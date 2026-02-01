// Widget entry point
// This will be built as a single widget.js file

import { initWidget } from "./widget";

// 即座にログを出力して、スクリプトが読み込まれているか確認
console.log("[Atelier Widget] ===== SCRIPT LOADED =====");
console.log("[Atelier Widget] Script URL:", document.currentScript?.getAttribute('src') || 'unknown');
console.log("[Atelier Widget] Window object:", typeof window);
console.log("[Atelier Widget] Document ready state:", document.readyState);
console.log("[Atelier Widget] Global config check:", (window as any).__atelierWidgetConfig);
console.log("[Atelier Widget] Global config exists:", !!(window as any).__atelierWidgetConfig);
console.log("[Atelier Widget] Global config publicKey:", (window as any).__atelierWidgetConfig?.publicKey);

// Auto-initialize when script loads
if (typeof window !== "undefined") {
  let initialized = false;
  
  // 初期化関数（重複実行を防ぐ）
  function doInit() {
    if (initialized) {
      console.log("[Atelier Widget] Already initialized, skipping");
      return;
    }
    initialized = true;
    console.log("[Atelier Widget] ===== doInit START =====");
    console.log("[Atelier Widget] Window object:", typeof window);
    console.log("[Atelier Widget] Document ready state:", document.readyState);
    console.log("[Atelier Widget] Global config:", (window as any).__atelierWidgetConfig);
    console.log("[Atelier Widget] Calling initWidget...");
    initWidget();
    console.log("[Atelier Widget] ===== doInit END =====");
  }
  
  // DOMが読み込まれるまで待つ
  console.log("[Atelier Widget] Setting up initialization...");
  if (document.readyState === "loading") {
    console.log("[Atelier Widget] Document is loading, waiting for DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", () => {
      console.log("[Atelier Widget] DOMContentLoaded event fired");
      doInit();
    });
  } else {
    // DOMが既に読み込まれている場合は即座に初期化
    console.log("[Atelier Widget] DOM already loaded, initializing immediately");
    doInit();
  }
  
  // window.onloadも待つ（念のため）
  if (document.readyState !== "complete") {
    console.log("[Atelier Widget] Document not complete, setting up load listener");
    window.addEventListener("load", () => {
      console.log("[Atelier Widget] Window load event fired");
      if (!initialized) {
        console.log("[Atelier Widget] Not initialized yet, calling doInit from load event");
        doInit();
      }
    });
  } else {
    console.log("[Atelier Widget] Document already complete");
  }
  
  // 動的に追加される要素にも対応するため、MutationObserverを使用
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      const elements = document.querySelectorAll<HTMLElement>(
        "[data-atelier-public-key], [data-atelier-shop-id]"
      );
      const uninitialized = Array.from(elements).filter(
        (el) => !el.shadowRoot
      );
      
      if (uninitialized.length > 0) {
        console.log(`[Atelier Widget] MutationObserver: Found ${uninitialized.length} uninitialized widget element(s), initializing`);
        initWidget();
      }
    });
    
    // DOMの変更を監視
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  
  // フォールバック: 少し遅延して再初期化を試みる
  setTimeout(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      "[data-atelier-public-key], [data-atelier-shop-id]"
    );
    const uninitialized = Array.from(elements).filter(
      (el) => !el.shadowRoot
    );
    if (uninitialized.length > 0) {
      console.log(`[Atelier Widget] Fallback: Found ${uninitialized.length} uninitialized widget element(s), initializing`);
      initWidget();
    }
  }, 500);
}
