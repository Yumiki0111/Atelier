(function() {
  "use strict";
  const WIDGET_EMBED_PREFIX = "fitlook";
  const WIDGET_EMBED_LEGACY_PREFIX = "atelier";
  function readEmbedAttr(el2, name) {
    return el2.getAttribute(`data-${WIDGET_EMBED_PREFIX}-${name}`) ?? el2.getAttribute(`data-${WIDGET_EMBED_LEGACY_PREFIX}-${name}`);
  }
  const WIDGET_HOST_SELECTOR = [
    "[data-fitlook-public-key]",
    "[data-atelier-public-key]",
    "[data-fitlook-shop-id]",
    "[data-atelier-shop-id]"
  ].join(", ");
  const WIDGET_CONTAINER_ID_PREFIX = "fitlook-widget-container-";
  const WIDGET_CONTAINER_LEGACY_ID_PREFIX = "Atelier-widget-container-";
  const WIDGET_BUTTON_ID_PREFIX = "fitlook-widget-button-";
  const WIDGET_ALL_CONTAINER_SELECTOR = `[id^="${WIDGET_CONTAINER_ID_PREFIX}"], [id^="${WIDGET_CONTAINER_LEGACY_ID_PREFIX}"]`;
  const WIDGET_LOG_PREFIX = "[FIT&LOOK Widget]";
  function readApiUrlFromDocument() {
    var _a, _b;
    return ((_a = document.querySelector("[data-fitlook-api-url]")) == null ? void 0 : _a.getAttribute("data-fitlook-api-url")) ?? ((_b = document.querySelector("[data-atelier-api-url]")) == null ? void 0 : _b.getAttribute("data-atelier-api-url")) ?? null;
  }
  const DEV_PORTS = /* @__PURE__ */ new Set(["3000", "3001", "5173", "5174"]);
  function isDevelopmentMode() {
    if (typeof window === "undefined") return false;
    const { hostname, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    return isLocalHost && DEV_PORTS.has(port);
  }
  function getApiBaseUrl() {
    if (typeof window === "undefined") return "";
    const apiUrlAttr = readApiUrlFromDocument();
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
          console.warn(`${WIDGET_LOG_PREFIX} API returned ${response2.status}, using mock config.`);
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
        console.warn(`${WIDGET_LOG_PREFIX} Event send error:`, error);
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
        console.error(`${WIDGET_LOG_PREFIX} Failed to send event:`, error);
      }
    }
  }
  function updateButtonPositions() {
    const allWidgetContainers = Array.from(document.querySelectorAll(WIDGET_ALL_CONTAINER_SELECTOR));
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
    const buttonId = `${WIDGET_BUTTON_ID_PREFIX}${productId}`;
    const containerId = `${WIDGET_CONTAINER_ID_PREFIX}${productId}`;
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
    button.setAttribute("data-fitlook-product-id", productId);
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
    container.setAttribute("data-fitlook-product-id", productId);
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
    const defaultImageUrl = `${apiBaseUrl}/human-logo.png`;
    const defaultDesign = {
      button: {
        shape: "circle",
        imageUrl: defaultImageUrl,
        color: "#ffffff"
      }
    };
    applyDesignToButton(containerId, defaultDesign);
  }
  const FITLOOK_LOGO_SVG_PATH_D = "M65.8594 -0.000150681H119.235V15.8399H87.0754V27.1678H114.723V42.3359H87.0754V66.0479H65.8594V-0.000150681ZM130.851 66.0479V-0.000150681H152.067V66.0479H130.851ZM205.219 16.8958V66.0479H184.003V16.8958H162.307V-0.000150681H226.819V16.8958H205.219ZM172.849 128.923L180.349 129.11H180.443C182.505 129.11 183.958 129.079 184.802 129.017C185.052 129.173 185.271 129.47 185.458 129.907L185.224 131.548C184.912 135.11 183.943 138.673 182.318 142.235C180.724 145.798 178.537 148.97 175.755 151.751L184.896 161.22C185.771 162.157 186.505 163.017 187.099 163.798L188.037 164.688C189.099 165.72 189.662 166.47 189.724 166.938C189.724 167.438 188.787 167.688 186.912 167.688L184.708 167.642H172.568C169.005 167.642 165.662 167.579 162.537 167.454C161.505 166.892 160.583 166.204 159.771 165.392L157.943 163.845L155.458 165.11C148.771 167.61 143.193 169.001 138.724 169.282L134.552 169.423C128.365 169.423 122.802 168.517 117.865 166.704C112.927 164.892 109.099 162.407 106.38 159.251C103.662 156.095 102.302 152.579 102.302 148.704C102.302 139.517 108.552 132.626 121.052 128.032C117.708 125.876 114.943 123.282 112.755 120.251C110.599 117.22 109.521 114.407 109.521 111.813C109.521 106.97 111.115 103.063 114.302 100.095C116.24 98.2822 119.287 96.7041 123.443 95.3604C127.599 94.0166 132.162 93.3447 137.13 93.3447C147.63 93.3447 155.474 95.1572 160.662 98.7822C164.599 101.563 166.568 105.392 166.568 110.267C166.568 113.829 165.365 117.095 162.958 120.063C160.583 123.032 157.021 126.235 152.271 129.673C153.927 131.329 155.208 132.532 156.115 133.282V133.235L161.177 138.063C162.896 135.751 163.802 133.829 163.896 132.298C164.021 130.735 164.396 129.798 165.021 129.485C165.833 129.11 168.443 128.923 172.849 128.923ZM148.943 152.876C147.599 151.813 146.552 150.845 145.802 149.97C145.052 149.095 144.583 148.563 144.396 148.376L137.318 141.626C136.912 141.626 136.599 141.438 136.38 141.063C136.193 140.657 135.568 139.954 134.505 138.954C133.474 137.923 132.552 137.392 131.74 137.36C130.052 138.173 128.505 139.595 127.099 141.626C125.724 143.657 125.037 145.642 125.037 147.579C125.037 149.485 125.662 151.173 126.912 152.642C129.255 155.298 132.333 156.626 136.146 156.626C139.958 156.626 144.224 155.376 148.943 152.876ZM137.224 120.345L137.177 120.298C137.583 120.548 138.005 120.673 138.443 120.673C138.88 120.673 139.271 120.595 139.615 120.438C143.146 117.751 145.349 115.438 146.224 113.501C146.63 112.563 146.833 111.438 146.833 110.126C146.833 108.813 146.302 107.626 145.24 106.563C143.458 104.782 141.193 103.892 138.443 103.892C135.724 103.892 133.537 104.563 131.88 105.907C130.224 107.22 129.396 109.001 129.396 111.251C129.708 114.313 132.318 117.345 137.224 120.345ZM-3.8147e-06 200H21.216V249.152H55.104V266.048H-3.8147e-06V200ZM95.2695 198.848C106.661 198.848 115.462 201.76 121.67 207.584C127.878 213.408 130.982 221.888 130.982 233.024C130.982 244.16 127.878 252.64 121.67 258.464C115.462 264.288 106.661 267.2 95.2695 267.2C83.8775 267.2 75.0775 264.32 68.8695 258.56C62.7255 252.736 59.6535 244.224 59.6535 233.024C59.6535 221.824 62.7255 213.344 68.8695 207.584C75.0775 201.76 83.8775 198.848 95.2695 198.848ZM95.2695 214.688C90.7255 214.688 87.2695 216.064 84.9015 218.816C82.5335 221.568 81.3495 225.28 81.3495 229.952V236.096C81.3495 240.768 82.5335 244.48 84.9015 247.232C87.2695 249.984 90.7255 251.36 95.2695 251.36C99.8135 251.36 103.269 249.984 105.638 247.232C108.069 244.48 109.285 240.768 109.285 236.096V229.952C109.285 225.28 108.069 221.568 105.638 218.816C103.269 216.064 99.8135 214.688 95.2695 214.688ZM175.238 198.848C186.63 198.848 195.43 201.76 201.638 207.584C207.846 213.408 210.95 221.888 210.95 233.024C210.95 244.16 207.846 252.64 201.638 258.464C195.43 264.288 186.63 267.2 175.238 267.2C163.846 267.2 155.046 264.32 148.838 258.56C142.694 252.736 139.622 244.224 139.622 233.024C139.622 221.824 142.694 213.344 148.838 207.584C155.046 201.76 163.846 198.848 175.238 198.848ZM175.238 214.688C170.694 214.688 167.238 216.064 164.87 218.816C162.502 221.568 161.318 225.28 161.318 229.952V236.096C161.318 240.768 162.502 244.48 164.87 247.232C167.238 249.984 170.694 251.36 175.238 251.36C179.782 251.36 183.238 249.984 185.606 247.232C188.038 244.48 189.254 240.768 189.254 236.096V229.952C189.254 225.28 188.038 221.568 185.606 218.816C183.238 216.064 179.782 214.688 175.238 214.688ZM267.111 200H293.415L269.703 227.168L293.895 266.048H268.839L255.111 241.856L243.591 251.264V266.048H222.375V200H243.591V228.224L267.111 200Z";
  const TOTAL = 4e3;
  const DRAW_MS = 1800;
  const FILL_START = 1600;
  const FILL_MS = 600;
  function ease(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  function mountFitLookLogoLoadingAnimation(container) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;padding:24px;box-sizing:border-box;";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 294 268");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.style.cssText = "width:min(72vw, 220px);height:auto;max-height:38vh;display:block;";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", FITLOOK_LOGO_SVG_PATH_D);
    path.setAttribute("stroke", "#111");
    path.setAttribute("stroke-width", "1");
    path.setAttribute("fill", "transparent");
    svg.appendChild(path);
    wrap.appendChild(svg);
    container.appendChild(wrap);
    let raf = null;
    let startTime = null;
    function reset() {
      path.style.strokeDasharray = String(TOTAL);
      path.style.strokeDashoffset = String(TOTAL);
      path.style.fill = "transparent";
    }
    function tick(ts) {
      if (startTime == null) startTime = ts;
      const e = ts - startTime;
      path.style.strokeDashoffset = String(TOTAL * (1 - ease(Math.min(e / DRAW_MS, 1))));
      if (e >= FILL_START) {
        path.style.fill = `rgba(0,0,0,${ease(Math.min((e - FILL_START) / FILL_MS, 1))})`;
      }
      if (e < DRAW_MS + FILL_MS) raf = requestAnimationFrame(tick);
      else raf = null;
    }
    function play() {
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      reset();
      requestAnimationFrame(() => {
        startTime = null;
        raf = requestAnimationFrame(tick);
      });
    }
    play();
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
    };
  }
  const ACCENT_DEFAULT = "#3d3835";
  const DEFAULT_FIT_BODY_VAL = 25;
  const DEFAULT_SWATCHES = [
    { id: "default-1", hex: "#e8c547", label: "Yellow" },
    { id: "default-2", hex: "#d4d4d4", label: "Grey" },
    { id: "default-3", hex: "#1a1a1a", label: "Black" }
  ];
  function injectStyles() {
    if (document.getElementById("fitlook-bs-styles")) return;
    const s = document.createElement("style");
    s.id = "fitlook-bs-styles";
    s.textContent = `
    @keyframes fitlook-fade-in  { from{opacity:0} to{opacity:1} }
    [data-fitlook-modal] *, [data-atelier-modal] * {
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
    const cleanup = overlay.__fitlookCleanup;
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
    const existingOverlays = document.querySelectorAll(
      "[data-fitlook-modal-overlay='true'], [data-atelier-modal-overlay='true']"
    );
    existingOverlays.forEach((el2) => {
      if (el2.style.opacity === "0" || parseFloat(el2.style.opacity) < 0.1) {
        el2.remove();
      }
    });
    const overlay = document.createElement("div");
    overlay.setAttribute("data-fitlook-modal", "true");
    overlay.setAttribute("data-fitlook-modal-overlay", "true");
    overlay.style.cssText = `
    position: fixed !important; inset: 0 !important;
    background: #ececec !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    opacity: 0; animation: fitlook-fade-in 0.22s ease-out forwards;
  `;
    const contentArea = document.createElement("div");
    contentArea.setAttribute("data-fitlook-content-area", "true");
    contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;background:#ececec;";
    const splashWrap = document.createElement("div");
    splashWrap.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;background:#f8f6f1;";
    const cancelSplash = mountFitLookLogoLoadingAnimation(splashWrap);
    contentArea.appendChild(splashWrap);
    overlay.appendChild(contentArea);
    document.body.appendChild(overlay);
    const cleanup = { fn: cancelSplash };
    overlay.__fitlookCleanup = cleanup;
    return { overlay, contentArea };
  }
  function updateModalWithConfig(_shadowRoot, config, params, overlay, contentArea) {
    var _a, _b, _c, _d;
    if (!overlay || !contentArea) return;
    injectStyles();
    const prevCleanup = overlay.__fitlookCleanup;
    if (prevCleanup == null ? void 0 : prevCleanup.fn) prevCleanup.fn();
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
    const cleanup = overlay.__fitlookCleanup;
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
    viewerArea.setAttribute("data-fitlook-viewer-container", "true");
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
      const cartDetail = {
        size: currentSize,
        colorId: selectedColorId,
        productId: params.externalProductId || params.productId
      };
      try {
        window.dispatchEvent(new CustomEvent("fitlook:add-to-cart", { detail: cartDetail }));
        window.dispatchEvent(new CustomEvent("Atelier:add-to-cart", { detail: cartDetail }));
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
        "position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:" + interfaceBg + ";border-radius:34px;overflow:hidden;animation:fitlook-fade-in 0.2s ease-out;"
      );
      bodyAdjustOverlay.setAttribute("data-fitlook-body-adjust", "true");
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
      console.log(`${WIDGET_LOG_PREFIX} 2D view ready`, { productName, sizes: sizeKeys });
    }
  }
  function showErrorInModal(_shadowRoot, errorMessage, overlay, contentArea) {
    if (!overlay || !contentArea) return;
    const prevCleanup = overlay.__fitlookCleanup;
    if (prevCleanup == null ? void 0 : prevCleanup.fn) prevCleanup.fn();
    if (prevCleanup) prevCleanup.fn = () => {
    };
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
    const elements = document.querySelectorAll(WIDGET_HOST_SELECTOR);
    const currentProductIds = /* @__PURE__ */ new Set();
    elements.forEach((element) => {
      const productId = readEmbedAttr(element, "product-id") || readEmbedAttr(element, "external-product-id");
      if (productId) {
        currentProductIds.add(productId);
      }
    });
    const allWidgetContainers = document.querySelectorAll(WIDGET_ALL_CONTAINER_SELECTOR);
    allWidgetContainers.forEach((container) => {
      const containerProductId = readEmbedAttr(container, "product-id");
      if (containerProductId && !currentProductIds.has(containerProductId)) {
        container.remove();
      }
    });
    if (elements.length === 0) {
      console.warn(
        `${WIDGET_LOG_PREFIX} No widget elements found. Use data-fitlook-public-key / data-fitlook-shop-id (or legacy data-atelier-*).`
      );
      return;
    }
    elements.forEach((element, index) => {
      if (element.shadowRoot) {
        return;
      }
      const publicKey = readEmbedAttr(element, "public-key");
      const externalProductId = readEmbedAttr(element, "external-product-id");
      const shopId = readEmbedAttr(element, "shop-id");
      const productId = readEmbedAttr(element, "product-id");
      const sku = readEmbedAttr(element, "sku");
      const handle = readEmbedAttr(element, "handle");
      const url = readEmbedAttr(element, "url");
      if (!publicKey && !shopId) {
        console.warn(`${WIDGET_LOG_PREFIX} public-key or shop-id is required`);
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
        const containerId = `${WIDGET_CONTAINER_ID_PREFIX}${pid}`;
        renderCube(shadowRoot, params, handleCubeClick, null);
        if (publicKey) {
          const designFetch = fetchWidgetDesign(publicKey);
          const designTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
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
        console.error(`${WIDGET_LOG_PREFIX} Failed to initialize widget ${index + 1}:`, error);
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
      alert(
        "ウィジェットの設定エラー: 商品IDが設定されていません。data-fitlook-external-product-id（推奨）または data-atelier-external-product-id を追加してください。"
      );
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
      console.error(`${WIDGET_LOG_PREFIX} Error in handleCubeClick:`, errorMessage);
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
        const elements = document.querySelectorAll(WIDGET_HOST_SELECTOR);
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
      const elements = document.querySelectorAll(WIDGET_HOST_SELECTOR);
      const uninitialized = Array.from(elements).filter(
        (el2) => !el2.shadowRoot
      );
      if (uninitialized.length > 0) {
        initWidget();
      }
    }, 500);
  }
})();
