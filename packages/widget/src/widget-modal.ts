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
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    background: white !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: visible !important;
    opacity: 0;
    animation: fadeIn 0.2s ease-out forwards;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  `;
  
  addFadeInStyle();
  
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white !important;
    width: 100% !important;
    height: 100% !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 24px 12px !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    margin: 0 !important;
    flex: 1 !important;
    min-height: 0 !important;
  `;

  const backButton = createBackButton(() => {
    // ローディング中に戻るボタンが押された場合: overlayのみ削除
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
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
  
  // shopIdが有効な場合のみイベントを送信
  const eventShopId = params.shopId || undefined;
  if (eventShopId && eventShopId !== "unknown") {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const productIdStr = params.productId || params.externalProductId || "";
    const validProductId = productIdStr && uuidRegex.test(productIdStr) 
      ? productIdStr 
      : undefined;
    
    sendEvent({
      shopId: eventShopId as string, // eventShopId !== "unknown" のチェックで string 型が保証されている
      productId: validProductId,
      type: "widget_open",
    }).catch((error) => {
      // エラーは無視（開発環境ではAPIサーバーが利用できない場合がある）
      if (isDevelopmentMode()) {
        console.warn("[Atelier Widget] Event send error:", error);
      }
    });
  }

  const defaultSize = config.asset?.defaultSize || "M";
  const availableSizes: string[] = ["S", "M", "L", "XL"];
  let currentSize = defaultSize;
  let currentConfig = config; // 着せ替え時に更新される
  
  // 現在の3Dビューアに表示中のアセット（カテゴリ→URL のマッピング）
  // 管理画面と同じロジックで、既存のアセットを保持しながら新しいアセットを追加
  const activeAssets = new Map<string, { url: string; category: string }>();

  /** 指定サイズのアセットリストを構築（現在のconfigから） */
  const buildAssetList = (size: string): { url: string; category?: string }[] => {
    const sizeAssets = currentConfig.asset?.sizes?.[size];
    if (!sizeAssets) {
      console.warn(`[Atelier Widget] No assets found for size: ${size}`, {
        availableSizes: Object.keys(currentConfig.asset?.sizes || {}),
        config: currentConfig
      });
      return [];
    }
    const result: { url: string; category?: string }[] = [];
    for (const asset of sizeAssets) {
      const url = asset.modelUrl || asset.glbUrl || "";
      if (url) {
        result.push({ url, category: asset.category });
      } else {
        console.warn(`[Atelier Widget] Asset missing URL:`, asset);
      }
    }
    console.log(`[Atelier Widget] Built asset list for size ${size}:`, result.length, "assets", result);
    return result;
  };

  // 管理画面と同じ方法：空で初期化し、後でupdateAssetsで追加
  
  // 着せ替えパネル用のアセットデータを取得
  let outfitAssetsData: { categories: Record<string, Array<{ id: string; productId: string; productName: string; modelUrl: string; thumbnailUrl: string | null; category: string; size: string }>> } | undefined = undefined;
  
  const fetchOutfitAssets = async (previewInstanceRef?: ReturnType<typeof initPreviewPanel>) => {
    try {
      const apiUrl = getApiBaseUrl() || "http://localhost:3000";
      const searchParams = new URLSearchParams();
      if (params.publicKey) {
        searchParams.append("publicKey", params.publicKey);
      }
      if (currentSize) {
        searchParams.append("size", currentSize);
      }
      // 除外する商品IDは externalProductId を優先（API側は external_product_id で検索するため）
      const currentProductId = params.externalProductId || params.productId;
      if (currentProductId) {
        searchParams.append("excludeProductId", currentProductId);
      }
      
      const response = await fetch(`${apiUrl}/api/public/assets/by-shop?${searchParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        outfitAssetsData = data;
        // プレビューインスタンスが既に作成されている場合は更新
        if (previewInstanceRef) {
          previewInstanceRef.updateOutfitAssets(data);
        }
      }
    } catch (error) {
      console.warn("[Atelier Widget] Failed to fetch outfit assets:", error);
    }
  };
  
  const onOutfitClickHandler = (container: HTMLElement) => {
    showOutfitChangePanel(container, params, {
      onProductSelect: (product, newConfig) => {
        // 新しい商品のconfigに切り替え
        currentConfig = newConfig;
        
        // 商品名を更新
        const productName = newConfig.asset?.productName || product.name;
        previewInstance.updateProductName(productName);
        
        // 現在のサイズに合うアセットがあるか確認、なければデフォルトサイズに
        const newDefaultSize = newConfig.asset?.defaultSize || "M";
        const newAssets = buildAssetList(currentSize);
        if (newAssets.length > 0) {
          // 現在のサイズで更新
          previewInstance.updateAssets(newAssets);
        } else {
          // 現在のサイズにアセットがない場合、デフォルトサイズに切り替え
          currentSize = newDefaultSize;
          previewInstance.updateSize(newDefaultSize);
          previewInstance.updateAssets(buildAssetList(newDefaultSize));
        }
      },
    }).catch((error) => {
      console.error("[Atelier Widget] Failed to show outfit change panel:", error);
      if (isDevelopmentMode()) {
        alert("着せ替えパネルの表示に失敗しました: " + error.message);
      }
    });
  };
  
  let previewInstance: ReturnType<typeof initPreviewPanel>;

  /** previewインスタンスを正しく破棄してモーダルを閉じる */
  const cleanupAndClose = () => {
    // floatingButtonsを削除
    document.querySelectorAll('[data-atelier-floating-buttons]').forEach((el) => {
      el.remove();
    });

    // previewInstanceを破棄
    if (previewInstance) {
      previewInstance.destroy();
    }

    // overlayを削除
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  // 戻るボタンのクリックハンドラーを、previewの破棄を含むものに更新
  const backButton = overlay.querySelector('[data-atelier-back-button]');
  if (backButton) {
    const newBackButton = backButton.cloneNode(true) as HTMLElement;
    newBackButton.addEventListener("click", cleanupAndClose);
    newBackButton.addEventListener("mouseenter", () => {
      newBackButton.style.backgroundColor = "rgba(255, 255, 255, 1)";
      newBackButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
    });
    newBackButton.addEventListener("mouseleave", () => {
      newBackButton.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
      newBackButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
    });
    backButton.replaceWith(newBackButton);
  }

  // ベースモデル（人）のURLを指定（apiBaseUrlと結合して絶対URLにする）
  const apiBaseUrl = getApiBaseUrl() || "http://localhost:3000";
  const baseModelUrl = `${apiBaseUrl}/3d/clo_model_men.glb`;
  
  const previewOptions = {
    onBackClick: cleanupAndClose,
    onOutfitClick: onOutfitClickHandler,
    currentProductId: params.productId || params.externalProductId || undefined,
    container: contentArea,
    modelUrl: baseModelUrl, // 絶対URLで指定（ECサイトのドメインから読み込まれるのを防ぐ）
    assets: [], // 管理画面と同じく空で初期化、後でupdateAssetsで追加
    outfitAssets: outfitAssetsData,
    textureUrl: undefined,
    apiBaseUrl, // 上で定義したapiBaseUrlを使用
    initialHeight: 170,
    minHeight: 150,
    maxHeight: 190,
    availableSizes,
    initialSize: currentSize,
    productName: config.asset?.productName,
    onOutfitAssetSelect: (asset: any) => {
      // アセットが選択されたときの処理（管理画面と同じロジック）
      // 選択されたアセットのカテゴリで既存アセットを置き換え（他のカテゴリは保持）
      activeAssets.set(asset.category, {
        url: asset.modelUrl,
        category: asset.category,
      });

      // 全アクティブアセットを3Dビューアに反映
      const allAssets = Array.from(activeAssets.values());
      previewInstance.updateAssets(allAssets);
      
      // shopIdが有効な場合のみイベントを送信
      if (eventShopId && eventShopId !== "unknown") {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validProductId = asset.productId && uuidRegex.test(asset.productId) ? asset.productId : undefined;
        
        sendEvent({
          shopId: eventShopId,
          productId: validProductId,
          type: "outfit_asset_select",
          meta: { assetId: asset.id, category: asset.category },
        }).catch((error) => {
          // エラーは無視（開発環境ではAPIサーバーが利用できない場合がある）
          if (isDevelopmentMode()) {
            console.warn("[Atelier Widget] Event send error:", error);
          }
        });
      }
    },
    onSizeChange: (size: string) => {
      currentSize = size;
      const newAssetList = buildAssetList(size);
      
      // サイズ変更時は、activeAssetsをクリアして新しいアセットで置き換え
      activeAssets.clear();
      newAssetList.forEach((asset) => {
        if (asset.category) {
          activeAssets.set(asset.category, {
            url: asset.url,
            category: asset.category,
          });
        }
      });
      
      previewInstance.updateAssets(newAssetList);
      
      // サイズが変更されたら、着せ替えパネルのアセットも更新
      fetchOutfitAssets(previewInstance);
      
      // shopIdが有効な場合のみイベントを送信
      if (eventShopId && eventShopId !== "unknown") {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const productIdStr = params.productId || params.externalProductId || "";
        const validProductId = productIdStr && uuidRegex.test(productIdStr) 
          ? productIdStr 
          : undefined;
        
        sendEvent({
          shopId: eventShopId as string, // eventShopId !== "unknown" のチェックで string 型が保証されている
          productId: validProductId,
          type: "size_change",
          meta: { size },
        }).catch((error) => {
          // エラーは無視（開発環境ではAPIサーバーが利用できない場合がある）
          if (isDevelopmentMode()) {
            console.warn("[Atelier Widget] Event send error:", error);
          }
        });
      }
    },
    onHeightChange: (height: number) => {
      // shopIdが有効な場合のみイベントを送信
      if (eventShopId && eventShopId !== "unknown") {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const productIdStr = params.productId || params.externalProductId || "";
        const validProductId = productIdStr && uuidRegex.test(productIdStr) 
          ? productIdStr 
          : undefined;
        
        sendEvent({
          shopId: eventShopId as string, // eventShopId !== "unknown" のチェックで string 型が保証されている
          productId: validProductId,
          type: "height_change",
          meta: { height },
        }).catch((error) => {
          // エラーは無視（開発環境ではAPIサーバーが利用できない場合がある）
          if (isDevelopmentMode()) {
            console.warn("[Atelier Widget] Event send error:", error);
          }
        });
      }
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
  
  // 管理画面と同じ方法：初期化後にアセットを追加
  const initialAssetList = buildAssetList(currentSize);
  if (initialAssetList.length > 0) {
    // 初期アセットをactiveAssetsに登録
    initialAssetList.forEach((asset) => {
      if (asset.category) {
        activeAssets.set(asset.category, {
          url: asset.url,
          category: asset.category,
        });
      }
    });
    previewInstance.updateAssets(initialAssetList);
  } else if (isDevelopmentMode()) {
    // 開発環境でのフォールバック
    previewInstance.updateAssets([{ url: "http://localhost:3000/3d/clo_model_men.glb", category: undefined }]);
  }
  
  // プレビューインスタンス作成後にアセットデータを取得して更新
  fetchOutfitAssets(previewInstance).then(() => {
    if (outfitAssetsData) {
      previewInstance.updateOutfitAssets(outfitAssetsData);
    }
  });
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

function createBackButton(onClick: () => void): HTMLElement {
  const backButton = document.createElement("button");
  backButton.setAttribute("data-atelier-back-button", "true");
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
  backButton.addEventListener("click", onClick);
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
