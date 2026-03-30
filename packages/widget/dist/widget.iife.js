(function() {
  "use strict";
  const DEV_PORTS = /* @__PURE__ */ new Set(["3000", "3001", "5173", "5174"]);
  function isDevelopmentMode() {
    if (typeof window === "undefined") return false;
    const { hostname, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    return isLocalHost && DEV_PORTS.has(port);
  }
  function getApiBaseUrl() {
    var _a;
    if (typeof window === "undefined") return "";
    const apiUrlAttr = (_a = document.querySelector("[data-atelier-api-url]")) == null ? void 0 : _a.getAttribute("data-atelier-api-url");
    if (apiUrlAttr) {
      return apiUrlAttr;
    }
    const scriptTag = document.querySelector('script[src*="widget.js"]');
    if (scriptTag) {
      const src = scriptTag.getAttribute("src");
      if (src) {
        try {
          const url = new URL(src, window.location.href);
          if (src.startsWith("http://") || src.startsWith("https://")) {
            return `${url.protocol}//${url.host}`;
          } else {
            if (window.location.hostname === "localhost" && window.location.port !== "3000") {
              return `http://localhost:3000`;
            }
            return window.location.origin;
          }
        } catch (e) {
          if (window.location.hostname === "localhost" && window.location.port !== "3000") {
            return `http://localhost:3000`;
          }
        }
      }
    }
    if (window.location.hostname === "localhost" && window.location.port !== "3000") {
      return `http://localhost:3000`;
    }
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  function createDevMockConfig() {
    const placeholder = { category: "default" };
    return {
      enabled: true,
      asset: {
        defaultSize: "4",
        productName: "SAMPLE PRODUCT",
        priceDisplay: "¥ 110,000 tax in",
        garmentFitAvailable: false,
        sizes: {
          "3": [placeholder],
          "4": [placeholder],
          "5": [placeholder]
        }
      }
    };
  }
  function buildSearchParams(params) {
    const searchParams = new URLSearchParams();
    if (params.publicKey) {
      searchParams.append("publicKey", params.publicKey);
    }
    if (params.externalProductId) {
      searchParams.append("externalProductId", params.externalProductId);
    } else if (params.productId) {
      searchParams.append("externalProductId", params.productId);
    }
    return searchParams;
  }
  async function fetchWidgetConfig(params) {
    var _a;
    if (!params.publicKey && !params.shopId) {
      throw new Error("publicKey or shopId is required");
    }
    if (isDevelopmentMode()) {
      try {
        const searchParams2 = buildSearchParams(params);
        if (!params.externalProductId && !params.productId) {
          if (params.sku) throw new Error("SKU is not supported. Please use externalProductId.");
          if (params.handle) throw new Error("Handle is not supported. Please use externalProductId.");
          if (params.url) throw new Error("URL is not supported. Please use externalProductId.");
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3e3);
        const apiUrl2 = getApiBaseUrl() || "http://localhost:3000";
        const response2 = await fetch(
          `${apiUrl2}/api/public/widget-config?${searchParams2.toString()}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (!response2.ok) {
          console.warn(`[Atelier Widget] API returned ${response2.status}, using mock config.`);
          return createDevMockConfig();
        }
        const config = await response2.json();
        if (!config.enabled) {
          if (((_a = config.asset) == null ? void 0 : _a.sizes) && Object.keys(config.asset.sizes).length > 0) {
            return { enabled: true, asset: config.asset };
          }
          return createDevMockConfig();
        }
        return config;
      } catch (error) {
        return createDevMockConfig();
      }
    }
    if (!params.externalProductId && !params.productId) {
      throw new Error("externalProductId is required");
    }
    const searchParams = buildSearchParams(params);
    const apiUrl = getApiBaseUrl();
    const requestUrl = `${apiUrl}/api/public/widget-config?${searchParams.toString()}`;
    let response;
    try {
      response = await fetch(requestUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Network error";
      throw new Error(`ネットワークエラー: ${errorMessage}. APIサーバーに接続できません。`);
    }
    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {
      }
      let errorMessage = `APIエラー: ${response.status} ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) errorMessage = errorJson.error;
      } catch {
        if (errorText) errorMessage = errorText;
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }
  async function fetchWidgetDesign(publicKey) {
    const apiUrl = getApiBaseUrl() || (isDevelopmentMode() ? "http://localhost:3000" : "");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e3);
      const res = await fetch(
        `${apiUrl}/api/public/widget-design?publicKey=${encodeURIComponent(publicKey)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== "object") return null;
      return data;
    } catch {
      return null;
    }
  }
  async function sendEvent(event) {
    if (isDevelopmentMode()) {
      const apiUrl = getApiBaseUrl();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1e3);
        const response = await fetch(`${apiUrl}/api/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(event),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return;
      } catch (error) {
        if (error instanceof Error && (error.name === "AbortError" || error.message === "Failed to fetch" || error.message.includes("network") || error.message.includes("connection"))) {
          return;
        }
        console.warn("[Atelier Widget] Event send error:", error);
        return;
      }
    }
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (!isDevelopmentMode()) {
        console.error("[Atelier Widget] Failed to send event:", error);
      }
    }
  }
  function updateButtonPositions() {
    const allWidgetContainers = Array.from(document.querySelectorAll('[id^="atelier-widget-container-"]'));
    const baseBottomPx = 24;
    const baseRightPx = 24;
    const buttonSpacingPx = 72;
    allWidgetContainers.forEach((container, index) => {
      const bottomOffsetPx = baseBottomPx + index * buttonSpacingPx;
      container.style.bottom = `${bottomOffsetPx}px`;
      container.style.right = `${baseRightPx}px`;
    });
  }
  function renderCube(shadowRoot, params, onCubeClick, initialDesign) {
    const productId = params.productId || params.externalProductId || `widget-${Date.now()}-${Math.random()}`;
    const buttonId = `atelier-widget-button-${productId}`;
    const containerId = `atelier-widget-container-${productId}`;
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
      existingContainer.remove();
      updateButtonPositions();
    }
    const baseBottomPx = 24;
    const baseRightPx = 24;
    const button = document.createElement("button");
    button.id = buttonId;
    button.setAttribute("type", "button");
    button.setAttribute("data-atelier-product-id", productId);
    button.style.cssText = `
    position: fixed !important;
    bottom: ${baseBottomPx}px !important;
    right: ${baseRightPx}px !important;
    z-index: 9999 !important;
    display: none !important;
    pointer-events: none !important;
  `;
    button.innerHTML = "";
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await onCubeClick(shadowRoot, params);
    });
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
    const eventShopId = params.shopId || "unknown";
    sendEvent({
      shopId: eventShopId,
      productId: params.productId || params.externalProductId || void 0,
      type: "cube_view"
    }).catch(() => {
    });
  }
  function applyDesignToButton(containerId, design) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const button = container.querySelector("button");
    if (!button) return;
    container.style.display = "flex";
    container.style.visibility = "visible";
    container.style.opacity = "1";
    button.innerHTML = "";
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
    if (shape === "circle") {
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
      const height = baseSize;
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
    updateButtonPositions();
  }
  function showDefaultButton(containerId) {
    const apiBaseUrl = getApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "");
    const defaultImageUrl = `${apiBaseUrl}/ATELIER-LOGO.png`;
    const defaultDesign = {
      button: {
        shape: "circle",
        imageUrl: defaultImageUrl,
        color: "#ffffff"
      }
    };
    applyDesignToButton(containerId, defaultDesign);
  }
  const ACCENT_DEFAULT = "#3d3835";
  const DEFAULT_FIT_BODY_VAL = 25;
  const DEFAULT_SWATCHES = [
    { id: "default-1", hex: "#e8c547", label: "Yellow" },
    { id: "default-2", hex: "#d4d4d4", label: "Grey" },
    { id: "default-3", hex: "#1a1a1a", label: "Black" }
  ];
  function injectStyles() {
    if (document.getElementById("atelier-bs-styles")) return;
    const s = document.createElement("style");
    s.id = "atelier-bs-styles";
    s.textContent = `
    @keyframes atelier-fade-in  { from{opacity:0} to{opacity:1} }
    @keyframes atelier-spin     { to{transform:rotate(360deg)} }
    [data-atelier-modal] * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
  `;
    document.head.appendChild(s);
  }
  function sortSizeKeys(keys) {
    return [...keys].sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
  }
  function closeOverlay(overlay) {
    const cleanup = overlay.__atelierCleanup;
    if (cleanup) cleanup.fn();
    overlay.style.transition = "opacity 0.2s ease-out";
    overlay.style.opacity = "0";
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 200);
  }
  function el(tag, style, text) {
    const node = document.createElement(tag);
    if (style) node.style.cssText = style;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function createBodySilhouetteSvg() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 120 260");
    svg.setAttribute("fill", "none");
    svg.style.cssText = "width:100%;height:100%;max-height:min(85%, 320px);opacity:0.85;";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M60 22c9 0 16-7 16-16S69 0 60 0s-16 7-16 16 7 16 16 16zm0 18c-12 0-22 8-24 19l-4 22 8 2 6-14 2 48-8 52 10 2 10-38 10 38 10-2-8-52 2-48 6 14 8-2-4-22c-2-11-12-19-24-19z"
    );
    path.setAttribute("stroke", "#c8c8c8");
    path.setAttribute("stroke-width", "1.4");
    svg.appendChild(path);
    return svg;
  }
  function iconPerson() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("fill", "none");
    svg.style.cssText = "width:12px;height:12px;display:block;flex-shrink:0;";
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", "12");
    c.setAttribute("cy", "6");
    c.setAttribute("r", "3");
    c.setAttribute("stroke", "currentColor");
    c.setAttribute("stroke-width", "1.5");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute(
      "d",
      "M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M9 10h6"
    );
    p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "1.5");
    p.setAttribute("stroke-linecap", "round");
    svg.appendChild(c);
    svg.appendChild(p);
    return svg;
  }
  function iconCart() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "15");
    svg.setAttribute("height", "15");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute(
      "d",
      "M6 6h15l-1.5 9h-12L4.5 3H2M6 6L4.5 3M8 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z"
    );
    p.setAttribute("stroke", "#fff");
    p.setAttribute("stroke-width", "1.6");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  }
  function renderModalWithLoading(_shadowRoot, _params) {
    injectStyles();
    const existingOverlays = document.querySelectorAll("[data-atelier-modal-overlay='true']");
    existingOverlays.forEach((el2) => {
      if (el2.style.opacity === "0" || parseFloat(el2.style.opacity) < 0.1) {
        el2.remove();
      }
    });
    const overlay = document.createElement("div");
    overlay.setAttribute("data-atelier-modal", "true");
    overlay.setAttribute("data-atelier-modal-overlay", "true");
    overlay.style.cssText = `
    position: fixed !important; inset: 0 !important;
    background: #ececec !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    opacity: 0; animation: atelier-fade-in 0.22s ease-out forwards;
  `;
    const contentArea = document.createElement("div");
    contentArea.setAttribute("data-atelier-content-area", "true");
    contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;background:#ececec;";
    const spinWrap = document.createElement("div");
    spinWrap.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;width:100%;";
    const spin = document.createElement("img");
    spin.src = `${getApiBaseUrl()}/logo.png`;
    spin.alt = "";
    spin.style.cssText = "width:56px;height:56px;object-fit:contain;animation:atelier-spin 2s linear infinite;";
    spinWrap.appendChild(spin);
    contentArea.appendChild(spinWrap);
    overlay.appendChild(contentArea);
    document.body.appendChild(overlay);
    const cleanup = { fn: () => {
    } };
    overlay.__atelierCleanup = cleanup;
    return { overlay, contentArea };
  }
  function updateModalWithConfig(_shadowRoot, config, params, overlay, contentArea) {
    var _a, _b, _c, _d;
    if (!overlay || !contentArea) return;
    injectStyles();
    contentArea.innerHTML = "";
    contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;background:#ececec;padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;";
    const ui = config.design;
    const interfaceBg = (ui == null ? void 0 : ui.interfaceBackgroundColor) ?? "#fafafa";
    const canvasBg = (ui == null ? void 0 : ui.canvasBackgroundColor) ?? "#fafafa";
    const ctaCart = (ui == null ? void 0 : ui.ctaCartLabel) ?? "カートに追加";
    const ctaTryOn = (ui == null ? void 0 : ui.ctaTryOnLabel) ?? "この体型で試着する";
    const accent = (ui == null ? void 0 : ui.ctaAccentColor) ?? ACCENT_DEFAULT;
    const phoneFrameOuter = el(
      "div",
      "width:100%;max-width:310.5px;height:100%;max-height:672px;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;"
    );
    const phoneShell = el(
      "div",
      "flex:1;min-height:0;display:flex;flex-direction:column;width:100%;height:100%;background:linear-gradient(145deg,#3a3a3c 0%,#1c1c1e 40%,#2c2c2e 60%,#1c1c1e 100%);border-radius:44px;border:1px solid rgba(130,130,135,0.5);padding:10px;box-sizing:border-box;"
    );
    const phoneScreen = el(
      "div",
      `position:relative;flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:${interfaceBg};border-radius:34px;`
    );
    phoneShell.appendChild(phoneScreen);
    phoneFrameOuter.appendChild(phoneShell);
    contentArea.appendChild(phoneFrameOuter);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const eshopId = params.shopId || void 0;
    if (eshopId && eshopId !== "unknown") {
      const pid = params.productId || params.externalProductId || "";
      sendEvent({
        shopId: eshopId,
        productId: uuidRe.test(pid) ? pid : void 0,
        type: "widget_open"
      }).catch(() => {
      });
    }
    const asset = config.asset;
    const productName = (asset == null ? void 0 : asset.productName) || "商品名";
    const priceText = (asset == null ? void 0 : asset.priceDisplay) || "—";
    const thumbnailUrl = (asset == null ? void 0 : asset.thumbnailUrl) || "";
    const garmentFitAvailable = (asset == null ? void 0 : asset.garmentFitAvailable) === true && !!params.publicKey;
    let sizeKeys = sortSizeKeys(Object.keys((asset == null ? void 0 : asset.sizes) || {}));
    if (sizeKeys.length === 0) {
      sizeKeys = garmentFitAvailable ? ["default"] : ["3", "4", "5"];
    }
    let currentSize = (asset == null ? void 0 : asset.defaultSize) && sizeKeys.includes(asset.defaultSize) ? asset.defaultSize : sizeKeys[0];
    const swatches = garmentFitAvailable ? [] : ((_a = asset == null ? void 0 : asset.colors) == null ? void 0 : _a.length) ? asset.colors : DEFAULT_SWATCHES;
    let selectedColorId = ((_b = swatches[0]) == null ? void 0 : _b.id) || "";
    let garmentImg = null;
    let fitHeightCm = 170;
    let fitBodyVal = DEFAULT_FIT_BODY_VAL;
    function weightKgFromBodyVal(v) {
      return Math.round(50 + v / 100 * 40);
    }
    const cleanup = overlay.__atelierCleanup;
    if (cleanup) {
      cleanup.fn = () => {
      };
    }
    const backRow = el("div", "padding:10px 14px 4px;padding-top:max(10px, env(safe-area-inset-top));");
    const backBtn = el(
      "button",
      "border:none;background:transparent;padding:6px 0;font-size:15px;color:#111;cursor:pointer;display:flex;align-items:center;gap:4px;"
    );
    backBtn.textContent = "← 閉じる";
    backBtn.addEventListener("click", () => closeOverlay(overlay));
    backRow.appendChild(backBtn);
    phoneScreen.appendChild(backRow);
    const productRow = el("div", "display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;padding:2px 12px 8px;gap:6px;");
    const leftCol = el("div", "display:flex;flex-direction:row;align-items:flex-start;gap:6px;min-width:0;flex:1;");
    const thumbWrap = el(
      "div",
      "width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#f3f4f6;border:1px solid #e5e7eb;"
    );
    if (thumbnailUrl) {
      const img = document.createElement("img");
      img.src = thumbnailUrl;
      img.alt = "";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      thumbWrap.appendChild(img);
    } else {
      const ph = el("div", "width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:7px;color:#9ca3af;");
      ph.textContent = "IMG";
      thumbWrap.appendChild(ph);
    }
    leftCol.appendChild(thumbWrap);
    const titleBlock = el("div", "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;");
    const nameEl = el(
      "div",
      "font-size:9px;font-weight:400;color:#111;line-height:1.2;word-break:break-word;"
    );
    nameEl.textContent = productName;
    const priceEl = el("div", "font-size:8px;color:#111;font-weight:400;");
    priceEl.textContent = priceText;
    titleBlock.appendChild(nameEl);
    titleBlock.appendChild(priceEl);
    leftCol.appendChild(titleBlock);
    const bodyBtn = el(
      "button",
      `display:flex;flex-direction:row;align-items:center;box-sizing:border-box;height:32px;padding:0 7px;gap:3px;border-radius:999px;border:1px solid #111;background:#fff;color:#111;font-size:9px;font-weight:600;cursor:pointer;flex-shrink:0;white-space:nowrap;line-height:1;`
    );
    const bodyIconWrap = el(
      "span",
      "display:flex;align-items:center;justify-content:center;flex-shrink:0;width:12px;height:12px;"
    );
    bodyIconWrap.appendChild(iconPerson());
    const bodyLabel = el("span", "display:flex;align-items:center;");
    bodyLabel.textContent = "体型を変更";
    bodyBtn.appendChild(bodyIconWrap);
    bodyBtn.appendChild(bodyLabel);
    productRow.appendChild(leftCol);
    productRow.appendChild(bodyBtn);
    phoneScreen.appendChild(productRow);
    function colorFilterForHex(hex) {
      const h = hex.replace("#", "");
      if (h.length !== 6) return "none";
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let hue = 0;
      if (max !== min) {
        if (max === r) hue = (g - b) / (max - min) % 6;
        else if (max === g) hue = (b - r) / (max - min) + 2;
        else hue = (r - g) / (max - min) + 4;
      }
      hue *= 60;
      if (hue < 0) hue += 360;
      const sepia = 0.35;
      const sat = 0.4;
      return `sepia(${sepia}) saturate(${sat}) hue-rotate(${hue}deg)`;
    }
    if (!garmentFitAvailable && swatches.length > 0) {
      const colorRow = el("div", "display:flex;flex-direction:row;gap:10px;padding:0 14px 14px;align-items:center;");
      swatches.forEach((sw) => {
        const b = el("button", "width:28px;height:28px;border-radius:50%;padding:0;cursor:pointer;flex-shrink:0;");
        b.style.background = sw.hex;
        b.style.border = sw.id === selectedColorId ? `3px solid ${accent}` : "1px solid #ccc";
        b.setAttribute("aria-label", sw.label || sw.id);
        b.addEventListener("click", () => {
          selectedColorId = sw.id;
          colorRow.querySelectorAll("button").forEach((btn, i) => {
            const s = swatches[i];
            if (!s) return;
            btn.style.border = s.id === selectedColorId ? `3px solid ${accent}` : "1px solid #ccc";
          });
          if (garmentImg && thumbnailUrl) {
            garmentImg.style.filter = colorFilterForHex(sw.hex);
          }
        });
        colorRow.appendChild(b);
      });
      phoneScreen.appendChild(colorRow);
    }
    const viewerArea = el(
      "div",
      `flex:1;min-height:120px;min-width:0;flex-basis:0;position:relative;background:${canvasBg};display:flex;align-items:center;justify-content:center;overflow:visible;padding:8px 12px 8px;box-sizing:border-box;`
    );
    viewerArea.setAttribute("data-atelier-viewer-container", "true");
    async function loadGarmentFitSvgInto(target, heightCm, bodyVal, options) {
      const bodyOnly = (options == null ? void 0 : options.bodyOnly) === true;
      if (!garmentFitAvailable || !params.publicKey) return;
      const ext = params.externalProductId || params.productId;
      if (!ext) return;
      target.innerHTML = "";
      const loading = el("div", "padding:24px;color:#6b7280;font-size:14px;text-align:center;");
      loading.textContent = "読み込み中...";
      target.appendChild(loading);
      try {
        const sp = new URLSearchParams({
          publicKey: params.publicKey,
          externalProductId: ext,
          size: currentSize,
          heightCm: String(heightCm),
          weightKg: String(weightKgFromBodyVal(bodyVal))
        });
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/api/public/widget-fit-svg?${sp.toString()}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        target.innerHTML = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${data.viewBoxWidth} ${data.viewBoxHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.cssText = "width:100%;height:auto;max-height:100%;display:block;";
        const gBody = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gBody.setAttribute("fill", "none");
        gBody.setAttribute("stroke", "#bbb");
        gBody.setAttribute("stroke-width", "4");
        for (const d of data.bodyPaths) {
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", d);
          gBody.appendChild(p);
        }
        svg.appendChild(gBody);
        if (!bodyOnly) {
          const gGarment = document.createElementNS("http://www.w3.org/2000/svg", "g");
          gGarment.setAttribute("fill", "none");
          const dashArr = data.garmentPathStrokeDasharrays;
          const widthArr = data.garmentPathStrokeWidths;
          const strokeArr = data.garmentPathStrokes;
          for (let gi = 0; gi < data.garmentPaths.length; gi++) {
            const d = data.garmentPaths[gi];
            const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p.setAttribute("d", d);
            const sw = widthArr == null ? void 0 : widthArr[gi];
            const stroke = strokeArr == null ? void 0 : strokeArr[gi];
            const dash = dashArr == null ? void 0 : dashArr[gi];
            p.setAttribute("stroke-width", sw != null && Number.isFinite(sw) ? String(sw) : "8");
            p.setAttribute("stroke", stroke && stroke.length > 0 ? stroke : "rgba(70, 70, 70, 0.82)");
            if (dash != null && String(dash).trim().length > 0) {
              p.setAttribute("stroke-dasharray", String(dash));
            }
            gGarment.appendChild(p);
          }
          svg.appendChild(gGarment);
        }
        target.appendChild(svg);
      } catch {
        target.innerHTML = "";
        const err = el("div", "padding:16px;color:#b91c1c;font-size:13px;text-align:center;");
        err.textContent = "試着表示の読み込みに失敗しました";
        target.appendChild(err);
      }
    }
    async function loadGarmentFitSvg() {
      return loadGarmentFitSvgInto(viewerArea, fitHeightCm, fitBodyVal);
    }
    if (garmentFitAvailable) {
      void loadGarmentFitSvg();
    } else {
      const silhouetteLayer = el(
        "div",
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;"
      );
      silhouetteLayer.appendChild(createBodySilhouetteSvg());
      viewerArea.appendChild(silhouetteLayer);
      if (thumbnailUrl) {
        garmentImg = document.createElement("img");
        garmentImg.src = thumbnailUrl;
        garmentImg.alt = "";
        const firstHex = ((_c = swatches[0]) == null ? void 0 : _c.hex) || "#e8c547";
        garmentImg.style.cssText = `position:relative;z-index:1;max-width:58%;max-height:62%;object-fit:contain;filter:${colorFilterForHex(
          ((_d = swatches.find((s) => s.id === selectedColorId)) == null ? void 0 : _d.hex) || firstHex
        )};`;
        viewerArea.appendChild(garmentImg);
      }
    }
    phoneScreen.appendChild(viewerArea);
    const WINDOW = 3;
    const idxSize = sizeKeys.indexOf(currentSize);
    let windowStart = idxSize >= 0 ? Math.min(Math.max(0, idxSize), Math.max(0, sizeKeys.length - WINDOW)) : 0;
    const sizeSection = el("div", "padding:8px 12px 6px;display:flex;flex-direction:column;gap:6px;");
    const sizeRow = el("div", "display:flex;flex-direction:row;align-items:center;justify-content:center;gap:6px;");
    const prevBtn = el(
      "button",
      "width:28px;height:28px;border:none;background:transparent;font-size:17px;color:#111;cursor:pointer;line-height:1;"
    );
    prevBtn.textContent = "‹";
    const nextBtn = el(
      "button",
      "width:28px;height:28px;border:none;background:transparent;font-size:17px;color:#111;cursor:pointer;line-height:1;"
    );
    nextBtn.textContent = "›";
    const sizeBtnsWrap = el("div", "display:flex;flex-direction:row;gap:6px;align-items:center;justify-content:center;");
    function renderSizeButtons() {
      sizeBtnsWrap.innerHTML = "";
      const slice = sizeKeys.slice(windowStart, windowStart + WINDOW);
      slice.forEach((sz) => {
        const isSel = sz === currentSize;
        const btn = el(
          "button",
          `width:34px;height:34px;border-radius:50%;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;` + (isSel ? `background:${accent};color:#fff;border:none;` : `background:#fff;color:#111;border:1px solid #111;`)
        );
        btn.textContent = sz;
        btn.addEventListener("click", () => {
          currentSize = sz;
          if (eshopId && eshopId !== "unknown") {
            const pid = params.productId || params.externalProductId || "";
            sendEvent({
              shopId: eshopId,
              productId: uuidRe.test(pid) ? pid : void 0,
              type: "size_change",
              meta: { size: sz }
            }).catch(() => {
            });
          }
          renderSizeButtons();
          if (garmentFitAvailable) {
            void loadGarmentFitSvg();
          }
        });
        sizeBtnsWrap.appendChild(btn);
      });
      prevBtn.style.opacity = windowStart <= 0 ? "0.35" : "1";
      prevBtn.style.pointerEvents = windowStart <= 0 ? "none" : "auto";
      nextBtn.style.opacity = windowStart + WINDOW >= sizeKeys.length ? "0.35" : "1";
      nextBtn.style.pointerEvents = windowStart + WINDOW >= sizeKeys.length ? "none" : "auto";
    }
    prevBtn.addEventListener("click", () => {
      windowStart = Math.max(0, windowStart - 1);
      renderSizeButtons();
    });
    nextBtn.addEventListener("click", () => {
      windowStart = Math.min(sizeKeys.length - WINDOW, windowStart + 1);
      renderSizeButtons();
    });
    sizeRow.appendChild(prevBtn);
    sizeRow.appendChild(sizeBtnsWrap);
    sizeRow.appendChild(nextBtn);
    sizeSection.appendChild(sizeRow);
    phoneScreen.appendChild(sizeSection);
    renderSizeButtons();
    const cartWrap = el(
      "div",
      "padding:8px 12px 12px;padding-bottom:max(12px, env(safe-area-inset-bottom));flex-shrink:0;"
    );
    const cartBtn = el(
      "button",
      `width:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:10px 14px;border:none;border-radius:10px;background:${accent};color:#fff;font-size:13px;font-weight:700;cursor:pointer;`
    );
    const cartLeft = el("div", "display:flex;align-items:center;gap:8px;");
    cartLeft.appendChild(iconCart());
    const cartMid = el("span", "flex:1;text-align:center;");
    cartMid.textContent = ctaCart;
    const cartRight = el(
      "div",
      "width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:11px;"
    );
    cartRight.textContent = "→";
    cartBtn.appendChild(cartLeft);
    cartBtn.appendChild(cartMid);
    cartBtn.appendChild(cartRight);
    cartBtn.addEventListener("click", () => {
      if (eshopId && eshopId !== "unknown") {
        const pid = params.productId || params.externalProductId || "";
        sendEvent({
          shopId: eshopId,
          productId: uuidRe.test(pid) ? pid : void 0,
          type: "add_to_cart",
          meta: { size: currentSize, colorId: selectedColorId }
        }).catch(() => {
        });
      }
      try {
        window.dispatchEvent(
          new CustomEvent("atelier:add-to-cart", {
            detail: { size: currentSize, colorId: selectedColorId, productId: params.externalProductId || params.productId }
          })
        );
      } catch {
      }
    });
    cartWrap.appendChild(cartBtn);
    phoneScreen.appendChild(cartWrap);
    let bodyAdjustOverlay = null;
    let bodyDraftPreviewTimer = null;
    function closeBodyAdjustOverlay() {
      if (bodyDraftPreviewTimer) {
        clearTimeout(bodyDraftPreviewTimer);
        bodyDraftPreviewTimer = null;
      }
      if (bodyAdjustOverlay) {
        bodyAdjustOverlay.remove();
        bodyAdjustOverlay = null;
      }
    }
    function openBodySheet() {
      if (bodyAdjustOverlay) return;
      let setupHeight = fitHeightCm;
      let bodyVal = fitBodyVal;
      bodyAdjustOverlay = el(
        "div",
        "position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:" + interfaceBg + ";border-radius:34px;overflow:hidden;animation:atelier-fade-in 0.2s ease-out;"
      );
      bodyAdjustOverlay.setAttribute("data-atelier-body-adjust", "true");
      const backPadTop = "padding:10px 14px 6px;padding-top:max(10px, env(safe-area-inset-top));";
      const backRowInner = el("div", backPadTop + "flex-shrink:0;");
      const backToProduct = el(
        "button",
        "border:none;background:transparent;padding:6px 0;font-size:15px;color:#111;cursor:pointer;display:flex;align-items:center;gap:4px;"
      );
      backToProduct.type = "button";
      backToProduct.textContent = "← 商品に戻る";
      backToProduct.addEventListener("click", () => closeBodyAdjustOverlay());
      backRowInner.appendChild(backToProduct);
      bodyAdjustOverlay.appendChild(backRowInner);
      const figureArea = el(
        "div",
        `flex:1;min-height:120px;min-width:0;flex-basis:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:visible;padding:8px 12px 8px;box-sizing:border-box;background:${canvasBg};`
      );
      function scheduleBodyDraftPreview() {
        if (!garmentFitAvailable) return;
        if (bodyDraftPreviewTimer) clearTimeout(bodyDraftPreviewTimer);
        bodyDraftPreviewTimer = setTimeout(() => {
          bodyDraftPreviewTimer = null;
          void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, { bodyOnly: true });
        }, 140);
      }
      if (garmentFitAvailable) {
        void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, { bodyOnly: true });
      } else {
        const silhouetteLayer = el(
          "div",
          "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;"
        );
        silhouetteLayer.appendChild(createBodySilhouetteSvg());
        figureArea.appendChild(silhouetteLayer);
      }
      bodyAdjustOverlay.appendChild(figureArea);
      const controls = el(
        "div",
        "flex-shrink:0;padding:0 18px 10px;display:flex;flex-direction:column;gap:14px;background:" + interfaceBg + ";"
      );
      const hRow = el("div", "width:100%;");
      const hLabel = el("div", "display:flex;justify-content:space-between;align-items:center;font-size:15px;margin-bottom:8px;color:#111;");
      const hTitle = el("span", "", "身長");
      const hVal = el("span", "", `${setupHeight} cm`);
      hLabel.appendChild(hTitle);
      hLabel.appendChild(hVal);
      const hInput = document.createElement("input");
      hInput.type = "range";
      hInput.min = "150";
      hInput.max = "195";
      hInput.value = String(fitHeightCm);
      hInput.style.cssText = "width:100%;height:28px;accent-color:" + accent + ";";
      hInput.addEventListener("input", () => {
        setupHeight = parseInt(hInput.value, 10) || 170;
        hVal.textContent = `${setupHeight} cm`;
        scheduleBodyDraftPreview();
      });
      hRow.appendChild(hLabel);
      hRow.appendChild(hInput);
      controls.appendChild(hRow);
      const bRow = el("div", "width:100%;");
      const bLabel = el("div", "display:flex;justify-content:space-between;align-items:center;font-size:15px;margin-bottom:8px;color:#111;");
      const bTitle = el("span", "", "体型");
      const bVal = el("span", "", String(fitBodyVal));
      bLabel.appendChild(bTitle);
      bLabel.appendChild(bVal);
      const bInput = document.createElement("input");
      bInput.type = "range";
      bInput.min = "0";
      bInput.max = "100";
      bInput.value = String(fitBodyVal);
      bInput.style.cssText = "width:100%;height:28px;accent-color:" + accent + ";";
      bInput.addEventListener("input", () => {
        bodyVal = parseInt(bInput.value, 10) || 0;
        bVal.textContent = String(bodyVal);
        scheduleBodyDraftPreview();
      });
      bRow.appendChild(bLabel);
      bRow.appendChild(bInput);
      controls.appendChild(bRow);
      bodyAdjustOverlay.appendChild(controls);
      const ctaPad = "padding:12px 18px;padding-bottom:max(14px, env(safe-area-inset-bottom));flex-shrink:0;background:" + interfaceBg + ";";
      const ctaWrap = el("div", ctaPad);
      const applyBtn = el(
        "button",
        `width:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:14px 16px;border:none;border-radius:12px;background:${accent};color:#fff;font-size:15px;font-weight:700;cursor:pointer;`
      );
      applyBtn.type = "button";
      const applyMid = el("span", "flex:1;text-align:center;");
      applyMid.textContent = ctaTryOn;
      const applyRight = el(
        "div",
        "width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;"
      );
      applyRight.textContent = "→";
      applyBtn.appendChild(applyMid);
      applyBtn.appendChild(applyRight);
      applyBtn.addEventListener("click", () => {
        fitHeightCm = setupHeight;
        fitBodyVal = bodyVal;
        if (garmentFitAvailable) {
          void loadGarmentFitSvg();
        }
        closeBodyAdjustOverlay();
      });
      ctaWrap.appendChild(applyBtn);
      bodyAdjustOverlay.appendChild(ctaWrap);
      phoneScreen.appendChild(bodyAdjustOverlay);
    }
    bodyBtn.addEventListener("click", openBodySheet);
    if (isDevelopmentMode()) {
      console.log("[Atelier Widget] 2D view ready", { productName, sizes: sizeKeys });
    }
  }
  function showErrorInModal(_shadowRoot, errorMessage, overlay, contentArea) {
    if (!overlay || !contentArea) return;
    contentArea.innerHTML = "";
    contentArea.style.cssText = `
    flex: 1; display: flex; flex-direction: column;
    overflow: hidden; align-items: center; justify-content: center;
    padding: 24px; text-align: center; background: #ececec;
    padding-top: max(24px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  `;
    const div = document.createElement("div");
    div.style.cssText = "color:#dc2626;font-size:15px;line-height:1.5;white-space:pre-line;";
    div.textContent = errorMessage;
    contentArea.appendChild(div);
  }
  function initWidget() {
    const elements = document.querySelectorAll(
      "[data-atelier-public-key], [data-atelier-shop-id]"
    );
    const currentProductIds = /* @__PURE__ */ new Set();
    elements.forEach((element) => {
      const productId = element.getAttribute("data-atelier-product-id") || element.getAttribute("data-atelier-external-product-id");
      if (productId) {
        currentProductIds.add(productId);
      }
    });
    const allWidgetContainers = document.querySelectorAll('[id^="atelier-widget-container-"]');
    allWidgetContainers.forEach((container) => {
      const containerProductId = container.getAttribute("data-atelier-product-id");
      if (containerProductId && !currentProductIds.has(containerProductId)) {
        container.remove();
      }
    });
    if (elements.length === 0) {
      console.warn("[Atelier Widget] No widget elements found. Make sure you have elements with data-atelier-public-key or data-atelier-shop-id attribute.");
      return;
    }
    elements.forEach((element, index) => {
      if (element.shadowRoot) {
        return;
      }
      const publicKey = element.getAttribute("data-atelier-public-key");
      const externalProductId = element.getAttribute("data-atelier-external-product-id");
      const shopId = element.getAttribute("data-atelier-shop-id");
      const productId = element.getAttribute("data-atelier-product-id");
      const sku = element.getAttribute("data-atelier-sku");
      const handle = element.getAttribute("data-atelier-handle");
      const url = element.getAttribute("data-atelier-url");
      if (!publicKey && !shopId) {
        console.warn("[Atelier Widget] public-key or shop-id is required");
        return;
      }
      try {
        element.style.display = "block";
        element.style.width = "auto";
        element.style.height = "auto";
        element.style.margin = "0";
        element.style.padding = "0";
        element.style.border = "none";
        element.style.background = "transparent";
        const shadowRoot = element.attachShadow({ mode: "open" });
        const params = {
          publicKey: publicKey || null,
          shopId: shopId || null,
          // 後方互換性のため
          externalProductId: externalProductId || null,
          productId: productId || null,
          // 後方互換性のため
          sku,
          handle,
          url
        };
        const pid = productId || externalProductId || `widget-${Date.now()}-${Math.random()}`;
        const containerId = `atelier-widget-container-${pid}`;
        renderCube(shadowRoot, params, handleCubeClick, null);
        if (publicKey) {
          const designFetch = fetchWidgetDesign(publicKey);
          const designTimeout = new Promise(
            (resolve) => setTimeout(() => resolve(null), 1500)
          );
          Promise.race([designFetch, designTimeout]).then((design) => {
            if (design) {
              applyDesignToButton(containerId, design);
            } else {
              showDefaultButton(containerId);
            }
          }).catch(() => {
            showDefaultButton(containerId);
          });
          designFetch.then((design) => {
            if (design) {
              applyDesignToButton(containerId, design);
            }
          }).catch(() => {
          });
        } else {
          showDefaultButton(containerId);
        }
      } catch (error) {
        console.error(`[Atelier Widget] Failed to initialize widget ${index + 1}:`, error);
      }
    });
    updateButtonPositions();
  }
  async function handleCubeClick(shadowRoot, params) {
    if (!params.publicKey && !params.shopId) {
      alert("ウィジェットの設定エラー: Public Keyが設定されていません");
      return;
    }
    if (!params.externalProductId && !params.productId) {
      alert("ウィジェットの設定エラー: 商品IDが設定されていません。data-atelier-external-product-id属性を追加してください。");
      return;
    }
    const eventShopId = params.shopId || "unknown";
    sendEvent({
      shopId: eventShopId,
      productId: params.productId || params.externalProductId || void 0,
      type: "cube_click"
    }).catch(() => {
    });
    const { overlay, contentArea } = renderModalWithLoading();
    try {
      const config = await fetchWidgetConfig(params);
      if (config.enabled) {
        updateModalWithConfig(shadowRoot, config, params, overlay, contentArea);
      } else {
        const errorDetails = config.error || "不明なエラー";
        showErrorInModal(shadowRoot, `この商品の試着は現在利用できません。

エラー: ${errorDetails}`, overlay, contentArea);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Atelier Widget] Error in handleCubeClick:", errorMessage);
      showErrorInModal(shadowRoot, `試着画面の読み込みに失敗しました。

エラー: ${errorMessage}`, overlay, contentArea);
    }
  }
  if (typeof window !== "undefined") {
    let doInit = function() {
      if (initialized) {
        return;
      }
      initialized = true;
      initWidget();
    };
    let initialized = false;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        doInit();
      });
    } else {
      doInit();
    }
    if (document.readyState !== "complete") {
      window.addEventListener("load", () => {
        if (!initialized) {
          doInit();
        }
      });
    }
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => {
        const elements = document.querySelectorAll(
          "[data-atelier-public-key], [data-atelier-shop-id]"
        );
        const uninitialized = Array.from(elements).filter(
          (el2) => !el2.shadowRoot
        );
        if (uninitialized.length > 0) {
          initWidget();
        }
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
    setTimeout(() => {
      const elements = document.querySelectorAll(
        "[data-atelier-public-key], [data-atelier-shop-id]"
      );
      const uninitialized = Array.from(elements).filter(
        (el2) => !el2.shadowRoot
      );
      if (uninitialized.length > 0) {
        initWidget();
      }
    }, 500);
  }
})();
