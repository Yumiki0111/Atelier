import type { WidgetParams } from "./widget-api";
import { getApiBaseUrl } from "./widget-utils";
import { emitDebugLog } from "./widget-debug-log";
import { mountFitLookLogoLoadingAnimation } from "./widget-fitlook-logo";
import { injectModalBaseStyles } from "./widget-modal-styles";
import { SURFACE_BG } from "./widget-modal-constants";
import { attachDesktopOverlayLayoutSync, closeOverlay } from "./widget-modal-overlay-layout";

export { updateModalWithConfig } from "./widget-modal-update-config";

export function renderModalWithLoading(
  _shadowRoot: ShadowRoot,
  _params: WidgetParams,
): { overlay: HTMLElement; contentArea: HTMLElement } {
  injectModalBaseStyles();

  const existingOverlays = document.querySelectorAll<HTMLElement>(
    "[data-fitlook-modal-overlay='true'], [data-atelier-modal-overlay='true']",
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
  if (_params.eventSource === "preview_link") {
    overlay.setAttribute("data-fitlook-preview-link-host", "1");
  }

  const contentArea = document.createElement("div");
  contentArea.setAttribute("data-fitlook-content-area", "true");
  /** 上下インセットの大きい方で揃え、ノッチ下で「中央より下」に見えるのを防ぐ */
  const safeBlockPad = "max(8px, env(safe-area-inset-top), env(safe-area-inset-bottom))";
  contentArea.style.cssText =
    "position:relative;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:visible;padding:" +
    safeBlockPad +
    " 12px " +
    safeBlockPad +
    ";box-sizing:border-box;background:" +
    SURFACE_BG +
    ";";

  const splashWrap = document.createElement("div");
  splashWrap.setAttribute("data-fitlook-splash-wrap", "true");
  /** 試着 iframe を下層に差し込むため全面オーバーレイ（`appendEmbedIframeBehindSplash` と併用） */
  splashWrap.style.cssText =
    "position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;overflow:hidden;box-sizing:border-box;" +
    "padding:0 12px;background:" +
    SURFACE_BG +
    ";pointer-events:auto;";
  const cancelSplash = mountFitLookLogoLoadingAnimation(splashWrap);
  contentArea.appendChild(splashWrap);

  overlay.appendChild(contentArea);
  document.body.appendChild(overlay);

  if (_params.desktopPanel === true) {
    attachDesktopOverlayLayoutSync(overlay);
  }

  // #region agent log
  emitDebugLog({
    sessionId: "673bd6",
    runId: "debug-desktop-panel",
    hypothesisId: "B",
    location: "widget-modal.ts:renderModalWithLoading",
    message: "modal loading attach branch",
    data: {
      desktopPanelIsTrue: _params.desktopPanel === true,
      calledAttach: _params.desktopPanel === true,
      overlayAttrAfter: overlay.getAttribute("data-fitlook-desktop-panel"),
    },
  });
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

/** 親のスプラッシュ終了後に iframe 内へ送り、試着の段階フェード（図解・脚注）を開始する */
export const FITLOOK_SPLASH_FINISHED_MESSAGE = "fitlook-splash-finished";

/**
 * スプラッシュ表示中に試着 iframe を下層へ差し込む（上層は `data-fitlook-splash-wrap`）。
 * 呼び出し側でスプラッシュ除去後に `postMessage({ type: FITLOOK_SPLASH_FINISHED_MESSAGE })` すること。
 */
export function appendEmbedIframeBehindSplash(
  overlay: HTMLElement,
  contentArea: HTMLElement,
  params: WidgetParams,
  reopenHandler?: () => void,
  options?: { surfaceBackgroundColor?: string },
): HTMLIFrameElement {
  const surfaceBg = options?.surfaceBackgroundColor?.trim() || "#fafafa";
  injectModalBaseStyles();

  const prevCleanup = (overlay as unknown as { __fitlookCleanup?: { fn: () => void } }).__fitlookCleanup;
  const apiBase = getApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const pk = encodeURIComponent(params.publicKey || "");
  const ext = encodeURIComponent(params.externalProductId || params.productId || "");
  const iframe = document.createElement("iframe");
  let iframeSrc = `${apiBase}/embed/widget-fit?publicKey=${pk}&externalProductId=${ext}&deferStagedReveal=1`;
  const cartTpl = params.addToCartUrlTemplate?.trim();
  if (cartTpl) {
    iframeSrc += `&addToCartUrl=${encodeURIComponent(cartTpl)}`;
  }
  if (params.eventSource) {
    iframeSrc += `&eventSource=${encodeURIComponent(params.eventSource)}`;
  }
  iframe.src = iframeSrc;
  iframe.setAttribute("title", "FIT&LOOK 試着");
  iframe.setAttribute("data-fitlook-widget-fit-iframe", "true");
  iframe.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%;border:none;display:block;z-index:1;";

  if (params.desktopPanel === true) {
    contentArea.style.cssText =
      "box-sizing:border-box;display:block;position:relative;padding:0;margin:0;overflow:hidden;background:" +
      surfaceBg +
      ";min-height:0;";
  } else {
    contentArea.style.position = "relative";
    contentArea.style.backgroundColor = surfaceBg;
  }

  const splashWrap = contentArea.querySelector("[data-fitlook-splash-wrap]");
  if (splashWrap) {
    contentArea.insertBefore(iframe, splashWrap);
  } else {
    contentArea.insertBefore(iframe, contentArea.firstChild);
  }

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
      prevCleanup?.fn?.();
      window.removeEventListener("message", onMsg);
    },
  };

  if (params.desktopPanel === true) {
    requestAnimationFrame(() => attachDesktopOverlayLayoutSync(overlay));
  }

  // #region agent log
  emitDebugLog({
    sessionId: "673bd6",
    runId: "debug-desktop-panel",
    hypothesisId: "E",
    location: "widget-modal.ts:appendEmbedIframeBehindSplash:end",
    message: "embed iframe branch",
    data: {
      desktopPanel: params.desktopPanel === true,
      scheduledRafAttach: params.desktopPanel === true,
      overlayAttr: overlay.getAttribute("data-fitlook-desktop-panel"),
    },
  });
  // #endregion

  return iframe;
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
  options?: { surfaceBackgroundColor?: string },
): void {
  const surfaceBg = options?.surfaceBackgroundColor?.trim() || "#fafafa";
  injectModalBaseStyles();
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
  if (params.eventSource) {
    iframeSrc += `&eventSource=${encodeURIComponent(params.eventSource)}`;
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
  contentArea: HTMLElement,
): void {
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
