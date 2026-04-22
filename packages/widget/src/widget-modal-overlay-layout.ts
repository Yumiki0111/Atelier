import { emitDebugLog } from "./widget-debug-log";

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

/** これ未満は常に全画面試着（スマホ） */
const DESKTOP_PANEL_MIN_WIDTH_PX = 768;

/**
 * `attachDesktopOverlayLayoutSync` は `params.desktopPanel === true` のときだけ呼ばれる。
 * - 幅が狭い → 常に全画面
 * - 幅は十分だがタッチ主体（hover も pointer もマウスっぽくない）→ iPad 等は全画面のまま
 * - 幅十分 + (`hover: hover` または `pointer: fine`) → PC 想定で右下パネル
 *
 * 以前は `!hoverNone` のみだったため、タッチ優先と報告される PC でも常に全画面になっていた。
 */
export function attachDesktopOverlayLayoutSync(overlay: HTMLElement): () => void {
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
    const wideEnough = w >= DESKTOP_PANEL_MIN_WIDTH_PX;
    const inputSuggestsMouse = hoverHover === true || pointerFine === true;
    /** オーバーレイ生成時に付与（document 検索より確実）。共有ページのホスト属性と併用 */
    const previewLinkSharePage =
      overlay.getAttribute("data-fitlook-preview-link-host") === "1" ||
      (typeof document !== "undefined" &&
        Boolean(
          document.querySelector('[data-fitlook-event-source="preview_link"]') ||
            document.querySelector('[data-atelier-event-source="preview_link"]'),
        ));
    const usePanel = wideEnough && (inputSuggestsMouse || previewLinkSharePage);
    if (usePanel) {
      overlay.setAttribute("data-fitlook-desktop-panel", "1");
    } else {
      overlay.removeAttribute("data-fitlook-desktop-panel");
    }
    // #region agent log
    emitDebugLog({
      sessionId: "673bd6",
      runId: "debug-desktop-panel",
      hypothesisId: "C",
      location: "widget-modal-overlay-layout.ts:apply",
      message: "desktop panel decision",
      data: {
        w,
        wideEnough,
        inputSuggestsMouse,
        previewLinkSharePage,
        hoverNone,
        hoverHover,
        pointerFine,
        usePanel,
        overlayAttr: overlay.getAttribute("data-fitlook-desktop-panel"),
      },
    });
    // #endregion
    if (typeof window !== "undefined") {
      (window as unknown as { __FITLOOK_DESKTOP_PANEL_LAST?: Record<string, unknown> }).__FITLOOK_DESKTOP_PANEL_LAST = {
        w,
        wideEnough,
        inputSuggestsMouse,
        previewLinkSharePage,
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
        location: "widget-modal-overlay-layout.ts:apply",
        message: "desktop panel apply",
        data: {
          runId: "post-fix-preview-link-panel",
          w,
          wideEnough,
          inputSuggestsMouse,
          previewLinkSharePage,
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

export function closeOverlay(overlay: HTMLElement): void {
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
