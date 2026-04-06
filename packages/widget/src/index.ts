// Widget entry point
// This will be built as a single widget.js file

import { WIDGET_HOST_SELECTOR } from "./embed-data";
import { initWidget } from "./widget";

// Auto-initialize when script loads
if (typeof window !== "undefined") {
  let initialized = false;
  
  // 初期化関数（重複実行を防ぐ）
  function doInit() {
    if (initialized) {
      return;
    }
    initialized = true;
    initWidget();
  }
  
  // DOMが読み込まれるまで待つ
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      doInit();
    });
  } else {
    // DOMが既に読み込まれている場合は即座に初期化
    doInit();
  }
  
  // window.onloadも待つ（念のため）
  if (document.readyState !== "complete") {
    window.addEventListener("load", () => {
      if (!initialized) {
        doInit();
      }
    });
  }
  
  // 動的に追加される要素にも対応するため、MutationObserverを使用
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      const elements = document.querySelectorAll<HTMLElement>(WIDGET_HOST_SELECTOR);
      const uninitialized = Array.from(elements).filter(
        (el) => !el.shadowRoot
      );
      
      if (uninitialized.length > 0) {
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
    const elements = document.querySelectorAll<HTMLElement>(WIDGET_HOST_SELECTOR);
    const uninitialized = Array.from(elements).filter(
      (el) => !el.shadowRoot
    );
    if (uninitialized.length > 0) {
      initWidget();
    }
  }, 500);
}
