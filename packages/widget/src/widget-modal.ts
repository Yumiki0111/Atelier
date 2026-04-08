import { weightKgFromBodyVal } from "@Atelier/shared";
import type { WidgetConfig, WidgetColorSwatch } from "./types";
import { WIDGET_LOG_PREFIX } from "./embed-data";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { sendEvent, type WidgetParams } from "./widget-api";

function widgetEventMeta(params: WidgetParams): Record<string, unknown> | undefined {
  if (!params.placement) return undefined;
  return { placement: params.placement };
}
import { mountFitLookLogoLoadingAnimation } from "./widget-fitlook-logo";

const ACCENT_DEFAULT = "#3d3835";

/** コンソール `WidgetPreviewChrome` の `PREVIEW_SURFACE_BG` と同じ（グレー帯で上下が透けないようにする） */
const SURFACE_BG = "#fafafa";

/** 体型スライダー初期（`weightKgFromBodyVal` と @Atelier/shared のプレビューと同じ） */
const DEFAULT_FIT_BODY_VAL = 25;

function injectStyles() {
  if (document.getElementById("fitlook-bs-styles")) return;
  const s = document.createElement("style");
  s.id = "fitlook-bs-styles";
  s.textContent = `
    @keyframes fitlook-fade-in  { from{opacity:0} to{opacity:1} }
    [data-fitlook-modal] *, [data-atelier-modal] * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
  `;
  document.head.appendChild(s);
}

function sortSizeKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function closeOverlay(overlay: HTMLElement) {
  const cleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (cleanup) cleanup.fn();
  overlay.style.transition = "opacity 0.2s ease-out";
  overlay.style.opacity = "0";
  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
  }, 200);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (style) node.style.cssText = style;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconPerson(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("fill", "none");
  svg.style.cssText = "width:12px;height:12px;display:block;flex-shrink:0;";
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", "12");
  c.setAttribute("cy", "6");
  c.setAttribute("r", "3");
  c.setAttribute("stroke", "currentColor");
  c.setAttribute("stroke-width", "1.5");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute(
    "d",
    "M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M9 10h6"
  );
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linecap", "round");
  svg.appendChild(c);
  svg.appendChild(p);
  return svg;
}

function iconCart(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute(
    "d",
    "M6 6h15l-1.5 9h-12L4.5 3H2M6 6L4.5 3M8 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z"
  );
  p.setAttribute("stroke", "#fff");
  p.setAttribute("stroke-width", "1.6");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.appendChild(p);
  return svg;
}

export function renderModalWithLoading(
  _shadowRoot: ShadowRoot,
  _params: WidgetParams
): { overlay: HTMLElement; contentArea: HTMLElement } {
  injectStyles();

  const existingOverlays = document.querySelectorAll<HTMLElement>(
    "[data-fitlook-modal-overlay='true'], [data-atelier-modal-overlay='true']"
  );
  existingOverlays.forEach((el) => {
    if (el.style.opacity === "0" || parseFloat(el.style.opacity) < 0.1) {
      el.remove();
    }
  });

  const overlay = document.createElement("div");
  overlay.setAttribute("data-fitlook-modal", "true");
  overlay.setAttribute("data-fitlook-modal-overlay", "true");
  overlay.style.cssText = `
    position: fixed !important; inset: 0 !important;
    background: ${SURFACE_BG} !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    opacity: 0; animation: fitlook-fade-in 0.22s ease-out forwards;
  `;

  const contentArea = document.createElement("div");
  contentArea.setAttribute("data-fitlook-content-area", "true");
  contentArea.style.cssText =
    "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;background:" +
    SURFACE_BG +
    ";";

  const splashWrap = document.createElement("div");
  splashWrap.style.cssText =
    "flex:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;background:" +
    SURFACE_BG +
    ";";
  const cancelSplash = mountFitLookLogoLoadingAnimation(splashWrap);
  contentArea.appendChild(splashWrap);

  overlay.appendChild(contentArea);
  document.body.appendChild(overlay);

  const cleanup = { fn: cancelSplash };
  (overlay as unknown as { __fitlookCleanup: typeof cleanup }).__fitlookCleanup = cleanup;

  return { overlay, contentArea };
}

export function updateModalWithConfig(
  _shadowRoot: ShadowRoot,
  config: WidgetConfig,
  params: WidgetParams,
  overlay: HTMLElement,
  contentArea: HTMLElement
) {
  if (!overlay || !contentArea) return;
  injectStyles();

  const prevCleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (prevCleanup?.fn) prevCleanup.fn();

  const ui = config.design;
  const interfaceBg = ui?.interfaceBackgroundColor ?? SURFACE_BG;
  const canvasBg = ui?.canvasBackgroundColor ?? SURFACE_BG;
  const ctaCart = ui?.ctaCartLabel ?? "カートに追加";
  const ctaTryOn = ui?.ctaTryOnLabel ?? "この体型で試着する";
  const accent = ui?.ctaAccentColor ?? ACCENT_DEFAULT;

  contentArea.innerHTML = "";
  contentArea.style.cssText =
    "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;background:" +
    interfaceBg +
    ";padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;";
  overlay.style.setProperty("background", interfaceBg, "important");

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

  let sizeKeys = sortSizeKeys(Object.keys(asset?.sizes || {}));
  if (sizeKeys.length === 0) {
    sizeKeys = garmentFitAvailable ? ["default"] : ["3", "4", "5"];
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
    "padding:max(10px, env(safe-area-inset-top)) 12px 4px 12px;flex-shrink:0;"
  );
  const backBtn = el(
    "button",
    "border:none;background:transparent;padding:6px 0;font-size:12px;color:#111;cursor:pointer;display:flex;align-items:center;gap:4px;"
  );
  backBtn.textContent = "← 閉じる";
  backBtn.addEventListener("click", () => closeOverlay(overlay));
  backRow.appendChild(backBtn);
  screenRoot.appendChild(backRow);

  // ── 商品行（左: サムネ・名前・価格 / 右: 体型）
  const productRow = el(
    "div",
    "display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-shrink:0;padding:2px 12px 8px 12px;gap:6px;"
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
    `flex:1;min-height:120px;min-width:0;flex-basis:0;position:relative;background:${canvasBg};display:flex;align-items:center;justify-content:center;overflow:visible;padding:16px;box-sizing:border-box;`
  );
  viewerArea.setAttribute("data-fitlook-viewer-container", "true");

  /**
   * コンソールの `PreviewFittingCanvasSvg`（`customGarmentData` をメモリに持つ）とは別経路。
   * - プレビュー: `useFittingCanvasData`＋サイズ変更時の path 補間（約 480ms・RAF）。体型スライダーも同じ計算がローカルで走る。
   * - ウィジェット: 毎回 `/api/public/widget-fit-svg` を叩き、返ってきたパスで SVG を組み立て直すだけ（サーバー計算は `computeWidgetFitSnapshot` と同系統だが、往復と離散更新のためカクつきやすい）。
   * スマホフレームは見た目の枠であり、計算パイプラインとは無関係。
   * 完全に同じ滑らかさにするには `garment_spec` をクライアントに載せて同じクライアント計算をバンドルする必要がある（別途大きな対応）。
   */
  function mountFitSvgElement(target: HTMLElement, svg: SVGSVGElement): void {
    svg.style.opacity = "0";
    svg.style.transition = "opacity 0.2s ease-out";
    target.appendChild(svg);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        svg.style.opacity = "1";
      });
    });
  }

  async function loadGarmentFitSvgInto(
    target: HTMLElement,
    heightCm: number,
    bodyVal: number,
    options?: { bodyOnly?: boolean; subtleLoading?: boolean }
  ): Promise<void> {
    const bodyOnly = options?.bodyOnly === true;
    const subtleLoading = options?.subtleLoading === true;
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
        viewBoxWidth: number;
        viewBoxHeight: number;
        bodyPaths: string[];
        garmentPaths: string[];
        garmentPathStrokeDasharrays?: (string | undefined)[];
        garmentPathStrokeWidths?: (number | undefined)[];
        garmentPathStrokes?: (string | undefined)[];
      };
      if (stale()) return;
      target.innerHTML = "";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${data.viewBoxWidth} ${data.viewBoxHeight}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.cssText =
        "width:100%;max-width:300px;height:auto;max-height:100%;display:block;margin:0 auto;";
      const gBody = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gBody.setAttribute("fill", "none");
      gBody.setAttribute("stroke", "#bbb");
      gBody.setAttribute("stroke-width", "4");
      for (const d of data.bodyPaths) {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", d);
        gBody.appendChild(p);
      }
      svg.appendChild(gBody);
      if (!bodyOnly) {
        const gGarment = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gGarment.setAttribute("fill", "none");
        const dashArr = data.garmentPathStrokeDasharrays;
        const widthArr = data.garmentPathStrokeWidths;
        const strokeArr = data.garmentPathStrokes;
        for (let gi = 0; gi < data.garmentPaths.length; gi++) {
          const d = data.garmentPaths[gi]!;
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", d);
          const sw = widthArr?.[gi];
          const stroke = strokeArr?.[gi];
          const dash = dashArr?.[gi];
          p.setAttribute("stroke-width", sw != null && Number.isFinite(sw) ? String(sw) : "8");
          p.setAttribute("stroke", stroke && stroke.length > 0 ? stroke : "rgba(70, 70, 70, 0.82)");
          if (dash != null && String(dash).trim().length > 0) {
            p.setAttribute("stroke-dasharray", String(dash));
          }
          gGarment.appendChild(p);
        }
        svg.appendChild(gGarment);
      }
      mountFitSvgElement(target, svg);
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

  async function loadGarmentFitSvg(opts?: { subtle?: boolean }): Promise<void> {
    return loadGarmentFitSvgInto(viewerArea, fitHeightCm, fitBodyVal, {
      subtleLoading: opts?.subtle === true,
    });
  }

  if (garmentFitAvailable) {
    void loadGarmentFitSvg();
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

  const sizeSection = el("div", "padding:8px 12px 2px;display:flex;flex-direction:column;gap:6px;");
  const sizeRow = el("div", "display:flex;flex-direction:row;align-items:center;justify-content:center;gap:8px;");

  const prevBtn = el(
    "button",
    "min-width:64px;min-height:64px;width:64px;height:64px;border:none;background:transparent;font-size:34px;color:#111;cursor:pointer;line-height:1;border-radius:999px;display:flex;align-items:center;justify-content:center;"
  );
  prevBtn.type = "button";
  prevBtn.setAttribute("aria-label", "前のサイズ");
  prevBtn.textContent = "‹";
  const nextBtn = el(
    "button",
    "min-width:64px;min-height:64px;width:64px;height:64px;border:none;background:transparent;font-size:34px;color:#111;cursor:pointer;line-height:1;border-radius:999px;display:flex;align-items:center;justify-content:center;"
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
    "flex-shrink:0;padding-top:4px;padding-left:12px;padding-right:12px;padding-bottom:max(12px, env(safe-area-inset-bottom));"
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
      `flex:1;min-height:120px;min-width:0;flex-basis:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:visible;padding:8px 12px 8px;box-sizing:border-box;background:${canvasBg};`
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
    const hLabel = el("div", "display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:400;line-height:1.25;margin-bottom:4px;color:#111;");
    const hTitle = el("span", "", "身長");
    const hVal = el("span", "", `${setupHeight} cm`);
    hLabel.appendChild(hTitle);
    hLabel.appendChild(hVal);
    const hInput = document.createElement("input");
    hInput.type = "range";
    hInput.min = "150";
    hInput.max = "195";
    hInput.value = String(fitHeightCm);
    hInput.style.cssText = "width:100%;height:28px;accent-color:" + accent + ";";
    hInput.addEventListener("input", () => {
      setupHeight = parseInt(hInput.value, 10) || 170;
      hVal.textContent = `${setupHeight} cm`;
      scheduleBodyDraftPreview();
    });
    hRow.appendChild(hLabel);
    hRow.appendChild(hInput);
    controls.appendChild(hRow);

    const bRow = el("div", "width:100%;");
    const bLabel = el("div", "font-size:9px;font-weight:400;line-height:1.25;margin-bottom:4px;color:#111;");
    bLabel.textContent = "シルエット";
    const bInput = document.createElement("input");
    bInput.type = "range";
    bInput.min = "0";
    bInput.max = "100";
    bInput.value = String(fitBodyVal);
    bInput.style.cssText = "width:100%;height:28px;accent-color:" + accent + ";";
    bInput.addEventListener("input", () => {
      bodyVal = parseInt(bInput.value, 10) || 0;
      scheduleBodyDraftPreview();
    });
    bRow.appendChild(bLabel);
    bRow.appendChild(bInput);
    controls.appendChild(bRow);

    bodyAdjustOverlay.appendChild(controls);

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
        void loadGarmentFitSvg({ subtle: true });
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

/**
 * コンソールの `WidgetStyleProductPreview` と同一 UI（`/embed/widget-fit`）を全画面 iframe で表示。
 * `garmentFitAvailable` のときのみ使用（クライアント試着パイプライン＝プレビューと同じ）。
 */
export function mountEmbedIframe(
  overlay: HTMLElement,
  contentArea: HTMLElement,
  params: WidgetParams
): void {
  const splashCleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (splashCleanup?.fn) splashCleanup.fn();

  contentArea.innerHTML = "";
  contentArea.style.cssText =
    "flex:1;min-height:0;position:relative;width:100%;height:100%;padding:0;margin:0;overflow:hidden;background:#fafafa;";
  overlay.style.setProperty("background", "#fafafa", "important");

  const apiBase = getApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const pk = encodeURIComponent(params.publicKey || "");
  const ext = encodeURIComponent(params.externalProductId || params.productId || "");
  const iframe = document.createElement("iframe");
  iframe.src = `${apiBase}/embed/widget-fit?publicKey=${pk}&externalProductId=${ext}`;
  iframe.setAttribute("title", "FIT&LOOK 試着");
  iframe.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%;border:none;display:block;";
  contentArea.style.position = "relative";
  contentArea.appendChild(iframe);

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type !== "fitlook-embed-close") return;
    window.removeEventListener("message", onMsg);
    closeOverlay(overlay);
  };
  window.addEventListener("message", onMsg);

  (overlay as unknown as { __fitlookCleanup: { fn: () => void } }).__fitlookCleanup = {
    fn: () => {
      window.removeEventListener("message", onMsg);
    },
  };
}

export function showErrorInModal(
  _shadowRoot: ShadowRoot,
  errorMessage: string,
  overlay: HTMLElement,
  contentArea: HTMLElement
) {
  if (!overlay || !contentArea) return;
  const prevCleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (prevCleanup?.fn) prevCleanup.fn();
  if (prevCleanup) prevCleanup.fn = () => {};

  contentArea.innerHTML = "";
  contentArea.style.cssText = `
    flex: 1; display: flex; flex-direction: column;
    overflow: hidden; align-items: center; justify-content: center;
    padding: 24px; text-align: center; background: ${SURFACE_BG};
    padding-top: max(24px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  `;
  overlay.style.setProperty("background", SURFACE_BG, "important");
  const div = document.createElement("div");
  div.style.cssText = "color:#dc2626;font-size:15px;line-height:1.5;white-space:pre-line;";
  div.textContent = errorMessage;
  contentArea.appendChild(div);
}
