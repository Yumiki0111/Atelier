import type { WidgetConfig, WidgetDesignConfig } from "./types";
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

/** 開発環境用のモックウィジェット設定を生成 */
function createDevMockConfig(): WidgetConfig {
  const glbUrl = "http://localhost:3000/3d/Model.fbx";
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

/** searchParamsを構築する共通関数 */
function buildSearchParams(params: WidgetParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params.publicKey) {
    searchParams.append("publicKey", params.publicKey);
  }
  // externalProductId を優先、なければ productId（後方互換性）
  if (params.externalProductId) {
    searchParams.append("externalProductId", params.externalProductId);
  } else if (params.productId) {
    searchParams.append("externalProductId", params.productId);
  }
  return searchParams;
}

export async function fetchWidgetConfig(params: WidgetParams): Promise<WidgetConfig> {
  // publicKey または shopId が必須
  if (!params.publicKey && !params.shopId) {
    throw new Error("publicKey or shopId is required");
  }

  // 開発モードでAPIサーバーが利用できない場合はモックデータを返す
  if (isDevelopmentMode()) {
    try {
      const searchParams = buildSearchParams(params);
      if (!params.externalProductId && !params.productId) {
        if (params.sku) throw new Error("SKU is not supported. Please use externalProductId.");
        if (params.handle) throw new Error("Handle is not supported. Please use externalProductId.");
        if (params.url) throw new Error("URL is not supported. Please use externalProductId.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const apiUrl = getApiBaseUrl() || "http://localhost:3000";
      const response = await fetch(
        `${apiUrl}/api/public/widget-config?${searchParams.toString()}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[Atelier Widget] API returned ${response.status}, using mock config.`);
        return createDevMockConfig();
      }

      const config = await response.json();

      // 開発環境では、APIが`enabled: false`を返した場合でもモックデータを使用
      if (!config.enabled) {
        // 実際のアセットが取得できている場合はそれを使用
        if (config.asset?.sizes && Object.keys(config.asset.sizes).length > 0) {
          return { enabled: true, asset: config.asset };
        }
        return createDevMockConfig();
      }

      return config;
    } catch (error) {
      // 開発環境では接続エラーを無視してモックデータを返す
      return createDevMockConfig();
    }
  }

  // 本番環境では通常通りAPIを呼び出す
  if (!params.externalProductId && !params.productId) {
    throw new Error("externalProductId is required");
  }

  const searchParams = buildSearchParams(params);
  const apiUrl = getApiBaseUrl();
  const requestUrl = `${apiUrl}/api/public/widget-config?${searchParams.toString()}`;

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch (fetchError) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : "Network error";
    throw new Error(`ネットワークエラー: ${errorMessage}. APIサーバーに接続できません。`);
  }

  if (!response.ok) {
    let errorText = "";
    try { errorText = await response.text(); } catch { /* ignore */ }

    let errorMessage = `APIエラー: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error) errorMessage = errorJson.error;
    } catch {
      if (errorText) errorMessage = errorText;
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * ボタン初期表示時にデザイン設定だけを軽量に取得する
 */
export async function fetchWidgetDesign(publicKey: string): Promise<WidgetDesignConfig | null> {
  const apiUrl = getApiBaseUrl() || (isDevelopmentMode() ? "http://localhost:3000" : "");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `${apiUrl}/api/public/widget-design?publicKey=${encodeURIComponent(publicKey)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    // 空オブジェクトチェック
    if (!data || (!data.button && !data.theme)) return null;
    return data as WidgetDesignConfig;
  } catch {
    return null;
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
