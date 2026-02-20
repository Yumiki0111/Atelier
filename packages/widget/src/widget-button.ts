import type { WidgetParams } from "./widget-api";
import type { WidgetDesignConfig } from "./types";
import { sendEvent } from "./widget-api";
import { updateButtonPositions } from "./widget-position";
import { getApiBaseUrl } from "./widget-utils";

export function renderCube(
  shadowRoot: ShadowRoot,
  params: WidgetParams,
  onCubeClick: (shadowRoot: ShadowRoot, params: WidgetParams) => Promise<void>,
  initialDesign?: WidgetDesignConfig | null
) {
  const productId = params.productId || params.externalProductId || `widget-${Date.now()}-${Math.random()}`;
  const buttonId = `atelier-widget-button-${productId}`;
  const containerId = `atelier-widget-container-${productId}`;
  
  // 既存のコンテナがあれば削除
  const existingContainer = document.getElementById(containerId);
  if (existingContainer) {
    existingContainer.remove();
    updateButtonPositions();
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const buttonHeight = isMobile ? 48 : 56;
  const buttonFontSize = isMobile ? 13 : 15;
  const buttonPadding = isMobile ? '0 12px' : '0 16px';
  const buttonGap = isMobile ? 6 : 8;
  const baseBottomPx = 24;
  const baseRightPx = 24;

  // ボタンを作成（デザイン適用まで完全に非表示）
  const button = document.createElement("button");
  button.id = buttonId;
  button.setAttribute("type", "button");
  button.setAttribute("data-atelier-product-id", productId);
  // 最小限のスタイルのみ設定（位置とz-indexのみ）
  // 他のスタイルは applyDesignToButton で設定されるまで適用しない
  button.style.cssText = `
    position: fixed !important;
    bottom: ${baseBottomPx}px !important;
    right: ${baseRightPx}px !important;
    z-index: 9999 !important;
    display: none !important;
    pointer-events: none !important;
  `;

  // ボタンのコンテンツを空にする（デザイン適用まで何も表示しない）
  button.innerHTML = "";

  // ホバーエフェクトは applyDesignToButton で設定される

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await onCubeClick(shadowRoot, params);
  });

  // コンテナを作成（デザイン適用まで完全に非表示）
  const container = document.createElement("div");
  container.id = containerId;
  container.setAttribute("data-atelier-product-id", productId);
  container.style.cssText = `
    position: fixed !important;
    bottom: ${baseBottomPx}px !important;
    right: ${baseRightPx}px !important;
    display: none !important;
    align-items: center !important;
    z-index: 9999 !important;
    pointer-events: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  `;
  
  container.appendChild(button);
  document.body.appendChild(container);

  updateButtonPositions();

  // デザインが既に取得できている場合は即座に適用
  if (initialDesign) {
    applyDesignToButton(containerId, initialDesign);
  }

  // イベント送信
  const eventShopId = params.shopId || "unknown";
  sendEvent({
    shopId: eventShopId,
    productId: params.productId || params.externalProductId || undefined,
    type: "cube_view",
  }).catch(() => {});
}

// フォントサイズの自動計算機能は削除（指定されたfontSizeをそのまま使用）

/**
 * 既に作成済みのボタンにデザイン設定を適用する
 */
export function applyDesignToButton(containerId: string, design: WidgetDesignConfig) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const button = container.querySelector("button") as HTMLButtonElement | null;
  if (!button) return;

  // コンテナを表示する
  container.style.display = "flex";
  container.style.visibility = "visible";
  container.style.opacity = "1";

  // まず、ボタンのコンテンツを完全にクリア
  button.innerHTML = "";

  const btn = design.button;
  if (!btn) {
    // デザインがない場合もデフォルトを表示
    button.style.display = "flex";
    return;
  }

  const color = btn.color || "#ffffff";
  const shape = btn.shape || "pill"; // デフォルトは横長円
  const text = btn.text || ""; // 空文字列をデフォルトに（円形ボタンでは使用しない）
  const imageUrl = btn.imageUrl || "";

  // テキスト色を自動判定
  const hex = color.replace("#", "");
  let textColor = "#ffffff";
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    textColor = luminance > 0.5 ? "#000000" : "#ffffff";
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const baseSize = isMobile ? 72 : 80;

  if (shape === "circle") {
    // 円形ボタン：画像のみ
    const size = baseSize;
    button.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: ${size}px !important;
      height: ${size}px !important;
      min-width: ${size}px !important;
      max-width: ${size}px !important;
      min-height: ${size}px !important;
      max-height: ${size}px !important;
      background: ${color} !important;
      border: none !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 1px !important;
      margin: 0 !important;
      outline: none !important;
      pointer-events: auto !important;
      z-index: 9999 !important;
      box-sizing: border-box !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    `;

    // 円形ボタンではテキストを表示しない（画像のみ）
    // innerHTMLは既にクリア済みなので、画像のみ追加
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      const imageSize = size - 2; // padding 1px * 2 = 2px
      img.style.cssText = `
        width: ${imageSize}px !important;
        height: ${imageSize}px !important;
        min-width: ${imageSize}px !important;
        min-height: ${imageSize}px !important;
        max-width: ${imageSize}px !important;
        max-height: ${imageSize}px !important;
        object-fit: cover !important;
        object-position: center !important;
        border-radius: 50% !important;
        display: block !important;
        margin: 0 !important;
      `;
      button.appendChild(img);
    }
    } else {
      // 横長円ボタン：画像と文字
      const height = baseSize;
      // 画面に収まるように幅を計算
      // 右端24px、左端24pxの余白を考慮し、画面幅の50%または最大300pxのうち小さい方を使用
      const screenWidth = typeof window !== "undefined" ? window.innerWidth || document.documentElement.clientWidth || 375 : 375;
      const rightMargin = 24;
      const leftMargin = 24;
      const maxAvailableWidth = Math.max(120, screenWidth - rightMargin - leftMargin);
      const desiredWidth = Math.min(screenWidth * 0.5, 300);
      const width = Math.min(desiredWidth, maxAvailableWidth);
      
      button.style.cssText = `
        position: fixed !important;
        bottom: 24px !important;
        right: ${rightMargin}px !important;
        left: auto !important;
        width: ${width}px !important;
        min-width: 120px !important;
        max-width: ${maxAvailableWidth}px !important;
        height: ${height}px !important;
        background: ${color} !important;
        border: none !important;
        border-radius: ${height / 2}px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 8px !important;
        padding: 0 12px !important;
        margin: 0 !important;
        outline: none !important;
        pointer-events: auto !important;
        z-index: 9999 !important;
        box-sizing: border-box !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        overflow: hidden !important;
      `;

    button.innerHTML = "";

    // 画像（任意）
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      const imageSize = height - 16; // padding考慮
      img.style.cssText = `
        width: ${imageSize}px !important;
        height: ${imageSize}px !important;
        min-width: ${imageSize}px !important;
        min-height: ${imageSize}px !important;
        max-width: ${imageSize}px !important;
        max-height: ${imageSize}px !important;
        object-fit: cover !important;
        object-position: center !important;
        border-radius: 50% !important;
        flex-shrink: 0 !important;
        display: block !important;
        margin: 0 !important;
      `;
      button.appendChild(img);
    }

    // テキスト
    if (text) {
      const textEl = document.createElement("div");
      textEl.textContent = text;
      textEl.style.cssText = `
        font-size: ${isMobile ? 13 : 15}px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        color: ${textColor} !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        flex: 1 !important;
        min-width: 0 !important;
        text-align: left !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      `;
      button.appendChild(textEl);
    }
  }

  // ホバーエフェクト
  button.onmouseenter = () => {
    button.style.transform = "translateY(-2px) scale(1.02)";
    button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15) !important";
  };
  button.onmouseleave = () => {
    button.style.transform = "translateY(0) scale(1)";
    button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1) !important";
  };

  // 位置再計算
  updateButtonPositions();
}

function createCubeIcon(size: number): SVGElement {
  const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  iconSvg.setAttribute("width", String(size));
  iconSvg.setAttribute("height", String(size));
  iconSvg.setAttribute("viewBox", "0 0 24 24");
  iconSvg.setAttribute("fill", "none");
  iconSvg.setAttribute("stroke", "currentColor");
  iconSvg.setAttribute("stroke-width", "2");
  iconSvg.setAttribute("stroke-linecap", "round");
  iconSvg.setAttribute("stroke-linejoin", "round");
  iconSvg.style.cssText = "flex-shrink: 0 !important;";
  
  const paths = [
    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    "M3.27 6.96L12 12.01l8.73-5.05",
    "M12 22.08V12"
  ];
  
  paths.forEach(d => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    iconSvg.appendChild(path);
  });
  
  return iconSvg;
}

/**
 * デフォルトデザイン（円形、ATELIER-LOGO.png）を適用する
 */
export function showDefaultButton(containerId: string) {
  const apiBaseUrl = getApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const defaultImageUrl = `${apiBaseUrl}/ATELIER-LOGO.png`;
  
  const defaultDesign: WidgetDesignConfig = {
    button: {
      shape: "circle",
      imageUrl: defaultImageUrl,
      color: "#ffffff",
    },
  };
  
  applyDesignToButton(containerId, defaultDesign);
}
