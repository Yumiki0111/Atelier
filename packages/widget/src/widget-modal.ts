import type { WidgetConfig } from "./types";
import { initPreviewPanel } from "@atelier/preview";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { sendEvent, type WidgetParams } from "./widget-api";
import { showOutfitChangePanel } from "./outfit-panel";

export function renderModalWithLoading(
  shadowRoot: ShadowRoot,
  params: WidgetParams
): { overlay: HTMLElement; contentArea: HTMLElement } {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    overflow: visible;
    opacity: 0;
    animation: fadeIn 0.2s ease-out forwards;
  `;
  
  addFadeInStyle();
  
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 24px 12px;
    box-sizing: border-box;
    overflow: hidden;
  `;

  const backButton = createBackButton(overlay);
  const contentArea = createContentArea();
  const loadingSpinner = createLoadingSpinner();
  
  contentArea.appendChild(loadingSpinner);
  modal.appendChild(backButton);
  modal.appendChild(contentArea);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  overlay.setAttribute('data-atelier-modal-overlay', 'true');
  contentArea.setAttribute('data-atelier-content-area', 'true');
  
  return { overlay, contentArea };
}

export function updateModalWithConfig(
  shadowRoot: ShadowRoot,
  config: WidgetConfig,
  params: WidgetParams,
  overlay: HTMLElement,
  contentArea: HTMLElement
) {
  if (!overlay || !contentArea) {
    console.error("[Atelier Widget] Modal elements not provided");
    return;
  }
  
  contentArea.innerHTML = '';
  contentArea.style.cssText = `
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    min-height: 0 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-sizing: border-box !important;
  `;
  
  const eventShopId = params.shopId || "unknown";
  sendEvent({
    shopId: eventShopId,
    productId: params.productId || params.externalProductId || undefined,
    type: "widget_open",
  });

  const defaultSize = config.asset?.defaultSize || "M";
  const availableSizes: string[] = ["S", "M", "L", "XL"];
  let currentSize = defaultSize;
  
  const assetList = config.asset?.sizes && config.asset.sizes[currentSize]
    ? (() => {
        const sizeAssets = config.asset.sizes[currentSize];
        return sizeAssets
          .map((asset) => {
            const url = asset.modelUrl || asset.glbUrl || "";
            if (!url) return null;
            return {
              url,
              category: asset.category,
            };
          })
          .filter((asset) => asset !== null) as { url: string; category?: string }[];
      })()
    : [];
  
  if (isDevelopmentMode() && assetList.length === 0) {
    assetList.push({
      url: "http://localhost:3000/3d/clo_model.glb",
      category: undefined,
    });
  }
  
  const onOutfitClickHandler = (container: HTMLElement) => {
    showOutfitChangePanel(container, params).catch((error) => {
      console.error("[Atelier Widget] Failed to show outfit change panel:", error);
      if (isDevelopmentMode()) {
        alert("着せ替えパネルの表示に失敗しました: " + error.message);
      }
    });
  };
  
  let previewInstance: ReturnType<typeof initPreviewPanel>;
  
  // floatingButtonsは既にcontainerに追加されている（サイズボタンと同じ仕様）
  // スタイルが正しく設定されていることを確認
  const setupFloatingButtons = (floatingButtons: HTMLElement) => {
    // 既にcontainerに追加され、スタイルも設定済みなので、何もする必要はない
    // ただし、念のためスタイルが正しく設定されていることを確認
    if (floatingButtons) {
      const computed = window.getComputedStyle(floatingButtons);
      if (computed.position !== 'absolute') {
        // スタイルが上書きされている場合は復元
        floatingButtons.style.cssText = `
          position: absolute !important;
          right: 24px !important;
          top: 55% !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 10px !important;
          pointer-events: auto !important;
          z-index: 10001 !important;
        `;
      }
    }
  };
  
  const previewOptions = {
    onBackClick: () => {
      // 1. まず、全てのfloatingButtonsを非表示にして削除（最優先）
      // position: fixedの要素は親要素が削除されても残る可能性があるため、
      // document全体から確実に削除する
      const allFloatingButtons = document.querySelectorAll('[data-atelier-floating-buttons]');
      allFloatingButtons.forEach((btn) => {
        const el = btn as HTMLElement;
        // 即座に非表示
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("opacity", "0", "important");
        el.style.setProperty("pointer-events", "none", "important");
        // 親要素から削除
        if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
        // remove()も実行
        if (el.isConnected) {
          el.remove();
        }
      });
      
      // 2. previewInstanceを破棄（floatingButtonsも削除されるはずだが、念のため）
      if (previewInstance) {
        previewInstance.destroy();
      }
      
      // 3. overlayを削除
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      
      // 4. 最終確認：残っているfloatingButtonsを削除
      const finalCheck = document.querySelectorAll('[data-atelier-floating-buttons]');
      finalCheck.forEach((btn) => {
        const el = btn as HTMLElement;
        el.style.setProperty("display", "none", "important");
        if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
        if (el.isConnected) {
          el.remove();
        }
      });
    },
    onOutfitClick: onOutfitClickHandler,
    currentProductId: params.productId || params.externalProductId || undefined,
    container: contentArea,
    onFloatingButtonsReady: setupFloatingButtons, // 新しいコールバックを追加
    assets: assetList,
    textureUrl: undefined,
    apiBaseUrl: getApiBaseUrl() || "http://localhost:3000",
    initialHeight: 170,
    minHeight: 150,
    maxHeight: 190,
    availableSizes,
    initialSize: currentSize,
    productName: config.asset?.productName,
    onSizeChange: (size: string) => {
      currentSize = size;
      const newAssetList = config.asset?.sizes && config.asset.sizes[size]
        ? (() => {
            const sizeAssets = config.asset.sizes[size];
            return sizeAssets
              .map((asset) => {
                const url = asset.modelUrl || asset.glbUrl || "";
                if (!url) return null;
                return {
                  url,
                  category: asset.category,
                };
              })
              .filter((asset) => asset !== null) as { url: string; category?: string }[];
          })()
        : [];
      previewInstance.updateAssets(newAssetList);
      
      sendEvent({
        shopId: eventShopId,
        productId: params.productId || params.externalProductId || undefined,
        type: "size_change",
        meta: { size },
      });
    },
    onHeightChange: (height: number) => {
      sendEvent({
        shopId: eventShopId,
        productId: params.productId || params.externalProductId || undefined,
        type: "height_change",
        meta: { height },
      });
    },
    onModelLoad: () => {},
    onModelError: (error: Error) => {
      if (
        error instanceof Error &&
        (error.message === "Failed to fetch" ||
          error.message.includes("network") ||
          error.message.includes("connection"))
      ) {
        return;
      }
      console.error("[Atelier Widget] Failed to load 3D model:", error);
    },
  };
  
  previewInstance = initPreviewPanel(previewOptions);
}

export function showErrorInModal(
  shadowRoot: ShadowRoot,
  errorMessage: string,
  overlay: HTMLElement,
  contentArea: HTMLElement
) {
  if (!overlay || !contentArea) {
    console.error("[Atelier Widget] Modal elements not provided");
    return;
  }
  
  contentArea.innerHTML = '';
  contentArea.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
  `;
  
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    color: #dc2626;
    font-size: 16px;
    line-height: 1.5;
    white-space: pre-line;
  `;
  errorDiv.textContent = errorMessage;
  contentArea.appendChild(errorDiv);
}

function addFadeInStyle() {
  if (!document.getElementById('atelier-widget-fade-in-style')) {
    const style = document.createElement('style');
    style.id = 'atelier-widget-fade-in-style';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

function createBackButton(overlay: HTMLElement): HTMLElement {
  const backButton = document.createElement("button");
  backButton.innerHTML = "< 商品に戻る";
  backButton.style.cssText = `
    position: absolute;
    top: 16px;
    left: 16px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 8px;
    z-index: 10001;
    color: #000;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  `;
  backButton.addEventListener("mouseenter", () => {
    backButton.style.backgroundColor = "rgba(255, 255, 255, 1)";
    backButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
  });
  backButton.addEventListener("mouseleave", () => {
    backButton.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    backButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
  });
  backButton.addEventListener("click", () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
  return backButton;
}

function createContentArea(): HTMLElement {
  const contentArea = document.createElement("div");
  contentArea.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    align-items: center;
    justify-content: center;
  `;
  return contentArea;
}

function createLoadingSpinner(): HTMLElement {
  if (!document.getElementById('atelier-widget-spin-style')) {
    const style = document.createElement('style');
    style.id = 'atelier-widget-spin-style';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  const loadingSpinner = document.createElement("div");
  loadingSpinner.style.cssText = `
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #333;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;
  return loadingSpinner;
}
