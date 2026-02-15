/**
 * 3DビューアコンテナのUI要素
 */
export interface ViewerContainerElements {
  viewerContainer: HTMLElement;
  modelWrapper: HTMLElement;
  floatingButtons: HTMLElement;
  jacketButton: HTMLElement;
  userButton: HTMLElement;
}

/** アセットURLのベースオリジンを解決する共通ヘルパー */
function resolveBaseOrigin(): string {
  if (typeof window === "undefined") return "";

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }

  const apiUrl = document.querySelector('[data-atelier-api-url]')?.getAttribute('data-atelier-api-url');
  if (apiUrl) {
    return apiUrl;
  }

  const scriptTag = document.querySelector('script[src*="widget.js"]');
  if (scriptTag) {
    const src = scriptTag.getAttribute('src');
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        return url.origin;
      } catch {
        // URL解析に失敗
      }
    }
  }

  return window.location.origin;
}

export function getBackgroundImageUrl(): string {
  const origin = resolveBaseOrigin();
  return origin ? `${origin}/model_background.png` : "";
}

function getIconUrl(iconName: string): string {
  const origin = resolveBaseOrigin();
  return origin ? `${origin}/icon/${iconName}.png` : "";
}

/**
 * 3DビューアコンテナのUI要素を作成
 */
export function createViewerContainer(productName?: string): ViewerContainerElements {
  const viewerContainer = document.createElement("div");
  viewerContainer.setAttribute("data-atelier-viewer-container", "true");
  const backgroundImageUrl = getBackgroundImageUrl();
  viewerContainer.style.cssText = `
    position: relative !important;
    flex: 1;
    min-height: 0;
    overflow: hidden !important;
    transform-origin: center center;
    pointer-events: auto;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    width: 100%;
    background-image: url(${backgroundImageUrl});
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  `;

  const modelWrapper = document.createElement("div");
  modelWrapper.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  `;

  viewerContainer.appendChild(modelWrapper);

  // フローティングアクションボタン
  const floatingButtons = document.createElement("div");
  floatingButtons.setAttribute("data-atelier-floating-buttons", "true");
  floatingButtons.style.cssText = `
    position: absolute;
    right: 5%;
    top: 55%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: auto;
    z-index: 10001;
  `;

  // 共通のフローティングボタンスタイル
  const floatingBtnStyle = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    transition: all 0.2s ease;
    color: black;
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    flex-shrink: 0;
    padding: 0;
  `;

  // ジャケットアイコンボタン
  const jacketButton = document.createElement("button");
  const jacketIcon = document.createElement("img");
  jacketIcon.src = getIconUrl("jacket");
  jacketIcon.alt = "ジャケット";
  jacketIcon.style.cssText = `width: 16px; height: 16px; object-fit: contain;`;
  jacketButton.appendChild(jacketIcon);
  jacketButton.style.cssText = floatingBtnStyle;

  // ユーザーアイコンボタン
  const userButton = document.createElement("button");
  const userIcon = document.createElement("img");
  userIcon.src = getIconUrl("person");
  userIcon.alt = "ユーザー";
  userIcon.style.cssText = `width: 16px; height: 16px; object-fit: contain;`;
  userButton.appendChild(userIcon);
  userButton.style.cssText = floatingBtnStyle;

  floatingButtons.appendChild(jacketButton);
  floatingButtons.appendChild(userButton);

  return {
    viewerContainer,
    modelWrapper,
    floatingButtons,
    jacketButton,
    userButton,
  };
}
