// 開発モードかどうかを判定
export function isDevelopmentMode(): boolean {
  if (typeof window === "undefined") return false;
  // Viteの開発サーバーは通常5173や5174ポートを使用
  // または開発用のHTMLファイルから実行されている場合
  // localhostの任意のポートも開発モードとして扱う
  const port = window.location.port;
  const hostname = window.location.hostname;
  return (
    port === "5174" ||
    port === "5173" ||
    port === "3001" ||
    port === "3000" ||
    (hostname === "localhost" && (port === "" || port === "5174" || port === "5173" || port === "3001" || port === "3000"))
  );
}

// API base URL - will be determined at runtime from the current page
export function getApiBaseUrl(): string {
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
        // widget.jsのURLから正しいオリジンを取得（相対パスの場合は現在のオリジンを使用）
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return `${url.protocol}//${url.host}`;
        } else {
          // 相対パスの場合、現在のオリジンを使用（開発環境ではlocalhost:3000を想定）
          // 開発環境の判定: localhost:3001などで動いている場合はlocalhost:3000を返す
          if (window.location.hostname === 'localhost' && window.location.port !== '3000') {
            return `http://localhost:3000`;
          }
          return window.location.origin;
        }
      } catch (e) {
        // URL解析に失敗した場合は開発環境のフォールバックを使用
        if (window.location.hostname === 'localhost' && window.location.port !== '3000') {
          return `http://localhost:3000`;
        }
      }
    }
  }
  
  // 4. フォールバック: 開発環境ではlocalhost:3000、それ以外は現在のオリジンを使用
  if (window.location.hostname === 'localhost' && window.location.port !== '3000') {
    return `http://localhost:3000`;
  }
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
}
