import type { WidgetConfig } from "./types";
import { initPreviewPanel } from "@atelier/preview";
import type { PreviewPanelInstance } from "@atelier/preview";

// 開発モードかどうかを判定
function isDevelopmentMode(): boolean {
  if (typeof window === "undefined") return false;
  // Viteの開発サーバーは通常5173や5174ポートを使用
  // または開発用のHTMLファイルから実行されている場合
  const port = window.location.port;
  const hostname = window.location.hostname;
  return (
    port === "5174" ||
    port === "5173" ||
    (hostname === "localhost" && (port === "" || port === "5174" || port === "5173"))
  );
}

// API base URL - will be determined at runtime from the current page
function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  
  // 1. 環境変数から取得（ビルド時に設定）
  // @ts-ignore - Viteのdefineで注入される
  if (typeof process !== "undefined" && process.env?.API_BASE_URL) {
    // @ts-ignore
    return process.env.API_BASE_URL;
  }
  
  // 2. data-atelier-api-url属性から取得（ページごとに設定可能）
  const apiUrlAttr = document.querySelector('[data-atelier-api-url]')?.getAttribute('data-atelier-api-url');
  if (apiUrlAttr) {
    return apiUrlAttr;
  }
  
  // 3. デフォルト: widget.jsが読み込まれたドメイン（consoleアプリのドメイン）
  // widget.jsのスクリプトタグのsrcから取得を試みる
  const scriptTag = document.querySelector('script[src*="widget.js"]');
  if (scriptTag) {
    const src = scriptTag.getAttribute('src');
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        return `${url.protocol}//${url.host}`;
      } catch (e) {
        // URL解析に失敗した場合は現在のオリジンを使用
      }
    }
  }
  
  // 4. フォールバック: 現在のオリジンを使用
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
}

export function initWidget() {
  // Find all elements with data-atelier attributes
  // 後方互換性のため、data-atelier-shop-id と data-atelier-public-key の両方をサポート
  const elements = document.querySelectorAll<HTMLElement>(
    "[data-atelier-public-key], [data-atelier-shop-id]"
  );

  console.log(`[Atelier Widget] Found ${elements.length} widget element(s)`);

  if (elements.length === 0) {
    console.warn("[Atelier Widget] No widget elements found. Make sure you have elements with data-atelier-public-key or data-atelier-shop-id attribute.");
    return;
  }

  elements.forEach((element, index) => {
    console.log(`[Atelier Widget] Initializing widget ${index + 1}/${elements.length}`, element);
    
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
    });
  });
}

function renderCube(
  shadowRoot: ShadowRoot,
  params: {
    publicKey?: string | null;
    shopId?: string | null; // 後方互換性のため
    externalProductId?: string | null;
    productId?: string | null; // 後方互換性のため
    sku?: string | null;
    handle?: string | null;
    url?: string | null;
  }
) {
  // Create button container
  const button = document.createElement("button");
  button.style.cssText = `
    width: 200px;
    height: 48px;
    background: white;
    border: 2px solid black;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: black;
    font-weight: 600;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    padding: 0;
    outline: none;
  `;
  button.textContent = "3Dで試着する";

  button.addEventListener("mouseenter", () => {
    button.style.background = "black";
    button.style.color = "white";
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.background = "white";
    button.style.color = "black";
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
  });

  button.addEventListener("click", async () => {
    await handleCubeClick(shadowRoot, params);
  });

  shadowRoot.appendChild(button);

  // Send cube_view event (失敗しても続行)
  // 後方互換性のため、shopId が存在する場合は使用
  const eventShopId = params.shopId || "unknown"; // 後方互換性のため
  sendEvent({
    shopId: eventShopId,
    productId: params.productId || params.externalProductId || undefined,
    type: "cube_view",
  }).catch(() => {
    // 開発環境ではエラーを無視
  });
}

async function handleCubeClick(
  shadowRoot: ShadowRoot,
  params: {
    publicKey?: string | null;
    shopId?: string | null; // 後方互換性のため
    externalProductId?: string | null;
    productId?: string | null; // 後方互換性のため
    sku?: string | null;
    handle?: string | null;
    url?: string | null;
  }
) {
  try {
    // Send cube_click event (失敗しても続行)
    const eventShopId = params.shopId || "unknown"; // 後方互換性のため
    sendEvent({
      shopId: eventShopId,
      productId: params.productId || params.externalProductId || undefined,
      type: "cube_click",
    }).catch(() => {
      // 開発環境ではエラーを無視（既にsendEvent内で警告を表示）
    });

    // Fetch widget config (開発環境では自動的にモックデータを使用)
    const config = await fetchWidgetConfig(params);
    if (config.enabled) {
      renderModal(shadowRoot, config, params);
    } else {
      // 開発環境では、enabled: falseでもモックデータでモーダルを表示
      if (isDevelopmentMode()) {
        console.warn(
          "[Atelier Widget] Widget is disabled, but using mock config for development."
        );
        const glbUrl = "http://localhost:3000/3d/model_men.glb";
        const mockConfig: WidgetConfig = {
          enabled: true,
          asset: {
            defaultSize: "M",
            sizes: {
              S: { glbUrl },
              M: { glbUrl },
              L: { glbUrl },
            },
          },
        };
        renderModal(shadowRoot, mockConfig, params);
      } else {
        console.warn("[Atelier Widget] Widget is disabled for this product");
      }
    }
  } catch (error) {
    // 開発環境ではエラーをログに出力して続行
    if (isDevelopmentMode()) {
      console.error("[Atelier Widget] Error in handleCubeClick:", error);
      // 開発環境では、エラーが発生してもモックデータでモーダルを表示
      const glbUrl = "http://localhost:3000/3d/model_men.glb";
      const mockConfig: WidgetConfig = {
        enabled: true,
        asset: {
          defaultSize: "M",
          sizes: {
            S: { glbUrl },
            M: { glbUrl },
            L: { glbUrl },
          },
        },
      };
      renderModal(shadowRoot, mockConfig, params);
    } else {
      // 本番環境ではエラーを再スロー
      throw error;
    }
  }
}

async function fetchWidgetConfig(params: {
  publicKey?: string | null;
  shopId?: string | null; // 後方互換性のため
  externalProductId?: string | null;
  productId?: string | null; // 後方互換性のため
  sku?: string | null;
  handle?: string | null;
  url?: string | null;
}): Promise<WidgetConfig> {
  // publicKey が必須
  if (!params.publicKey) {
    throw new Error("publicKey is required");
  }

  // 開発モードでAPIサーバーが利用できない場合はモックデータを返す
  if (isDevelopmentMode()) {
    try {
      const searchParams = new URLSearchParams({
        publicKey: params.publicKey,
      });

      // externalProductId を優先、なければ productId（後方互換性）
      if (params.externalProductId) {
        searchParams.append("externalProductId", params.externalProductId);
      } else if (params.productId) {
        searchParams.append("externalProductId", params.productId); // 後方互換性
      } else if (params.sku) {
        // SKU はサポートされていないため、エラーを返す
        throw new Error("SKU is not supported. Please use externalProductId.");
      } else if (params.handle) {
        // Handle はサポートされていないため、エラーを返す
        throw new Error("Handle is not supported. Please use externalProductId.");
      } else if (params.url) {
        // URL はサポートされていないため、エラーを返す
        throw new Error("URL is not supported. Please use externalProductId.");
      }

      // 開発環境では、consoleサーバーに接続を試みる（タイムアウトを長めに設定）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒に延長

      const apiUrl = getApiBaseUrl() || "http://localhost:3000"; // フォールバック
      const response = await fetch(
        `${apiUrl}/api/public/widget-config?${searchParams.toString()}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 開発環境では、APIエラー（400/500）もモックデータを返す
        if (isDevelopmentMode()) {
          console.warn(
            `[Atelier Widget] API returned ${response.status}, using mock config.`
          );
          // モックデータを返す
          const glbUrl = "http://localhost:3000/3d/model_men.glb";
          return {
            enabled: true,
            asset: {
              defaultSize: "M",
              sizes: {
                S: { glbUrl },
                M: { glbUrl },
                L: { glbUrl },
              },
            },
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const config = await response.json();
      
      // 開発環境では、APIが`enabled: false`を返した場合でもモックデータを使用
      if (isDevelopmentMode() && !config.enabled) {
        console.warn(
          "[Atelier Widget] API returned enabled: false, using mock config for development."
        );
        const glbUrl = "http://localhost:3000/3d/model_men.glb";
        return {
          enabled: true,
          asset: {
            defaultSize: "M",
            sizes: {
              S: { glbUrl },
              M: { glbUrl },
              L: { glbUrl },
            },
          },
        };
      }
      
      return config;
    } catch (error) {
      // 開発環境では接続エラーやAPIエラーを完全に無視してモックデータを返す
      if (isDevelopmentMode()) {
        // 最初の1回だけログを表示
        if (!(window as any).__atelier_widget_config_warned) {
          console.info(
            "[Atelier Widget] Development mode: Using mock config. " +
            "To use real API, start console server: npm run dev:console"
          );
          (window as any).__atelier_widget_config_warned = true;
        }
        // モックデータを返す（開発環境ではローカルのGLBファイルを使用）
        // consoleサーバーが起動している場合、public/3d/model_men.glbにアクセス可能
        // 開発モードでは、consoleサーバー（localhost:3000）のGLBファイルを使用
        const glbUrl = "http://localhost:3000/3d/model_men.glb";
        
        return {
          enabled: true,
          asset: {
            defaultSize: "M",
            sizes: {
              S: { glbUrl },
              M: { glbUrl },
              L: { glbUrl },
            },
          },
        };
      }
      // 本番環境ではエラーを再スロー
      throw error;
    }
  }

  // 本番環境では通常通りAPIを呼び出す
  const searchParams = new URLSearchParams({
    publicKey: params.publicKey,
  });

  // externalProductId を優先、なければ productId（後方互換性）
  if (params.externalProductId) {
    searchParams.append("externalProductId", params.externalProductId);
  } else if (params.productId) {
    searchParams.append("externalProductId", params.productId); // 後方互換性
  } else {
    throw new Error("externalProductId is required");
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/public/widget-config?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch widget config: ${response.statusText}`);
  }

  return response.json();
}

function renderModal(
  shadowRoot: ShadowRoot,
  config: WidgetConfig,
  params: {
    publicKey?: string | null;
    shopId?: string | null; // 後方互換性のため
    externalProductId?: string | null;
    productId?: string | null; // 後方互換性のため
  }
) {
  // Send widget_open event
  const eventShopId = params.shopId || "unknown"; // 後方互換性のため
  sendEvent({
    shopId: eventShopId,
    productId: params.productId || params.externalProductId || undefined,
    type: "widget_open",
  });

  // Create modal overlay - 全画面表示
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
    overflow: hidden;
  `;

  // Create modal content - 全画面表示
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 24px;
    box-sizing: border-box;
    overflow: hidden;
  `;

  // Close button - PreviewPanelと同じスタイル
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×";
  closeButton.style.cssText = `
    position: absolute;
    top: 24px;
    right: 24px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    z-index: 1;
  `;
  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
  });
  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
  });
  closeButton.addEventListener("click", () => {
    shadowRoot.removeChild(overlay);
  });

  // Main content area - PreviewPanelと同じレイアウト（電話フレームなし）
  // エンドユーザー向けにはタイトルは不要（閉じるボタンのみ）
  const contentArea = document.createElement("div");
  contentArea.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  `;
  
  modal.appendChild(closeButton);
  modal.appendChild(contentArea);
  overlay.appendChild(modal);

  shadowRoot.appendChild(overlay);

  // Initialize preview panel using @atelier/preview（新デザイン：サイズ選択 + 質問入力）
  const defaultSize = config.asset?.defaultSize || "M";
  const availableSizes: string[] = config.asset?.sizes 
    ? Object.keys(config.asset.sizes)
    : ["S", "M", "L"];
  let currentSize = defaultSize;
  let glbUrl = config.asset?.sizes[currentSize]?.glbUrl;
  
  // 会話管理用の変数
  let conversationId: string | undefined;
  let sessionId: string | undefined;
  
  // 開発モードでglbUrlがundefinedの場合、デフォルトのGLBファイルを使用
  if (isDevelopmentMode() && !glbUrl) {
    glbUrl = "http://localhost:3000/3d/model_men.glb";
  }
  
  console.log("[Atelier Widget] Initializing preview panel:", {
    glbUrl,
    hasConfig: !!config.asset,
    defaultSize,
    availableSizes,
  });
  
  const previewInstance = initPreviewPanel({
    container: contentArea,
    glbUrl: glbUrl,
    textureUrl: undefined,
    initialHeight: 170,
    minHeight: 150,
    maxHeight: 190,
    availableSizes,
    initialSize: currentSize,
    onSizeChange: (size) => {
      currentSize = size;
      const newGlbUrl = config.asset?.sizes[size]?.glbUrl || 
        (isDevelopmentMode() ? "http://localhost:3000/3d/model_men.glb" : undefined);
      previewInstance.updateGlbUrl(newGlbUrl);
      const eventShopId = params.shopId || "unknown"; // 後方互換性のため
      sendEvent({
        shopId: eventShopId,
        productId: params.productId || params.externalProductId || undefined,
        type: "size_change",
        meta: { size },
      });
    },
    onHeightChange: (height) => {
      const eventShopId = params.shopId || "unknown"; // 後方互換性のため
      sendEvent({
        shopId: eventShopId,
        productId: params.productId || params.externalProductId || undefined,
        type: "height_change",
        meta: { height },
      });
    },
    onMessageSend: async (message) => {
      try {
        const apiUrl = getApiBaseUrl() || "http://localhost:3000"; // フォールバック
        const eventShopId = params.shopId || "unknown"; // 後方互換性のため
        const eventProductId = params.productId || params.externalProductId || undefined;
        const requestBody = {
          message,
          productId: eventProductId,
          shopId: eventShopId,
          conversationId: conversationId,
          sessionId: sessionId,
          context: {
            size: currentSize,
          },
        };
        
        console.log("[Atelier Widget] Sending chat request:", {
          apiUrl: `${apiUrl}/api/chat`,
          shopId: eventShopId,
          productId: eventProductId,
          conversationId: conversationId,
          sessionId: sessionId,
          messageLength: message.length,
        });
        
        const response = await fetch(`${apiUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log("[Atelier Widget] Chat API response status:", response.status);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("[Atelier Widget] Chat API error:", {
            status: response.status,
            error,
          });
          // エラーメッセージを返す（適当な返信を返さない）
          throw new Error(error.message || error.error || "メッセージの送信に失敗しました");
        }

        const data = await response.json();
        console.log("[Atelier Widget] Chat API response data:", {
          hasResponse: !!data.response,
          conversationId: data.conversationId,
          sessionId: data.sessionId,
          responseLength: data.response?.length || 0,
        });
        
        if (!data.response) {
          throw new Error("レスポンスが空です");
        }
        
        // 会話IDとセッションIDを保存（次回のリクエストで使用）
        if (data.conversationId) {
          console.log("[Atelier Widget] Conversation ID received:", data.conversationId);
          conversationId = data.conversationId;
        }
        if (data.sessionId) {
          console.log("[Atelier Widget] Session ID received:", data.sessionId);
          sessionId = data.sessionId;
        }
        
        return data.response;
      } catch (error) {
        // 開発環境では接続エラーを適切に処理
        if (
          error instanceof Error &&
          (error.message === "Failed to fetch" ||
            error.message.includes("network") ||
            error.message.includes("connection") ||
            error.name === "AbortError")
        ) {
          console.warn("[Atelier Widget] Chat API not available (development mode)");
          // 開発環境でconsoleサーバーが起動していない場合のメッセージ
          const errorMessage = isDevelopmentMode()
            ? "開発環境では、consoleサーバー（npm run dev:console）を起動してください。商品情報を取得するには、APIサーバーへの接続が必要です。"
            : "チャットサービスに接続できません。しばらくしてから再度お試しください。";
          throw new Error(errorMessage);
        }
        console.error("[Atelier Widget] Failed to send message:", error);
        // エラーを再スローして、preview.tsで適切に処理されるようにする
        throw error;
      }
    },
    onModelLoad: () => {
      console.log("[Atelier Widget] 3D model loaded:", glbUrl);
    },
    onModelError: (error) => {
      // 開発環境では接続エラーを抑制（consoleサーバーが起動していない場合）
      if (
        error instanceof Error &&
        (error.message === "Failed to fetch" ||
          error.message.includes("network") ||
          error.message.includes("connection"))
      ) {
        // 開発環境ではエラーログを出さない
        return;
      }
      console.error("[Atelier Widget] Failed to load 3D model:", error, glbUrl);
    },
  });
}

async function sendEvent(event: {
  shopId: string;
  productId?: string;
  type: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  // 開発モードではAPIサーバーが利用できない場合を想定
  if (isDevelopmentMode()) {
    // 開発モードでは、APIサーバーが利用可能かどうかをチェック
    // 利用可能な場合のみ送信を試みる
    const apiUrl = getApiBaseUrl();
    
    // 最初の1回だけ警告を表示
    if (!(window as any).__atelier_widget_dev_mode_info) {
      console.info(
        "[Atelier Widget] Development mode active. " +
        "API events will be sent if console server is available. " +
        "To enable API, start: npm run dev:console"
      );
      (window as any).__atelier_widget_dev_mode_info = true;
    }
    
    try {
      // タイムアウトを短く設定して、すぐに失敗するようにする
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const response = await fetch(`${apiUrl}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return; // 成功した場合は終了
    } catch (error) {
      // 開発環境では接続エラーを完全に無視（ログも出さない）
      // AbortErrorやTypeError（Failed to fetch）は無視
      // ブラウザのコンソールにはERR_CONNECTION_REFUSEDが表示されるが、
      // これはブラウザのネットワークエラーなのでJavaScript側では抑制できない
      // widgetの動作には影響しない
      if (
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message === "Failed to fetch" ||
          error.message.includes("network") ||
          error.message.includes("connection"))
      ) {
        return; // エラーを無視して続行
      }
      // その他のエラーは警告として表示
      console.warn("[Atelier Widget] Event send error:", error);
      return;
    }
  }

  // 本番環境では通常通りAPIを呼び出す
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    // 本番環境でもエラーを再スローしない（widgetの動作を継続）
    // ただし、本番環境ではエラーをログに記録
    if (!isDevelopmentMode()) {
      console.error("[Atelier Widget] Failed to send event:", error);
    }
    // エラーを再スローしない（widgetの動作を継続）
  }
}
