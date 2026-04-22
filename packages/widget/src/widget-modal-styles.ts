/** 初回以降も常に上書き（古い CSS が残ると PC レイアウトが効かない） */
export function injectModalBaseStyles(): void {
  let s = document.getElementById("fitlook-bs-styles") as HTMLStyleElement | null;
  if (!s) {
    s = document.createElement("style");
    s.id = "fitlook-bs-styles";
    document.head.appendChild(s);
  }
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
