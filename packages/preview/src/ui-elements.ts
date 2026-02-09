import type { ProductSize } from "@atelier/shared";

/**
 * サイズ選択エリアのUI要素を作成
 */
export interface SizeAreaElements {
  sizeArea: HTMLElement;
  sizeButtons: HTMLElement[];
  sizeButtonsContainer: HTMLElement;
  productNameDiv: HTMLElement | null;
  prevButton: HTMLElement;
  nextButton: HTMLElement;
}

export function createSizeArea(
  availableSizes: ProductSize[],
  initialSize: ProductSize,
  productName?: string
): SizeAreaElements {
  // サイズ選択エリア（下3/4線のすぐ下に配置、はみ出さないように修正）
  const sizeArea = document.createElement("div");
  sizeArea.setAttribute("data-atelier-size-area", "true");
  sizeArea.style.cssText = `
    position: absolute;
    top: 83%;
    left: 0;
    right: 0;
    width: 100%;
    flex-shrink: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2%;
    padding: 0 6%;
    padding-bottom: 0.2%;
    box-sizing: border-box;
    min-height: 150px;
    overflow: hidden;
    max-height: 17%;
  `;

  // サイズ選択ボタン全体のコンテナ
  const sizeSelectorWrapper = document.createElement("div");
  sizeSelectorWrapper.style.cssText = `
    display: flex;
    align-items: center;
    width: 100%;
    position: relative;
    min-width: 0;
  `;

  // サイズボタンコンテナ（滑らかなスクロール用、はみ出さないように修正）
  const sizeButtonsContainer = document.createElement("div");
  sizeButtonsContainer.className = "size-buttons-container";
  sizeButtonsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    justify-content: center;
    flex: 1;
    min-width: 0;
    max-width: 100%;
    padding: 0 50px;
    margin: 0 auto;
    box-sizing: border-box;
  `;
  
  // スクロールバーを非表示
  const style = document.createElement("style");
  style.textContent = `
    .size-buttons-container::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);

  // サイズボタン配列
  const sizeButtons: HTMLElement[] = [];

  // サイズボタンを横並びで表示（S, M, L, XLなど）
  availableSizes.forEach((size, index) => {
    const sizeBtn = document.createElement("button");
    sizeBtn.textContent = size;
    const isSelected = size === initialSize;
    sizeBtn.style.cssText = `
      background: ${isSelected ? "#000000" : "rgba(255, 255, 255, 0.95)"};
      color: ${isSelected ? "#ffffff" : "#374151"};
      border: ${isSelected ? "1px solid #000000" : "1px solid rgba(0, 0, 0, 0.15)"};
      font-size: 16px;
      font-weight: ${isSelected ? "700" : "600"};
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 45px;
      min-height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      white-space: nowrap;
      flex-shrink: 0;
    `;
    
    sizeButtons.push(sizeBtn);
    sizeButtonsContainer.appendChild(sizeBtn);
  });

  // ナビゲーションボタン
  const prevButton = document.createElement("button");
  prevButton.innerHTML = "&lt;";
  prevButton.style.cssText = `
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    color: #374151;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  `;

  const nextButton = document.createElement("button");
  nextButton.innerHTML = "&gt;";
  nextButton.style.cssText = `
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    color: #374151;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  `;

  sizeSelectorWrapper.appendChild(prevButton);
  sizeSelectorWrapper.appendChild(sizeButtonsContainer);
  sizeSelectorWrapper.appendChild(nextButton);
  sizeArea.appendChild(sizeSelectorWrapper);

  // 商品名をサイズ選択のすぐ下に配置
  let productNameDiv: HTMLElement | null = null;
  if (productName) {
    productNameDiv = document.createElement("div");
    productNameDiv.textContent = productName.toUpperCase();
    productNameDiv.style.cssText = `
      font-size: 2.5%;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #1f2937;
      text-align: center;
      width: 100%;
      padding-top: 1%;
      padding-bottom: 0.5%;
      box-sizing: border-box;
    `;
    sizeArea.appendChild(productNameDiv);
  }

  return {
    sizeArea,
    sizeButtons,
    sizeButtonsContainer,
    productNameDiv,
    prevButton,
    nextButton,
  };
}

/**
 * 3DビューアコンテナのUI要素を作成
 */
export interface ViewerContainerElements {
  viewerContainer: HTMLElement;
  modelWrapper: HTMLElement;
  floatingButtons: HTMLElement;
  jacketButton: HTMLElement;
  userButton: HTMLElement;
}

function getBackgroundImageUrl(): string {
  if (typeof window === "undefined") return "";
  
  // 開発環境では常にconsoleサーバー（3000）から取得
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `http://localhost:3000/model_background.png`;
  }
  
  // data-atelier-api-url属性から取得
  const apiUrl = document.querySelector('[data-atelier-api-url]')?.getAttribute('data-atelier-api-url');
  if (apiUrl) {
    return `${apiUrl}/model_background.png`;
  }
  
  // widget.jsのスクリプトタグから取得（getApiBaseUrlと同じロジック）
  const scriptTag = document.querySelector('script[src*="widget.js"]');
  if (scriptTag) {
    const src = scriptTag.getAttribute('src');
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        return `${url.origin}/model_background.png`;
      } catch (e) {
        // URL解析に失敗
      }
    }
  }
  
  return `${window.location.origin}/model_background.png`;
}

export function createViewerContainer(productName?: string): ViewerContainerElements {
  // 3Dモデルエリア（中央、flex: 1で残りのスペースを埋める）
  const viewerContainer = document.createElement("div");
  viewerContainer.setAttribute("data-atelier-viewer-container", "true");
  const backgroundImageUrl = getBackgroundImageUrl();
  viewerContainer.style.cssText = `
    position: relative !important;
    flex: 1;
    min-height: 0;
    overflow: visible !important;
    transform-origin: center center;
    pointer-events: auto;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background-image: url(${backgroundImageUrl});
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  `;
  
  // 3Dモデルを表示するためのラッパー
  const modelWrapper = document.createElement("div");
  modelWrapper.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  `;
  
  viewerContainer.appendChild(modelWrapper);

  // 右側フローティングアクションボタン（サイズボタンと同じようにcontainerに対してposition: absoluteで配置）
  const floatingButtons = document.createElement("div");
  floatingButtons.setAttribute("data-atelier-floating-buttons", "true");
  floatingButtons.style.cssText = `
    position: absolute;
    right: 24px;
    top: 55%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: auto;
    z-index: 10001;
  `;
  
  const getIconUrl = (iconName: string): string => {
    if (typeof window === "undefined") return "";
    
    // 開発環境では常にconsoleサーバー（3000）から取得
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `http://localhost:3000/icon/${iconName}.png`;
    }
    
    // data-atelier-api-url属性から取得
    const apiUrl = document.querySelector('[data-atelier-api-url]')?.getAttribute('data-atelier-api-url');
    if (apiUrl) {
      return `${apiUrl}/icon/${iconName}.png`;
    }
    
    // widget.jsのスクリプトタグから取得（getApiBaseUrlと同じロジック）
    const scriptTag = document.querySelector('script[src*="widget.js"]');
    if (scriptTag) {
      const src = scriptTag.getAttribute('src');
      if (src) {
        try {
          const url = new URL(src, window.location.href);
          return `${url.origin}/icon/${iconName}.png`;
        } catch (e) {
          // URL解析に失敗
        }
      }
    }
    
    return `${window.location.origin}/icon/${iconName}.png`;
  };

  // ジャケットアイコンボタン
  const jacketButton = document.createElement("button");
  const jacketIcon = document.createElement("img");
  jacketIcon.src = getIconUrl("jacket");
  jacketIcon.alt = "ジャケット";
  jacketIcon.style.cssText = `
    width: 20px;
    height: 20px;
    object-fit: contain;
  `;
  jacketButton.appendChild(jacketIcon);
  jacketButton.style.cssText = `
    width: 44px;
    height: 44px;
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
  `;

  // ユーザーアイコンボタン
  const userButton = document.createElement("button");
  const userIcon = document.createElement("img");
  userIcon.src = getIconUrl("person");
  userIcon.alt = "ユーザー";
  userIcon.style.cssText = `
    width: 20px;
    height: 20px;
    object-fit: contain;
  `;
  userButton.appendChild(userIcon);
  userButton.style.cssText = `
    width: 44px;
    height: 44px;
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
  `;

  floatingButtons.appendChild(jacketButton);
  floatingButtons.appendChild(userButton);
  
  // フローティングボタンはcontainerに追加される（preview.tsで処理）
  // ここでは追加しない

  return {
    viewerContainer,
    modelWrapper,
    floatingButtons,
    jacketButton,
    userButton,
  };
}

