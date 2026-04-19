import { readApiUrlFromDocument } from "./embed-data";

/** 開発ポートのセット（Vite, Next.js等） */
const DEV_PORTS = new Set(["3000", "3001"]);

/**
 * 開発モードかどうかを判定
 * localhost/127.0.0.1 かつ既知の開発ポートで実行中の場合に true
 */
export function isDevelopmentMode(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, port } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocalHost && DEV_PORTS.has(port);
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
  
  // 2. data-fitlook-api-url（推奨）または data-atelier-api-url から取得
  const apiUrlAttr = readApiUrlFromDocument();
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
          // 相対パス: 常に現在のページオリジン（Next が 3001 等でも /api/events が届くようにする）
          return window.location.origin;
        }
      } catch (e) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return window.location.origin;
        }
      }
    }
  }
  
  // 4. フォールバック
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin;
  }
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
}
