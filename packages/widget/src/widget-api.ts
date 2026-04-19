import { WIDGET_LOG_PREFIX } from "./embed-data";
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
  /** 埋め込み位置（例: `inline` / `embedded` = ホスト内インライン、`floating` または未指定 = 右下固定） */
  placement?: string | null;
  /** モーダル表示時の初期サイズ（API のサイズキーと一致する場合のみ有効） */
  initialSize?: string | null;
  /** 画像上などフルエリア透明タップ（inline と併用。body へのフローティングは出さない） */
  overlay?: boolean | null;
  /** `false` のとき試着モーダルを端末枠（黒ベゼル・max-width 制限）なしの全幅 UI にする（デモページ向け） */
  phoneFrame?: boolean | null;
  /**
   * `data-fitlook-desktop-panel="true"` または親ページ URL の `?fitlook-desktop-panel=true` … 右下パネル用オプトイン。
   * 未指定・false のときは EC 本番同様、常に全画面の試着 UI。
   */
  desktopPanel?: boolean | null;
  /**
   * `data-fitlook-add-to-cart-url` — `{{productId}}` `{{size}}` `{{colorId}}` 等で置換し、クリック時に `location` 遷移する。
   * ショップ側 JS なしでカート URL だけ埋め込みたい場合に使う。
   */
  addToCartUrlTemplate?: string | null;
  /**
   * `data-fitlook-auto-open` 等で初回を自動起動したときに付与。
   * 試着モーダルを閉じたあと（embed の「商品に戻る」／2D の「閉じる」）に再度スプラッシュ付きで開く。
   */
  reopenAfterModalClose?: boolean | null;
  /**
   * `data-fitlook-event-source="preview_link"` など。アナリティクスでプレビューリンク経由を識別する。
   */
  eventSource?: string | null;
}

/** 開発環境用のモックウィジェット設定を生成（2Dウィジェット用・サイズキーのみ利用） */
function createDevMockConfig(): WidgetConfig {
  const placeholder = { category: "default" as const };
  return {
    enabled: true,
    asset: {
      defaultSize: "4",
      productName: "SAMPLE PRODUCT",
      priceDisplay: "¥ 110,000 tax in",
      garmentFitAvailable: false,
      sizes: {
        "3": [placeholder],
        "4": [placeholder],
        "5": [placeholder],
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

  // 開発モードでも API が取れたら本番と同じデータを使う（失敗時のみモック）
  if (isDevelopmentMode()) {
    try {
      const searchParams = buildSearchParams(params);
      if (!params.externalProductId && !params.productId) {
        if (params.sku) throw new Error("SKU is not supported. Please use externalProductId.");
        if (params.handle) throw new Error("Handle is not supported. Please use externalProductId.");
        if (params.url) throw new Error("URL is not supported. Please use externalProductId.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const apiUrl = getApiBaseUrl() || "http://localhost:3000";
      const response = await fetch(
        `${apiUrl}/api/public/widget-config?${searchParams.toString()}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const errText = await response.text();
      let config: WidgetConfig;
      try {
        config = JSON.parse(errText) as WidgetConfig;
      } catch {
        return {
          enabled: false,
          error: `APIエラー: ${response.status} ${response.statusText}`,
        };
      }

      if (!response.ok) {
        console.warn(`${WIDGET_LOG_PREFIX} API returned ${response.status}`, config);
        return {
          enabled: false,
          error: (config as { error?: string }).error || `APIエラー: ${response.status}`,
        };
      }

      if (!config.enabled) {
        if (config.asset?.sizes && Object.keys(config.asset.sizes).length > 0) {
          return { enabled: true, asset: config.asset, shopId: config.shopId, design: config.design };
        }
        return {
          enabled: false,
          error: (config as { error?: string }).error || "この商品の試着は利用できません",
        };
      }

      return config;
    } catch (error) {
      console.warn(`${WIDGET_LOG_PREFIX} dev fetch failed, using mock`, error);
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
    if (!data || typeof data !== "object") return null;
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
      console.warn(`${WIDGET_LOG_PREFIX} Event send error:`, error);
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
      console.error(`${WIDGET_LOG_PREFIX} Failed to send event:`, error);
    }
    // エラーを再スローしない（widgetの動作を継続）
  }
}
