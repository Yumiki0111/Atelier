/**
 * Meshcapade トークン管理
 * 
 * 二段構えの実装：
 * 1. PoC用: MESHCAPADE_TOKENが設定されていればそれを使用（手動トークン）
 * 2. 本番用: MESHCAPADE_CLIENT_ID/SECRETが設定されていればOAuth2で自動取得
 * 
 * 優先順位: CLIENT_ID/SECRET > TOKEN
 */

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp (milliseconds)
}

// トークンキャッシュ（メモリ内）
let tokenCache: TokenCache | null = null;

// トークン取得中のPromise（同時リクエストを防ぐため）
let tokenFetchPromise: Promise<string> | null = null;

/**
 * MeshcapadeのOAuth2トークン取得エンドポイント
 */
const MESHCAPADE_TOKEN_URL = process.env.MESHCAPADE_TOKEN_URL || "https://api.meshcapade.com/oauth/token";

/**
 * 手動トークン（PoC用）を取得
 */
function getManualToken(): string | null {
  return process.env.MESHCAPADE_TOKEN || null;
}

/**
 * OAuth2認証情報が設定されているかチェック
 */
function hasOAuth2Credentials(): boolean {
  return !!(process.env.MESHCAPADE_CLIENT_ID && process.env.MESHCAPADE_CLIENT_SECRET);
}

/**
 * OAuth2 client_credentialsフローでアクセストークンを取得
 */
async function fetchAccessToken(): Promise<string> {
  const clientId = process.env.MESHCAPADE_CLIENT_ID;
  const clientSecret = process.env.MESHCAPADE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "MESHCAPADE_CLIENT_ID and MESHCAPADE_CLIENT_SECRET must be set in environment variables"
    );
  }

  // Basic認証用のBase64エンコード
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(MESHCAPADE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Meshcapade Token] Failed to fetch token:", response.status, errorText);
    throw new Error(`Failed to fetch Meshcapade token: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("No access_token in response");
  }

  // 有効期限を計算（expires_inは秒単位）
  const expiresIn = data.expires_in || 3600; // デフォルト1時間
  const expiresAt = Date.now() + (expiresIn * 1000) - (60 * 1000); // 1分前に期限切れとみなす

  return data.access_token;
}

/**
 * 有効なアクセストークンを取得
 * 
 * 優先順位:
 * 1. OAuth2認証情報（CLIENT_ID/SECRET）があれば自動取得（キャッシュあり）
 * 2. 手動トークン（MESHCAPADE_TOKEN）があればそれを使用（PoC用）
 * 
 * @returns 有効なアクセストークン
 */
export async function getMeshcapadeToken(): Promise<string> {
  // OAuth2認証情報が設定されている場合：自動取得モード
  if (hasOAuth2Credentials()) {
    // キャッシュが有効な場合はそれを返す
    if (tokenCache && tokenCache.expiresAt > Date.now()) {
      return tokenCache.accessToken;
    }

    // 既にトークン取得中の場合は、そのPromiseを待つ
    if (tokenFetchPromise) {
      return tokenFetchPromise;
    }

    // 新しいトークンを取得
    tokenFetchPromise = (async () => {
      try {
        const accessToken = await fetchAccessToken();
        
        // キャッシュを更新
        const expiresIn = 3600; // デフォルト1時間（実際の値はAPIレスポンスから取得）
        tokenCache = {
          accessToken,
          expiresAt: Date.now() + (expiresIn * 1000) - (60 * 1000), // 1分前に期限切れとみなす
        };

        return accessToken;
      } catch (error) {
        // エラー時はキャッシュをクリア
        tokenCache = null;
        throw error;
      } finally {
        // Promiseをクリア
        tokenFetchPromise = null;
      }
    })();

    return tokenFetchPromise;
  }

  // OAuth2認証情報がない場合：手動トークンモード（PoC用）
  const manualToken = getManualToken();
  if (manualToken) {
    console.log("[Meshcapade Token] Using manual token (PoC mode)");
    return manualToken;
  }

  // どちらも設定されていない場合
  throw new Error(
    "Meshcapade credentials not configured. " +
    "Please set either MESHCAPADE_CLIENT_ID and MESHCAPADE_CLIENT_SECRET (for OAuth2), " +
    "or MESHCAPADE_TOKEN (for PoC/manual mode)."
  );
}

/**
 * トークンキャッシュをクリア（テスト用、または手動更新が必要な場合）
 */
export function clearTokenCache(): void {
  tokenCache = null;
  tokenFetchPromise = null;
}

/**
 * Meshcapade APIリクエスト用のヘッダーを取得
 * 
 * @returns Authorizationヘッダーを含むHeadersオブジェクト
 */
export async function getMeshcapadeHeaders(): Promise<Headers> {
  const token = await getMeshcapadeToken();
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return headers;
}
