import type { ProductSize } from "@atelier/shared";

/**
 * サイズ選択エリアのUI要素を作成
 */
export interface SizeAreaElements {
  sizeArea: HTMLElement;
  sizeButtons: HTMLElement[];
  sizeButtonsContainer: HTMLElement;
  prevButton: HTMLElement;
  nextButton: HTMLElement;
}

export function createSizeArea(
  availableSizes: ProductSize[],
  initialSize: ProductSize,
  productName?: string
): SizeAreaElements {
  // サイズ選択エリア（下に配置するため、絶対配置用のコンテナ）
  const sizeArea = document.createElement("div");
  sizeArea.style.cssText = `
    position: absolute;
    left: 0;
    right: 0;
    bottom: 8px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
  `;

  // サイズ選択ボタン全体のコンテナ（矢印ボタンとサイズボタンを含む）
  const sizeSelectorWrapper = document.createElement("div");
  sizeSelectorWrapper.style.cssText = `
    display: flex;
    align-items: center;
    width: 100%;
    position: relative;
    min-width: 0;
    overflow: visible;
  `;

  // 左矢印ボタン（画面左端に固定）
  const prevButton = document.createElement("button");
  prevButton.innerHTML = "&lt;";
  prevButton.style.cssText = `
    position: absolute;
    left: 0;
    background: transparent;
    border: none;
    font-size: 18px;
    color: black;
    cursor: pointer;
    padding: 6px 10px;
    outline: none;
    transition: all 0.15s ease;
    font-weight: 500;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    z-index: 10;
    flex-shrink: 0;
  `;

  // サイズ選択ボタンコンテナ（横スクロール可能、中央に配置）
  const sizeButtonsContainer = document.createElement("div");
  sizeButtonsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    justify-content: flex-start;
    flex: 1;
    min-width: 200px;
    padding: 0 48px;
    margin: 0 auto;
  `;
  
  // スクロールバーを非表示（Chrome, Safari, Edge）
  const style = document.createElement("style");
  style.textContent = `
    [data-size-buttons-container]::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);
  sizeButtonsContainer.setAttribute("data-size-buttons-container", "true");

  // サイズボタン配列
  const sizeButtons: HTMLElement[] = [];

  // サイズボタンを横並びで表示（S, M, L, XLなど）
  console.log("[Atelier Preview] Creating size buttons:", availableSizes, "initialSize:", initialSize);
  console.log("[Atelier Preview] availableSizes length:", availableSizes.length);
  availableSizes.forEach((size, index) => {
    const sizeBtn = document.createElement("button");
    sizeBtn.textContent = size;
    const isSelected = size === initialSize;
    sizeBtn.style.cssText = `
      background: ${isSelected ? "black" : "#d1d5db"};
      color: white;
      border: none;
      font-size: 14px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 40px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      flex-shrink: 0;
      white-space: nowrap;
    `;
    sizeButtons.push(sizeBtn);
    sizeButtonsContainer.appendChild(sizeBtn);
    console.log("[Atelier Preview] Added size button:", size, "selected:", isSelected, "index:", index);
    console.log("[Atelier Preview] Button element:", sizeBtn, "parent:", sizeButtonsContainer);
  });
  console.log("[Atelier Preview] Total size buttons created:", sizeButtons.length);
  console.log("[Atelier Preview] sizeButtonsContainer children:", sizeButtonsContainer.children.length);
  console.log("[Atelier Preview] sizeButtonsContainer computed width:", sizeButtonsContainer.offsetWidth);

  // 右矢印ボタン（画面右端に固定）
  const nextButton = document.createElement("button");
  nextButton.innerHTML = "&gt;";
  nextButton.style.cssText = `
    position: absolute;
    right: 0;
    background: transparent;
    border: none;
    font-size: 18px;
    color: black;
    cursor: pointer;
    padding: 4px 8px;
    outline: none;
    transition: all 0.15s ease;
    font-weight: 500;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    z-index: 10;
  `;

  // レイアウト: 左矢印（絶対配置） → サイズボタンコンテナ（中央） → 右矢印（絶対配置）
  sizeSelectorWrapper.appendChild(prevButton);
  sizeSelectorWrapper.appendChild(sizeButtonsContainer);
  sizeSelectorWrapper.appendChild(nextButton);
  sizeArea.appendChild(sizeSelectorWrapper);

  // 商品名をサイズ選択の下に追加
  console.log("[Atelier Preview] Product name:", productName);
  if (productName) {
    const productNameDiv = document.createElement("div");
    productNameDiv.textContent = productName;
    productNameDiv.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: #374151;
      margin-top: 8px;
      text-align: center;
      width: 100%;
    `;
    sizeArea.appendChild(productNameDiv);
    console.log("[Atelier Preview] Product name div added to sizeArea");
  } else {
    console.warn("[Atelier Preview] No product name provided");
  }

  return {
    sizeArea,
    sizeButtons,
    sizeButtonsContainer,
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

export function createViewerContainer(productName?: string): ViewerContainerElements {
  // 3Dモデルエリア（中央、広く取る）
  const viewerContainer = document.createElement("div");
  viewerContainer.style.cssText = `
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    transform-origin: center top;
    pointer-events: auto;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
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

  // 右側フローティングアクションボタン
  const floatingButtons = document.createElement("div");
  floatingButtons.style.cssText = `
    position: absolute;
    right: 16px;
    bottom: 120px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 25;
    pointer-events: none;
  `;
  
  // アイコン画像のURLを取得する関数
  const getIconUrl = (iconName: string): string => {
    if (typeof window === "undefined") {
      return "";
    }
    
    // 開発環境では、consoleサーバーのpublicフォルダから取得
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      const port = window.location.port || "3000";
      return `http://localhost:${port}/icon/${iconName}.png`;
    }
    
    // 本番環境では、widget.jsが読み込まれたドメインから取得
    const scriptTag = document.querySelector('script[src*="widget.js"]');
    if (scriptTag) {
      const src = scriptTag.getAttribute("src");
      if (src) {
        try {
          const url = new URL(src, window.location.href);
          return `${url.protocol}//${url.host}/icon/${iconName}.png`;
        } catch (e) {
          // URL解析に失敗した場合は現在のオリジンを使用
        }
      }
    }
    
    // フォールバック: 現在のオリジンを使用
    return `${window.location.origin}/icon/${iconName}.png`;
  };

  // ジャケットアイコンボタン
  const jacketButton = document.createElement("button");
  const jacketIcon = document.createElement("img");
  jacketIcon.src = getIconUrl("jaclet");
  jacketIcon.alt = "ジャケット";
  jacketIcon.style.cssText = `
    width: 24px;
    height: 24px;
    object-fit: contain;
  `;
  jacketButton.appendChild(jacketIcon);
  jacketButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    color: black;
  `;

  // ユーザーアイコンボタン
  const userButton = document.createElement("button");
  const userIcon = document.createElement("img");
  userIcon.src = getIconUrl("person");
  userIcon.alt = "ユーザー";
  userIcon.style.cssText = `
    width: 24px;
    height: 24px;
    object-fit: contain;
  `;
  userButton.appendChild(userIcon);
  userButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    color: black;
  `;

  floatingButtons.appendChild(jacketButton);
  floatingButtons.appendChild(userButton);
  viewerContainer.appendChild(floatingButtons);

  return {
    viewerContainer,
    modelWrapper,
    floatingButtons,
    jacketButton,
    userButton,
  };
}

/**
 * メッセージ入力エリアのUI要素を作成
 */
export interface MessageAreaElements {
  bottomControls: HTMLElement;
  messageArea: HTMLElement;
  messageForm: HTMLFormElement;
  messageInput: HTMLInputElement;
  sendButton: HTMLButtonElement;
}

export function createMessageArea(): MessageAreaElements {
  // 下部コントロールエリア
  const bottomControls = document.createElement("div");
  bottomControls.style.cssText = `
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  `;

  // 質問入力エリア（通常時は非表示）
  const messageArea = document.createElement("div");
  messageArea.style.cssText = `
    flex-shrink: 0;
    padding: 0 12px;
    display: none;
  `;

  const messageForm = document.createElement("form");
  messageForm.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 2px solid #e5e7eb;
    border-radius: 20px;
    background: white;
  `;

  const messageInput = document.createElement("input");
  messageInput.type = "text";
  messageInput.placeholder = "質問はありますか？";
  messageInput.style.cssText = `
    flex: 1;
    border: none;
    outline: none;
    font-size: 11px;
    background: transparent;
    color: #6b7280;
  `;

  const sendButton = document.createElement("button");
  sendButton.innerHTML = "▶";
  sendButton.style.cssText = `
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    outline: none;
    transform: rotate(0deg);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  messageForm.appendChild(messageInput);
  messageForm.appendChild(sendButton);
  messageArea.appendChild(messageForm);
  bottomControls.appendChild(messageArea);

  return {
    bottomControls,
    messageArea,
    messageForm,
    messageInput,
    sendButton,
  };
}
