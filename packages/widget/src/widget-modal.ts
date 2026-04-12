import {
  interpolateAddToCartUrlTemplate,
  resolveAddToCartNavigationHref,
  weightKgFromBodyVal,
  WIDGET_DESIGN_INTERFACE_BG_DEFAULT,
  normalizeWidgetCtaAccentColor,
} from "@Atelier/shared";
import type { WidgetConfig, WidgetColorSwatch } from "./types";
import { WIDGET_LOG_PREFIX } from "./embed-data";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { sendEvent, type WidgetParams } from "./widget-api";

function widgetEventMeta(params: WidgetParams): Record<string, unknown> | undefined {
  if (!params.placement) return undefined;
  return { placement: params.placement };
}
import { mountFitLookLogoLoadingAnimation } from "./widget-fitlook-logo";

function tryNavigateAddToCart(params: WidgetParams, size: string, colorId: string): boolean {
  const template = params.addToCartUrlTemplate?.trim();
  if (!template) return false;
  const productId = String(params.externalProductId || params.productId || "");
  const interpolated = interpolateAddToCartUrlTemplate(template, {
    productId,
    size,
    colorId,
  });
  const href = resolveAddToCartNavigationHref(
    interpolated,
    typeof window !== "undefined" ? window.location.origin : null
  );
  if (!href) return false;
  try {
    window.location.assign(href);
    return true;
  } catch {
    return false;
  }
}


/** コンソール `WidgetPreviewChrome` の `PREVIEW_SURFACE_BG` と同じ（グレー帯で上下が透けないようにする） */
const SURFACE_BG = WIDGET_DESIGN_INTERFACE_BG_DEFAULT;

/** 体型スライダー初期（`weightKgFromBodyVal` と @Atelier/shared のプレビューと同じ） */
const DEFAULT_FIT_BODY_VAL = 25;

function injectStyles() {
  let s = document.getElementById("fitlook-bs-styles") as HTMLStyleElement | null;
  if (!s) {
    s = document.createElement("style");
    s.id = "fitlook-bs-styles";
    document.head.appendChild(s);
  }
  /** 初回以降も常に上書き（古い CSS が残ると PC レイアウトが効かない） */
  s.textContent = `
    @keyframes fitlook-fade-in  { from{opacity:0} to{opacity:1} }
    [data-fitlook-modal] *, [data-atelier-modal] * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    /** 試着モーダル外枠（モバイル: 全面。PC は JS が data-fitlook-desktop-panel を付与） */
    .fitlook-modal-overlay-shell {
      position: fixed !important;
      inset: 0 !important;
      z-index: 10000 !important;
      display: flex !important;
      flex-direction: column !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      background: transparent !important;
      opacity: 0;
      animation: fitlook-fade-in 0.22s ease-out forwards;
    }
    .fitlook-modal-overlay-shell[data-fitlook-desktop-panel="1"] {
      align-items: flex-end !important;
      justify-content: flex-end !important;
      padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
        max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)) !important;
      background: rgba(15, 23, 42, 0.4) !important;
      backdrop-filter: blur(2px);
    }
    /**
     * 全画面試着: 子に flex:1 を CSS で付与（mountEmbedIframe がインラインで flex:1 を付けると
     * 一部ブラウザで右下パネル用の flex:0 が負けて全画面になるため、非パネル時はここで統一する）
     */
    .fitlook-modal-overlay-shell:not([data-fitlook-desktop-panel="1"]) > [data-fitlook-content-area="true"] {
      flex: 1 1 0% !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
    }
    .fitlook-modal-overlay-shell[data-fitlook-desktop-panel="1"] > [data-fitlook-content-area="true"] {
      width: min(420px, calc(100vw - 32px)) !important;
      height: min(85vh, 760px) !important;
      max-height: min(85vh, 760px) !important;
      flex: 0 0 auto !important;
      min-height: 0 !important;
      border-radius: 16px !important;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22) !important;
      overflow: hidden !important;
    }
  `;
}

/**
 * ビューポート幅に応じて `data-fitlook-desktop-panel` を切り替え（@media だけに頼らない）。
 * 再呼び出し時は既存リスナーを外してから付け直す（iframe 差し替え後などに右下パネルが復元される）。
 */
/**
 * 右下パネル用の幅判定。`visualViewport.width` だけを使うと、環境によっては
 * `innerWidth` より小さい値になり（ズーム・ブラウザ実装差）、PC でも常に 768 未満扱いになる。
 * 以前の `matchMedia(min-width)` はレイアウト幅に近く、体感と一致しやすかった。
 */
function getDesktopPanelWidthPx(): number {
  if (typeof window === "undefined") return 0;
  const inner = window.innerWidth;
  const vvW = window.visualViewport?.width;
  const vv = vvW != null && vvW > 0 ? vvW : 0;
  return Math.max(inner, vv);
}

/**
 * `attachDesktopOverlayLayoutSync` は `params.desktopPanel === true` のときだけ呼ばれる。
 * 幅閾値や `(hover: hover)` まで要求すると環境差で常に全面のままになるため、
 * タッチ主体 UI だけ `(hover: none)` で右下パネルを付けない（iPad 等は全面試着のまま）。
 */
function attachDesktopOverlayLayoutSync(overlay: HTMLElement): () => void {
  const prevDetach = (overlay as unknown as { __fitlookDesktopDetach?: () => void }).__fitlookDesktopDetach;
  if (prevDetach) prevDetach();

  const apply = () => {
    const w = getDesktopPanelWidthPx();
    const hoverNone =
      typeof window.matchMedia === "function" ? window.matchMedia("(hover: none)").matches : false;
    const hoverHover =
      typeof window.matchMedia === "function" ? window.matchMedia("(hover: hover)").matches : null;
    const pointerFine =
      typeof window.matchMedia === "function" ? window.matchMedia("(pointer: fine)").matches : null;
    const usePanel = !hoverNone;
    if (usePanel) {
      overlay.setAttribute("data-fitlook-desktop-panel", "1");
    } else {
      overlay.removeAttribute("data-fitlook-desktop-panel");
    }
    if (typeof window !== "undefined") {
      (window as unknown as { __FITLOOK_DESKTOP_PANEL_LAST?: Record<string, unknown> }).__FITLOOK_DESKTOP_PANEL_LAST = {
        w,
        hoverNone,
        hoverHover,
        pointerFine,
        usePanel,
        overlayAttr: overlay.getAttribute("data-fitlook-desktop-panel"),
      };
    }
    // #region agent log
    fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a81229" },
      body: JSON.stringify({
        sessionId: "a81229",
        hypothesisId: "B-C-D-E",
        location: "widget-modal.ts:attachDesktopOverlayLayoutSync:apply",
        message: "desktop panel apply",
        data: {
          runId: "post-fix-hover-none-gate",
          w,
          innerWidth: typeof window !== "undefined" ? window.innerWidth : null,
          vvW: typeof window !== "undefined" ? window.visualViewport?.width ?? null : null,
          hoverNone,
          hoverHover,
          pointerFine,
          usePanel,
          overlayAttr: overlay.getAttribute("data-fitlook-desktop-panel"),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  };
  apply();
  const onResize = () => apply();
  window.addEventListener("resize", onResize);
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  if (vv) {
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
  }
  const detach = () => {
    window.removeEventListener("resize", onResize);
    if (vv) {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    }
  };
  (overlay as unknown as { __fitlookDesktopDetach?: () => void }).__fitlookDesktopDetach = detach;
  return detach;
}

function sortSizeKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function closeOverlay(overlay: HTMLElement) {
  const cleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (cleanup) cleanup.fn();
  const detachDesktop = (overlay as unknown as { __fitlookDesktopDetach?: () => void }).__fitlookDesktopDetach;
  if (detachDesktop) detachDesktop();
  (overlay as unknown as { __fitlookDesktopDetach?: () => void }).__fitlookDesktopDetach = undefined;
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

/** `/api/public/widget-fit-svg` の `fitEaseSummary` と同形 */
type WidgetFitEaseSummaryJson = {
  shoulderEaseCm: number | null;
  chestEaseCm: number | null;
  sleeveFromWristCm: number | null;
  hemFromCrotchCm: number | null;
  fitChestBandJa?: string;
  fitToneJa: string;
  linesJa: string[];
};

function fitEaseToneColors(fitToneJa: string): { bg: string; fg: string } {
  if (fitToneJa.includes("きつめ")) return { bg: "rgba(255,241,242,0.96)", fg: "#9f1239" };
  if (fitToneJa.includes("ゆったり")) return { bg: "rgba(240,249,255,0.96)", fg: "#0c4a6e" };
  if (fitToneJa.includes("バランス良")) return { bg: "rgba(236,253,245,0.96)", fg: "#065f46" };
  if (fitToneJa.includes("短め")) return { bg: "rgba(255,251,235,0.96)", fg: "#92400e" };
  if (fitToneJa.includes("長め")) return { bg: "rgba(238,242,255,0.96)", fg: "#312e81" };
  return { bg: "rgba(241,245,249,0.96)", fg: "#1e293b" };
}

function fitChestBandColors(band: string): { bg: string; fg: string } {
  if (band === "小さめなサイズ") return { bg: "rgba(255,241,242,0.96)", fg: "#9f1239" };
  if (band === "おすすめのサイズ") return { bg: "rgba(236,253,245,0.96)", fg: "#065f46" };
  if (band === "大きめなサイズ") return { bg: "rgba(240,249,255,0.96)", fg: "#0c4a6e" };
  return { bg: "rgba(241,245,249,0.96)", fg: "#1e293b" };
}

function appendWidgetFitEaseSummary(parent: HTMLElement, summary: WidgetFitEaseSummaryJson | undefined): void {
  if (!summary) return;
  const band = (summary.fitChestBandJa || "").trim();
  const tone = (summary.fitToneJa || "").trim();
  const lines = (summary.linesJa || []).map((l) => String(l).trim()).filter((l) => l.length > 0);
  if (!band && !tone && lines.length === 0) return;

  const wrap = el(
    "div",
    "width:100%;max-width:280px;padding:0 4px 2px;text-align:center;box-sizing:border-box;"
  );
  wrap.setAttribute("data-fitlook-fit-ease-summary", "true");

  if (band) {
    const { bg, fg } = fitChestBandColors(band);
    const bandBadge = el(
      "div",
      `display:inline-block;margin:0 auto 8px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:800;line-height:1.35;letter-spacing:0.02em;background:${bg};color:${fg};`
    );
    bandBadge.textContent = band;
    wrap.appendChild(bandBadge);
  }

  if (tone) {
    const { bg, fg } = fitEaseToneColors(tone);
    const badge = el(
      "div",
      `display:inline-block;margin:0 auto 6px;padding:8px 12px;border-radius:8px;font-size:11px;font-weight:700;line-height:1.35;letter-spacing:0.02em;background:${bg};color:${fg};`
    );
    badge.textContent = tone;
    wrap.appendChild(badge);
  }

  if (lines.length > 0) {
    const list = el("div", "text-align:left;font-size:10px;line-height:1.45;color:#334155;");
    for (const line of lines) {
      const row = el("div", "padding:1px 0 1px 10px;text-indent:-10px;");
      row.textContent = `・${line}`;
      list.appendChild(row);
    }
    wrap.appendChild(list);
  }

  parent.appendChild(wrap);
}

type WidgetFitEaseDiagramOp =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; dash?: string }
  | { kind: "filledPoly"; points: string; fill: string }
  | { kind: "openPolyline"; points: string; stroke: string; strokeWidth: number; dash?: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx: number; fill: string; stroke: string; strokeWidth: number }
  | {
      kind: "text";
      x: number;
      y: number;
      fontSize: number;
      fill: string;
      textAnchor: "middle" | "start" | "end";
      content: string;
    }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string; stroke?: string; strokeWidth?: number; dash?: string };

type WidgetFitEaseDiagramJson = {
  viewBoxWidth: number;
  viewBoxHeight: number;
  ops: WidgetFitEaseDiagramOp[];
};

const SVG_NS = "http://www.w3.org/2000/svg";

function appendFitEaseDiagramToSvg(svg: SVGSVGElement, diagram: WidgetFitEaseDiagramJson): void {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-fitlook-ease-diagram", "true");
  g.setAttribute("pointer-events", "none");
  for (const op of diagram.ops) {
    if (op.kind === "line") {
      const ln = document.createElementNS(SVG_NS, "line");
      ln.setAttribute("x1", String(op.x1));
      ln.setAttribute("y1", String(op.y1));
      ln.setAttribute("x2", String(op.x2));
      ln.setAttribute("y2", String(op.y2));
      ln.setAttribute("stroke", op.stroke);
      ln.setAttribute("stroke-width", String(op.strokeWidth));
      if (op.dash) ln.setAttribute("stroke-dasharray", op.dash);
      g.appendChild(ln);
    } else if (op.kind === "filledPoly") {
      const poly = document.createElementNS(SVG_NS, "polygon");
      poly.setAttribute("points", op.points);
      poly.setAttribute("fill", op.fill);
      g.appendChild(poly);
    } else if (op.kind === "openPolyline") {
      const poly = document.createElementNS(SVG_NS, "polyline");
      poly.setAttribute("points", op.points);
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", op.stroke);
      poly.setAttribute("stroke-width", String(op.strokeWidth));
      if (op.dash) poly.setAttribute("stroke-dasharray", op.dash);
      poly.setAttribute("stroke-linejoin", "round");
      poly.setAttribute("stroke-linecap", "round");
      g.appendChild(poly);
    } else if (op.kind === "rect") {
      const r = document.createElementNS(SVG_NS, "rect");
      r.setAttribute("x", String(op.x));
      r.setAttribute("y", String(op.y));
      r.setAttribute("width", String(op.w));
      r.setAttribute("height", String(op.h));
      r.setAttribute("rx", String(op.rx));
      r.setAttribute("fill", op.fill);
      r.setAttribute("stroke", op.stroke);
      r.setAttribute("stroke-width", String(op.strokeWidth));
      g.appendChild(r);
    } else if (op.kind === "text") {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", String(op.x));
      t.setAttribute("y", String(op.y));
      t.setAttribute("font-size", String(op.fontSize));
      t.setAttribute("fill", op.fill);
      t.setAttribute("text-anchor", op.textAnchor);
      t.setAttribute("font-family", 'system-ui, -apple-system, "Segoe UI", sans-serif');
      t.setAttribute("font-weight", "700");
      t.setAttribute("dominant-baseline", "middle");
      t.textContent = op.content;
      g.appendChild(t);
    } else if (op.kind === "circle") {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", String(op.cx));
      c.setAttribute("cy", String(op.cy));
      c.setAttribute("r", String(op.r));
      c.setAttribute("fill", op.fill);
      if (op.stroke != null && op.stroke.length > 0) c.setAttribute("stroke", op.stroke);
      if (op.strokeWidth != null && op.strokeWidth > 0) c.setAttribute("stroke-width", String(op.strokeWidth));
      if (op.dash) c.setAttribute("stroke-dasharray", op.dash);
      g.appendChild(c);
    }
  }
  svg.appendChild(g);
}

/** 図解ありのときは総評のみ（胸バンド・箇条書きは図内に集約） */
function appendFitEaseFootnote(parent: HTMLElement, summary: WidgetFitEaseSummaryJson | undefined): void {
  const band = (summary?.fitChestBandJa || "").trim();
  const tone = (summary?.fitToneJa || "").trim();
  if (!band && !tone) return;
  const wrap = el(
    "div",
    "width:100%;max-width:280px;padding:2px 6px 0;text-align:center;box-sizing:border-box;"
  );
  wrap.setAttribute("data-fitlook-fit-ease-footnote", "true");
  if (band) {
    const bc = fitChestBandColors(band);
    const bandBadge = el(
      "div",
      `display:inline-block;margin:0 auto 4px;padding:5px 9px;border-radius:6px;font-size:8px;font-weight:700;line-height:1.3;letter-spacing:0.01em;background:${bc.bg};color:${bc.fg};`
    );
    bandBadge.textContent = band;
    wrap.appendChild(bandBadge);
  }
  if (tone) {
    const { bg, fg } = fitEaseToneColors(tone);
    const badge = el(
      "div",
      `display:inline-block;margin:0 auto;padding:5px 9px;border-radius:6px;font-size:8px;font-weight:600;line-height:1.3;letter-spacing:0.01em;background:${bg};color:${fg};`
    );
    badge.textContent = tone;
    wrap.appendChild(badge);
  }
  parent.appendChild(wrap);
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
  overlay.className = "fitlook-modal-overlay-shell";

  const contentArea = document.createElement("div");
  contentArea.setAttribute("data-fitlook-content-area", "true");
  /** 上下インセットの大きい方で揃え、ノッチ下で「中央より下」に見えるのを防ぐ */
  const safeBlockPad = "max(8px, env(safe-area-inset-top), env(safe-area-inset-bottom))";
  contentArea.style.cssText =
    "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:visible;padding:" +
    safeBlockPad +
    " 12px " +
    safeBlockPad +
    ";box-sizing:border-box;background:" +
    SURFACE_BG +
    ";";

  const splashWrap = document.createElement("div");
  /** `public/icon/logo.html` と同様にビューポート中央のみ。過大な padding はロゴ下に空域ができ「二重の表示」に見えるため付けない */
  splashWrap.style.cssText =
    "flex:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;overflow:hidden;box-sizing:border-box;" +
    "padding:0 12px;background:" +
    SURFACE_BG +
    ";";
  const cancelSplash = mountFitLookLogoLoadingAnimation(splashWrap);
  contentArea.appendChild(splashWrap);

  overlay.appendChild(contentArea);
  document.body.appendChild(overlay);

  if (_params.desktopPanel === true) {
    attachDesktopOverlayLayoutSync(overlay);
  }

  // #region agent log
  fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a81229" },
    body: JSON.stringify({
      sessionId: "a81229",
      hypothesisId: "A",
      location: "widget-modal.ts:renderModalWithLoading:afterAttach",
      message: "loading overlay desktopPanel",
      data: { desktopPanelIsTrue: _params.desktopPanel === true, calledAttach: _params.desktopPanel === true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const cleanup = { fn: cancelSplash };
  (overlay as unknown as { __fitlookCleanup: typeof cleanup }).__fitlookCleanup = cleanup;

  return { overlay, contentArea };
}

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
  injectStyles();

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
    `flex:1;min-height:120px;min-width:0;flex-basis:0;position:relative;background:${canvasBg};display:flex;align-items:center;justify-content:center;overflow:visible;padding:8px;box-sizing:border-box;`
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
    const gGarment = svg.querySelector("[data-fitlook-fit-garment]");
    const diag = svg.querySelector("[data-fitlook-ease-diagram]");
    const fadeBodyMs = "0.42s";
    const instantDiagram = opts.instantDiagram === true;

    if (gBody instanceof SVGGElement) {
      gBody.style.opacity = "0";
      gBody.style.transition = `opacity ${fadeBodyMs} ease-out`;
    }
    if (!opts.bodyOnly && gGarment instanceof SVGGElement) {
      gGarment.style.opacity = "0";
      gGarment.style.transition = `opacity ${fadeBodyMs} ease-out`;
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
        if (!opts.bodyOnly && gGarment instanceof SVGGElement) gGarment.style.opacity = "1";
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
        viewBoxWidth: number;
        viewBoxHeight: number;
        bodyPaths: string[];
        garmentPaths: string[];
        garmentPathStrokeDasharrays?: (string | undefined)[];
        garmentPathStrokeWidths?: (number | undefined)[];
        garmentPathStrokes?: (string | undefined)[];
        fitEaseSummary?: WidgetFitEaseSummaryJson;
        fitEaseDiagram?: WidgetFitEaseDiagramJson | null;
      };
      if (stale()) return;
      target.innerHTML = "";
      const column = el(
        "div",
        "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;max-width:100%;max-height:100%;min-height:0;"
      );
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${data.viewBoxWidth} ${data.viewBoxHeight}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.cssText =
        "width:100%;max-width:100%;height:auto;max-height:100%;display:block;margin:0 auto;";
      const gBody = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gBody.setAttribute("data-fitlook-fit-body", "true");
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
        gGarment.setAttribute("data-fitlook-fit-garment", "true");
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

/**
 * コンソールの `WidgetStyleProductPreview` と同一 UI（`/embed/widget-fit`）を全画面 iframe で表示。
 * `garmentFitAvailable` のときのみ使用（クライアント試着パイプライン＝プレビューと同じ）。
 */
export function mountEmbedIframe(
  overlay: HTMLElement,
  contentArea: HTMLElement,
  params: WidgetParams,
  reopenHandler?: () => void,
  options?: { surfaceBackgroundColor?: string }
): void {
  const surfaceBg = options?.surfaceBackgroundColor?.trim() || "#fafafa";
  injectStyles();
  const splashCleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  if (splashCleanup?.fn) splashCleanup.fn();

  // #region agent log
  fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a81229" },
    body: JSON.stringify({
      sessionId: "a81229",
      hypothesisId: "A",
      location: "widget-modal.ts:mountEmbedIframe:entry",
      message: "mountEmbedIframe desktopPanel branch",
      data: { desktopPanelIsTrue: params.desktopPanel === true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (params.desktopPanel === true) {
    attachDesktopOverlayLayoutSync(overlay);
  }

  contentArea.innerHTML = "";
  /**
   * `data-fitlook-desktop-panel="1"` のときはインラインで flex:1 を付けない（付けると列フレックスで子が伸び切り全画面になる）。
   * 幅・パネル化は injectStyles の !important に任せる。
   */
  if (params.desktopPanel === true) {
    contentArea.style.cssText =
      "box-sizing:border-box;display:block;position:relative;padding:0;margin:0;overflow:hidden;background:" +
      surfaceBg +
      ";min-height:0;";
  } else {
    contentArea.style.cssText =
      "flex:1;min-height:0;position:relative;width:100%;height:100%;padding:0;margin:0;overflow:hidden;background:" +
      surfaceBg +
      ";";
  }

  const apiBase = getApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const pk = encodeURIComponent(params.publicKey || "");
  const ext = encodeURIComponent(params.externalProductId || params.productId || "");
  const iframe = document.createElement("iframe");
  let iframeSrc = `${apiBase}/embed/widget-fit?publicKey=${pk}&externalProductId=${ext}`;
  const cartTpl = params.addToCartUrlTemplate?.trim();
  if (cartTpl) {
    iframeSrc += `&addToCartUrl=${encodeURIComponent(cartTpl)}`;
  }
  iframe.src = iframeSrc;
  iframe.setAttribute("title", "FIT&LOOK 試着");
  iframe.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%;border:none;display:block;";
  contentArea.style.position = "relative";
  contentArea.appendChild(iframe);

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type !== "fitlook-embed-close") return;
    window.removeEventListener("message", onMsg);
    closeOverlay(overlay);
    if (reopenHandler) {
      queueMicrotask(reopenHandler);
    }
  };
  window.addEventListener("message", onMsg);

  (overlay as unknown as { __fitlookCleanup: { fn: () => void } }).__fitlookCleanup = {
    fn: () => {
      window.removeEventListener("message", onMsg);
    },
  };

  if (params.desktopPanel === true) {
    requestAnimationFrame(() => attachDesktopOverlayLayoutSync(overlay));
  }
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
  const div = document.createElement("div");
  div.style.cssText = "color:#dc2626;font-size:15px;line-height:1.5;white-space:pre-line;";
  div.textContent = errorMessage;
  contentArea.appendChild(div);
}
