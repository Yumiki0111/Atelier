import { weightKgFromBodyVal, normalizeWidgetCtaAccentColor } from "@Atelier/shared";
import type { WidgetConfig, WidgetColorSwatch } from "./types";
import { WIDGET_LOG_PREFIX } from "./embed-data";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { sendEvent, type WidgetParams } from "./widget-api";
import { injectModalBaseStyles } from "./widget-modal-styles";
import { attachDesktopOverlayLayoutSync, closeOverlay } from "./widget-modal-overlay-layout";
import { widgetEventMeta, tryNavigateAddToCart } from "./widget-modal-cart";
import { el, sortSizeKeys } from "./widget-modal-dom-utils";
import {
  SURFACE_BG,
  DEFAULT_FIT_BODY_VAL,
  GRADING_V4_GRID_BODY_TEMPLATE_PATH_COUNT,
  gradingV4GridBodyPathEndsClosed,
} from "./widget-modal-constants";
import {
  appendWidgetFitEaseSummary,
  appendFitEaseDiagramToSvg,
  appendFitEaseFootnote,
  iconPerson,
  iconCart,
  type WidgetFitEaseSummaryJson,
  type WidgetFitEaseDiagramJson,
} from "./widget-modal-fit-ease-ui";
import { appendWidgetFitGarmentPathGroup } from "./widget-fit-svg-path-dom";

export function updateModalWithConfig(
  _shadowRoot: ShadowRoot,
  config: WidgetConfig,
  params: WidgetParams,
  overlay: HTMLElement,
  contentArea: HTMLElement,
  reopenHandler?: () => void,
  options?: { deferGarmentViewerMs?: number }
) {
  if (!overlay || !contentArea) return;
  injectModalBaseStyles();

  if (params.desktopPanel === true) {
    attachDesktopOverlayLayoutSync(overlay);
  }

  const prevCleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (prevCleanup?.fn) prevCleanup.fn();

  const deferGarmentViewerMs = Math.max(0, options?.deferGarmentViewerMs ?? 0);

  const ui = config.design;
  const interfaceBg = ui?.interfaceBackgroundColor ?? SURFACE_BG;
  const canvasBg = ui?.canvasBackgroundColor ?? SURFACE_BG;
  const ctaCart = ui?.ctaCartLabel ?? "カートに追加";
  const ctaTryOn = ui?.ctaTryOnLabel ?? "この体型で試着する";
  const accent = normalizeWidgetCtaAccentColor(ui?.ctaAccentColor);

  contentArea.innerHTML = "";
  contentArea.style.cssText =
    "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;background:" +
    interfaceBg +
    ";padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;";

  /**
   * 端末枠（黒ベゼル・max-width 制限）:
   * - `phoneFrame === true` のときのみ強制オン
   * - `phoneFrame === false` または画像オーバーレイ試着（`overlay`）ではオフ（本番 PDP / デモは枠なし）
   * - 未指定のフローティングボタンのみ従来どおり枠あり
   */
  const usePhoneFrame =
    params.phoneFrame === true
      ? true
      : params.phoneFrame === false || params.overlay === true
        ? false
        : true;
  if (!usePhoneFrame) {
    contentArea.style.alignItems = "stretch";
    contentArea.style.paddingLeft = "0";
    contentArea.style.paddingRight = "0";
  }

  let screenRoot: HTMLElement;
  if (usePhoneFrame) {
    const phoneFrameOuter = el(
      "div",
      "width:100%;max-width:310.5px;height:100%;max-height:672px;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;"
    );
    const phoneShell = el(
      "div",
      "flex:1;min-height:0;display:flex;flex-direction:column;width:100%;height:100%;" +
        "background:linear-gradient(145deg,#3a3a3c 0%,#1c1c1e 40%,#2c2c2e 60%,#1c1c1e 100%);" +
        "border-radius:44px;border:1px solid rgba(130,130,135,0.5);padding:10px;box-sizing:border-box;"
    );
    const phoneScreen = el(
      "div",
      `position:relative;flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:${interfaceBg};border-radius:34px;`
    );
    phoneShell.appendChild(phoneScreen);
    phoneFrameOuter.appendChild(phoneShell);
    contentArea.appendChild(phoneFrameOuter);
    screenRoot = phoneScreen;
  } else {
    screenRoot = el(
      "div",
      `position:relative;flex:1;min-height:0;min-width:0;width:100%;max-width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:${interfaceBg};`
    );
    contentArea.appendChild(screenRoot);
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const eshopId = params.shopId || config.shopId || undefined;
  const productIdForEvents = params.productId || params.externalProductId || "";
  if (eshopId && eshopId !== "unknown") {
    sendEvent({
      shopId: eshopId,
      productId: uuidRe.test(productIdForEvents) ? productIdForEvents : undefined,
      type: "widget_open",
      meta: widgetEventMeta(params),
    }).catch(() => {});
  }

  const asset = config.asset;
  const productName = asset?.productName || "商品名";
  const priceText = asset?.priceDisplay || "—";
  const thumbnailUrl = asset?.thumbnailUrl || "";
  /** 開発で登録した garment_spec をサーバーで着用計算するモード（publicKey 必須） */
  const garmentFitAvailable = asset?.garmentFitAvailable === true && !!params.publicKey;

  /** API が `sizes` に挿入したキー順＝着丈→袖丈順。2D 試着時は再ソートしない（locale 順に戻さない） */
  let sizeKeys = Object.keys(asset?.sizes || {});
  if (!garmentFitAvailable) {
    sizeKeys = sortSizeKeys(sizeKeys);
  }
  if (sizeKeys.length === 0) {
    sizeKeys = garmentFitAvailable ? ["XS", "S", "M", "L", "XL", "XXL"] : ["3", "4", "5"];
  }
  let currentSize = sizeKeys[0];
  if (params.initialSize && sizeKeys.includes(params.initialSize)) {
    currentSize = params.initialSize;
  } else if (asset?.defaultSize && sizeKeys.includes(asset.defaultSize)) {
    currentSize = asset.defaultSize;
  }

  /** API が colors を返す場合のみ色切替 UI を出す（未登録時は表示しない） */
  const swatches: WidgetColorSwatch[] =
    garmentFitAvailable || !asset?.colors?.length ? [] : asset.colors;
  let selectedColorId = swatches[0]?.id || "";
  let garmentImg: HTMLImageElement | null = null;

  let fitHeightCm = 170;
  let fitBodyVal = DEFAULT_FIT_BODY_VAL;

  /** メイン試着ビュー用。体型シートの body-only プレビューとは別カウンタ（お互いにキャンセルしない） */
  let fitSvgViewerGen = 0;
  let fitSvgBodyDraftGen = 0;

  const cleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (cleanup) {
    cleanup.fn = () => {};
  }

  // ── 戻る（PreviewBackRow に合わせる）
  const backRow = el(
    "div",
    `padding:max(10px, env(safe-area-inset-top)) 16px 4px 16px;flex-shrink:0;position:relative;z-index:3;background:${interfaceBg};`
  );
  const backBtn = el(
    "button",
    "border:none;background:transparent;padding:6px 0;font-size:12px;color:#111;cursor:pointer;display:flex;align-items:center;gap:4px;"
  );
  backBtn.textContent = "← 閉じる";
  backBtn.addEventListener("click", () => {
    closeOverlay(overlay);
    if (reopenHandler) {
      queueMicrotask(reopenHandler);
    }
  });
  backRow.appendChild(backBtn);
  screenRoot.appendChild(backRow);

  // ── 商品行（左: サムネ・名前・価格 / 右: 体型）
  const productRow = el(
    "div",
    `display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-shrink:0;position:relative;z-index:3;padding:6px 16px 8px 16px;gap:8px;background:${interfaceBg};`
  );
  const leftCol = el("div", "display:flex;flex-direction:row;align-items:flex-start;gap:6px;min-width:0;flex:1;");

  const thumbWrap = el(
    "div",
    "width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#f3f4f6;border:1px solid #e5e7eb;"
  );
  if (thumbnailUrl) {
    const img = document.createElement("img");
    img.src = thumbnailUrl;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    thumbWrap.appendChild(img);
  } else {
    const ph = el("div", "width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:7px;color:#9ca3af;");
    ph.textContent = "IMG";
    thumbWrap.appendChild(ph);
  }
  leftCol.appendChild(thumbWrap);

  const titleBlock = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;");
  const nameEl = el(
    "div",
    "font-size:9px;font-weight:400;color:#111;line-height:1.2;word-break:break-word;"
  );
  nameEl.textContent = productName;
  const priceEl = el("div", "font-size:8px;color:#111;font-weight:400;");
  priceEl.textContent = priceText;
  titleBlock.appendChild(nameEl);
  titleBlock.appendChild(priceEl);
  leftCol.appendChild(titleBlock);

  const bodyBtn = el(
    "button",
    `display:flex;flex-direction:row;align-items:center;box-sizing:border-box;height:32px;padding:0 7px;gap:3px;border-radius:999px;border:1px solid #111;background:#fff;color:#111;font-size:9px;font-weight:600;cursor:pointer;flex-shrink:0;white-space:nowrap;line-height:1;`
  );
  const bodyIconWrap = el(
    "span",
    "display:flex;align-items:center;justify-content:center;flex-shrink:0;width:12px;height:12px;"
  );
  bodyIconWrap.appendChild(iconPerson());
  const bodyLabel = el("span", "display:flex;align-items:center;");
  bodyLabel.textContent = "体型を変更";
  bodyBtn.appendChild(bodyIconWrap);
  bodyBtn.appendChild(bodyLabel);
  productRow.appendChild(leftCol);
  productRow.appendChild(bodyBtn);
  screenRoot.appendChild(productRow);

  function colorFilterForHex(hex: string): string {
    const h = hex.replace("#", "");
    if (h.length !== 6) return "none";
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    if (max !== min) {
      if (max === r) hue = ((g - b) / (max - min)) % 6;
      else if (max === g) hue = (b - r) / (max - min) + 2;
      else hue = (r - g) / (max - min) + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
    const sepia = 0.35;
    const sat = 0.4;
    return `sepia(${sepia}) saturate(${sat}) hue-rotate(${hue}deg)`;
  }

  // ── 色（登録SVG試着時はサムネイル上の疑似染色のみ使わない）
  if (!garmentFitAvailable && swatches.length > 0) {
    const colorRow = el("div", "display:flex;flex-direction:row;gap:10px;padding:0 14px 14px;align-items:center;");
    swatches.forEach((sw) => {
      const b = el("button", "width:28px;height:28px;border-radius:50%;padding:0;cursor:pointer;flex-shrink:0;");
      b.style.background = sw.hex;
      b.style.border = sw.id === selectedColorId ? `3px solid ${accent}` : "1px solid #ccc";
      b.setAttribute("aria-label", sw.label || sw.id);
      b.addEventListener("click", () => {
        selectedColorId = sw.id;
        colorRow.querySelectorAll("button").forEach((btn, i) => {
          const s = swatches[i];
          if (!s) return;
          (btn as HTMLElement).style.border =
            s.id === selectedColorId ? `3px solid ${accent}` : "1px solid #ccc";
        });
        if (garmentImg && thumbnailUrl) {
          garmentImg.style.filter = colorFilterForHex(sw.hex);
        }
      });
      colorRow.appendChild(b);
    });
    screenRoot.appendChild(colorRow);
  }

  // ── 試着表示（開発と同じ計算の SVG）または従来のシルエット＋サムネ
  const viewerArea = el(
    "div",
    `flex:1 1 0%;min-height:0;min-width:0;position:relative;z-index:1;background:${canvasBg};display:flex;align-items:center;justify-content:center;overflow:hidden;padding:10px 12px 12px;box-sizing:border-box;`
  );
  viewerArea.setAttribute("data-fitlook-viewer-container", "true");

  /**
   * コンソールの `PreviewFittingCanvasSvg`（`customGarmentData` をメモリに持つ）とは別経路。
   * - プレビュー: `useFittingCanvasData`＋サイズ変更時の path 補間（約 480ms・RAF）。体型スライダーも同じ計算がローカルで走る。
   * - ウィジェット: 毎回 `/api/public/widget-fit-svg` を叩き、返ってきたパスで SVG を組み立て直すだけ（サーバー計算は `computeWidgetFitSnapshot` と同系統だが、往復と離散更新のためカクつきやすい）。
   * スマホフレームは見た目の枠であり、計算パイプラインとは無関係。
   * 完全に同じ滑らかさにするには `garment_spec` をクライアントに載せて同じクライアント計算をバンドルする必要がある（別途大きな対応）。
   */
  /** 体型・服パス → 図解（ポイント・採寸数値）。初回のみ段階フェード、再取得（subtle）時は図解を消さない */
  function mountFitSvgStaged(
    parent: HTMLElement,
    svg: SVGSVGElement,
    opts: { bodyOnly: boolean; hasDiagram: boolean; instantDiagram?: boolean }
  ): void {
    const gBody = svg.querySelector("[data-fitlook-fit-body]");
    /** 背面＋前面で各 `<g data-fitlook-fit-garment>` があるため、先頭のみにせずすべてにフェードを掛ける */
    const garmentGroups = [...svg.querySelectorAll("[data-fitlook-fit-garment]")].filter(
      (n): n is SVGGElement => n instanceof SVGGElement
    );
    const diag = svg.querySelector("[data-fitlook-ease-diagram]");
    const fadeBodyMs = "0.42s";
    const instantDiagram = opts.instantDiagram === true;

    if (gBody instanceof SVGGElement) {
      gBody.style.opacity = "0";
      gBody.style.transition = `opacity ${fadeBodyMs} ease-out`;
    }
    if (!opts.bodyOnly) {
      garmentGroups.forEach((gGarment) => {
        gGarment.style.opacity = "0";
        gGarment.style.transition = `opacity ${fadeBodyMs} ease-out`;
      });
    }
    if (opts.hasDiagram && diag instanceof SVGGElement) {
      if (instantDiagram) {
        diag.style.opacity = "1";
      } else {
        diag.style.opacity = "0";
        diag.style.transition = "opacity 0.35s ease-out";
      }
    }

    parent.appendChild(svg);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (gBody instanceof SVGGElement) gBody.style.opacity = "1";
        if (!opts.bodyOnly) garmentGroups.forEach((gGarment) => (gGarment.style.opacity = "1"));
      });
    });

    if (opts.hasDiagram && diag instanceof SVGGElement && !instantDiagram) {
      window.setTimeout(() => {
        diag.style.opacity = "1";
      }, 420);
    }
  }

  async function loadGarmentFitSvgInto(
    target: HTMLElement,
    heightCm: number,
    bodyVal: number,
    options?: { bodyOnly?: boolean; subtleLoading?: boolean; stagedEaseAfterBody?: boolean }
  ): Promise<void> {
    const bodyOnly = options?.bodyOnly === true;
    const subtleLoading = options?.subtleLoading === true;
    /** 体型適用後など、subtle でも図解・脚注を初回と同様に遅延表示する */
    const stagedEaseAfterBody = options?.stagedEaseAfterBody === true;
    if (!garmentFitAvailable || !params.publicKey) return;
    const ext = params.externalProductId || params.productId;
    if (!ext) return;

    const isBodyDraft = bodyOnly;
    const gen = isBodyDraft ? ++fitSvgBodyDraftGen : ++fitSvgViewerGen;
    const stale = () =>
      isBodyDraft ? gen !== fitSvgBodyDraftGen : gen !== fitSvgViewerGen;

    /** プレビュー同様：再取得時は既存 SVG/画像をそのまま表示し、完了後に差し替え（薄いオーバーレイは出さない） */
    const canSubtle =
      subtleLoading &&
      (target.querySelector("svg") != null || target.querySelector("img") != null);
    const skipEaseStagedDelay = canSubtle && !stagedEaseAfterBody;

    target.querySelectorAll("[data-fitlook-fit-loading]").forEach((n) => n.remove());

    if (!canSubtle) {
      target.innerHTML = "";
      const loading = el("div", "padding:24px;color:#6b7280;font-size:14px;text-align:center;");
      loading.textContent = "読み込み中...";
      target.appendChild(loading);
    }

    try {
      const sp = new URLSearchParams({
        publicKey: params.publicKey,
        externalProductId: ext,
        size: currentSize,
        heightCm: String(heightCm),
        weightKg: String(weightKgFromBodyVal(bodyVal)),
      });
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/public/widget-fit-svg?${sp.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        viewBoxMinX?: number;
        viewBoxWidth: number;
        viewBoxHeight: number;
        bodyPaths: string[];
        presetId?: string;
        garmentPathsBehindBody?: string[];
        garmentBehindBodyPathStrokeDasharrays?: (string | undefined)[];
        garmentBehindBodyPathStrokeWidths?: (number | undefined)[];
        garmentBehindBodyPathStrokes?: (string | undefined)[];
        garmentBehindBodyPathFills?: (string | undefined)[];
        garmentPaths: string[];
        garmentPathStrokeDasharrays?: (string | undefined)[];
        garmentPathStrokeWidths?: (number | undefined)[];
        garmentPathStrokes?: (string | undefined)[];
        garmentPathFills?: (string | undefined)[];
        fitEaseSummary?: WidgetFitEaseSummaryJson;
        fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
      };
      if (stale()) return;
      target.innerHTML = "";
      const column = el(
        "div",
        "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;max-width:min(100%,300px);max-height:100%;min-height:0;margin:0 auto;overflow:hidden;"
      );
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `${data.viewBoxMinX ?? 0} 0 ${data.viewBoxWidth} ${data.viewBoxHeight}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.setAttribute("overflow", "visible");
      svg.style.cssText =
        `aspect-ratio:${data.viewBoxWidth} / ${data.viewBoxHeight};width:auto;max-width:100%;height:auto;max-height:100%;display:block;margin:0 auto;`;
      const defaultGarmentStroke =
        data.presetId === "gradingV4" ? "rgba(45,45,45,0.9)" : "rgba(70, 70, 70, 0.82)";
      if (!bodyOnly) {
        const behind = data.garmentPathsBehindBody;
        if (behind != null && behind.length > 0) {
          appendWidgetFitGarmentPathGroup(
            svg,
            {
              paths: behind,
              strokeDasharrays: data.garmentBehindBodyPathStrokeDasharrays,
              strokeWidths: data.garmentBehindBodyPathStrokeWidths,
              strokes: data.garmentBehindBodyPathStrokes,
              fills: data.garmentBehindBodyPathFills,
            },
            { presetId: data.presetId, defaultStroke: defaultGarmentStroke, gradingBehindGarmentLayer: true }
          );
        }
      }
      const gBody = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gBody.setAttribute("data-fitlook-fit-body", "true");
      const gridLayered =
        data.presetId === "gradingV4" && data.bodyPaths.length === GRADING_V4_GRID_BODY_TEMPLATE_PATH_COUNT;
      if (gridLayered) {
        const gFill = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gFill.setAttribute("stroke", "none");
        for (const d of data.bodyPaths) {
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", d);
          p.setAttribute("fill", gradingV4GridBodyPathEndsClosed(d) ? canvasBg : "none");
          gFill.appendChild(p);
        }
        const gOutline = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gOutline.setAttribute("fill", "none");
        gOutline.setAttribute("stroke", "#bbb");
        gOutline.setAttribute("stroke-width", "4");
        const d0 = data.bodyPaths[0];
        if (d0) {
          const p0 = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p0.setAttribute("d", d0);
          gOutline.appendChild(p0);
        }
        for (let bi = 1; bi < data.bodyPaths.length; bi++) {
          const di = data.bodyPaths[bi]!;
          if (gradingV4GridBodyPathEndsClosed(di)) continue;
          const pOp = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pOp.setAttribute("d", di);
          gOutline.appendChild(pOp);
        }
        gBody.appendChild(gFill);
        gBody.appendChild(gOutline);
      } else {
        gBody.setAttribute("fill", canvasBg);
        gBody.setAttribute("stroke", "#bbb");
        gBody.setAttribute("stroke-width", "4");
        for (const d of data.bodyPaths) {
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", d);
          gBody.appendChild(p);
        }
      }
      svg.appendChild(gBody);
      if (!bodyOnly) {
        appendWidgetFitGarmentPathGroup(
          svg,
          {
            paths: data.garmentPaths,
            strokeDasharrays: data.garmentPathStrokeDasharrays,
            strokeWidths: data.garmentPathStrokeWidths,
            strokes: data.garmentPathStrokes,
            fills: data.garmentPathFills,
          },
          { presetId: data.presetId, defaultStroke: defaultGarmentStroke }
        );
        const dia = data.fitEaseDiagram;
        if (dia && Array.isArray(dia.ops) && dia.ops.length > 0) {
          appendFitEaseDiagramToSvg(svg, dia);
        }
      }
      const hasDiagram = Boolean(
        !bodyOnly && data.fitEaseDiagram && Array.isArray(data.fitEaseDiagram.ops) && data.fitEaseDiagram.ops.length > 0
      );
      /** 初回・体型適用後は体型・服→図解→文言。サイズ変更の subtle のみ図解を即表示 */
      mountFitSvgStaged(column, svg, {
        bodyOnly,
        hasDiagram,
        instantDiagram: skipEaseStagedDelay && hasDiagram,
      });
      if (!bodyOnly) {
        const dia = data.fitEaseDiagram;
        if (dia && Array.isArray(dia.ops) && dia.ops.length > 0) {
          if (skipEaseStagedDelay) {
            appendFitEaseFootnote(column, data.fitEaseSummary);
          } else {
            const footWrap = el(
              "div",
              "width:100%;max-width:100%;opacity:0;transition:opacity 0.35s ease-out;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;"
            );
            appendFitEaseFootnote(footWrap, data.fitEaseSummary);
            if (footWrap.childNodes.length > 0) {
              column.appendChild(footWrap);
              window.setTimeout(() => {
                footWrap.style.opacity = "1";
              }, 540);
            }
          }
        } else if (skipEaseStagedDelay) {
          appendWidgetFitEaseSummary(column, data.fitEaseSummary);
        } else {
          const sumWrap = el(
            "div",
            "width:100%;max-width:100%;opacity:0;transition:opacity 0.35s ease-out;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;"
          );
          appendWidgetFitEaseSummary(sumWrap, data.fitEaseSummary);
          if (sumWrap.childNodes.length > 0) {
            column.appendChild(sumWrap);
            window.setTimeout(() => {
              sumWrap.style.opacity = "1";
            }, 480);
          }
        }
      }
      target.appendChild(column);
    } catch {
      if (stale()) return;
      if (canSubtle) {
        const err = el(
          "div",
          "position:absolute;bottom:8px;left:8px;right:8px;z-index:20;padding:8px 10px;background:rgba(254,242,242,0.96);border-radius:8px;text-align:center;font-size:12px;color:#b91c1c;"
        );
        err.setAttribute("data-fitlook-fit-err-toast", "true");
        err.textContent = "表示の更新に失敗しました";
        target.querySelector("[data-fitlook-fit-err-toast]")?.remove();
        target.appendChild(err);
        window.setTimeout(() => err.remove(), 4200);
      } else {
        target.innerHTML = "";
        const err = el("div", "padding:16px;color:#b91c1c;font-size:13px;text-align:center;");
        err.textContent = "試着表示の読み込みに失敗しました";
        target.appendChild(err);
      }
    }
  }

  async function loadGarmentFitSvg(opts?: { subtle?: boolean; stagedEaseAfterBody?: boolean }): Promise<void> {
    return loadGarmentFitSvgInto(viewerArea, fitHeightCm, fitBodyVal, {
      subtleLoading: opts?.subtle === true,
      stagedEaseAfterBody: opts?.stagedEaseAfterBody === true,
    });
  }

  if (garmentFitAvailable) {
    if (deferGarmentViewerMs > 0) {
      window.setTimeout(() => {
        void loadGarmentFitSvg();
      }, deferGarmentViewerMs);
    } else {
      void loadGarmentFitSvg();
    }
  } else if (thumbnailUrl) {
    garmentImg = document.createElement("img");
    garmentImg.src = thumbnailUrl;
    garmentImg.alt = productName || "";
    const selHex = swatches.find((s) => s.id === selectedColorId)?.hex || swatches[0]?.hex;
    const filterCss =
      swatches.length > 0 && selHex ? `filter:${colorFilterForHex(selHex)};` : "";
    garmentImg.style.cssText = `position:relative;z-index:1;max-width:88%;max-height:72%;width:auto;height:auto;object-fit:contain;${filterCss}`;
    viewerArea.appendChild(garmentImg);
  } else {
    const empty = el("div", "padding:20px 16px;text-align:center;color:#6b7280;font-size:13px;line-height:1.5;");
    empty.textContent = "商品画像（サムネイル）が登録されていません。コンソールの商品で画像 URL を設定してください。";
    viewerArea.appendChild(empty);
  }
  screenRoot.appendChild(viewerArea);

  // ── サイズ（グレーディング）
  const WINDOW = 3;
  const idxSize = sizeKeys.indexOf(currentSize);
  let windowStart =
    idxSize >= 0
      ? Math.min(Math.max(0, idxSize), Math.max(0, sizeKeys.length - WINDOW))
      : 0;

  const sizeSection = el(
    "div",
    `flex-shrink:0;position:relative;z-index:3;padding:8px 14px 2px;display:flex;flex-direction:column;gap:6px;background:${interfaceBg};`
  );
  const sizeRow = el("div", "display:flex;flex-direction:row;align-items:center;justify-content:center;gap:6px;");

  const prevBtn = el(
    "button",
    "flex-shrink:0;min-width:48px;min-height:52px;width:48px;height:52px;border:none;background:transparent;font-size:32px;color:#111;cursor:pointer;line-height:1;border-radius:999px;display:flex;align-items:center;justify-content:center;"
  );
  prevBtn.type = "button";
  prevBtn.setAttribute("aria-label", "前のサイズ");
  prevBtn.textContent = "‹";
  const nextBtn = el(
    "button",
    "flex-shrink:0;min-width:48px;min-height:52px;width:48px;height:52px;border:none;background:transparent;font-size:32px;color:#111;cursor:pointer;line-height:1;border-radius:999px;display:flex;align-items:center;justify-content:center;"
  );
  nextBtn.type = "button";
  nextBtn.setAttribute("aria-label", "次のサイズ");
  nextBtn.textContent = "›";

  const sizeBtnsWrap = el("div", "display:flex;flex-direction:row;gap:8px;align-items:center;justify-content:center;");

  function syncWindowStartFromSelection() {
    const idx = sizeKeys.indexOf(currentSize);
    windowStart =
      idx >= 0 ? Math.min(Math.max(0, idx), Math.max(0, sizeKeys.length - WINDOW)) : 0;
  }

  function selectSize(sz: string) {
    currentSize = sz;
    syncWindowStartFromSelection();
    if (eshopId && eshopId !== "unknown") {
      sendEvent({
        shopId: eshopId,
        productId: uuidRe.test(productIdForEvents) ? productIdForEvents : undefined,
        type: "size_change",
        meta: { size: sz, ...widgetEventMeta(params) },
      }).catch(() => {});
    }
    renderSizeButtons();
    if (garmentFitAvailable) {
      void loadGarmentFitSvg({ subtle: true });
    }
  }

  function renderSizeButtons() {
    sizeBtnsWrap.innerHTML = "";
    const slice = sizeKeys.slice(windowStart, windowStart + WINDOW);
    slice.forEach((sz) => {
      const isSel = sz === currentSize;
      const btn = el(
        "button",
        `min-width:44px;height:44px;padding:0 10px;box-sizing:border-box;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer;flex-shrink:0;` +
          (isSel
            ? `background:${accent};color:#fff;border:none;`
            : `background:#fff;color:#111;border:1px solid #111;`)
      );
      btn.type = "button";
      btn.textContent = sz;
      btn.addEventListener("click", () => {
        selectSize(sz);
      });
      sizeBtnsWrap.appendChild(btn);
    });
    const idx = sizeKeys.indexOf(currentSize);
    const atStart = idx <= 0;
    const atEnd = idx < 0 || idx >= sizeKeys.length - 1;
    prevBtn.style.opacity = atStart ? "0.35" : "1";
    prevBtn.style.pointerEvents = atStart ? "none" : "auto";
    prevBtn.toggleAttribute("disabled", atStart);
    nextBtn.style.opacity = atEnd ? "0.35" : "1";
    nextBtn.style.pointerEvents = atEnd ? "none" : "auto";
    nextBtn.toggleAttribute("disabled", atEnd);
  }

  prevBtn.addEventListener("click", () => {
    const idx = sizeKeys.indexOf(currentSize);
    if (idx <= 0) return;
    selectSize(sizeKeys[idx - 1]!);
  });
  nextBtn.addEventListener("click", () => {
    const idx = sizeKeys.indexOf(currentSize);
    if (idx < 0 || idx >= sizeKeys.length - 1) return;
    selectSize(sizeKeys[idx + 1]!);
  });

  sizeRow.appendChild(prevBtn);
  sizeRow.appendChild(sizeBtnsWrap);
  sizeRow.appendChild(nextBtn);
  sizeSection.appendChild(sizeRow);
  screenRoot.appendChild(sizeSection);
  renderSizeButtons();

  // ── カート
  const cartWrap = el(
    "div",
    `flex-shrink:0;position:relative;z-index:3;background:${interfaceBg};padding-top:4px;padding-left:14px;padding-right:14px;padding-bottom:max(12px, env(safe-area-inset-bottom));`
  );
  const cartBtn = el(
    "button",
    `width:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-between;box-sizing:border-box;padding:10px 14px;border:none;border-radius:10px;background:${accent};color:#fff;font-size:13px;font-weight:700;cursor:pointer;`
  );
  const cartLeft = el("div", "display:flex;align-items:center;gap:8px;flex-shrink:0;");
  cartLeft.appendChild(iconCart());
  const cartMid = el("span", "flex:1;text-align:center;");
  cartMid.textContent = ctaCart;
  const cartRight = el(
    "div",
    "width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:11px;"
  );
  cartRight.textContent = "→";
  cartBtn.appendChild(cartLeft);
  cartBtn.appendChild(cartMid);
  cartBtn.appendChild(cartRight);
  cartBtn.addEventListener("click", () => {
    if (eshopId && eshopId !== "unknown") {
      sendEvent({
        shopId: eshopId,
        productId: uuidRe.test(productIdForEvents) ? productIdForEvents : undefined,
        type: "add_to_cart_click",
        meta: { size: currentSize, colorId: selectedColorId, ...widgetEventMeta(params) },
      }).catch(() => {});
    }
    const cartDetail = {
      size: currentSize,
      colorId: selectedColorId,
      productId: params.externalProductId || params.productId,
    };
    try {
      window.dispatchEvent(new CustomEvent("fitlook:add-to-cart", { detail: cartDetail }));
      window.dispatchEvent(new CustomEvent("Atelier:add-to-cart", { detail: cartDetail }));
    } catch {
      /* ignore */
    }
    tryNavigateAddToCart(params, currentSize, selectedColorId);
  });
  cartWrap.appendChild(cartBtn);
  screenRoot.appendChild(cartWrap);

  // ── 体型調整（試着画面内の全画面。試着ビューと同じ SVG／シルエット＋サムネを表示）
  let bodyAdjustOverlay: HTMLElement | null = null;
  let bodyDraftPreviewTimer: ReturnType<typeof setTimeout> | null = null;

  function closeBodyAdjustOverlay() {
    if (bodyDraftPreviewTimer) {
      clearTimeout(bodyDraftPreviewTimer);
      bodyDraftPreviewTimer = null;
    }
    if (bodyAdjustOverlay) {
      bodyAdjustOverlay.remove();
      bodyAdjustOverlay = null;
    }
  }

  function openBodySheet() {
    if (bodyAdjustOverlay) return;

    let setupHeight = fitHeightCm;
    let bodyVal = fitBodyVal;

    bodyAdjustOverlay = el(
      "div",
      "position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:" +
        interfaceBg +
        ";border-radius:" +
        (usePhoneFrame ? "34px" : "0") +
        ";overflow:hidden;animation:fitlook-fade-in 0.2s ease-out;"
    );
    bodyAdjustOverlay.setAttribute("data-fitlook-body-adjust", "true");

    const backPadTop = "padding:10px 14px 6px;padding-top:max(10px, env(safe-area-inset-top));";
    const backRowInner = el("div", backPadTop + "flex-shrink:0;");
    const backToProduct = el(
      "button",
      "border:none;background:transparent;padding:6px 0;font-size:15px;color:#111;cursor:pointer;display:flex;align-items:center;gap:4px;"
    );
    backToProduct.type = "button";
    backToProduct.textContent = "← 商品に戻る";
    backToProduct.addEventListener("click", () => closeBodyAdjustOverlay());
    backRowInner.appendChild(backToProduct);
    bodyAdjustOverlay.appendChild(backRowInner);

    const figureArea = el(
      "div",
      `flex:1 1 0%;min-height:0;min-width:0;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:10px 12px 12px;box-sizing:border-box;background:${canvasBg};`
    );

    function scheduleBodyDraftPreview() {
      if (!garmentFitAvailable) return;
      if (bodyDraftPreviewTimer) clearTimeout(bodyDraftPreviewTimer);
      bodyDraftPreviewTimer = setTimeout(() => {
        bodyDraftPreviewTimer = null;
        void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, {
          bodyOnly: true,
          subtleLoading: true,
        });
      }, 140);
    }

    if (garmentFitAvailable) {
      void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, {
        bodyOnly: true,
        subtleLoading: false,
      });
    } else if (thumbnailUrl) {
      const prevImg = document.createElement("img");
      prevImg.src = thumbnailUrl;
      prevImg.alt = productName || "";
      prevImg.style.cssText =
        "max-width:88%;max-height:72%;width:auto;height:auto;object-fit:contain;position:relative;z-index:1;";
      figureArea.appendChild(prevImg);
    } else {
      const ph = el("div", "padding:16px;text-align:center;color:#6b7280;font-size:13px;");
      ph.textContent = "商品画像が登録されていません";
      figureArea.appendChild(ph);
    }
    bodyAdjustOverlay.appendChild(figureArea);

    const controls = el(
      "div",
      "flex-shrink:0;padding:0 12px 10px;display:flex;flex-direction:column;gap:6px;background:" +
        interfaceBg +
        ";"
    );

    const hRow = el("div", "width:100%;");
    const hLabel = el(
      "div",
      "display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:400;line-height:1;margin-bottom:2px;color:#111;"
    );
    const hTitle = el("span", "", "身長");
    const hVal = el("span", "", `${setupHeight} cm`);
    hLabel.appendChild(hTitle);
    hLabel.appendChild(hVal);
    const hInput = document.createElement("input");
    hInput.type = "range";
    hInput.min = "150";
    hInput.max = "195";
    hInput.value = String(fitHeightCm);
    hInput.style.cssText = "width:100%;height:28px;margin:0;accent-color:" + accent + ";";
    hInput.addEventListener("input", () => {
      setupHeight = parseInt(hInput.value, 10) || 170;
      hVal.textContent = `${setupHeight} cm`;
      scheduleBodyDraftPreview();
    });
    hRow.appendChild(hLabel);
    hRow.appendChild(hInput);
    controls.appendChild(hRow);

    const bRow = el("div", "width:100%;");
    const bLabel = el("div", "font-size:9px;font-weight:400;line-height:1;margin-bottom:2px;color:#111;");
    bLabel.textContent = "シルエット";
    const bInput = document.createElement("input");
    bInput.type = "range";
    bInput.min = "0";
    bInput.max = "100";
    bInput.value = String(fitBodyVal);
    bInput.style.cssText = "width:100%;height:28px;margin:0;accent-color:" + accent + ";";
    bInput.addEventListener("input", () => {
      bodyVal = parseInt(bInput.value, 10) || 0;
      scheduleBodyDraftPreview();
    });
    bRow.appendChild(bLabel);
    bRow.appendChild(bInput);
    controls.appendChild(bRow);

    bodyAdjustOverlay.appendChild(controls);

    // #region agent log
    fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "38ca00" },
      body: JSON.stringify({
        sessionId: "38ca00",
        runId: "widget-body-controls",
        hypothesisId: "H-widget-slider-gap",
        location: "widget-modal-update-config.ts:bodyAdjustControlsMount",
        message: "body adjust controls mounted (label/range spacing tune)",
        data: { labelLineHeight: 1, labelMarginBottomPx: 2, rangeMargin: 0 },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const ctaPad =
      "padding:8px 12px;padding-bottom:max(12px, env(safe-area-inset-bottom));flex-shrink:0;background:" +
        interfaceBg +
        ";";
    const ctaWrap = el("div", ctaPad);
    const applyBtn = el(
      "button",
      `width:100%;box-sizing:border-box;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:10px 14px;border:none;border-radius:10px;background:${accent};color:#fff;font-size:13px;font-weight:700;cursor:pointer;`
    );
    applyBtn.type = "button";
    const applyMid = el("span", "flex:1;text-align:center;");
    applyMid.textContent = ctaTryOn;
    const applyRight = el(
      "div",
      "width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;"
    );
    applyRight.textContent = "→";
    const applySpacer = el("span", "display:block;flex:0 0 15px;width:15px;height:15px;flex-shrink:0;");
    applyBtn.appendChild(applySpacer);
    applyBtn.appendChild(applyMid);
    applyBtn.appendChild(applyRight);
    applyBtn.addEventListener("click", () => {
      fitHeightCm = setupHeight;
      fitBodyVal = bodyVal;
      if (eshopId && eshopId !== "unknown") {
        sendEvent({
          shopId: eshopId,
          productId: uuidRe.test(productIdForEvents) ? productIdForEvents : undefined,
          type: "height_change",
          meta: {
            heightCm: fitHeightCm,
            bodyVal: fitBodyVal,
            ...widgetEventMeta(params),
          },
        }).catch(() => {});
      }
      if (garmentFitAvailable) {
        void loadGarmentFitSvg({ subtle: true, stagedEaseAfterBody: true });
      }
      closeBodyAdjustOverlay();
    });
    ctaWrap.appendChild(applyBtn);
    bodyAdjustOverlay.appendChild(ctaWrap);

    screenRoot.appendChild(bodyAdjustOverlay);
  }

  bodyBtn.addEventListener("click", openBodySheet);

  if (isDevelopmentMode()) {
    console.log(`${WIDGET_LOG_PREFIX} 2D view ready`, { productName, sizes: sizeKeys });
  }
}
