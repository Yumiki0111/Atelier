import type { PreviewPanelOptions, PreviewPanelInstance } from "./types";
import type { ProductSize } from "@atelier/shared";
import { init3DViewer } from "./viewer";
import { createSizeArea, createViewerContainer } from "./ui-elements";

function getBackgroundImageUrl(): string {
  if (typeof window === "undefined") return "";
  
  // 開発環境では常にconsoleサーバー（3000）から取得
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `http://localhost:3000/model_background.png`;
  }
  
  // data-atelier-api-url属性から取得
  const apiUrl = document.querySelector('[data-atelier-api-url]')?.getAttribute('data-atelier-api-url');
  if (apiUrl) {
    return `${apiUrl}/model_background.png`;
  }
  
  // widget.jsのスクリプトタグから取得（getApiBaseUrlと同じロジック）
  const scriptTag = document.querySelector('script[src*="widget.js"]');
  if (scriptTag) {
    const src = scriptTag.getAttribute('src');
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        return `${url.origin}/model_background.png`;
      } catch (e) {
        // URL解析に失敗
      }
    }
  }
  
  return `${window.location.origin}/model_background.png`;
}

/**
 * PreviewPanelのVanilla JS実装
 * Widget向けの新しいデザイン（サイズ選択 + 質問入力）
 */
export function initPreviewPanel(
  options: PreviewPanelOptions
): PreviewPanelInstance {
  console.log("[Atelier Preview] ===== initPreviewPanel START =====");
  console.log("[Atelier Preview] options:", options);
  console.log("[Atelier Preview] options.onOutfitClick:", options.onOutfitClick);
  console.log("[Atelier Preview] typeof options.onOutfitClick:", typeof options.onOutfitClick);
  
  const {
    container,
    glbUrl,
    modelUrl,
    assets,
    textureUrl,
    apiBaseUrl,
    initialHeight = 170,
    minHeight = 150,
    maxHeight = 190,
    availableSizes = ["S", "M", "L"],
    initialSize = "M",
    productName,
    onHeightChange,
    onSizeChange,
    onModelLoad,
    onModelError,
    onBackClick,
    onOutfitClick,
    currentProductId,
    onFloatingButtonsReady,
  } = options;
  
  // デバッグ: onOutfitClickが正しく受け取られているか確認
  console.log("[Atelier Preview] After destructuring - onOutfitClick:", typeof onOutfitClick, onOutfitClick);
  console.log("[Atelier Preview] onBackClick:", typeof onBackClick, onBackClick);
  console.log("[Atelier Preview] currentProductId:", currentProductId);
  
  // modelUrlを優先、なければglbUrlを使用（後方互換性）
  const currentModelUrl = modelUrl || glbUrl;

  let currentSize = initialSize;
  let isKeyboardVisible = false;

  // 既存の要素を個別に削除（innerHTMLを使わない - Reactとの競合を避けるため）
  // PreviewPanel.tsxでdestroy()の後にクリアしているが、念のためここでもクリア
  // ただし、innerHTMLは使わず、個別にremove()で削除
  try {
    // 子要素を配列にコピーしてから削除（削除中にDOMが変更されるのを防ぐ）
    const children = Array.from(container.children);
    for (const child of children) {
      try {
        child.remove();
      } catch (error) {
        // 個別の削除エラーは無視
        console.warn("[Atelier Preview] Could not remove child element:", error);
      }
    }
  } catch (error) {
    // エラーは無視（既にクリアされている可能性がある）
    console.warn("[Atelier Preview] Could not clear container, continuing anyway:", error);
  }

  // コンテナのスタイルを完全にリセットして設定（親要素の影響を受けないように、はみ出し防止）
  // overflowはvisibleにして、フローティングボタンが表示されるようにする
  container.style.cssText = `
    display: flex !important;
    flex-direction: column !important;
    position: relative !important;
    overflow: visible !important;
    background: transparent !important;
    gap: 0 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-sizing: border-box !important;
    max-width: 100% !important;
    max-height: 100% !important;
  `.trim();

  // UI要素を作成
  const sizeAreaElements = createSizeArea(availableSizes, initialSize, productName);
  const { sizeArea, sizeButtons, sizeButtonsContainer, productNameDiv, prevButton, nextButton } = sizeAreaElements;
  
  // スクロール関数（シンプルに）
  const scrollToSelectedSize = () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex >= 0 && sizeButtons[currentIndex]) {
      const selectedButton = sizeButtons[currentIndex];
      const containerRect = sizeButtonsContainer.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();
      const scrollLeft = sizeButtonsContainer.scrollLeft;
      const buttonLeft = buttonRect.left - containerRect.left + scrollLeft;
      const buttonWidth = buttonRect.width;
      const containerWidth = containerRect.width;
      const targetScroll = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
      
      sizeButtonsContainer.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const viewerElements = createViewerContainer(productName);
  const { viewerContainer, floatingButtons, jacketButton, userButton } = viewerElements;

  // フローティングボタンはcontainerに追加される（サイズボタンと同じ仕様）
  // onFloatingButtonsReadyコールバックが提供されている場合は呼び出す（ウィジェット側で何か処理が必要な場合）
  if (onFloatingButtonsReady) {
    onFloatingButtonsReady(floatingButtons);
  }
  
  let isSizeChanging = false;

  // 各ボタンにpointer-eventsを設定
  const setButtonPointerEvents = (button: HTMLElement) => {
    button.style.pointerEvents = "auto";
  };
  setButtonPointerEvents(jacketButton);
  setButtonPointerEvents(userButton);

  // フローティングボタンのホバーエフェクト
  jacketButton.addEventListener("mouseenter", () => {
    jacketButton.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.18)";
    jacketButton.style.transform = "scale(1.08)";
    jacketButton.style.background = "rgba(255, 255, 255, 1)";
  });
  jacketButton.addEventListener("mouseleave", () => {
    jacketButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.12)";
    jacketButton.style.transform = "scale(1)";
    jacketButton.style.background = "rgba(255, 255, 255, 0.95)";
  });

  // ジャケットアイコンボタンのクリックイベント（着せ替えパネルを表示/非表示）
  console.log("[Atelier Preview] Setting up jacketButton click handler");
  console.log("[Atelier Preview] onOutfitClick at handler setup:", typeof onOutfitClick, onOutfitClick);
  
  jacketButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("[Atelier Preview] ===== jacketButton clicked =====");
    console.log("[Atelier Preview] onOutfitClick:", typeof onOutfitClick, onOutfitClick);
    
    if (onOutfitClick) {
      // コールバックが提供されている場合はそれを使用（ウィジェット側で処理）
      console.log("[Atelier Preview] Calling onOutfitClick callback with container");
      try {
        onOutfitClick(container);
      } catch (error) {
        console.error("[Atelier Preview] Error in onOutfitClick:", error);
      }
    } else {
      // カスタムイベントを発火（親ページでリッスンできるように）
      console.log("[Atelier Preview] onOutfitClick not provided, dispatching custom event");
      const event = new CustomEvent("atelier:open-outfit-modal", {
        detail: {
          currentProductId: currentProductId,
        },
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
    }
  });
  userButton.addEventListener("mouseenter", () => {
    userButton.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.18)";
    userButton.style.transform = "scale(1.08)";
    userButton.style.background = "rgba(255, 255, 255, 1)";
  });
  userButton.addEventListener("mouseleave", () => {
    userButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.12)";
    userButton.style.transform = "scale(1)";
    userButton.style.background = "rgba(255, 255, 255, 0.95)";
  });

  // サイズボタンの更新（シンプルに）
  const updateSizeButtons = () => {
    sizeButtons.forEach((btn, idx) => {
      const btnSize = availableSizes[idx];
      const selected = btnSize === currentSize;
      btn.style.background = selected ? "#000000" : "rgba(255, 255, 255, 0.95)";
      btn.style.color = selected ? "#ffffff" : "#374151";
      btn.style.border = selected ? "1px solid #000000" : "1px solid rgba(0, 0, 0, 0.15)";
      btn.style.fontWeight = selected ? "700" : "600";
    });
    
    scrollToSelectedSize();
  };
  
  // 初期表示時にサイズボタンを更新
  updateSizeButtons();
  
  // 初期表示時に選択されたサイズを中央にスクロール
  setTimeout(() => {
    scrollToSelectedSize();
  }, 100);
  
  // 矢印ボタンのイベントハンドラー
  prevButton.addEventListener("click", () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex > 0) {
      currentSize = availableSizes[currentIndex - 1];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    }
  });
  
  nextButton.addEventListener("click", () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex < availableSizes.length - 1) {
      currentSize = availableSizes[currentIndex + 1];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    }
  });
  
  // 矢印ボタンのホバーエフェクト（シンプルに）
  prevButton.addEventListener("mouseenter", () => {
    prevButton.style.background = "rgba(255, 255, 255, 1)";
    prevButton.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
  });
  prevButton.addEventListener("mouseleave", () => {
    prevButton.style.background = "rgba(255, 255, 255, 0.9)";
    prevButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
  });
  
  nextButton.addEventListener("mouseenter", () => {
    nextButton.style.background = "rgba(255, 255, 255, 1)";
    nextButton.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
  });
  nextButton.addEventListener("mouseleave", () => {
    nextButton.style.background = "rgba(255, 255, 255, 0.9)";
    nextButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
  });

  // サイズボタンのクリックイベント（シンプルに）
  sizeButtons.forEach((sizeBtn, idx) => {
    sizeBtn.addEventListener("click", () => {
      currentSize = availableSizes[idx];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    });
  });

  // 全要素を追加
  // コンテナの構造: モデル（中央、flex: 1） → サイズ選択（下、商品名含む） → フローティングボタン（右側）
  container.appendChild(viewerContainer);
  container.appendChild(sizeArea);
  // productNameDivはsizeAreaの中に既に追加されているため、ここでは追加しない
  
  // フローティングボタンをcontainerに追加（サイズボタンと同じ仕様）
  container.appendChild(floatingButtons);
  
  // デバッグログ（開発環境のみ）
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    setTimeout(() => {
      const buttonsRect = floatingButtons.getBoundingClientRect();
      const computed = window.getComputedStyle(floatingButtons);
      console.log("[Atelier Preview] Floating buttons position:", {
        parentElement: floatingButtons.parentElement?.tagName,
        parentIsBody: floatingButtons.parentElement === document.body,
        parentIsOverlay: floatingButtons.parentElement?.getAttribute("data-atelier-modal-overlay") === "true",
        position: computed.position,
        right: computed.right,
        left: computed.left,
        bottom: computed.bottom,
        zIndex: computed.zIndex,
        rect: {
          left: buttonsRect.left,
          right: buttonsRect.right,
          width: buttonsRect.width,
          viewportWidth: window.innerWidth,
          distanceFromRight: window.innerWidth - buttonsRect.right,
        },
      });
    }, 100);
  }
  
  // サイズボタンは表示
  // sizeArea.style.display = "none"; // コメントアウト
  
  // フローティングボタンは表示（着せ替え機能に必要）

  // 3Dビューアを初期化（背景画像を指定）
  const backgroundImageUrl = getBackgroundImageUrl();
  const viewerInstance = init3DViewer(viewerContainer, {
    apiBaseUrl,
    glbUrl,
    modelUrl,
    assets: assets?.map(a => ({ url: a.url, category: a.category as any })),
    textureUrl,
    backgroundImageUrl,
    onLoad: onModelLoad,
    onError: onModelError,
  });
  
  // init3DViewerの後、floatingButtonsの親要素を再確認（onFloatingButtonsReadyが呼ばれている場合）
  // ただし、既にonFloatingButtonsReadyが呼ばれている場合は、再度呼ばない（重複を避ける）
  // onFloatingButtonsReadyはsetupFloatingButtonsで既に呼ばれているため、ここでは呼ばない
  // onFloatingButtonsReadyが提供されていない場合のみ、document.bodyに追加（後方互換性）

  // 作成した要素への参照を保持（destroy()で個別に削除するため）
  // productNameDivはsizeAreaの中に含まれているため、個別に追加する必要はない
  const createdElements = [sizeArea, viewerContainer];

  // ResizeObserverへの参照を保持（destroy()で切断するため）
  const resizeObservers: ResizeObserver[] = [];

  return {
    updateGlbUrl(newGlbUrl: string | undefined) {
      // 後方互換性のため
      viewerInstance.updateGlbUrl(newGlbUrl);
    },
    updateModelUrl(newModelUrl: string | undefined) {
      // GLBとFBXの両方をサポート
      viewerInstance.updateModelUrl(newModelUrl);
    },
    updateAssets(newAssets: Array<{ url: string; category?: string }>) {
      // 着せ替え用アセットを更新
      viewerInstance.updateAssets(newAssets.map(a => ({ url: a.url, category: a.category as any })));
    },
    updateHeight(height: number) {
      // 身長スライダーは削除されたため、コールバックのみ呼び出す
      onHeightChange?.(height);
    },
    updateSize(size: ProductSize) {
      currentSize = size;
      updateSizeButtons();
    },
    destroy() {
      // ResizeObserverを切断
      for (const observer of resizeObservers) {
        try {
          observer.disconnect();
        } catch (error) {
          console.warn("[Atelier Preview] Could not disconnect ResizeObserver:", error);
        }
      }
      
      // 3Dビューアを破棄（viewerContainer内の要素も削除される）
      try {
        viewerInstance.destroy();
      } catch (error) {
        console.error("[Atelier Preview] Error destroying viewer instance:", error);
      }
      
      // DOMのクリーンアップ - 作成した要素を個別に削除（innerHTMLは使わない）
      // container要素自体はReactが管理しているが、子要素はVanilla JSで作成したものなので削除可能
      try {
        // 作成した要素を個別に削除（remove()メソッドを使用）
        for (const element of createdElements) {
          try {
            if (element && element.isConnected) {
              element.remove();
            } else if (element && element.parentNode) {
              // isConnectedがfalseでもparentNodeがある場合は削除を試みる
              element.remove();
            }
          } catch (error) {
            // 個別の削除エラーは無視
            console.warn("[Atelier Preview] Could not remove element:", error);
          }
        }
      } catch (error) {
        // エラーが発生した場合は無視（既に削除されている可能性がある）
        console.warn("[Atelier Preview] Could not clean up container:", error);
      }
      
      // floatingButtonsを明示的に削除（overlayの子要素として追加されている場合でも、念のため削除）
      try {
        if (floatingButtons && floatingButtons.isConnected) {
          floatingButtons.remove();
        } else if (floatingButtons && floatingButtons.parentNode) {
          floatingButtons.remove();
        }
      } catch (error) {
        console.warn("[Atelier Preview] Could not remove floatingButtons:", error);
      }
    },
  };
}
