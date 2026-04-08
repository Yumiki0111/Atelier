import type { WidgetParams } from "./widget-api";
import type { WidgetDesignConfig } from "./types";
import {
  WIDGET_BUTTON_ID_PREFIX,
  WIDGET_CONTAINER_ID_PREFIX,
  isInlinePlacement,
} from "./embed-data";

function isOverlayParams(params: WidgetParams): boolean {
  return params.overlay === true;
}
import { updateButtonPositions } from "./widget-position";

function getRootForContainer(containerId: string, shadowRoot: ShadowRoot): Document | ShadowRoot {
  return shadowRoot.getElementById(containerId) ? shadowRoot : document;
}

function removeExistingContainer(containerId: string, shadowRoot: ShadowRoot): void {
  const inDoc = document.getElementById(containerId);
  if (inDoc) {
    inDoc.remove();
    updateButtonPositions();
    return;
  }
  const inShadow = shadowRoot.getElementById(containerId);
  if (inShadow) {
    inShadow.remove();
  }
}

export function renderCube(
  shadowRoot: ShadowRoot,
  params: WidgetParams,
  onCubeClick: (shadowRoot: ShadowRoot, params: WidgetParams) => Promise<void>,
  initialDesign: WidgetDesignConfig | null | undefined,
  containerId: string
) {
  const productId = params.productId || params.externalProductId || `widget-${Date.now()}-${Math.random()}`;
  const buttonId = containerId.replace(WIDGET_CONTAINER_ID_PREFIX, WIDGET_BUTTON_ID_PREFIX);

  const overlay = isOverlayParams(params);
  const inline = isInlinePlacement(params.placement) || overlay;

  removeExistingContainer(containerId, shadowRoot);

  const baseBottomPx = 24;
  const baseRightPx = 24;

  const button = document.createElement("button");
  button.id = buttonId;
  button.setAttribute("type", "button");
  button.setAttribute("data-fitlook-product-id", productId);
  button.innerHTML = "";

  if (overlay) {
    button.style.cssText = `
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      opacity: 0 !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      display: block !important;
      z-index: 21 !important;
    `;
  } else if (inline) {
    button.style.cssText = `
      position: relative !important;
      display: none !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      vertical-align: middle !important;
    `;
  } else {
    button.style.cssText = `
      position: fixed !important;
      bottom: ${baseBottomPx}px !important;
      right: ${baseRightPx}px !important;
      z-index: 9999 !important;
      display: none !important;
      pointer-events: none !important;
    `;
  }

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await onCubeClick(shadowRoot, params);
  });

  const container = document.createElement("div");
  container.id = containerId;
  container.setAttribute("data-fitlook-product-id", productId);
  if (overlay) {
    container.setAttribute("data-fitlook-overlay", "true");
    container.style.cssText = `
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      align-items: stretch !important;
      z-index: 20 !important;
      pointer-events: none !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
  } else if (inline) {
    container.setAttribute("data-fitlook-inline", "true");
    container.style.cssText = `
      position: relative !important;
      display: none !important;
      align-items: center !important;
      width: fit-content !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      pointer-events: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    `;
  } else {
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
  }

  container.appendChild(button);
  if (inline) {
    shadowRoot.appendChild(container);
  } else {
    document.body.appendChild(container);
  }

  if (!inline) {
    updateButtonPositions();
  }

  if (initialDesign) {
    applyDesignToButton(containerId, initialDesign, getRootForContainer(containerId, shadowRoot));
  }
}

/**
 * 既に作成済みのボタンにデザイン設定を適用する
 */
export function applyDesignToButton(
  containerId: string,
  design: WidgetDesignConfig,
  root: Document | ShadowRoot = document
) {
  const container = root.getElementById(containerId);
  if (!container) return;

  const button = container.querySelector("button") as HTMLButtonElement | null;
  if (!button) return;

  const overlay = container.getAttribute("data-fitlook-overlay") === "true";
  const inline = container.getAttribute("data-fitlook-inline") === "true";

  container.style.display = "flex";
  container.style.visibility = "visible";
  container.style.opacity = "1";

  button.innerHTML = "";

  if (overlay) {
    button.style.cssText = `
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      opacity: 0 !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      display: block !important;
      z-index: 21 !important;
    `;
    return;
  }

  const btn = design.button;
  if (!btn) {
    button.style.display = "flex";
    return;
  }

  const color = btn.color || "#ffffff";
  const shape = btn.shape || "pill";
  const text = btn.text || "";
  const imageUrl = btn.imageUrl || "";

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
  const inlineCircle = isMobile ? 40 : 44;
  const inlinePillH = isMobile ? 40 : 44;

  if (shape === "circle") {
    const size = inline ? inlineCircle : baseSize;
    button.style.cssText = inline
      ? `
      position: relative !important;
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
      z-index: 1 !important;
      box-sizing: border-box !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    `
      : `
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

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      const imageSize = size - 2;
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
    const height = inline ? inlinePillH : baseSize;
    const screenWidth =
      typeof window !== "undefined" ? window.innerWidth || document.documentElement.clientWidth || 375 : 375;
    const rightMargin = 24;
    const leftMargin = 24;
    const maxAvailableWidth = Math.max(120, screenWidth - rightMargin - leftMargin);
    const desiredWidth = Math.min(screenWidth * 0.5, 300);
    const width = inline
      ? Math.min(Math.max(120, Math.min(desiredWidth, maxAvailableWidth)), 280)
      : Math.min(desiredWidth, maxAvailableWidth);

    button.style.cssText = inline
      ? `
      position: relative !important;
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
      z-index: 1 !important;
      box-sizing: border-box !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      overflow: hidden !important;
    `
      : `
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

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      const imageSize = height - 16;
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

  button.onmouseenter = () => {
    button.style.transform = "translateY(-2px) scale(1.02)";
    button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15) !important";
  };
  button.onmouseleave = () => {
    button.style.transform = "translateY(0) scale(1)";
    button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1) !important";
  };

  if (!inline) {
    updateButtonPositions();
  }
}

/** ショップデザイン未取得時。外部画像は使わず（配布先で 404 や誤配置の原因になる） */
export function showDefaultButton(containerId: string, root: Document | ShadowRoot = document) {
  const defaultDesign: WidgetDesignConfig = {
    button: {
      shape: "pill",
      text: "試着",
      color: "#0f172a",
    },
  };

  applyDesignToButton(containerId, defaultDesign, root);
}
