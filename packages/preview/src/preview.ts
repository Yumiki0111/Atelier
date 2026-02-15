import type { PreviewPanelOptions, PreviewPanelInstance, OutfitAssetsData } from "./types";
import type { ProductSize } from "@atelier/shared";
import { init3DViewer } from "./viewer";
import { createSizeArea, createViewerContainer, createOutfitTabs, getBackgroundImageUrl } from "./ui-elements";

/**
 * PreviewPanelのVanilla JS実装
 */
export function initPreviewPanel(
  options: PreviewPanelOptions
): PreviewPanelInstance {
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
    outfitAssets,
    onHeightChange,
    onSizeChange,
    onModelLoad,
    onModelError,
    onBackClick,
    onOutfitClick,
    onOutfitAssetSelect,
    currentProductId,
    onFloatingButtonsReady,
  } = options;

  const currentModelUrl = modelUrl || glbUrl;
  let currentSize = initialSize;

  // コンテナのクリア
  try {
    const children = Array.from(container.children);
    for (const child of children) {
      try { child.remove(); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // コンテナスタイル設定
  // 子要素が各自の内部paddingを管理するため、コンテナのpaddingは0
  container.style.cssText = `
    display: flex !important;
    flex-direction: column !important;
    position: relative !important;
    overflow: hidden !important;
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

  const outfitTabsElements = createOutfitTabs(outfitAssets, (asset, category) => {
    onOutfitAssetSelect?.(asset, category);
  });
  const { outfitTabsContainer } = outfitTabsElements;

  // スクロール関数
  const scrollToSelectedSize = () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex >= 0 && sizeButtons[currentIndex]) {
      const selectedButton = sizeButtons[currentIndex];
      const containerRect = sizeButtonsContainer.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();
      const scrollLeft = sizeButtonsContainer.scrollLeft;
      const buttonLeft = buttonRect.left - containerRect.left + scrollLeft;
      const targetScroll = buttonLeft - (containerRect.width / 2) + (buttonRect.width / 2);

      sizeButtonsContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const viewerElements = createViewerContainer(productName);
  const { viewerContainer, floatingButtons, jacketButton, userButton } = viewerElements;

  if (onFloatingButtonsReady) {
    onFloatingButtonsReady(floatingButtons);
  }

  // ボタンのpointer-events設定
  jacketButton.style.pointerEvents = "auto";
  userButton.style.pointerEvents = "auto";

  // ジャケットボタンのホバー＆クリック
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

  jacketButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onOutfitClick) {
      try { onOutfitClick(container); } catch (error) {
        console.error("[Atelier Preview] Error in onOutfitClick:", error);
      }
    } else {
      const event = new CustomEvent("atelier:open-outfit-modal", {
        detail: { currentProductId },
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
    }
  });

  // ユーザーボタンのホバー
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

  // サイズボタンの更新
  const updateSizeButtons = () => {
    sizeButtons.forEach((btn, idx) => {
      const selected = availableSizes[idx] === currentSize;
      btn.style.background = selected ? "#000000" : "transparent";
      btn.style.color = selected ? "#ffffff" : "#000000";
      btn.style.border = "none";
      btn.style.fontWeight = selected ? "600" : "700";
      btn.style.borderRadius = selected ? "50px" : "0";
    });
    scrollToSelectedSize();
  };

  updateSizeButtons();
  setTimeout(() => scrollToSelectedSize(), 100);

  // 矢印ボタン
  prevButton.addEventListener("click", () => {
    const idx = availableSizes.indexOf(currentSize);
    if (idx > 0) {
      currentSize = availableSizes[idx - 1];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    }
  });

  nextButton.addEventListener("click", () => {
    const idx = availableSizes.indexOf(currentSize);
    if (idx < availableSizes.length - 1) {
      currentSize = availableSizes[idx + 1];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    }
  });

  // 矢印ボタンのホバー
  const addHoverEffect = (btn: HTMLElement) => {
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(255, 255, 255, 1)";
      btn.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(255, 255, 255, 0.9)";
      btn.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    });
  };
  addHoverEffect(prevButton);
  addHoverEffect(nextButton);

  // サイズボタンのクリック
  sizeButtons.forEach((sizeBtn, idx) => {
    sizeBtn.addEventListener("click", () => {
      currentSize = availableSizes[idx];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    });
  });

  // DOM構築
  container.appendChild(sizeArea);
  container.appendChild(viewerContainer);
  container.appendChild(outfitTabsContainer);

  // 3Dビューア初期化
  const backgroundImageUrl = getBackgroundImageUrl();
  const viewerInstance = init3DViewer(viewerContainer, {
    apiBaseUrl,
    glbUrl,
    modelUrl,
    assets: assets?.map(a => ({ url: a.url, category: a.category })),
    textureUrl,
    backgroundImageUrl,
    onLoad: onModelLoad,
    onError: onModelError,
  });

  const createdElements = [sizeArea, viewerContainer];
  const resizeObservers: ResizeObserver[] = [];

  return {
    updateGlbUrl(newGlbUrl: string | undefined) {
      viewerInstance.updateGlbUrl(newGlbUrl);
    },
    updateModelUrl(newModelUrl: string | undefined) {
      viewerInstance.updateModelUrl(newModelUrl);
    },
    updateAssets(newAssets: Array<{ url: string; category?: string }>) {
      viewerInstance.updateAssets(newAssets.map(a => ({ url: a.url, category: a.category })));
    },
    updateOutfitAssets(data: OutfitAssetsData) {
      outfitTabsElements.updateAssets(data);
    },
    updateHeight(height: number) {
      onHeightChange?.(height);
    },
    updateSize(size: ProductSize) {
      currentSize = size;
      updateSizeButtons();
    },
    updateProductName(name: string) {
      if (productNameDiv) {
        productNameDiv.textContent = name;
      }
    },
    destroy() {
      for (const observer of resizeObservers) {
        try { observer.disconnect(); } catch { /* ignore */ }
      }

      try { viewerInstance.destroy(); } catch (error) {
        console.error("[Atelier Preview] Error destroying viewer instance:", error);
      }

      try {
        for (const element of createdElements) {
          try {
            if (element && (element.isConnected || element.parentNode)) {
              element.remove();
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }

      try {
        if (floatingButtons && (floatingButtons.isConnected || floatingButtons.parentNode)) {
          floatingButtons.remove();
        }
      } catch { /* ignore */ }
    },
  };
}
