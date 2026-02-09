import type { WidgetConfig } from "./types";
import { initPreviewPanel } from "@atelier/preview";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { fetchWidgetConfig, sendEvent, type WidgetParams } from "./widget-api";
import { renderCube, renderModalWithLoading, updateModalWithConfig, showErrorInModal, updateButtonPositions } from "./widget-render";

export function initWidget() {
  // 既存のボタンをクリーンアップ（ページ遷移時などに対応）
  // 現在のページに存在するウィジェット要素に対応するボタンのみを保持
  const elements = document.querySelectorAll<HTMLElement>(
    "[data-atelier-public-key], [data-atelier-shop-id]"
  );
  
  // 現在のページに存在する商品IDを収集
  const currentProductIds = new Set<string>();
  elements.forEach((element) => {
    const productId = element.getAttribute("data-atelier-product-id") || 
                      element.getAttribute("data-atelier-external-product-id");
    if (productId) {
      currentProductIds.add(productId);
    }
  });
  
  // 現在のページに存在しない商品のコンテナ（ボタンと画像を含む）を削除
  const allWidgetContainers = document.querySelectorAll<HTMLElement>('[id^="atelier-widget-container-"]');
  allWidgetContainers.forEach((container) => {
    const containerProductId = container.getAttribute("data-atelier-product-id");
    if (containerProductId && !currentProductIds.has(containerProductId)) {
      container.remove();
    }
  });

  if (elements.length === 0) {
    console.warn("[Atelier Widget] No widget elements found. Make sure you have elements with data-atelier-public-key or data-atelier-shop-id attribute.");
    return;
  }

  elements.forEach((element, index) => {
    // 既に初期化されている要素はスキップ
    if (element.shadowRoot) {
      return;
    }
    
    // 新しい形式: public-key を優先
    const publicKey = element.getAttribute("data-atelier-public-key");
    const externalProductId = element.getAttribute("data-atelier-external-product-id");
    
    // 後方互換性: 古い形式もサポート
    const shopId = element.getAttribute("data-atelier-shop-id");
    const productId = element.getAttribute("data-atelier-product-id");
    
    const sku = element.getAttribute("data-atelier-sku");
    const handle = element.getAttribute("data-atelier-handle");
    const url = element.getAttribute("data-atelier-url");

    if (!publicKey && !shopId) {
      console.warn("[Atelier Widget] public-key or shop-id is required");
      return;
    }

    try {
      // 親要素のスタイルをリセット（Shadow DOMの内容が正しく表示されるように）
      element.style.display = "block";
      element.style.width = "auto";
      element.style.height = "auto";
      element.style.margin = "0";
      element.style.padding = "0";
      element.style.border = "none";
      element.style.background = "transparent";
      
      // Create shadow DOM
      const shadowRoot = element.attachShadow({ mode: "open" });

      // Render button
      renderCube(shadowRoot, {
        publicKey: publicKey || null,
        shopId: shopId || null, // 後方互換性のため
        externalProductId: externalProductId || null,
        productId: productId || null, // 後方互換性のため
        sku,
        handle,
        url,
      }, handleCubeClick);
    } catch (error) {
      console.error(`[Atelier Widget] Failed to initialize widget ${index + 1}:`, error);
    }
  });
  
  // すべてのボタンの位置を再計算（初期化後）
  updateButtonPositions();
}

async function handleCubeClick(
  shadowRoot: ShadowRoot,
  params: WidgetParams
) {
  console.log("[Atelier Widget] ===== handleCubeClick START =====");
  console.log("[Atelier Widget] params:", params);
  
  // パラメータの検証
  if (!params.publicKey && !params.shopId) {
    const errorMsg = "[Atelier Widget] publicKey or shopId is required";
    console.error(errorMsg);
    alert("ウィジェットの設定エラー: Public Keyが設定されていません");
    return;
  }

  if (!params.externalProductId && !params.productId) {
    const errorMsg = "[Atelier Widget] externalProductId or productId is required";
    console.error(errorMsg);
    alert("ウィジェットの設定エラー: 商品IDが設定されていません。data-atelier-external-product-id属性を追加してください。");
    return;
  }

  // Send cube_click event (失敗しても続行、非同期で実行)
  const eventShopId = params.shopId || "unknown"; // 後方互換性のため
  sendEvent({
    shopId: eventShopId,
    productId: params.productId || params.externalProductId || undefined,
    type: "cube_click",
  }).catch((error) => {
    console.warn("[Atelier Widget] Failed to send cube_click event:", error);
  });

  // モーダルを即座に表示（ローディング状態）
  console.log("[Atelier Widget] Calling renderModalWithLoading");
  const { overlay, contentArea } = renderModalWithLoading(shadowRoot, params);
  console.log("[Atelier Widget] renderModalWithLoading completed, overlay:", overlay, "contentArea:", contentArea);

  // バックグラウンドで設定を取得
  try {
    console.log("[Atelier Widget] Fetching widget config...");
    const config = await fetchWidgetConfig(params);
    console.log("[Atelier Widget] Widget config fetched:", config);
    
    if (config.enabled) {
      console.log("[Atelier Widget] Config enabled, calling updateModalWithConfig");
      updateModalWithConfig(shadowRoot, config, params, overlay, contentArea);
    } else {
      // 開発環境では、enabled: falseでもモックデータでモーダルを表示
      if (isDevelopmentMode()) {
        console.warn(
          "[Atelier Widget] Widget is disabled, but using mock config for development."
        );
        const glbUrl = "http://localhost:3000/3d/clo_model.glb";
        const mockConfig: WidgetConfig = {
          enabled: true,
          asset: {
            defaultSize: "M",
            sizes: {
              S: [{ glbUrl }],
              M: [{ glbUrl }],
              L: [{ glbUrl }],
            },
          },
        };
        updateModalWithConfig(shadowRoot, mockConfig, params, overlay, contentArea);
      } else {
        console.warn("[Atelier Widget] Widget is disabled for this product", {
          config,
          params,
        });
        const errorDetails = config.error || "不明なエラー";
        showErrorInModal(shadowRoot, `この商品の3D試着は現在利用できません。\n\nエラー: ${errorDetails}`, overlay, contentArea);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // 開発環境ではエラーをログに出力して続行
    if (isDevelopmentMode()) {
      console.error("[Atelier Widget] Error in handleCubeClick:", error);
      console.error("[Atelier Widget] Error details:", error);
      // 開発環境では、エラーが発生してもモックデータでモーダルを表示
      const glbUrl = "http://localhost:3000/3d/model_men.glb";
        const mockConfig: WidgetConfig = {
          enabled: true,
          asset: {
            defaultSize: "M",
            sizes: {
              S: [{ glbUrl }],
              M: [{ glbUrl }],
              L: [{ glbUrl }],
            },
          },
        };
        updateModalWithConfig(shadowRoot, mockConfig, params, overlay, contentArea);
    } else {
      // 本番環境ではエラーメッセージを表示
      console.error("[Atelier Widget] Error in handleCubeClick:", errorMessage);
      showErrorInModal(shadowRoot, `3D試着の読み込みに失敗しました。\n\nエラー: ${errorMessage}`, overlay, contentArea);
    }
  }
}
