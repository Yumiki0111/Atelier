import type { WidgetConfig, WidgetColorSwatch } from "./types";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { sendEvent, type WidgetParams } from "./widget-api";

const ACCENT_DEFAULT = "#3d3835";

/** 開発ページのデフォルト体重 60kg と揃える（`weightKgFromBodyVal`: 50 + (v/100)*40） */
const DEFAULT_FIT_BODY_VAL = 25;
const DEFAULT_SWATCHES: WidgetColorSwatch[] = [
  { id: "default-1", hex: "#e8c547", label: "Yellow" },
  { id: "default-2", hex: "#d4d4d4", label: "Grey" },
  { id: "default-3", hex: "#1a1a1a", label: "Black" },
];

function injectStyles() {
  if (document.getElementById("atelier-bs-styles")) return;
  const s = document.createElement("style");
  s.id = "atelier-bs-styles";
  s.textContent = `
    @keyframes atelier-fade-in  { from{opacity:0} to{opacity:1} }
    @keyframes atelier-spin     { to{transform:rotate(360deg)} }
    [data-atelier-modal] * {
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
  const cleanup = (overlay as unknown as { __atelierCleanup?: { fn: () => void } }).__atelierCleanup;
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

/** 正面シルエット（線画） */
function createBodySilhouetteSvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 120 260");
  svg.setAttribute("fill", "none");
  svg.style.cssText = "width:100%;height:100%;max-height:min(85%, 320px);opacity:0.85;";
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M60 22c9 0 16-7 16-16S69 0 60 0s-16 7-16 16 7 16 16 16zm0 18c-12 0-22 8-24 19l-4 22 8 2 6-14 2 48-8 52 10 2 10-38 10 38 10-2-8-52 2-48 6 14 8-2-4-22c-2-11-12-19-24-19z"
  );
  path.setAttribute("stroke", "#c8c8c8");
  path.setAttribute("stroke-width", "1.4");
  svg.appendChild(path);
  return svg;
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

  const existingOverlays = document.querySelectorAll<HTMLElement>("[data-atelier-modal-overlay='true']");
  existingOverlays.forEach((el) => {
    if (el.style.opacity === "0" || parseFloat(el.style.opacity) < 0.1) {
      el.remove();
    }
  });

  const overlay = document.createElement("div");
  overlay.setAttribute("data-atelier-modal", "true");
  overlay.setAttribute("data-atelier-modal-overlay", "true");
  overlay.style.cssText = `
    position: fixed !important; inset: 0 !important;
    background: #ececec !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    opacity: 0; animation: atelier-fade-in 0.22s ease-out forwards;
  `;

  const contentArea = document.createElement("div");
  contentArea.setAttribute("data-atelier-content-area", "true");
  contentArea.style.cssText =
    "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;background:#ececec;";

  const spinWrap = document.createElement("div");
  spinWrap.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;width:100%;";
  const spin = document.createElement("img");
  spin.src = `${getApiBaseUrl()}/logo.png`;
  spin.alt = "";
  spin.style.cssText = "width:56px;height:56px;object-fit:contain;animation:atelier-spin 2s linear infinite;";
  spinWrap.appendChild(spin);
  contentArea.appendChild(spinWrap);

  overlay.appendChild(contentArea);
  document.body.appendChild(overlay);

  const cleanup = { fn: (): void => {} };
  (overlay as unknown as { __atelierCleanup: typeof cleanup }).__atelierCleanup = cleanup;

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

  contentArea.innerHTML = "";
  contentArea.style.cssText =
    "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;background:#ececec;padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;";

  const ui = config.design;
  const interfaceBg = ui?.interfaceBackgroundColor ?? "#fafafa";
  const canvasBg = ui?.canvasBackgroundColor ?? "#fafafa";
  const ctaCart = ui?.ctaCartLabel ?? "カートに追加";
  const ctaTryOn = ui?.ctaTryOnLabel ?? "この体型で試着する";
  const accent = ui?.ctaAccentColor ?? ACCENT_DEFAULT;

  /** コンソール `PreviewPanel` と同様: 端末枠内に試着 UI のみ（全画面ではなく電話サイズ） */
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

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const eshopId = params.shopId || undefined;
  if (eshopId && eshopId !== "unknown") {
    const pid = params.productId || params.externalProductId || "";
    sendEvent({
      shopId: eshopId,
      productId: uuidRe.test(pid) ? pid : undefined,
      type: "widget_open",
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
  let currentSize = asset?.defaultSize && sizeKeys.includes(asset.defaultSize) ? asset.defaultSize : sizeKeys[0];

  const swatches = garmentFitAvailable
    ? []
    : asset?.colors?.length
      ? asset.colors
      : DEFAULT_SWATCHES;
  let selectedColorId = swatches[0]?.id || "";
  let garmentImg: HTMLImageElement | null = null;

  let fitHeightCm = 170;
  let fitBodyVal = DEFAULT_FIT_BODY_VAL;

  function weightKgFromBodyVal(v: number): number {
    return Math.round(50 + (v / 100) * 40);
  }

  const cleanup = (overlay as unknown as { __atelierCleanup?: { fn: () => void } }).__atelierCleanup;
  if (cleanup) {
    cleanup.fn = () => {};
  }

  // ── 戻る
  const backRow = el("div", "padding:10px 14px 4px;padding-top:max(10px, env(safe-area-inset-top));");
  const backBtn = el(
    "button",
    "border:none;background:transparent;padding:6px 0;font-size:15px;color:#111;cursor:pointer;display:flex;align-items:center;gap:4px;"
  );
  backBtn.textContent = "← 閉じる";
  backBtn.addEventListener("click", () => closeOverlay(overlay));
  backRow.appendChild(backBtn);
  phoneScreen.appendChild(backRow);

  // ── 商品行（左: サムネ・名前・価格 / 右: 体型）
  const productRow = el("div", "display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;padding:2px 12px 8px;gap:6px;");
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
  phoneScreen.appendChild(productRow);

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
    phoneScreen.appendChild(colorRow);
  }

  // ── 試着表示（開発と同じ計算の SVG）または従来のシルエット＋サムネ
  const viewerArea = el(
    "div",
    `flex:1;min-height:120px;min-width:0;flex-basis:0;position:relative;background:${canvasBg};display:flex;align-items:center;justify-content:center;overflow:visible;padding:8px 12px 8px;box-sizing:border-box;`
  );
  viewerArea.setAttribute("data-atelier-viewer-container", "true");

  async function loadGarmentFitSvgInto(
    target: HTMLElement,
    heightCm: number,
    bodyVal: number,
    options?: { bodyOnly?: boolean }
  ): Promise<void> {
    const bodyOnly = options?.bodyOnly === true;
    if (!garmentFitAvailable || !params.publicKey) return;
    const ext = params.externalProductId || params.productId;
    if (!ext) return;
    target.innerHTML = "";
    const loading = el("div", "padding:24px;color:#6b7280;font-size:14px;text-align:center;");
    loading.textContent = "読み込み中...";
    target.appendChild(loading);
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
      target.innerHTML = "";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${data.viewBoxWidth} ${data.viewBoxHeight}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.cssText = "width:100%;height:auto;max-height:100%;display:block;";
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
      target.appendChild(svg);
    } catch {
      target.innerHTML = "";
      const err = el("div", "padding:16px;color:#b91c1c;font-size:13px;text-align:center;");
      err.textContent = "試着表示の読み込みに失敗しました";
      target.appendChild(err);
    }
  }

  async function loadGarmentFitSvg(): Promise<void> {
    return loadGarmentFitSvgInto(viewerArea, fitHeightCm, fitBodyVal);
  }

  if (garmentFitAvailable) {
    void loadGarmentFitSvg();
  } else {
    const silhouetteLayer = el(
      "div",
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;"
    );
    silhouetteLayer.appendChild(createBodySilhouetteSvg());
    viewerArea.appendChild(silhouetteLayer);

    if (thumbnailUrl) {
      garmentImg = document.createElement("img");
      garmentImg.src = thumbnailUrl;
      garmentImg.alt = "";
      const firstHex = swatches[0]?.hex || "#e8c547";
      garmentImg.style.cssText = `position:relative;z-index:1;max-width:58%;max-height:62%;object-fit:contain;filter:${colorFilterForHex(
        swatches.find((s) => s.id === selectedColorId)?.hex || firstHex
      )};`;
      viewerArea.appendChild(garmentImg);
    }
  }
  phoneScreen.appendChild(viewerArea);

  // ── サイズ（グレーディング）
  const WINDOW = 3;
  const idxSize = sizeKeys.indexOf(currentSize);
  let windowStart =
    idxSize >= 0
      ? Math.min(Math.max(0, idxSize), Math.max(0, sizeKeys.length - WINDOW))
      : 0;

  const sizeSection = el("div", "padding:8px 12px 6px;display:flex;flex-direction:column;gap:6px;");
  const sizeRow = el("div", "display:flex;flex-direction:row;align-items:center;justify-content:center;gap:6px;");

  const prevBtn = el(
    "button",
    "width:28px;height:28px;border:none;background:transparent;font-size:17px;color:#111;cursor:pointer;line-height:1;"
  );
  prevBtn.textContent = "‹";
  const nextBtn = el(
    "button",
    "width:28px;height:28px;border:none;background:transparent;font-size:17px;color:#111;cursor:pointer;line-height:1;"
  );
  nextBtn.textContent = "›";

  const sizeBtnsWrap = el("div", "display:flex;flex-direction:row;gap:6px;align-items:center;justify-content:center;");

  function renderSizeButtons() {
    sizeBtnsWrap.innerHTML = "";
    const slice = sizeKeys.slice(windowStart, windowStart + WINDOW);
    slice.forEach((sz) => {
      const isSel = sz === currentSize;
      const btn = el(
        "button",
        `width:34px;height:34px;border-radius:50%;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;` +
          (isSel
            ? `background:${accent};color:#fff;border:none;`
            : `background:#fff;color:#111;border:1px solid #111;`)
      );
      btn.textContent = sz;
      btn.addEventListener("click", () => {
        currentSize = sz;
        if (eshopId && eshopId !== "unknown") {
          const pid = params.productId || params.externalProductId || "";
          sendEvent({
            shopId: eshopId,
            productId: uuidRe.test(pid) ? pid : undefined,
            type: "size_change",
            meta: { size: sz },
          }).catch(() => {});
        }
        renderSizeButtons();
        if (garmentFitAvailable) {
          void loadGarmentFitSvg();
        }
      });
      sizeBtnsWrap.appendChild(btn);
    });
    prevBtn.style.opacity = windowStart <= 0 ? "0.35" : "1";
    prevBtn.style.pointerEvents = windowStart <= 0 ? "none" : "auto";
    nextBtn.style.opacity = windowStart + WINDOW >= sizeKeys.length ? "0.35" : "1";
    nextBtn.style.pointerEvents = windowStart + WINDOW >= sizeKeys.length ? "none" : "auto";
  }

  prevBtn.addEventListener("click", () => {
    windowStart = Math.max(0, windowStart - 1);
    renderSizeButtons();
  });
  nextBtn.addEventListener("click", () => {
    windowStart = Math.min(sizeKeys.length - WINDOW, windowStart + 1);
    renderSizeButtons();
  });

  sizeRow.appendChild(prevBtn);
  sizeRow.appendChild(sizeBtnsWrap);
  sizeRow.appendChild(nextBtn);
  sizeSection.appendChild(sizeRow);
  phoneScreen.appendChild(sizeSection);
  renderSizeButtons();

  // ── カート
  const cartWrap = el(
    "div",
    "padding:8px 12px 12px;padding-bottom:max(12px, env(safe-area-inset-bottom));flex-shrink:0;"
  );
  const cartBtn = el(
    "button",
    `width:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:10px 14px;border:none;border-radius:10px;background:${accent};color:#fff;font-size:13px;font-weight:700;cursor:pointer;`
  );
  const cartLeft = el("div", "display:flex;align-items:center;gap:8px;");
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
      const pid = params.productId || params.externalProductId || "";
      sendEvent({
        shopId: eshopId,
        productId: uuidRe.test(pid) ? pid : undefined,
        type: "add_to_cart",
        meta: { size: currentSize, colorId: selectedColorId },
      }).catch(() => {});
    }
    try {
      window.dispatchEvent(
        new CustomEvent("atelier:add-to-cart", {
          detail: { size: currentSize, colorId: selectedColorId, productId: params.externalProductId || params.productId },
        })
      );
    } catch {
      /* ignore */
    }
  });
  cartWrap.appendChild(cartBtn);
  phoneScreen.appendChild(cartWrap);

  // ── 体型調整（端末枠 phoneScreen 内の全画面。試着ビューと同じ SVG／シルエット＋サムネを表示）
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
        ";border-radius:34px;overflow:hidden;animation:atelier-fade-in 0.2s ease-out;"
    );
    bodyAdjustOverlay.setAttribute("data-atelier-body-adjust", "true");

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
        void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, { bodyOnly: true });
      }, 140);
    }

    if (garmentFitAvailable) {
      void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, { bodyOnly: true });
    } else {
      const silhouetteLayer = el(
        "div",
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;"
      );
      silhouetteLayer.appendChild(createBodySilhouetteSvg());
      figureArea.appendChild(silhouetteLayer);
    }
    bodyAdjustOverlay.appendChild(figureArea);

    const controls = el(
      "div",
      "flex-shrink:0;padding:0 18px 10px;display:flex;flex-direction:column;gap:14px;background:" +
        interfaceBg +
        ";"
    );

    const hRow = el("div", "width:100%;");
    const hLabel = el("div", "display:flex;justify-content:space-between;align-items:center;font-size:15px;margin-bottom:8px;color:#111;");
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
    const bLabel = el("div", "display:flex;justify-content:space-between;align-items:center;font-size:15px;margin-bottom:8px;color:#111;");
    const bTitle = el("span", "", "体型");
    const bVal = el("span", "", String(fitBodyVal));
    bLabel.appendChild(bTitle);
    bLabel.appendChild(bVal);
    const bInput = document.createElement("input");
    bInput.type = "range";
    bInput.min = "0";
    bInput.max = "100";
    bInput.value = String(fitBodyVal);
    bInput.style.cssText = "width:100%;height:28px;accent-color:" + accent + ";";
    bInput.addEventListener("input", () => {
      bodyVal = parseInt(bInput.value, 10) || 0;
      bVal.textContent = String(bodyVal);
      scheduleBodyDraftPreview();
    });
    bRow.appendChild(bLabel);
    bRow.appendChild(bInput);
    controls.appendChild(bRow);

    bodyAdjustOverlay.appendChild(controls);

    const ctaPad =
      "padding:12px 18px;padding-bottom:max(14px, env(safe-area-inset-bottom));flex-shrink:0;background:" +
      interfaceBg +
      ";";
    const ctaWrap = el("div", ctaPad);
    const applyBtn = el(
      "button",
      `width:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:14px 16px;border:none;border-radius:12px;background:${accent};color:#fff;font-size:15px;font-weight:700;cursor:pointer;`
    );
    applyBtn.type = "button";
    const applyMid = el("span", "flex:1;text-align:center;");
    applyMid.textContent = ctaTryOn;
    const applyRight = el(
      "div",
      "width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;"
    );
    applyRight.textContent = "→";
    applyBtn.appendChild(applyMid);
    applyBtn.appendChild(applyRight);
    applyBtn.addEventListener("click", () => {
      fitHeightCm = setupHeight;
      fitBodyVal = bodyVal;
      if (garmentFitAvailable) {
        void loadGarmentFitSvg();
      }
      closeBodyAdjustOverlay();
    });
    ctaWrap.appendChild(applyBtn);
    bodyAdjustOverlay.appendChild(ctaWrap);

    phoneScreen.appendChild(bodyAdjustOverlay);
  }

  bodyBtn.addEventListener("click", openBodySheet);

  if (isDevelopmentMode()) {
    console.log("[Atelier Widget] 2D view ready", { productName, sizes: sizeKeys });
  }
}

export function showErrorInModal(
  _shadowRoot: ShadowRoot,
  errorMessage: string,
  overlay: HTMLElement,
  contentArea: HTMLElement
) {
  if (!overlay || !contentArea) return;
  contentArea.innerHTML = "";
  contentArea.style.cssText = `
    flex: 1; display: flex; flex-direction: column;
    overflow: hidden; align-items: center; justify-content: center;
    padding: 24px; text-align: center; background: #ececec;
    padding-top: max(24px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  `;
  const div = document.createElement("div");
  div.style.cssText = "color:#dc2626;font-size:15px;line-height:1.5;white-space:pre-line;";
  div.textContent = errorMessage;
  contentArea.appendChild(div);
}
