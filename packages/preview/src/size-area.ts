import type { ProductSize } from "@atelier/shared";

/**
 * サイズ選択エリアのUI要素
 */
export interface SizeAreaElements {
  sizeArea: HTMLElement;
  sizeButtons: HTMLElement[];
  sizeButtonsContainer: HTMLElement;
  productNameDiv: HTMLElement | null;
  prevButton: HTMLElement;
  nextButton: HTMLElement;
}

/**
 * サイズ選択エリアのUI要素を作成
 */
export function createSizeArea(
  availableSizes: ProductSize[],
  initialSize: ProductSize,
  productName?: string
): SizeAreaElements {
  const sizeArea = document.createElement("div");
  sizeArea.setAttribute("data-atelier-size-area", "true");
  
  // プレビュー環境（PhoneFrame）を検出
  // PhoneFrame内ではセーフエリア（ステータスバー）を考慮する必要がある
  const isPreviewEnvironment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     document.querySelector('[data-phone-frame]') !== null);
  
  // プレビュー環境ではセーフエリア（約5.2%）を考慮して少し下げる
  // 実機環境ではtop: 0で問題ない（ブラウザがセーフエリアを自動処理）
  const topValue = isPreviewEnvironment ? '6%' : '0';
  
  sizeArea.style.cssText = `
    position: absolute;
    top: ${topValue};
    left: 0;
    right: 0;
    width: 100%;
    flex-shrink: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2%;
    padding: 0 5%;
    box-sizing: border-box;
    background: transparent;
  `;

  // サイズボタンコンテナ（白い丸みを帯びたコンテナ）
  const sizeButtonsContainer = document.createElement("div");
  sizeButtonsContainer.className = "size-buttons-container";
  sizeButtonsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0;
    background: #ffffff;
    border-radius: 50px;
    padding: 3px 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    width: auto;
    box-sizing: border-box;
    position: relative;
    margin: 0 auto;
    height: 30px;
  `;

  // スクロールバーを非表示（重複追加を防止）
  if (!document.getElementById('atelier-size-buttons-scrollbar-style')) {
    const style = document.createElement("style");
    style.id = 'atelier-size-buttons-scrollbar-style';
    style.textContent = `
      .size-buttons-container::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  // サイズボタン配列
  const sizeButtons: HTMLElement[] = [];

  availableSizes.forEach((size, index) => {
    const sizeBtn = document.createElement("div");
    sizeBtn.textContent = size;
    sizeBtn.setAttribute("role", "button");
    sizeBtn.setAttribute("tabindex", "0");
    const isSelected = size === initialSize;
    const hPad = index === 0 || index === availableSizes.length - 1 ? "8px" : "10px";
    sizeBtn.style.cssText = `
      background: ${isSelected ? "#000000" : "transparent"};
      color: ${isSelected ? "#ffffff" : "#000000"};
      border: none;
      outline: none;
      box-shadow: none;
      font-size: 11px;
      font-weight: ${isSelected ? "600" : "700"};
      padding: 3px ${hPad};
      border-radius: ${isSelected ? "50px" : "0"};
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      white-space: nowrap;
      flex-shrink: 0;
      position: relative;
      z-index: ${isSelected ? "1" : "0"};
      user-select: none;
    `;

    sizeButtons.push(sizeBtn);
    sizeButtonsContainer.appendChild(sizeBtn);
  });

  // ナビゲーションボタン（非表示）
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
    display: none;
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
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  `;

  sizeArea.appendChild(sizeButtonsContainer);

  // 商品名をサイズバーの下に表示
  let productNameDiv: HTMLElement | null = null;
  if (productName) {
    productNameDiv = document.createElement("div");
    productNameDiv.textContent = productName;
    productNameDiv.style.cssText = `
      font-size: 12px;
      font-weight: 700;
      color: #000000;
      text-align: center;
      width: 100%;
      margin: 0;
      padding: 0;
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
