import { fetchWidgetConfig, fetchWidgetDesign, sendEvent, type WidgetParams } from "./widget-api";
import { renderCube, applyDesignToButton, showDefaultButton, renderModalWithLoading, updateModalWithConfig, showErrorInModal, updateButtonPositions } from "./widget-render";

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

      const params: WidgetParams = {
        publicKey: publicKey || null,
        shopId: shopId || null, // 後方互換性のため
        externalProductId: externalProductId || null,
        productId: productId || null, // 後方互換性のため
        sku,
        handle,
        url,
      };

      const pid = productId || externalProductId || `widget-${Date.now()}-${Math.random()}`;
      const containerId = `atelier-widget-container-${pid}`;
      
      // ボタンを即座に作成（デザイン取得前に非表示で）
      renderCube(shadowRoot, params, handleCubeClick, null);

      if (publicKey) {
        // 最大1500msでデザインを取得。タイムアウトした場合はデフォルトを表示
        const designFetch = fetchWidgetDesign(publicKey);
        const designTimeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 1500)
        );
        Promise.race([designFetch, designTimeout])
          .then((design) => {
            if (design) {
              applyDesignToButton(containerId, design);
            } else {
              showDefaultButton(containerId);
            }
          })
          .catch(() => {
            showDefaultButton(containerId);
          });
        // タイムアウト後に実際のデザインが届いた場合も適用
        designFetch.then((design) => {
          if (design) {
            applyDesignToButton(containerId, design);
          }
        }).catch(() => {});
      } else {
        // publicKeyがない場合はデフォルトを即時適用
        showDefaultButton(containerId);
      }
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
  // パラメータの検証
  if (!params.publicKey && !params.shopId) {
    alert("ウィジェットの設定エラー: Public Keyが設定されていません");
    return;
  }

  if (!params.externalProductId && !params.productId) {
    alert("ウィジェットの設定エラー: 商品IDが設定されていません。data-atelier-external-product-id属性を追加してください。");
    return;
  }

  // cube_clickイベント送信（失敗しても続行）
  const eventShopId = params.shopId || "unknown";
  sendEvent({
    shopId: eventShopId,
    productId: params.productId || params.externalProductId || undefined,
    type: "cube_click",
  }).catch(() => {});

  // モーダルを即座に表示（ローディング状態）
  const { overlay, contentArea } = renderModalWithLoading(shadowRoot, params);

  // バックグラウンドで設定を取得
  try {
    const config = await fetchWidgetConfig(params);

    if (config.enabled) {
      updateModalWithConfig(shadowRoot, config, params, overlay, contentArea);
    } else {
      const errorDetails = config.error || "不明なエラー";
      showErrorInModal(shadowRoot, `この商品の3D試着は現在利用できません。\n\nエラー: ${errorDetails}`, overlay, contentArea);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Atelier Widget] Error in handleCubeClick:", errorMessage);
    showErrorInModal(shadowRoot, `3D試着の読み込みに失敗しました。\n\nエラー: ${errorMessage}`, overlay, contentArea);
  }
}
