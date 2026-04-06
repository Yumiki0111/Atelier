/**
 * アセットURLのベースオリジンを解決する共通ヘルパー
 */
function resolveBaseOrigin(): string {
  if (typeof window === "undefined") return "";

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }

  const apiUrl =
    document.querySelector("[data-fitlook-api-url]")?.getAttribute("data-fitlook-api-url") ??
    document.querySelector("[data-atelier-api-url]")?.getAttribute("data-atelier-api-url");
  if (apiUrl) return apiUrl;

  const scriptTag = document.querySelector('script[src*="widget.js"]');
  if (scriptTag) {
    const src = scriptTag.getAttribute('src');
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        return url.origin;
      } catch { /* ignore */ }
    }
  }

  return window.location.origin;
}

export function getBackgroundImageUrl(): string {
  const origin = resolveBaseOrigin();
  return origin ? `${origin}/model_background.png` : "";
}
