import type { WidgetParams } from "./widget-api";
import type { WidgetDesignConfig } from "./types";
import { sendEvent } from "./widget-api";
import { loadProductImage } from "./widget-image";
import { updateButtonPositions } from "./widget-position";

export function renderCube(
  shadowRoot: ShadowRoot,
  params: WidgetParams,
  onCubeClick: (shadowRoot: ShadowRoot, params: WidgetParams) => Promise<void>
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
  const buttonMinWidth = isMobile ? 160 : 180;
  const buttonFontSize = isMobile ? 13 : 15;
  const buttonPadding = isMobile ? '0 20px' : '0 24px';
  const buttonGap = isMobile ? 6 : 8;
  const baseBottomPx = 24;
  const baseRightPx = 24;

  // ボタンを作成
  const button = document.createElement("button");
  button.id = buttonId;
  button.setAttribute("type", "button");
  button.setAttribute("data-atelier-product-id", productId);
  button.style.cssText = `
    position: fixed !important;
    bottom: ${baseBottomPx}px !important;
    right: ${baseRightPx}px !important;
    width: auto !important;
    min-width: ${buttonMinWidth}px !important;
    height: ${buttonHeight}px !important;
    background: white !important;
    border: 2px solid #e5e7eb !important;
    border-radius: ${buttonHeight / 2}px !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: ${buttonGap}px !important;
    color: #1f2937 !important;
    font-weight: 600 !important;
    font-size: ${buttonFontSize}px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    padding: ${buttonPadding} !important;
    margin: 0 !important;
    outline: none !important;
    pointer-events: auto !important;
    z-index: 9999 !important;
    box-sizing: border-box !important;
    line-height: 1 !important;
    text-align: center !important;
    white-space: nowrap !important;
    backdrop-filter: blur(10px) !important;
  `;
  
  // アイコンを追加
  const iconSize = isMobile ? 18 : 20;
  const iconSvg = createCubeIcon(iconSize);
  const buttonText = document.createTextNode("試着する");
  button.appendChild(iconSvg);
  button.appendChild(buttonText);

  // ホバーエフェクト
  button.addEventListener("mouseenter", () => {
    button.style.background = "#f9fafb !important";
    button.style.borderColor = "#d1d5db !important";
    button.style.transform = "translateY(-2px) scale(1.02)";
    button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15) !important";
  });

  button.addEventListener("mouseleave", () => {
    button.style.background = "white !important";
    button.style.borderColor = "#e5e7eb !important";
    button.style.transform = "translateY(0) scale(1)";
    button.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1) !important";
  });

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await onCubeClick(shadowRoot, params);
  });

  // コンテナを作成
  const container = document.createElement("div");
  container.id = containerId;
  container.setAttribute("data-atelier-product-id", productId);
  container.style.cssText = `
    position: fixed !important;
    bottom: ${baseBottomPx}px !important;
    right: ${baseRightPx}px !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    z-index: 9999 !important;
    pointer-events: none !important;
  `;
  
  button.style.pointerEvents = "auto";
  
  // 商品画像コンテナ
  const imageContainer = createImageContainer(buttonHeight);
  loadProductImage(params, imageContainer, buttonHeight);
  
  container.appendChild(imageContainer);
  container.appendChild(button);
  document.body.appendChild(container);

  updateButtonPositions();

  // イベント送信
  const eventShopId = params.shopId || "unknown";
  sendEvent({
    shopId: eventShopId,
    productId: params.productId || params.externalProductId || undefined,
    type: "cube_view",
  }).catch(() => {});
}

/**
 * 既に作成済みのボタンにデザイン設定を適用する
 */
export function applyDesignToButton(containerId: string, design: WidgetDesignConfig) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const button = container.querySelector("button") as HTMLButtonElement | null;
  if (!button) return;

  const btn = design.button;
  if (!btn) return;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ボタンスタイルを更新
  const color = btn.color || "#ffffff";
  const isWhite = color === "#ffffff" || color === "white";
  const height = btn.height ?? (isMobile ? 48 : 56);
  const width = btn.width ?? (isMobile ? 160 : 180);
  const radius = btn.radius ?? height / 2;
  const fontSize = btn.fontSize ?? (isMobile ? 13 : 15);
  const borderWidth = btn.borderWidth ?? 0;
  const borderColor = btn.borderColor ?? "#000000";
  const shadow = btn.shadow ?? true;

  const border = borderWidth > 0
    ? `${borderWidth}px solid ${borderColor}`
    : isWhite ? "2px solid #e5e7eb" : "none";

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

  button.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    width: auto !important;
    min-width: ${width}px !important;
    height: ${height}px !important;
    background: ${color} !important;
    border: ${border} !important;
    border-radius: ${radius}px !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: ${isMobile ? 6 : 8}px !important;
    color: ${textColor} !important;
    font-weight: 600 !important;
    font-size: ${fontSize}px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    box-shadow: ${shadow ? "0 2px 8px rgba(0,0,0,0.1)" : "none"} !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    padding: 0 ${isMobile ? "20px" : "24px"} !important;
    margin: 0 !important;
    outline: none !important;
    pointer-events: auto !important;
    z-index: 9999 !important;
    box-sizing: border-box !important;
    line-height: 1 !important;
    text-align: center !important;
    white-space: nowrap !important;
    backdrop-filter: blur(10px) !important;
  `;

  // テキスト更新
  if (btn.text) {
    const textNode = Array.from(button.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE
    ) as Text | undefined;
    if (textNode) textNode.textContent = btn.text;
  }

  // ホバーエフェクト更新
  button.onmouseenter = () => {
    button.style.transform = "translateY(-2px) scale(1.02)";
    if (shadow) button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15) !important";
  };
  button.onmouseleave = () => {
    button.style.transform = "translateY(0) scale(1)";
    button.style.boxShadow = shadow ? "0 2px 8px rgba(0,0,0,0.1) !important" : "none !important";
  };

  // アイコン色も更新
  const svg = button.querySelector("svg");
  if (svg) svg.setAttribute("stroke", textColor);

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

function createImageContainer(size: number): HTMLElement {
  const imageContainer = document.createElement("div");
  imageContainer.style.cssText = `
    width: ${size}px !important;
    height: ${size}px !important;
    border-radius: 50% !important;
    background: white !important;
    border: 2px solid rgba(102, 126, 234, 0.3) !important;
    overflow: hidden !important;
    flex-shrink: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    pointer-events: none !important;
    position: relative !important;
  `;
  
  const placeholder = document.createElement("div");
  placeholder.style.cssText = `
    width: 100% !important;
    height: 100% !important;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
  `;
  imageContainer.appendChild(placeholder);
  
  return imageContainer;
}
