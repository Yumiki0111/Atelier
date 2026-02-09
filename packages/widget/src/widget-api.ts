import type { WidgetConfig } from "./types";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";

export interface WidgetParams {
  publicKey?: string | null;
  shopId?: string | null; // 後方互換性のため
  externalProductId?: string | null;
  productId?: string | null; // 後方互換性のため
  sku?: string | null;
  handle?: string | null;
  url?: string | null;
}

export async function fetchWidgetConfig(params: WidgetParams): Promise<WidgetConfig> {
  // publicKey または shopId が必須
  if (!params.publicKey && !params.shopId) {
    throw new Error("publicKey or shopId is required");
  }

  // 開発モードでAPIサーバーが利用できない場合はモックデータを返す
  if (isDevelopmentMode()) {
    try {
      const searchParams = new URLSearchParams();
      if (params.publicKey) {
        searchParams.append("publicKey", params.publicKey);
      }

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
          const glbUrl = "http://localhost:3000/3d/clo_model.glb";
          return {
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
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const config = await response.json();
      
      // 開発環境では、APIが`enabled: false`を返した場合でもモックデータを使用
      if (isDevelopmentMode() && !config.enabled) {
        // 開発環境でも、実際のアセットが取得できている場合はそれを使用
        // enabled: falseでも、assetが存在する場合は使用する
        if (config.asset && config.asset.sizes && Object.keys(config.asset.sizes).length > 0) {
          return {
            enabled: true,
            asset: config.asset,
          };
        }
        // アセットが存在しない場合のみモックデータを使用
        const glbUrl = "http://localhost:3000/3d/clo_model.glb";
        return {
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
      }
      
      return config;
    } catch (error) {
      // 開発環境では接続エラーやAPIエラーを完全に無視してモックデータを返す
      if (isDevelopmentMode()) {
        // モックデータを返す（開発環境ではローカルのGLBファイルを使用）
        // consoleサーバーが起動している場合、public/3d/model_men.glbにアクセス可能
        // 開発モードでは、consoleサーバー（localhost:3000）のGLBファイルを使用
        const glbUrl = "http://localhost:3000/3d/clo_model.glb";
        
        return {
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
      }
      // 本番環境ではエラーを再スロー
      throw error;
    }
  }

  // 本番環境では通常通りAPIを呼び出す
  try {
    const searchParams = new URLSearchParams({
      publicKey: params.publicKey!,
    });

    // externalProductId を優先、なければ productId（後方互換性）
    if (params.externalProductId) {
      searchParams.append("externalProductId", params.externalProductId);
    } else if (params.productId) {
      searchParams.append("externalProductId", params.productId); // 後方互換性
    } else {
      throw new Error("externalProductId is required");
    }

    const apiUrl = getApiBaseUrl();
    const requestUrl = `${apiUrl}/api/public/widget-config?${searchParams.toString()}`;

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError) {
      // ネットワークエラー（CORS、タイムアウト、接続エラーなど）
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Network error";
      console.error("[Atelier Widget] Network error:", errorMessage);
      throw new Error(`ネットワークエラー: ${errorMessage}. APIサーバーに接続できません。`);
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch (e) {
        // レスポンスボディの読み取りに失敗
      }
      
      let errorMessage = `APIエラー: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch (e) {
        // JSON解析に失敗した場合は、テキストをそのまま使用
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      console.error("[Atelier Widget] API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 200), // 最初の200文字のみ
      });
      
      throw new Error(errorMessage);
    }

    const config = await response.json();
    return config;
  } catch (error) {
    // エラーを再スロー（上位のhandleCubeClickで処理）
    throw error;
  }
}

export async function sendEvent(event: {
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
