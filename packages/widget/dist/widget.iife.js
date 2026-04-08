(function() {
  "use strict";
  const WIDGET_EMBED_PREFIX = "fitlook";
  const WIDGET_EMBED_LEGACY_PREFIX = "atelier";
  function readEmbedAttr(el2, name) {
    return el2.getAttribute(`data-${WIDGET_EMBED_PREFIX}-${name}`) ?? el2.getAttribute(`data-${WIDGET_EMBED_LEGACY_PREFIX}-${name}`);
  }
  function isInlinePlacement(placement) {
    if (!placement) return false;
    const p = placement.trim().toLowerCase();
    return p === "inline" || p === "embedded";
  }
  function isOverlayModeFromAttr(value) {
    return (value == null ? void 0 : value.trim().toLowerCase()) === "true";
  }
  function isPhoneFrameDisabledFromAttr(value) {
    return (value == null ? void 0 : value.trim().toLowerCase()) === "false";
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
    var _a2, _b;
    return ((_a2 = document.querySelector("[data-fitlook-api-url]")) == null ? void 0 : _a2.getAttribute("data-fitlook-api-url")) ?? ((_b = document.querySelector("[data-atelier-api-url]")) == null ? void 0 : _b.getAttribute("data-atelier-api-url")) ?? null;
  }
  const DEV_PORTS = /* @__PURE__ */ new Set(["3000", "3001"]);
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
    var _a2;
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
        const timeoutId = setTimeout(() => controller.abort(), 8e3);
        const apiUrl2 = getApiBaseUrl() || "http://localhost:3000";
        const response2 = await fetch(
          `${apiUrl2}/api/public/widget-config?${searchParams2.toString()}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const errText = await response2.text();
        let config2;
        try {
          config2 = JSON.parse(errText);
        } catch {
          return {
            enabled: false,
            error: `APIエラー: ${response2.status} ${response2.statusText}`
          };
        }
        if (!response2.ok) {
          console.warn(`${WIDGET_LOG_PREFIX} API returned ${response2.status}`, config2);
          return {
            enabled: false,
            error: config2.error || `APIエラー: ${response2.status}`
          };
        }
        if (!config2.enabled) {
          if (((_a2 = config2.asset) == null ? void 0 : _a2.sizes) && Object.keys(config2.asset.sizes).length > 0) {
            return { enabled: true, asset: config2.asset, shopId: config2.shopId, design: config2.design };
          }
          return {
            enabled: false,
            error: config2.error || "この商品の試着は利用できません"
          };
        }
        return config2;
      } catch (error) {
        console.warn(`${WIDGET_LOG_PREFIX} dev fetch failed, using mock`, error);
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
  const FITLOOK_LOGO_SVG_PATH_D = "M65.8594 -0.000150681H119.235V15.8399H87.0754V27.1678H114.723V42.3359H87.0754V66.0479H65.8594V-0.000150681ZM130.851 66.0479V-0.000150681H152.067V66.0479H130.851ZM205.219 16.8958V66.0479H184.003V16.8958H162.307V-0.000150681H226.819V16.8958H205.219ZM172.849 128.923L180.349 129.11H180.443C182.505 129.11 183.958 129.079 184.802 129.017C185.052 129.173 185.271 129.47 185.458 129.907L185.224 131.548C184.912 135.11 183.943 138.673 182.318 142.235C180.724 145.798 178.537 148.97 175.755 151.751L184.896 161.22C185.771 162.157 186.505 163.017 187.099 163.798L188.037 164.688C189.099 165.72 189.662 166.47 189.724 166.938C189.724 167.438 188.787 167.688 186.912 167.688L184.708 167.642H172.568C169.005 167.642 165.662 167.579 162.537 167.454C161.505 166.892 160.583 166.204 159.771 165.392L157.943 163.845L155.458 165.11C148.771 167.61 143.193 169.001 138.724 169.282L134.552 169.423C128.365 169.423 122.802 168.517 117.865 166.704C112.927 164.892 109.099 162.407 106.38 159.251C103.662 156.095 102.302 152.579 102.302 148.704C102.302 139.517 108.552 132.626 121.052 128.032C117.708 125.876 114.943 123.282 112.755 120.251C110.599 117.22 109.521 114.407 109.521 111.813C109.521 106.97 111.115 103.063 114.302 100.095C116.24 98.2822 119.287 96.7041 123.443 95.3604C127.599 94.0166 132.162 93.3447 137.13 93.3447C147.63 93.3447 155.474 95.1572 160.662 98.7822C164.599 101.563 166.568 105.392 166.568 110.267C166.568 113.829 165.365 117.095 162.958 120.063C160.583 123.032 157.021 126.235 152.271 129.673C153.927 131.329 155.208 132.532 156.115 133.282V133.235L161.177 138.063C162.896 135.751 163.802 133.829 163.896 132.298C164.021 130.735 164.396 129.798 165.021 129.485C165.833 129.11 168.443 128.923 172.849 128.923ZM148.943 152.876C147.599 151.813 146.552 150.845 145.802 149.97C145.052 149.095 144.583 148.563 144.396 148.376L137.318 141.626C136.912 141.626 136.599 141.438 136.38 141.063C136.193 140.657 135.568 139.954 134.505 138.954C133.474 137.923 132.552 137.392 131.74 137.36C130.052 138.173 128.505 139.595 127.099 141.626C125.724 143.657 125.037 145.642 125.037 147.579C125.037 149.485 125.662 151.173 126.912 152.642C129.255 155.298 132.333 156.626 136.146 156.626C139.958 156.626 144.224 155.376 148.943 152.876ZM137.224 120.345L137.177 120.298C137.583 120.548 138.005 120.673 138.443 120.673C138.88 120.673 139.271 120.595 139.615 120.438C143.146 117.751 145.349 115.438 146.224 113.501C146.63 112.563 146.833 111.438 146.833 110.126C146.833 108.813 146.302 107.626 145.24 106.563C143.458 104.782 141.193 103.892 138.443 103.892C135.724 103.892 133.537 104.563 131.88 105.907C130.224 107.22 129.396 109.001 129.396 111.251C129.708 114.313 132.318 117.345 137.224 120.345ZM-3.8147e-06 200H21.216V249.152H55.104V266.048H-3.8147e-06V200ZM95.2695 198.848C106.661 198.848 115.462 201.76 121.67 207.584C127.878 213.408 130.982 221.888 130.982 233.024C130.982 244.16 127.878 252.64 121.67 258.464C115.462 264.288 106.661 267.2 95.2695 267.2C83.8775 267.2 75.0775 264.32 68.8695 258.56C62.7255 252.736 59.6535 244.224 59.6535 233.024C59.6535 221.824 62.7255 213.344 68.8695 207.584C75.0775 201.76 83.8775 198.848 95.2695 198.848ZM95.2695 214.688C90.7255 214.688 87.2695 216.064 84.9015 218.816C82.5335 221.568 81.3495 225.28 81.3495 229.952V236.096C81.3495 240.768 82.5335 244.48 84.9015 247.232C87.2695 249.984 90.7255 251.36 95.2695 251.36C99.8135 251.36 103.269 249.984 105.638 247.232C108.069 244.48 109.285 240.768 109.285 236.096V229.952C109.285 225.28 108.069 221.568 105.638 218.816C103.269 216.064 99.8135 214.688 95.2695 214.688ZM175.238 198.848C186.63 198.848 195.43 201.76 201.638 207.584C207.846 213.408 210.95 221.888 210.95 233.024C210.95 244.16 207.846 252.64 201.638 258.464C195.43 264.288 186.63 267.2 175.238 267.2C163.846 267.2 155.046 264.32 148.838 258.56C142.694 252.736 139.622 244.224 139.622 233.024C139.622 221.824 142.694 213.344 148.838 207.584C155.046 201.76 163.846 198.848 175.238 198.848ZM175.238 214.688C170.694 214.688 167.238 216.064 164.87 218.816C162.502 221.568 161.318 225.28 161.318 229.952V236.096C161.318 240.768 162.502 244.48 164.87 247.232C167.238 249.984 170.694 251.36 175.238 251.36C179.782 251.36 183.238 249.984 185.606 247.232C188.038 244.48 189.254 240.768 189.254 236.096V229.952C189.254 225.28 188.038 221.568 185.606 218.816C183.238 216.064 179.782 214.688 175.238 214.688ZM267.111 200H293.415L269.703 227.168L293.895 266.048H268.839L255.111 241.856L243.591 251.264V266.048H222.375V200H243.591V228.224L267.111 200Z";
  const TOTAL = 4e3;
  const DRAW_MS = 1800;
  const FILL_START = 1600;
  const FILL_MS = 600;
  const FITLOOK_LOGO_SPLASH_DURATION_MS = DRAW_MS + FILL_MS;
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
  function updateButtonPositions() {
    const allWidgetContainers = Array.from(document.querySelectorAll(WIDGET_ALL_CONTAINER_SELECTOR)).filter(
      (el2) => el2.getAttribute("data-fitlook-inline") !== "true"
    );
    const baseBottomPx = 24;
    const baseRightPx = 24;
    const buttonSpacingPx = 72;
    allWidgetContainers.forEach((container, index) => {
      const bottomOffsetPx = baseBottomPx + index * buttonSpacingPx;
      container.style.bottom = `${bottomOffsetPx}px`;
      container.style.right = `${baseRightPx}px`;
    });
  }
  function isOverlayParams(params) {
    return params.overlay === true;
  }
  function removeExistingContainer(containerId, shadowRoot) {
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
  function renderCube(shadowRoot, params, onCubeClick, initialDesign, containerId) {
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
  }
  function applyDesignToButton(containerId, design, root = document) {
    const container = root.getElementById(containerId);
    if (!container) return;
    const button = container.querySelector("button");
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
      button.style.cssText = inline ? `
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
    ` : `
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
      const screenWidth = typeof window !== "undefined" ? window.innerWidth || document.documentElement.clientWidth || 375 : 375;
      const rightMargin = 24;
      const leftMargin = 24;
      const maxAvailableWidth = Math.max(120, screenWidth - rightMargin - leftMargin);
      const desiredWidth = Math.min(screenWidth * 0.5, 300);
      const width = inline ? Math.min(Math.max(120, Math.min(desiredWidth, maxAvailableWidth)), 280) : Math.min(desiredWidth, maxAvailableWidth);
      button.style.cssText = inline ? `
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
    ` : `
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
  function showDefaultButton(containerId, root = document) {
    const defaultDesign = {
      button: {
        shape: "pill",
        text: "試着",
        color: "#0f172a"
      }
    };
    applyDesignToButton(containerId, defaultDesign, root);
  }
  function $constructor(name, initializer2, params) {
    function init(inst, def) {
      if (!inst._zod) {
        Object.defineProperty(inst, "_zod", {
          value: {
            def,
            constr: _,
            traits: /* @__PURE__ */ new Set()
          },
          enumerable: false
        });
      }
      if (inst._zod.traits.has(name)) {
        return;
      }
      inst._zod.traits.add(name);
      initializer2(inst, def);
      const proto = _.prototype;
      const keys = Object.keys(proto);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!(k in inst)) {
          inst[k] = proto[k].bind(inst);
        }
      }
    }
    const Parent = (params == null ? void 0 : params.Parent) ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
      var _a2;
      const inst = (params == null ? void 0 : params.Parent) ? new Definition() : this;
      init(inst, def);
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      for (const fn of inst._zod.deferred) {
        fn();
      }
      return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
      value: (inst) => {
        var _a2, _b;
        if ((params == null ? void 0 : params.Parent) && inst instanceof params.Parent)
          return true;
        return (_b = (_a2 = inst == null ? void 0 : inst._zod) == null ? void 0 : _a2.traits) == null ? void 0 : _b.has(name);
      }
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
  }
  class $ZodAsyncError extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  }
  class $ZodEncodeError extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  }
  const globalConfig = {};
  function config(newConfig) {
    return globalConfig;
  }
  function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
    return values;
  }
  function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
      return value.toString();
    return value;
  }
  function cached(getter) {
    return {
      get value() {
        {
          const value = getter();
          Object.defineProperty(this, "value", { value });
          return value;
        }
      }
    };
  }
  function nullish(input) {
    return input === null || input === void 0;
  }
  function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
  }
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepString = step.toString();
    let stepDecCount = (stepString.split(".")[1] || "").length;
    if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
      const match = stepString.match(/\d?e-(\d?)/);
      if (match == null ? void 0 : match[1]) {
        stepDecCount = Number.parseInt(match[1]);
      }
    }
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  const EVALUATING = Symbol("evaluating");
  function defineLazy(object2, key, getter) {
    let value = void 0;
    Object.defineProperty(object2, key, {
      get() {
        if (value === EVALUATING) {
          return void 0;
        }
        if (value === void 0) {
          value = EVALUATING;
          value = getter();
        }
        return value;
      },
      set(v) {
        Object.defineProperty(object2, key, {
          value: v
          // configurable: true,
        });
      },
      configurable: true
    });
  }
  function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
      const descriptors = Object.getOwnPropertyDescriptors(def);
      Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
  }
  function esc(str) {
    return JSON.stringify(str);
  }
  function slugify(input) {
    return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  }
  const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
  };
  function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
  }
  const allowsEval = cached(() => {
    var _a2;
    if (typeof navigator !== "undefined" && ((_a2 = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : _a2.includes("Cloudflare"))) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  function isPlainObject(o) {
    if (isObject(o) === false)
      return false;
    const ctor = o.constructor;
    if (ctor === void 0)
      return true;
    if (typeof ctor !== "function")
      return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false)
      return false;
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
      return false;
    }
    return true;
  }
  function shallowClone(o) {
    if (isPlainObject(o))
      return { ...o };
    if (Array.isArray(o))
      return [...o];
    return o;
  }
  const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clone(inst, def, params) {
    const cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || (params == null ? void 0 : params.parent))
      cl._zod.parent = inst;
    return cl;
  }
  function normalizeParams(_params) {
    const params = _params;
    if (!params)
      return {};
    if (typeof params === "string")
      return { error: () => params };
    if ((params == null ? void 0 : params.message) !== void 0) {
      if ((params == null ? void 0 : params.error) !== void 0)
        throw new Error("Cannot specify both `message` and `error` params");
      params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
      return { ...params, error: () => params.error };
    return params;
  }
  function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
      return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
    });
  }
  const NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-34028234663852886e22, 34028234663852886e22],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
  function pick(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".pick() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = {};
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          newShape[key] = currDef.shape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function omit(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".omit() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = { ...schema._zod.def.shape };
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          delete newShape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function extend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      const existingShape = schema._zod.def.shape;
      for (const key in shape) {
        if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
          throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
        }
      }
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const _shape = { ...schema._zod.def.shape, ...shape };
        assignProp(this, "shape", _shape);
        return _shape;
      }
    });
    return clone(schema, def);
  }
  function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const _shape = { ...schema._zod.def.shape, ...shape };
        assignProp(this, "shape", _shape);
        return _shape;
      }
    });
    return clone(schema, def);
  }
  function merge(a, b) {
    const def = mergeDefs(a._zod.def, {
      get shape() {
        const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
        assignProp(this, "shape", _shape);
        return _shape;
      },
      get catchall() {
        return b._zod.def.catchall;
      },
      checks: []
      // delete existing checks
    });
    return clone(a, def);
  }
  function partial(Class, schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".partial() cannot be used on object schemas containing refinements");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = { ...oldShape };
        if (mask) {
          for (const key in mask) {
            if (!(key in oldShape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = Class ? new Class({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        } else {
          for (const key in oldShape) {
            shape[key] = Class ? new Class({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function required(Class, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = { ...oldShape };
        if (mask) {
          for (const key in mask) {
            if (!(key in shape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = new Class({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        } else {
          for (const key in oldShape) {
            shape[key] = new Class({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      }
    });
    return clone(schema, def);
  }
  function aborted(x, startIndex = 0) {
    var _a2;
    if (x.aborted === true)
      return true;
    for (let i = startIndex; i < x.issues.length; i++) {
      if (((_a2 = x.issues[i]) == null ? void 0 : _a2.continue) !== true) {
        return true;
      }
    }
    return false;
  }
  function prefixIssues(path, issues) {
    return issues.map((iss) => {
      var _a2;
      (_a2 = iss).path ?? (_a2.path = []);
      iss.path.unshift(path);
      return iss;
    });
  }
  function unwrapMessage(message) {
    return typeof message === "string" ? message : message == null ? void 0 : message.message;
  }
  function finalizeIssue(iss, ctx, config2) {
    var _a2, _b, _c, _d, _e, _f;
    const full = { ...iss, path: iss.path ?? [] };
    if (!iss.message) {
      const message = unwrapMessage((_c = (_b = (_a2 = iss.inst) == null ? void 0 : _a2._zod.def) == null ? void 0 : _b.error) == null ? void 0 : _c.call(_b, iss)) ?? unwrapMessage((_d = ctx == null ? void 0 : ctx.error) == null ? void 0 : _d.call(ctx, iss)) ?? unwrapMessage((_e = config2.customError) == null ? void 0 : _e.call(config2, iss)) ?? unwrapMessage((_f = config2.localeError) == null ? void 0 : _f.call(config2, iss)) ?? "Invalid input";
      full.message = message;
    }
    delete full.inst;
    delete full.continue;
    if (!(ctx == null ? void 0 : ctx.reportInput)) {
      delete full.input;
    }
    return full;
  }
  function getLengthableOrigin(input) {
    if (Array.isArray(input))
      return "array";
    if (typeof input === "string")
      return "string";
    return "unknown";
  }
  function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
      return {
        message: iss,
        code: "custom",
        input,
        inst
      };
    }
    return { ...iss };
  }
  const initializer$1 = (inst, def) => {
    inst.name = "$ZodError";
    Object.defineProperty(inst, "_zod", {
      value: inst._zod,
      enumerable: false
    });
    Object.defineProperty(inst, "issues", {
      value: def,
      enumerable: false
    });
    inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
    Object.defineProperty(inst, "toString", {
      value: () => inst.message,
      enumerable: false
    });
  };
  const $ZodError = $constructor("$ZodError", initializer$1);
  const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
  function flattenError(error, mapper = (issue2) => issue2.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  function formatError(error, mapper = (issue2) => issue2.message) {
    const fieldErrors = { _errors: [] };
    const processError = (error2) => {
      for (const issue2 of error2.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues });
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues });
        } else if (issue2.path.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue2.path.length) {
            const el2 = issue2.path[i];
            const terminal = i === issue2.path.length - 1;
            if (!terminal) {
              curr[el2] = curr[el2] || { _errors: [] };
            } else {
              curr[el2] = curr[el2] || { _errors: [] };
              curr[el2]._errors.push(mapper(issue2));
            }
            curr = curr[el2];
            i++;
          }
        }
      }
    };
    processError(error);
    return fieldErrors;
  }
  const _parse = (_Err) => (schema, value, _ctx, _params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result.issues.length) {
      const e = new ((_params == null ? void 0 : _params.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params == null ? void 0 : _params.callee);
      throw e;
    }
    return result.value;
  };
  const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e = new ((params == null ? void 0 : params.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params == null ? void 0 : params.callee);
      throw e;
    }
    return result.value;
  };
  const _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    return result.issues.length ? {
      success: false,
      error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
  const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    return result.issues.length ? {
      success: false,
      error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
  const _encode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parse(_Err)(schema, value, ctx);
  };
  const _decode = (_Err) => (schema, value, _ctx) => {
    return _parse(_Err)(schema, value, _ctx);
  };
  const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parseAsync(_Err)(schema, value, ctx);
  };
  const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _parseAsync(_Err)(schema, value, _ctx);
  };
  const _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
  };
  const _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
  };
  const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
  };
  const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
  };
  const cuid = /^[cC][^\s-]{8,}$/;
  const cuid2 = /^[0-9a-z]+$/;
  const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  const xid = /^[0-9a-vA-V]{20}$/;
  const ksuid = /^[A-Za-z0-9]{27}$/;
  const nanoid = /^[a-zA-Z0-9_-]{21}$/;
  const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  const uuid = (version2) => {
    if (!version2)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
  };
  const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  function emoji() {
    return new RegExp(_emoji$1, "u");
  }
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  const base64url = /^[A-Za-z0-9_-]*$/;
  const e164 = /^\+[1-9]\d{6,14}$/;
  const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
  const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
  }
  function time$1(args) {
    return new RegExp(`^${timeSource(args)}$`);
  }
  function datetime$1(args) {
    const time2 = timeSource({ precision: args.precision });
    const opts = ["Z"];
    if (args.local)
      opts.push("");
    if (args.offset)
      opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    const timeRegex = `${time2}(?:${opts.join("|")})`;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
  }
  const string$1 = (params) => {
    const regex = params ? `[\\s\\S]{${(params == null ? void 0 : params.minimum) ?? 0},${(params == null ? void 0 : params.maximum) ?? ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
  };
  const integer = /^-?\d+$/;
  const number$1 = /^-?\d+(?:\.\d+)?$/;
  const boolean$1 = /^(?:true|false)$/i;
  const lowercase = /^[^A-Z]*$/;
  const uppercase = /^[^a-z]*$/;
  const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a2;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
  });
  const numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a2;
      (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = (_a2 = def.format) == null ? void 0 : _a2.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a2, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {
      });
  });
  const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
  class Doc {
    constructor(args = []) {
      this.content = [];
      this.indent = 0;
      if (this)
        this.args = args;
    }
    indented(fn) {
      this.indent += 1;
      fn(this);
      this.indent -= 1;
    }
    write(arg) {
      if (typeof arg === "function") {
        arg(this, { execution: "sync" });
        arg(this, { execution: "async" });
        return;
      }
      const content = arg;
      const lines = content.split("\n").filter((x) => x);
      const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
      const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
      for (const line of dedented) {
        this.content.push(line);
      }
    }
    compile() {
      const F = Function;
      const args = this == null ? void 0 : this.args;
      const content = (this == null ? void 0 : this.content) ?? [``];
      const lines = [...content.map((x) => `  ${x}`)];
      return new F(...args, lines.join("\n"));
    }
  }
  const version = {
    major: 4,
    minor: 3,
    patch: 5
  };
  const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a3;
    var _a2;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...inst._zod.def.checks ?? []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      (_a3 = inst._zod.deferred) == null ? void 0 : _a3.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && (ctx == null ? void 0 : ctx.async) === false) {
            throw new $ZodAsyncError();
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary2) => {
              return handleCanaryResult(canary2, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return result.then((result2) => runChecks(result2, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
    defineLazy(inst, "~standard", () => ({
      validate: (value) => {
        var _a4;
        try {
          const r = safeParse$1(inst, value);
          return r.success ? { value: r.data } : { issues: (_a4 = r.error) == null ? void 0 : _a4.issues };
        } catch (_) {
          return safeParseAsync$1(inst, value).then((r) => {
            var _a5;
            return r.success ? { value: r.data } : { issues: (_a5 = r.error) == null ? void 0 : _a5.issues };
          });
        }
      },
      vendor: "zod",
      version: 1
    }));
  });
  const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    var _a2;
    $ZodType.init(inst, def);
    inst._zod.pattern = [...((_a2 = inst == null ? void 0 : inst._zod.bag) == null ? void 0 : _a2.patterns) ?? []].pop() ?? string$1(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_2) {
        }
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === void 0)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        const url = new URL(trimmed);
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: def.hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.normalize) {
          payload.value = url.href;
        } else {
          payload.value = trimmed;
        }
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime$1(def));
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date$1);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time$1(def));
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration$1);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv4`;
  });
  const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv6`;
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const parts = payload.value.split("/");
      try {
        if (parts.length !== 2)
          throw new Error();
        const [address, prefix] = parts;
        if (!prefix)
          throw new Error();
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error();
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error();
        new URL(`http://[${address}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  function isValidBase64(data) {
    if (data === "")
      return true;
    if (data.length % 4 !== 0)
      return false;
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }
  const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64";
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  function isValidBase64URL(data) {
    if (!base64url.test(data))
      return false;
    const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
    const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
    return isValidBase64(padded);
  }
  const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64url";
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  function isValidJWT(token, algorithm = null) {
    try {
      const tokensParts = token.split(".");
      if (tokensParts.length !== 3)
        return false;
      const [header] = tokensParts;
      if (!header)
        return false;
      const parsedHeader = JSON.parse(atob(header));
      if ("typ" in parsedHeader && (parsedHeader == null ? void 0 : parsedHeader.typ) !== "JWT")
        return false;
      if (!parsedHeader.alg)
        return false;
      if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
        return false;
      return true;
    } catch {
      return false;
    }
  }
  const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean$1;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  function handleArrayResult(result, final, index) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
  }
  const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i = 0; i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  function handlePropertyResult(result, final, key, input, isOptionalOut) {
    if (result.issues.length) {
      if (isOptionalOut && !(key in input)) {
        return;
      }
      final.issues.push(...prefixIssues(key, result.issues));
    }
    if (result.value === void 0) {
      if (key in input) {
        final.value[key] = void 0;
      }
    } else {
      final.value[key] = result.value;
    }
  }
  function normalizeDef(def) {
    var _a2, _b, _c, _d;
    const keys = Object.keys(def.shape);
    for (const k of keys) {
      if (!((_d = (_c = (_b = (_a2 = def.shape) == null ? void 0 : _a2[k]) == null ? void 0 : _b._zod) == null ? void 0 : _c.traits) == null ? void 0 : _d.has("$ZodType"))) {
        throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
      }
    }
    const okeys = optionalKeys(def.shape);
    return {
      ...def,
      keys,
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(okeys)
    };
  }
  function handleCatchall(proms, input, payload, ctx, def, inst) {
    const unrecognized = [];
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t = _catchall.def.type;
    const isOptionalOut = _catchall.optout === "optional";
    for (const key in input) {
      if (keySet.has(key))
        continue;
      if (t === "never") {
        unrecognized.push(key);
        continue;
      }
      const r = _catchall.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalOut);
      }
    }
    if (unrecognized.length) {
      payload.issues.push({
        code: "unrecognized_keys",
        keys: unrecognized,
        input,
        inst
      });
    }
    if (!proms.length)
      return payload;
    return Promise.all(proms).then(() => {
      return payload;
    });
  }
  const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!(desc == null ? void 0 : desc.get)) {
      const sh = def.shape;
      Object.defineProperty(def, "shape", {
        get: () => {
          const newSh = { ...sh };
          Object.defineProperty(def, "shape", {
            value: newSh
          });
          return newSh;
        }
      });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
          for (const v of field.values)
            propValues[key].add(v);
        }
      }
      return propValues;
    });
    const isObject$1 = isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject$1(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = {};
      const proms = [];
      const shape = value.shape;
      for (const key of value.keys) {
        const el2 = shape[key];
        const isOptionalOut = el2._zod.optout === "optional";
        const r = el2._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
        } else {
          handlePropertyResult(r, payload, key, input, isOptionalOut);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
  });
  const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
      var _a2;
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k = esc(key);
        return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids = /* @__PURE__ */ Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {};`);
      for (const key of normalized.keys) {
        const id = ids[key];
        const k = esc(key);
        const schema = shape[key];
        const isOptionalOut = ((_a2 = schema == null ? void 0 : schema._zod) == null ? void 0 : _a2.optout) === "optional";
        doc.write(`const ${id} = ${parseStr(key)};`);
        if (isOptionalOut) {
          doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        } else {
          doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        }
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn = doc.compile();
      return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject$1 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval$1 = allowsEval;
    const fastEnabled = jit && allowsEval$1.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject$1(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && (ctx == null ? void 0 : ctx.async) === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst);
      }
      return superParse(payload, ctx);
    };
  });
  function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
      if (result.issues.length === 0) {
        final.value = result.value;
        return final;
      }
    }
    const nonaborted = results.filter((r) => !aborted(r));
    if (nonaborted.length === 1) {
      final.value = nonaborted[0].value;
      return nonaborted[0];
    }
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
    return final;
  }
  const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o) => o._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o) => o._zod.pattern)) {
        const patterns = def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return void 0;
    });
    const single = def.options.length === 1;
    const first = def.options[0]._zod.run;
    inst._zod.parse = (payload, ctx) => {
      if (single) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  function mergeValues(a, b) {
    if (a === b) {
      return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
      return { valid: true, data: a };
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      const bKeys = Object.keys(b);
      const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
          };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return { valid: false, mergeErrorPath: [] };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
          };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
  }
  function handleIntersectionResults(result, left, right) {
    const unrecKeys = /* @__PURE__ */ new Map();
    let unrecIssue;
    for (const iss of left.issues) {
      if (iss.code === "unrecognized_keys") {
        unrecIssue ?? (unrecIssue = iss);
        for (const k of iss.keys) {
          if (!unrecKeys.has(k))
            unrecKeys.set(k, {});
          unrecKeys.get(k).l = true;
        }
      } else {
        result.issues.push(iss);
      }
    }
    for (const iss of right.issues) {
      if (iss.code === "unrecognized_keys") {
        for (const k of iss.keys) {
          if (!unrecKeys.has(k))
            unrecKeys.set(k, {});
          unrecKeys.get(k).r = true;
        }
      } else {
        result.issues.push(iss);
      }
    }
    const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
    if (bothKeys.length && unrecIssue) {
      result.issues.push({ ...unrecIssue, keys: bothKeys });
    }
    if (aborted(result))
      return result;
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
  }
  const $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      const values = def.keyType._zod.values;
      if (values) {
        payload.value = {};
        const recordKeys = /* @__PURE__ */ new Set();
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            recordKeys.add(typeof key === "number" ? key.toString() : key);
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[key] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[key] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!recordKeys.has(key)) {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized
          });
        }
      } else {
        payload.value = {};
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          const checkNumericKey = typeof key === "string" && number$1.test(key) && keyResult.issues.length && keyResult.issues.some((iss) => iss.code === "invalid_type" && iss.expected === "number");
          if (checkNumericKey) {
            const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
            if (retryResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (retryResult.issues.length === 0) {
              keyResult = retryResult;
            }
          }
          if (keyResult.issues.length) {
            if (def.mode === "loose") {
              payload.value[key] = input[key];
            } else {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
            }
            continue;
          }
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[keyResult.value] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
      throw new Error("Cannot create literal schema with no valid values");
    }
    const values = new Set(def.values);
    inst._zod.values = values;
    inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError();
      }
      payload.value = _out;
      return payload;
    };
  });
  function handleOptionalResult(result, input) {
    if (result.issues.length && input === void 0) {
      return { issues: [], value: void 0 };
    }
    return result;
  }
  const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise)
          return result.then((r) => handleOptionalResult(r, payload.value));
        return handleOptionalResult(result, payload.value);
      }
      if (payload.value === void 0) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
    inst._zod.parse = (payload, ctx) => {
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleDefaultResult(result2, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  function handleDefaultResult(payload, def) {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return payload;
  }
  const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v = def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleNonOptionalResult(result2, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === void 0) {
      payload.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: payload.value,
        inst
      });
    }
    return payload;
  }
  const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.value;
          if (result2.issues.length) {
            payload.value = def.catchValue({
              ...payload,
              error: {
                issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            });
            payload.issues = [];
          }
          return payload;
        });
      }
      payload.value = result.value;
      if (result.issues.length) {
        payload.value = def.catchValue({
          ...payload,
          error: {
            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        });
        payload.issues = [];
      }
      return payload;
    };
  });
  const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handlePipeResult(right2, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  function handlePipeResult(left, next, ctx) {
    if (left.issues.length) {
      left.aborted = true;
      return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues }, ctx);
  }
  const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => {
      var _a2, _b;
      return (_b = (_a2 = def.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.optin;
    });
    defineLazy(inst._zod, "optout", () => {
      var _a2, _b;
      return (_b = (_a2 = def.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.optout;
    });
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  function handleReadonlyResult(payload) {
    payload.value = Object.freeze(payload.value);
    return payload;
  }
  const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r2) => handleRefineResult(r2, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
  function handleRefineResult(result, payload, input, inst) {
    if (!result) {
      const _iss = {
        code: "custom",
        input,
        inst,
        // incorporates params.error into issue reporting
        path: [...inst._zod.def.path ?? []],
        // incorporates params.error into issue reporting
        continue: !inst._zod.def.abort
        // params: inst._zod.def.params,
      };
      if (inst._zod.def.params)
        _iss.params = inst._zod.def.params;
      payload.issues.push(issue(_iss));
    }
  }
  var _a;
  class $ZodRegistry {
    constructor() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
    }
    add(schema, ..._meta) {
      const meta = _meta[0];
      this._map.set(schema, meta);
      if (meta && typeof meta === "object" && "id" in meta) {
        this._idmap.set(meta.id, schema);
      }
      return this;
    }
    clear() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
      return this;
    }
    remove(schema) {
      const meta = this._map.get(schema);
      if (meta && typeof meta === "object" && "id" in meta) {
        this._idmap.delete(meta.id);
      }
      this._map.delete(schema);
      return this;
    }
    get(schema) {
      const p = schema._zod.parent;
      if (p) {
        const pm = { ...this.get(p) ?? {} };
        delete pm.id;
        const f = { ...pm, ...this._map.get(schema) };
        return Object.keys(f).length ? f : void 0;
      }
      return this._map.get(schema);
    }
    has(schema) {
      return this._map.has(schema);
    }
  }
  function registry() {
    return new $ZodRegistry();
  }
  (_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
  const globalRegistry = globalThis.__zod_globalRegistry;
  // @__NO_SIDE_EFFECTS__
  function _string(Class, params) {
    return new Class({
      type: "string",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _email(Class, params) {
    return new Class({
      type: "string",
      format: "email",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _guid(Class, params) {
    return new Class({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuid(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv4(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v4",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv6(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v6",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv7(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v7",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _url(Class, params) {
    return new Class({
      type: "string",
      format: "url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _emoji(Class, params) {
    return new Class({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _nanoid(Class, params) {
    return new Class({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cuid(Class, params) {
    return new Class({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cuid2(Class, params) {
    return new Class({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ulid(Class, params) {
    return new Class({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _xid(Class, params) {
    return new Class({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ksuid(Class, params) {
    return new Class({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ipv4(Class, params) {
    return new Class({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ipv6(Class, params) {
    return new Class({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cidrv4(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cidrv6(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _base64(Class, params) {
    return new Class({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _base64url(Class, params) {
    return new Class({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _e164(Class, params) {
    return new Class({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _jwt(Class, params) {
    return new Class({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDateTime(Class, params) {
    return new Class({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: false,
      local: false,
      precision: null,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDate(Class, params) {
    return new Class({
      type: "string",
      format: "date",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoTime(Class, params) {
    return new Class({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDuration(Class, params) {
    return new Class({
      type: "string",
      format: "duration",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _number(Class, params) {
    return new Class({
      type: "number",
      checks: [],
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _int(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "safeint",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _boolean(Class, params) {
    return new Class({
      type: "boolean",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _unknown(Class) {
    return new Class({
      type: "unknown"
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _never(Class, params) {
    return new Class({
      type: "never",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lt(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lte(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _gt(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _gte(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _multipleOf(value, params) {
    return new $ZodCheckMultipleOf({
      check: "multiple_of",
      ...normalizeParams(params),
      value
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _maxLength(maximum, params) {
    const ch = new $ZodCheckMaxLength({
      check: "max_length",
      ...normalizeParams(params),
      maximum
    });
    return ch;
  }
  // @__NO_SIDE_EFFECTS__
  function _minLength(minimum, params) {
    return new $ZodCheckMinLength({
      check: "min_length",
      ...normalizeParams(params),
      minimum
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _length(length, params) {
    return new $ZodCheckLengthEquals({
      check: "length_equals",
      ...normalizeParams(params),
      length
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _regex(pattern, params) {
    return new $ZodCheckRegex({
      check: "string_format",
      format: "regex",
      ...normalizeParams(params),
      pattern
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lowercase(params) {
    return new $ZodCheckLowerCase({
      check: "string_format",
      format: "lowercase",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uppercase(params) {
    return new $ZodCheckUpperCase({
      check: "string_format",
      format: "uppercase",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _includes(includes, params) {
    return new $ZodCheckIncludes({
      check: "string_format",
      format: "includes",
      ...normalizeParams(params),
      includes
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _startsWith(prefix, params) {
    return new $ZodCheckStartsWith({
      check: "string_format",
      format: "starts_with",
      ...normalizeParams(params),
      prefix
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _endsWith(suffix, params) {
    return new $ZodCheckEndsWith({
      check: "string_format",
      format: "ends_with",
      ...normalizeParams(params),
      suffix
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _overwrite(tx) {
    return new $ZodCheckOverwrite({
      check: "overwrite",
      tx
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _normalize(form) {
    return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
  }
  // @__NO_SIDE_EFFECTS__
  function _trim() {
    return /* @__PURE__ */ _overwrite((input) => input.trim());
  }
  // @__NO_SIDE_EFFECTS__
  function _toLowerCase() {
    return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
  }
  // @__NO_SIDE_EFFECTS__
  function _toUpperCase() {
    return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
  }
  // @__NO_SIDE_EFFECTS__
  function _slugify() {
    return /* @__PURE__ */ _overwrite((input) => slugify(input));
  }
  // @__NO_SIDE_EFFECTS__
  function _array(Class, element, params) {
    return new Class({
      type: "array",
      element,
      // get element() {
      //   return element;
      // },
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _refine(Class, fn, _params) {
    const schema = new Class({
      type: "custom",
      check: "custom",
      fn,
      ...normalizeParams(_params)
    });
    return schema;
  }
  // @__NO_SIDE_EFFECTS__
  function _superRefine(fn) {
    const ch = /* @__PURE__ */ _check((payload) => {
      payload.addIssue = (issue$1) => {
        if (typeof issue$1 === "string") {
          payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
        } else {
          const _issue = issue$1;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = ch);
          _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
          payload.issues.push(issue(_issue));
        }
      };
      return fn(payload.value, payload);
    });
    return ch;
  }
  // @__NO_SIDE_EFFECTS__
  function _check(fn, params) {
    const ch = new $ZodCheck({
      check: "custom",
      ...normalizeParams(params)
    });
    ch._zod.check = fn;
    return ch;
  }
  function initializeContext(params) {
    let target = (params == null ? void 0 : params.target) ?? "draft-2020-12";
    if (target === "draft-4")
      target = "draft-04";
    if (target === "draft-7")
      target = "draft-07";
    return {
      processors: params.processors ?? {},
      metadataRegistry: (params == null ? void 0 : params.metadata) ?? globalRegistry,
      target,
      unrepresentable: (params == null ? void 0 : params.unrepresentable) ?? "throw",
      override: (params == null ? void 0 : params.override) ?? (() => {
      }),
      io: (params == null ? void 0 : params.io) ?? "output",
      counter: 0,
      seen: /* @__PURE__ */ new Map(),
      cycles: (params == null ? void 0 : params.cycles) ?? "ref",
      reused: (params == null ? void 0 : params.reused) ?? "inline",
      external: (params == null ? void 0 : params.external) ?? void 0
    };
  }
  function process(schema, ctx, _params = { path: [], schemaPath: [] }) {
    var _a3, _b;
    var _a2;
    const def = schema._zod.def;
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.count++;
      const isCycle = _params.schemaPath.includes(schema);
      if (isCycle) {
        seen.cycle = _params.path;
      }
      return seen.schema;
    }
    const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
    ctx.seen.set(schema, result);
    const overrideSchema = (_b = (_a3 = schema._zod).toJSONSchema) == null ? void 0 : _b.call(_a3);
    if (overrideSchema) {
      result.schema = overrideSchema;
    } else {
      const params = {
        ..._params,
        schemaPath: [..._params.schemaPath, schema],
        path: _params.path
      };
      if (schema._zod.processJSONSchema) {
        schema._zod.processJSONSchema(ctx, result.schema, params);
      } else {
        const _json = result.schema;
        const processor = ctx.processors[def.type];
        if (!processor) {
          throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
        }
        processor(schema, ctx, _json, params);
      }
      const parent = schema._zod.parent;
      if (parent) {
        if (!result.ref)
          result.ref = parent;
        process(parent, ctx, params);
        ctx.seen.get(parent).isParent = true;
      }
    }
    const meta = ctx.metadataRegistry.get(schema);
    if (meta)
      Object.assign(result.schema, meta);
    if (ctx.io === "input" && isTransforming(schema)) {
      delete result.schema.examples;
      delete result.schema.default;
    }
    if (ctx.io === "input" && result.schema._prefault)
      (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
    delete result.schema._prefault;
    const _result = ctx.seen.get(schema);
    return _result.schema;
  }
  function extractDefs(ctx, schema) {
    var _a2, _b, _c, _d;
    const root = ctx.seen.get(schema);
    if (!root)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    const idToSchema = /* @__PURE__ */ new Map();
    for (const entry of ctx.seen.entries()) {
      const id = (_a2 = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _a2.id;
      if (id) {
        const existing = idToSchema.get(id);
        if (existing && existing !== entry[0]) {
          throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
        }
        idToSchema.set(id, entry[0]);
      }
    }
    const makeURI = (entry) => {
      var _a3;
      const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
      if (ctx.external) {
        const externalId = (_a3 = ctx.external.registry.get(entry[0])) == null ? void 0 : _a3.id;
        const uriGenerator = ctx.external.uri ?? ((id2) => id2);
        if (externalId) {
          return { ref: uriGenerator(externalId) };
        }
        const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
        entry[1].defId = id;
        return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
      }
      if (entry[1] === root) {
        return { ref: "#" };
      }
      const uriPrefix = `#`;
      const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
      const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
      return { defId, ref: defUriPrefix + defId };
    };
    const extractToDef = (entry) => {
      if (entry[1].schema.$ref) {
        return;
      }
      const seen = entry[1];
      const { ref, defId } = makeURI(entry);
      seen.def = { ...seen.schema };
      if (defId)
        seen.defId = defId;
      const schema2 = seen.schema;
      for (const key in schema2) {
        delete schema2[key];
      }
      schema2.$ref = ref;
    };
    if (ctx.cycles === "throw") {
      for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        if (seen.cycle) {
          throw new Error(`Cycle detected: #/${(_b = seen.cycle) == null ? void 0 : _b.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        }
      }
    }
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (schema === entry[0]) {
        extractToDef(entry);
        continue;
      }
      if (ctx.external) {
        const ext = (_c = ctx.external.registry.get(entry[0])) == null ? void 0 : _c.id;
        if (schema !== entry[0] && ext) {
          extractToDef(entry);
          continue;
        }
      }
      const id = (_d = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _d.id;
      if (id) {
        extractToDef(entry);
        continue;
      }
      if (seen.cycle) {
        extractToDef(entry);
        continue;
      }
      if (seen.count > 1) {
        if (ctx.reused === "ref") {
          extractToDef(entry);
          continue;
        }
      }
    }
  }
  function finalize(ctx, schema) {
    var _a2, _b, _c;
    const root = ctx.seen.get(schema);
    if (!root)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    const flattenRef = (zodSchema) => {
      const seen = ctx.seen.get(zodSchema);
      if (seen.ref === null)
        return;
      const schema2 = seen.def ?? seen.schema;
      const _cached = { ...schema2 };
      const ref = seen.ref;
      seen.ref = null;
      if (ref) {
        flattenRef(ref);
        const refSeen = ctx.seen.get(ref);
        const refSchema = refSeen.schema;
        if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
          schema2.allOf = schema2.allOf ?? [];
          schema2.allOf.push(refSchema);
        } else {
          Object.assign(schema2, refSchema);
        }
        Object.assign(schema2, _cached);
        const isParentRef = zodSchema._zod.parent === ref;
        if (isParentRef) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (!(key in _cached)) {
              delete schema2[key];
            }
          }
        }
        if (refSchema.$ref) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
      const parent = zodSchema._zod.parent;
      if (parent && parent !== ref) {
        flattenRef(parent);
        const parentSeen = ctx.seen.get(parent);
        if (parentSeen == null ? void 0 : parentSeen.schema.$ref) {
          schema2.$ref = parentSeen.schema.$ref;
          if (parentSeen.def) {
            for (const key in schema2) {
              if (key === "$ref" || key === "allOf")
                continue;
              if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
                delete schema2[key];
              }
            }
          }
        }
      }
      ctx.override({
        zodSchema,
        jsonSchema: schema2,
        path: seen.path ?? []
      });
    };
    for (const entry of [...ctx.seen.entries()].reverse()) {
      flattenRef(entry[0]);
    }
    const result = {};
    if (ctx.target === "draft-2020-12") {
      result.$schema = "https://json-schema.org/draft/2020-12/schema";
    } else if (ctx.target === "draft-07") {
      result.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (ctx.target === "draft-04") {
      result.$schema = "http://json-schema.org/draft-04/schema#";
    } else if (ctx.target === "openapi-3.0") ;
    else ;
    if ((_a2 = ctx.external) == null ? void 0 : _a2.uri) {
      const id = (_b = ctx.external.registry.get(schema)) == null ? void 0 : _b.id;
      if (!id)
        throw new Error("Schema is missing an `id` property");
      result.$id = ctx.external.uri(id);
    }
    Object.assign(result, root.def ?? root.schema);
    const defs = ((_c = ctx.external) == null ? void 0 : _c.defs) ?? {};
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.def && seen.defId) {
        defs[seen.defId] = seen.def;
      }
    }
    if (ctx.external) ;
    else {
      if (Object.keys(defs).length > 0) {
        if (ctx.target === "draft-2020-12") {
          result.$defs = defs;
        } else {
          result.definitions = defs;
        }
      }
    }
    try {
      const finalized = JSON.parse(JSON.stringify(result));
      Object.defineProperty(finalized, "~standard", {
        value: {
          ...schema["~standard"],
          jsonSchema: {
            input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
            output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
          }
        },
        enumerable: false,
        writable: false
      });
      return finalized;
    } catch (_err) {
      throw new Error("Error converting schema to JSON.");
    }
  }
  function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
    if (ctx.seen.has(_schema))
      return false;
    ctx.seen.add(_schema);
    const def = _schema._zod.def;
    if (def.type === "transform")
      return true;
    if (def.type === "array")
      return isTransforming(def.element, ctx);
    if (def.type === "set")
      return isTransforming(def.valueType, ctx);
    if (def.type === "lazy")
      return isTransforming(def.getter(), ctx);
    if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
      return isTransforming(def.innerType, ctx);
    }
    if (def.type === "intersection") {
      return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    if (def.type === "record" || def.type === "map") {
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    if (def.type === "pipe") {
      return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    if (def.type === "object") {
      for (const key in def.shape) {
        if (isTransforming(def.shape[key], ctx))
          return true;
      }
      return false;
    }
    if (def.type === "union") {
      for (const option of def.options) {
        if (isTransforming(option, ctx))
          return true;
      }
      return false;
    }
    if (def.type === "tuple") {
      for (const item of def.items) {
        if (isTransforming(item, ctx))
          return true;
      }
      if (def.rest && isTransforming(def.rest, ctx))
        return true;
      return false;
    }
    return false;
  }
  const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
    const ctx = initializeContext({ ...params, processors });
    process(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
  };
  const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
    const { libraryOptions, target } = params ?? {};
    const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
    process(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
  };
  const formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: ""
    // do not set
  };
  const stringProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    json.type = "string";
    const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
    if (typeof minimum === "number")
      json.minLength = minimum;
    if (typeof maximum === "number")
      json.maxLength = maximum;
    if (format) {
      json.format = formatMap[format] ?? format;
      if (json.format === "")
        delete json.format;
      if (format === "time") {
        delete json.format;
      }
    }
    if (contentEncoding)
      json.contentEncoding = contentEncoding;
    if (patterns && patterns.size > 0) {
      const regexes = [...patterns];
      if (regexes.length === 1)
        json.pattern = regexes[0].source;
      else if (regexes.length > 1) {
        json.allOf = [
          ...regexes.map((regex) => ({
            ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
            pattern: regex.source
          }))
        ];
      }
    }
  };
  const numberProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
    if (typeof format === "string" && format.includes("int"))
      json.type = "integer";
    else
      json.type = "number";
    if (typeof exclusiveMinimum === "number") {
      if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
        json.minimum = exclusiveMinimum;
        json.exclusiveMinimum = true;
      } else {
        json.exclusiveMinimum = exclusiveMinimum;
      }
    }
    if (typeof minimum === "number") {
      json.minimum = minimum;
      if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
        if (exclusiveMinimum >= minimum)
          delete json.minimum;
        else
          delete json.exclusiveMinimum;
      }
    }
    if (typeof exclusiveMaximum === "number") {
      if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
        json.maximum = exclusiveMaximum;
        json.exclusiveMaximum = true;
      } else {
        json.exclusiveMaximum = exclusiveMaximum;
      }
    }
    if (typeof maximum === "number") {
      json.maximum = maximum;
      if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
        if (exclusiveMaximum <= maximum)
          delete json.maximum;
        else
          delete json.exclusiveMaximum;
      }
    }
    if (typeof multipleOf === "number")
      json.multipleOf = multipleOf;
  };
  const booleanProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
  };
  const neverProcessor = (_schema, _ctx, json, _params) => {
    json.not = {};
  };
  const unknownProcessor = (_schema, _ctx, _json, _params) => {
  };
  const enumProcessor = (schema, _ctx, json, _params) => {
    const def = schema._zod.def;
    const values = getEnumValues(def.entries);
    if (values.every((v) => typeof v === "number"))
      json.type = "number";
    if (values.every((v) => typeof v === "string"))
      json.type = "string";
    json.enum = values;
  };
  const literalProcessor = (schema, ctx, json, _params) => {
    const def = schema._zod.def;
    const vals = [];
    for (const val of def.values) {
      if (val === void 0) {
        if (ctx.unrepresentable === "throw") {
          throw new Error("Literal `undefined` cannot be represented in JSON Schema");
        }
      } else if (typeof val === "bigint") {
        if (ctx.unrepresentable === "throw") {
          throw new Error("BigInt literals cannot be represented in JSON Schema");
        } else {
          vals.push(Number(val));
        }
      } else {
        vals.push(val);
      }
    }
    if (vals.length === 0) ;
    else if (vals.length === 1) {
      const val = vals[0];
      json.type = val === null ? "null" : typeof val;
      if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
        json.enum = [val];
      } else {
        json.const = val;
      }
    } else {
      if (vals.every((v) => typeof v === "number"))
        json.type = "number";
      if (vals.every((v) => typeof v === "string"))
        json.type = "string";
      if (vals.every((v) => typeof v === "boolean"))
        json.type = "boolean";
      if (vals.every((v) => v === null))
        json.type = "null";
      json.enum = vals;
    }
  };
  const customProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Custom types cannot be represented in JSON Schema");
    }
  };
  const transformProcessor = (_schema, ctx, _json, _params) => {
    if (ctx.unrepresentable === "throw") {
      throw new Error("Transforms cannot be represented in JSON Schema");
    }
  };
  const arrayProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    const { minimum, maximum } = schema._zod.bag;
    if (typeof minimum === "number")
      json.minItems = minimum;
    if (typeof maximum === "number")
      json.maxItems = maximum;
    json.type = "array";
    json.items = process(def.element, ctx, { ...params, path: [...params.path, "items"] });
  };
  const objectProcessor = (schema, ctx, _json, params) => {
    var _a2;
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    json.properties = {};
    const shape = def.shape;
    for (const key in shape) {
      json.properties[key] = process(shape[key], ctx, {
        ...params,
        path: [...params.path, "properties", key]
      });
    }
    const allKeys = new Set(Object.keys(shape));
    const requiredKeys = new Set([...allKeys].filter((key) => {
      const v = def.shape[key]._zod;
      if (ctx.io === "input") {
        return v.optin === void 0;
      } else {
        return v.optout === void 0;
      }
    }));
    if (requiredKeys.size > 0) {
      json.required = Array.from(requiredKeys);
    }
    if (((_a2 = def.catchall) == null ? void 0 : _a2._zod.def.type) === "never") {
      json.additionalProperties = false;
    } else if (!def.catchall) {
      if (ctx.io === "output")
        json.additionalProperties = false;
    } else if (def.catchall) {
      json.additionalProperties = process(def.catchall, ctx, {
        ...params,
        path: [...params.path, "additionalProperties"]
      });
    }
  };
  const unionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const isExclusive = def.inclusive === false;
    const options = def.options.map((x, i) => process(x, ctx, {
      ...params,
      path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
    }));
    if (isExclusive) {
      json.oneOf = options;
    } else {
      json.anyOf = options;
    }
  };
  const intersectionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const a = process(def.left, ctx, {
      ...params,
      path: [...params.path, "allOf", 0]
    });
    const b = process(def.right, ctx, {
      ...params,
      path: [...params.path, "allOf", 1]
    });
    const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
    const allOf = [
      ...isSimpleIntersection(a) ? a.allOf : [a],
      ...isSimpleIntersection(b) ? b.allOf : [b]
    ];
    json.allOf = allOf;
  };
  const recordProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    json.type = "object";
    const keyType = def.keyType;
    const keyBag = keyType._zod.bag;
    const patterns = keyBag == null ? void 0 : keyBag.patterns;
    if (def.mode === "loose" && patterns && patterns.size > 0) {
      const valueSchema = process(def.valueType, ctx, {
        ...params,
        path: [...params.path, "patternProperties", "*"]
      });
      json.patternProperties = {};
      for (const pattern of patterns) {
        json.patternProperties[pattern.source] = valueSchema;
      }
    } else {
      if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
        json.propertyNames = process(def.keyType, ctx, {
          ...params,
          path: [...params.path, "propertyNames"]
        });
      }
      json.additionalProperties = process(def.valueType, ctx, {
        ...params,
        path: [...params.path, "additionalProperties"]
      });
    }
    const keyValues = keyType._zod.values;
    if (keyValues) {
      const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
      if (validKeyValues.length > 0) {
        json.required = validKeyValues;
      }
    }
  };
  const nullableProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const inner = process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (ctx.target === "openapi-3.0") {
      seen.ref = def.innerType;
      json.nullable = true;
    } else {
      json.anyOf = [inner, { type: "null" }];
    }
  };
  const nonoptionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  const defaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.default = JSON.parse(JSON.stringify(def.defaultValue));
  };
  const prefaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    if (ctx.io === "input")
      json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
  };
  const catchProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    let catchValue;
    try {
      catchValue = def.catchValue(void 0);
    } catch {
      throw new Error("Dynamic catch values are not supported in JSON Schema");
    }
    json.default = catchValue;
  };
  const pipeProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
  };
  const readonlyProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.readOnly = true;
  };
  const optionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    process(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function datetime(params) {
    return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
  }
  const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function date(params) {
    return /* @__PURE__ */ _isoDate(ZodISODate, params);
  }
  const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function time(params) {
    return /* @__PURE__ */ _isoTime(ZodISOTime, params);
  }
  const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function duration(params) {
    return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
  }
  const initializer = (inst, issues) => {
    $ZodError.init(inst, issues);
    inst.name = "ZodError";
    Object.defineProperties(inst, {
      format: {
        value: (mapper) => formatError(inst, mapper)
        // enumerable: false,
      },
      flatten: {
        value: (mapper) => flattenError(inst, mapper)
        // enumerable: false,
      },
      addIssue: {
        value: (issue2) => {
          inst.issues.push(issue2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      addIssues: {
        value: (issues2) => {
          inst.issues.push(...issues2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      isEmpty: {
        get() {
          return inst.issues.length === 0;
        }
        // enumerable: false,
      }
    });
  };
  const ZodRealError = $constructor("ZodError", initializer, {
    Parent: Error
  });
  const parse = /* @__PURE__ */ _parse(ZodRealError);
  const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
  const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
  const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  const encode = /* @__PURE__ */ _encode(ZodRealError);
  const decode = /* @__PURE__ */ _decode(ZodRealError);
  const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
  const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
  const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
  const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
  const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
  const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    Object.assign(inst["~standard"], {
      jsonSchema: {
        input: createStandardJSONSchemaMethod(inst, "input"),
        output: createStandardJSONSchemaMethod(inst, "output")
      }
    });
    inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    inst.check = (...checks) => {
      return inst.clone(mergeDefs(def, {
        checks: [
          ...def.checks ?? [],
          ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), {
        parent: true
      });
    };
    inst.with = inst.check;
    inst.clone = (def2, params) => clone(inst, def2, params);
    inst.brand = () => inst;
    inst.register = (reg, meta) => {
      reg.add(inst, meta);
      return inst;
    };
    inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode(inst, data, params);
    inst.decode = (data, params) => decode(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
    inst.refine = (check, params) => inst.check(refine(check, params));
    inst.superRefine = (refinement) => inst.check(superRefine(refinement));
    inst.overwrite = (fn) => inst.check(/* @__PURE__ */ _overwrite(fn));
    inst.optional = () => optional(inst);
    inst.exactOptional = () => exactOptional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => optional(nullable(inst));
    inst.nonoptional = (params) => nonoptional(inst, params);
    inst.array = () => array(inst);
    inst.or = (arg) => union([inst, arg]);
    inst.and = (arg) => intersection(inst, arg);
    inst.transform = (tx) => pipe(inst, transform(tx));
    inst.default = (def2) => _default(inst, def2);
    inst.prefault = (def2) => prefault(inst, def2);
    inst.catch = (params) => _catch(inst, params);
    inst.pipe = (target) => pipe(inst, target);
    inst.readonly = () => readonly(inst);
    inst.describe = (description) => {
      const cl = inst.clone();
      globalRegistry.add(cl, { description });
      return cl;
    };
    Object.defineProperty(inst, "description", {
      get() {
        var _a2;
        return (_a2 = globalRegistry.get(inst)) == null ? void 0 : _a2.description;
      },
      configurable: true
    });
    inst.meta = (...args) => {
      if (args.length === 0) {
        return globalRegistry.get(inst);
      }
      const cl = inst.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    };
    inst.isOptional = () => inst.safeParse(void 0).success;
    inst.isNullable = () => inst.safeParse(null).success;
    inst.apply = (fn) => fn(inst);
    return inst;
  });
  const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    inst.regex = (...args) => inst.check(/* @__PURE__ */ _regex(...args));
    inst.includes = (...args) => inst.check(/* @__PURE__ */ _includes(...args));
    inst.startsWith = (...args) => inst.check(/* @__PURE__ */ _startsWith(...args));
    inst.endsWith = (...args) => inst.check(/* @__PURE__ */ _endsWith(...args));
    inst.min = (...args) => inst.check(/* @__PURE__ */ _minLength(...args));
    inst.max = (...args) => inst.check(/* @__PURE__ */ _maxLength(...args));
    inst.length = (...args) => inst.check(/* @__PURE__ */ _length(...args));
    inst.nonempty = (...args) => inst.check(/* @__PURE__ */ _minLength(1, ...args));
    inst.lowercase = (params) => inst.check(/* @__PURE__ */ _lowercase(params));
    inst.uppercase = (params) => inst.check(/* @__PURE__ */ _uppercase(params));
    inst.trim = () => inst.check(/* @__PURE__ */ _trim());
    inst.normalize = (...args) => inst.check(/* @__PURE__ */ _normalize(...args));
    inst.toLowerCase = () => inst.check(/* @__PURE__ */ _toLowerCase());
    inst.toUpperCase = () => inst.check(/* @__PURE__ */ _toUpperCase());
    inst.slugify = () => inst.check(/* @__PURE__ */ _slugify());
  });
  const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
    inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
    inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
    inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime(params));
    inst.date = (params) => inst.check(date(params));
    inst.time = (params) => inst.check(time(params));
    inst.duration = (params) => inst.check(duration(params));
  });
  function string(params) {
    return /* @__PURE__ */ _string(ZodString, params);
  }
  const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json);
    inst.gt = (value, params) => inst.check(/* @__PURE__ */ _gt(value, params));
    inst.gte = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
    inst.min = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
    inst.lt = (value, params) => inst.check(/* @__PURE__ */ _lt(value, params));
    inst.lte = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
    inst.max = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
    inst.int = (params) => inst.check(int(params));
    inst.safe = (params) => inst.check(int(params));
    inst.positive = (params) => inst.check(/* @__PURE__ */ _gt(0, params));
    inst.nonnegative = (params) => inst.check(/* @__PURE__ */ _gte(0, params));
    inst.negative = (params) => inst.check(/* @__PURE__ */ _lt(0, params));
    inst.nonpositive = (params) => inst.check(/* @__PURE__ */ _lte(0, params));
    inst.multipleOf = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
    inst.step = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
    inst.finite = () => inst;
    const bag = inst._zod.bag;
    inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
  });
  function number(params) {
    return /* @__PURE__ */ _number(ZodNumber, params);
  }
  const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  function int(params) {
    return /* @__PURE__ */ _int(ZodNumberFormat, params);
  }
  const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json);
  });
  function boolean(params) {
    return /* @__PURE__ */ _boolean(ZodBoolean, params);
  }
  const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor();
  });
  function unknown() {
    return /* @__PURE__ */ _unknown(ZodUnknown);
  }
  const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json);
  });
  function never(params) {
    return /* @__PURE__ */ _never(ZodNever, params);
  }
  const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
    inst.min = (minLength, params) => inst.check(/* @__PURE__ */ _minLength(minLength, params));
    inst.nonempty = (params) => inst.check(/* @__PURE__ */ _minLength(1, params));
    inst.max = (maxLength, params) => inst.check(/* @__PURE__ */ _maxLength(maxLength, params));
    inst.length = (len, params) => inst.check(/* @__PURE__ */ _length(len, params));
    inst.unwrap = () => inst.element;
  });
  function array(element, params) {
    return /* @__PURE__ */ _array(ZodArray, element, params);
  }
  const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    defineLazy(inst, "shape", () => {
      return def.shape;
    });
    inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
    inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
    inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
    inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
    inst.extend = (incoming) => {
      return extend(inst, incoming);
    };
    inst.safeExtend = (incoming) => {
      return safeExtend(inst, incoming);
    };
    inst.merge = (other) => merge(inst, other);
    inst.pick = (mask) => pick(inst, mask);
    inst.omit = (mask) => omit(inst, mask);
    inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
    inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
  });
  function object(shape, params) {
    const def = {
      type: "object",
      shape: shape ?? {},
      ...normalizeParams(params)
    };
    return new ZodObject(def);
  }
  const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  function union(options, params) {
    return new ZodUnion({
      type: "union",
      options,
      ...normalizeParams(params)
    });
  }
  const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
  });
  function intersection(left, right) {
    return new ZodIntersection({
      type: "intersection",
      left,
      right
    });
  }
  const ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  function record(keyType, valueType, params) {
    return new ZodRecord({
      type: "record",
      keyType,
      valueType,
      ...normalizeParams(params)
    });
  }
  const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
  });
  function _enum(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new ZodEnum({
      type: "enum",
      entries,
      ...normalizeParams(params)
    });
  }
  const ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  function literal(value, params) {
    return new ZodLiteral({
      type: "literal",
      values: Array.isArray(value) ? value : [value],
      ...normalizeParams(params)
    });
  }
  const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue$1) => {
        if (typeof issue$1 === "string") {
          payload.issues.push(issue(issue$1, payload.value, def));
        } else {
          const _issue = issue$1;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  function transform(fn) {
    return new ZodTransform({
      type: "transform",
      transform: fn
    });
  }
  const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function optional(innerType) {
    return new ZodOptional({
      type: "optional",
      innerType
    });
  }
  const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
    $ZodExactOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function exactOptional(innerType) {
    return new ZodExactOptional({
      type: "optional",
      innerType
    });
  }
  const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nullable(innerType) {
    return new ZodNullable({
      type: "nullable",
      innerType
    });
  }
  const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  function _default(innerType, defaultValue) {
    return new ZodDefault({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
      }
    });
  }
  const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function prefault(innerType, defaultValue) {
    return new ZodPrefault({
      type: "prefault",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
      }
    });
  }
  const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nonoptional(innerType, params) {
    return new ZodNonOptional({
      type: "nonoptional",
      innerType,
      ...normalizeParams(params)
    });
  }
  const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  function _catch(innerType, catchValue) {
    return new ZodCatch({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
    });
  }
  const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
  });
  function pipe(in_, out) {
    return new ZodPipe({
      type: "pipe",
      in: in_,
      out
      // ...util.normalizeParams(params),
    });
  }
  const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function readonly(innerType) {
    return new ZodReadonly({
      type: "readonly",
      innerType
    });
  }
  const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx);
  });
  function refine(fn, _params = {}) {
    return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
  }
  function superRefine(fn) {
    return /* @__PURE__ */ _superRefine(fn);
  }
  const productSizeSchema = string().min(1);
  const productCategorySchema = _enum([
    "ジャケット",
    "コート",
    "トップス",
    "ボトムス"
  ]);
  const productSchema = object({
    id: string().uuid(),
    shopId: string().min(1),
    // 現時点ではTEXT型のため、UUID検証は緩和（将来的にUUID型に変更予定）
    externalProductId: string().optional(),
    // 外部システムの商品ID（ウィジェット連携で使用）
    name: string().min(1),
    brand: string().optional(),
    category: productCategorySchema.optional(),
    thumbnailUrl: union([string().url(), literal("")]).optional(),
    // URL形式であることを検証、空文字列も許可
    createdAt: string().datetime(),
    updatedAt: string().datetime()
  });
  const createProductSchema = productSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
  }).extend({
    /** クライアントでサニタイズ済み。サーバーでも危険キーを除去する */
    garmentSpec: unknown().optional()
  });
  createProductSchema.partial();
  const assetSchema = object({
    id: string().uuid(),
    productId: string().uuid(),
    size: productSizeSchema,
    // 柔軟な形式
    glbUrl: string().url().optional(),
    // 後方互換性のため残す
    modelUrl: string().url().optional(),
    // GLBとFBXの両方をサポート
    thumbnailUrl: string().url().optional(),
    version: number().int().positive().default(1),
    isActive: boolean().optional().default(true),
    createdAt: string().datetime(),
    updatedAt: string().datetime()
  });
  const createAssetSchemaBase = assetSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });
  createAssetSchemaBase.refine(
    (data) => data.modelUrl || data.glbUrl,
    { message: "modelUrl or glbUrl is required" }
  );
  createAssetSchemaBase.partial().omit({
    productId: true
    // productIdは更新対象外
  }).refine(
    (data) => {
      if (data.modelUrl === void 0 && data.glbUrl === void 0) {
        return true;
      }
      return data.modelUrl || data.glbUrl;
    },
    { message: "modelUrl or glbUrl must be provided if updating" }
  );
  const eventTypeSchema = _enum([
    "cube_view",
    "cube_click",
    "widget_open",
    "size_change",
    "height_change",
    "add_to_cart_click"
  ]);
  const eventSchema = object({
    id: string().uuid(),
    shopId: string().min(1),
    // 現時点ではTEXT型のため、UUID検証は緩和（将来的にUUID型に変更予定）
    productId: string().uuid().optional(),
    type: eventTypeSchema,
    meta: record(string(), unknown()).optional(),
    sessionId: string().optional(),
    userAgent: string().optional(),
    ipAddress: string().optional(),
    // IPv4/IPv6形式の検証は必要に応じて追加
    createdAt: string().datetime()
  });
  eventSchema.omit({
    id: true,
    createdAt: true
  });
  object({
    enabled: boolean(),
    asset: object({
      defaultSize: string().min(1),
      // 柔軟なサイズ形式
      sizes: record(
        string().min(1),
        // 柔軟なサイズ形式
        object({
          glbUrl: string().url().optional(),
          // 後方互換性のため残す
          modelUrl: string().url().optional()
          // GLBとFBXの両方をサポート
        }).refine(
          (data) => data.modelUrl || data.glbUrl,
          { message: "modelUrl or glbUrl is required" }
        )
      )
    }).optional()
  });
  const conversationSchema = object({
    id: string().uuid(),
    shopId: string().min(1),
    productId: string().uuid().optional(),
    sessionId: string().optional(),
    userAgent: string().optional(),
    ipAddress: string().optional(),
    startedAt: string().datetime(),
    endedAt: string().datetime().optional(),
    messageCount: number().int().nonnegative(),
    createdAt: string().datetime(),
    updatedAt: string().datetime()
  });
  const messageSchema = object({
    id: string().uuid(),
    conversationId: string().uuid(),
    role: _enum(["user", "assistant"]),
    content: string().min(1),
    productId: string().uuid().optional(),
    context: record(string(), unknown()).optional(),
    createdAt: string().datetime()
  });
  conversationSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    messageCount: true,
    endedAt: true
  });
  messageSchema.omit({
    id: true,
    createdAt: true
  });
  const shopSchema = object({
    id: string().uuid(),
    name: string().min(1),
    domain: string().optional(),
    platform: _enum(["shopify", "custom", "other"]).optional(),
    apiKey: string().optional(),
    settings: record(string(), unknown()).optional().default({}),
    createdAt: string().datetime(),
    updatedAt: string().datetime()
  });
  const createShopSchema = shopSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });
  createShopSchema.partial();
  const userRoleSchema = _enum(["owner", "admin", "member"]);
  const userSchema = object({
    id: string().uuid(),
    shopId: string().uuid(),
    role: userRoleSchema,
    email: string().email(),
    name: string().optional(),
    createdAt: string().datetime(),
    updatedAt: string().datetime()
  });
  const createUserSchema = userSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });
  createUserSchema.partial();
  const sizeTypeSchema = object({
    id: string().uuid(),
    name: string().min(1),
    displayName: string().min(1),
    sizes: array(string().min(1)),
    createdAt: string().datetime()
  });
  sizeTypeSchema.omit({
    id: true,
    createdAt: true
  });
  const widgetConfigTableSchema = object({
    id: string().uuid(),
    shopId: string().uuid(),
    config: record(string(), unknown()).default({}),
    createdAt: string().datetime(),
    updatedAt: string().datetime()
  });
  const createWidgetConfigTableSchema = widgetConfigTableSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });
  createWidgetConfigTableSchema.partial();
  const PREVIEW_FIT_BODY_WEIGHT_MIN_KG = 40;
  const PREVIEW_FIT_BODY_WEIGHT_MAX_KG = 90;
  function weightKgFromBodyVal(bodyVal) {
    const t = Math.max(0, Math.min(100, bodyVal)) / 100;
    return Math.round(
      PREVIEW_FIT_BODY_WEIGHT_MIN_KG + t * (PREVIEW_FIT_BODY_WEIGHT_MAX_KG - PREVIEW_FIT_BODY_WEIGHT_MIN_KG)
    );
  }
  function widgetEventMeta$1(params) {
    if (!params.placement) return void 0;
    return { placement: params.placement };
  }
  const ACCENT_DEFAULT = "#3d3835";
  const SURFACE_BG = "#fafafa";
  const DEFAULT_FIT_BODY_VAL = 25;
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
    background: ${SURFACE_BG} !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    opacity: 0; animation: fitlook-fade-in 0.22s ease-out forwards;
  `;
    const contentArea = document.createElement("div");
    contentArea.setAttribute("data-fitlook-content-area", "true");
    contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;background:" + SURFACE_BG + ";";
    const splashWrap = document.createElement("div");
    splashWrap.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;background:" + SURFACE_BG + ";";
    const cancelSplash = mountFitLookLogoLoadingAnimation(splashWrap);
    contentArea.appendChild(splashWrap);
    overlay.appendChild(contentArea);
    document.body.appendChild(overlay);
    const cleanup = { fn: cancelSplash };
    overlay.__fitlookCleanup = cleanup;
    return { overlay, contentArea };
  }
  function updateModalWithConfig(_shadowRoot, config2, params, overlay, contentArea) {
    var _a2, _b, _c, _d;
    if (!overlay || !contentArea) return;
    injectStyles();
    const prevCleanup = overlay.__fitlookCleanup;
    if (prevCleanup == null ? void 0 : prevCleanup.fn) prevCleanup.fn();
    const ui = config2.design;
    const interfaceBg = (ui == null ? void 0 : ui.interfaceBackgroundColor) ?? SURFACE_BG;
    const canvasBg = (ui == null ? void 0 : ui.canvasBackgroundColor) ?? SURFACE_BG;
    const ctaCart = (ui == null ? void 0 : ui.ctaCartLabel) ?? "カートに追加";
    const ctaTryOn = (ui == null ? void 0 : ui.ctaTryOnLabel) ?? "この体型で試着する";
    const accent = (ui == null ? void 0 : ui.ctaAccentColor) ?? ACCENT_DEFAULT;
    contentArea.innerHTML = "";
    contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;background:" + interfaceBg + ";padding:max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));box-sizing:border-box;";
    overlay.style.setProperty("background", interfaceBg, "important");
    const usePhoneFrame = params.phoneFrame === true ? true : params.phoneFrame === false || params.overlay === true ? false : true;
    if (!usePhoneFrame) {
      contentArea.style.alignItems = "stretch";
      contentArea.style.paddingLeft = "0";
      contentArea.style.paddingRight = "0";
    }
    let screenRoot;
    if (usePhoneFrame) {
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
      screenRoot = phoneScreen;
    } else {
      screenRoot = el(
        "div",
        `position:relative;flex:1;min-height:0;min-width:0;width:100%;max-width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:${interfaceBg};`
      );
      contentArea.appendChild(screenRoot);
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const eshopId = params.shopId || config2.shopId || void 0;
    const productIdForEvents = params.productId || params.externalProductId || "";
    if (eshopId && eshopId !== "unknown") {
      sendEvent({
        shopId: eshopId,
        productId: uuidRe.test(productIdForEvents) ? productIdForEvents : void 0,
        type: "widget_open",
        meta: widgetEventMeta$1(params)
      }).catch(() => {
      });
    }
    const asset = config2.asset;
    const productName = (asset == null ? void 0 : asset.productName) || "商品名";
    const priceText = (asset == null ? void 0 : asset.priceDisplay) || "—";
    const thumbnailUrl = (asset == null ? void 0 : asset.thumbnailUrl) || "";
    const garmentFitAvailable = (asset == null ? void 0 : asset.garmentFitAvailable) === true && !!params.publicKey;
    let sizeKeys = sortSizeKeys(Object.keys((asset == null ? void 0 : asset.sizes) || {}));
    if (sizeKeys.length === 0) {
      sizeKeys = garmentFitAvailable ? ["default"] : ["3", "4", "5"];
    }
    let currentSize = sizeKeys[0];
    if (params.initialSize && sizeKeys.includes(params.initialSize)) {
      currentSize = params.initialSize;
    } else if ((asset == null ? void 0 : asset.defaultSize) && sizeKeys.includes(asset.defaultSize)) {
      currentSize = asset.defaultSize;
    }
    const swatches = garmentFitAvailable || !((_a2 = asset == null ? void 0 : asset.colors) == null ? void 0 : _a2.length) ? [] : asset.colors;
    let selectedColorId = ((_b = swatches[0]) == null ? void 0 : _b.id) || "";
    let garmentImg = null;
    let fitHeightCm = 170;
    let fitBodyVal = DEFAULT_FIT_BODY_VAL;
    let fitSvgViewerGen = 0;
    let fitSvgBodyDraftGen = 0;
    const cleanup = overlay.__fitlookCleanup;
    if (cleanup) {
      cleanup.fn = () => {
      };
    }
    const backRow = el(
      "div",
      "padding:max(10px, env(safe-area-inset-top)) 12px 4px 12px;flex-shrink:0;"
    );
    const backBtn = el(
      "button",
      "border:none;background:transparent;padding:6px 0;font-size:12px;color:#111;cursor:pointer;display:flex;align-items:center;gap:4px;"
    );
    backBtn.textContent = "← 閉じる";
    backBtn.addEventListener("click", () => closeOverlay(overlay));
    backRow.appendChild(backBtn);
    screenRoot.appendChild(backRow);
    const productRow = el(
      "div",
      "display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-shrink:0;padding:2px 12px 8px 12px;gap:6px;"
    );
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
    screenRoot.appendChild(productRow);
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
      screenRoot.appendChild(colorRow);
    }
    const viewerArea = el(
      "div",
      `flex:1;min-height:120px;min-width:0;flex-basis:0;position:relative;background:${canvasBg};display:flex;align-items:center;justify-content:center;overflow:visible;padding:16px;box-sizing:border-box;`
    );
    viewerArea.setAttribute("data-fitlook-viewer-container", "true");
    function mountFitSvgElement(target, svg) {
      svg.style.opacity = "0";
      svg.style.transition = "opacity 0.2s ease-out";
      target.appendChild(svg);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          svg.style.opacity = "1";
        });
      });
    }
    async function loadGarmentFitSvgInto(target, heightCm, bodyVal, options) {
      var _a3;
      const bodyOnly = (options == null ? void 0 : options.bodyOnly) === true;
      const subtleLoading = (options == null ? void 0 : options.subtleLoading) === true;
      if (!garmentFitAvailable || !params.publicKey) return;
      const ext = params.externalProductId || params.productId;
      if (!ext) return;
      const isBodyDraft = bodyOnly;
      const gen = isBodyDraft ? ++fitSvgBodyDraftGen : ++fitSvgViewerGen;
      const stale = () => isBodyDraft ? gen !== fitSvgBodyDraftGen : gen !== fitSvgViewerGen;
      const canSubtle = subtleLoading && (target.querySelector("svg") != null || target.querySelector("img") != null);
      target.querySelectorAll("[data-fitlook-fit-loading]").forEach((n) => n.remove());
      if (!canSubtle) {
        target.innerHTML = "";
        const loading = el("div", "padding:24px;color:#6b7280;font-size:14px;text-align:center;");
        loading.textContent = "読み込み中...";
        target.appendChild(loading);
      }
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
        if (stale()) return;
        target.innerHTML = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${data.viewBoxWidth} ${data.viewBoxHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.cssText = "width:100%;max-width:300px;height:auto;max-height:100%;display:block;margin:0 auto;";
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
        mountFitSvgElement(target, svg);
      } catch {
        if (stale()) return;
        if (canSubtle) {
          const err = el(
            "div",
            "position:absolute;bottom:8px;left:8px;right:8px;z-index:20;padding:8px 10px;background:rgba(254,242,242,0.96);border-radius:8px;text-align:center;font-size:12px;color:#b91c1c;"
          );
          err.setAttribute("data-fitlook-fit-err-toast", "true");
          err.textContent = "表示の更新に失敗しました";
          (_a3 = target.querySelector("[data-fitlook-fit-err-toast]")) == null ? void 0 : _a3.remove();
          target.appendChild(err);
          window.setTimeout(() => err.remove(), 4200);
        } else {
          target.innerHTML = "";
          const err = el("div", "padding:16px;color:#b91c1c;font-size:13px;text-align:center;");
          err.textContent = "試着表示の読み込みに失敗しました";
          target.appendChild(err);
        }
      }
    }
    async function loadGarmentFitSvg(opts) {
      return loadGarmentFitSvgInto(viewerArea, fitHeightCm, fitBodyVal, {
        subtleLoading: (opts == null ? void 0 : opts.subtle) === true
      });
    }
    if (garmentFitAvailable) {
      void loadGarmentFitSvg();
    } else if (thumbnailUrl) {
      garmentImg = document.createElement("img");
      garmentImg.src = thumbnailUrl;
      garmentImg.alt = productName;
      const selHex = ((_c = swatches.find((s) => s.id === selectedColorId)) == null ? void 0 : _c.hex) || ((_d = swatches[0]) == null ? void 0 : _d.hex);
      const filterCss = swatches.length > 0 && selHex ? `filter:${colorFilterForHex(selHex)};` : "";
      garmentImg.style.cssText = `position:relative;z-index:1;max-width:88%;max-height:72%;width:auto;height:auto;object-fit:contain;${filterCss}`;
      viewerArea.appendChild(garmentImg);
    } else {
      const empty = el("div", "padding:20px 16px;text-align:center;color:#6b7280;font-size:13px;line-height:1.5;");
      empty.textContent = "商品画像（サムネイル）が登録されていません。コンソールの商品で画像 URL を設定してください。";
      viewerArea.appendChild(empty);
    }
    screenRoot.appendChild(viewerArea);
    const WINDOW = 3;
    const idxSize = sizeKeys.indexOf(currentSize);
    let windowStart = idxSize >= 0 ? Math.min(Math.max(0, idxSize), Math.max(0, sizeKeys.length - WINDOW)) : 0;
    const sizeSection = el("div", "padding:8px 12px 2px;display:flex;flex-direction:column;gap:6px;");
    const sizeRow = el("div", "display:flex;flex-direction:row;align-items:center;justify-content:center;gap:8px;");
    const prevBtn = el(
      "button",
      "min-width:64px;min-height:64px;width:64px;height:64px;border:none;background:transparent;font-size:34px;color:#111;cursor:pointer;line-height:1;border-radius:999px;display:flex;align-items:center;justify-content:center;"
    );
    prevBtn.type = "button";
    prevBtn.setAttribute("aria-label", "前のサイズ");
    prevBtn.textContent = "‹";
    const nextBtn = el(
      "button",
      "min-width:64px;min-height:64px;width:64px;height:64px;border:none;background:transparent;font-size:34px;color:#111;cursor:pointer;line-height:1;border-radius:999px;display:flex;align-items:center;justify-content:center;"
    );
    nextBtn.type = "button";
    nextBtn.setAttribute("aria-label", "次のサイズ");
    nextBtn.textContent = "›";
    const sizeBtnsWrap = el("div", "display:flex;flex-direction:row;gap:8px;align-items:center;justify-content:center;");
    function syncWindowStartFromSelection() {
      const idx = sizeKeys.indexOf(currentSize);
      windowStart = idx >= 0 ? Math.min(Math.max(0, idx), Math.max(0, sizeKeys.length - WINDOW)) : 0;
    }
    function selectSize(sz) {
      currentSize = sz;
      syncWindowStartFromSelection();
      if (eshopId && eshopId !== "unknown") {
        sendEvent({
          shopId: eshopId,
          productId: uuidRe.test(productIdForEvents) ? productIdForEvents : void 0,
          type: "size_change",
          meta: { size: sz, ...widgetEventMeta$1(params) }
        }).catch(() => {
        });
      }
      renderSizeButtons();
      if (garmentFitAvailable) {
        void loadGarmentFitSvg({ subtle: true });
      }
    }
    function renderSizeButtons() {
      sizeBtnsWrap.innerHTML = "";
      const slice = sizeKeys.slice(windowStart, windowStart + WINDOW);
      slice.forEach((sz) => {
        const isSel = sz === currentSize;
        const btn = el(
          "button",
          `min-width:44px;height:44px;padding:0 10px;box-sizing:border-box;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer;flex-shrink:0;` + (isSel ? `background:${accent};color:#fff;border:none;` : `background:#fff;color:#111;border:1px solid #111;`)
        );
        btn.type = "button";
        btn.textContent = sz;
        btn.addEventListener("click", () => {
          selectSize(sz);
        });
        sizeBtnsWrap.appendChild(btn);
      });
      const idx = sizeKeys.indexOf(currentSize);
      const atStart = idx <= 0;
      const atEnd = idx < 0 || idx >= sizeKeys.length - 1;
      prevBtn.style.opacity = atStart ? "0.35" : "1";
      prevBtn.style.pointerEvents = atStart ? "none" : "auto";
      prevBtn.toggleAttribute("disabled", atStart);
      nextBtn.style.opacity = atEnd ? "0.35" : "1";
      nextBtn.style.pointerEvents = atEnd ? "none" : "auto";
      nextBtn.toggleAttribute("disabled", atEnd);
    }
    prevBtn.addEventListener("click", () => {
      const idx = sizeKeys.indexOf(currentSize);
      if (idx <= 0) return;
      selectSize(sizeKeys[idx - 1]);
    });
    nextBtn.addEventListener("click", () => {
      const idx = sizeKeys.indexOf(currentSize);
      if (idx < 0 || idx >= sizeKeys.length - 1) return;
      selectSize(sizeKeys[idx + 1]);
    });
    sizeRow.appendChild(prevBtn);
    sizeRow.appendChild(sizeBtnsWrap);
    sizeRow.appendChild(nextBtn);
    sizeSection.appendChild(sizeRow);
    screenRoot.appendChild(sizeSection);
    renderSizeButtons();
    const cartWrap = el(
      "div",
      "flex-shrink:0;padding-top:4px;padding-left:12px;padding-right:12px;padding-bottom:max(12px, env(safe-area-inset-bottom));"
    );
    const cartBtn = el(
      "button",
      `width:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-between;box-sizing:border-box;padding:10px 14px;border:none;border-radius:10px;background:${accent};color:#fff;font-size:13px;font-weight:700;cursor:pointer;`
    );
    const cartLeft = el("div", "display:flex;align-items:center;gap:8px;flex-shrink:0;");
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
        sendEvent({
          shopId: eshopId,
          productId: uuidRe.test(productIdForEvents) ? productIdForEvents : void 0,
          type: "add_to_cart_click",
          meta: { size: currentSize, colorId: selectedColorId, ...widgetEventMeta$1(params) }
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
    screenRoot.appendChild(cartWrap);
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
        "position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:" + interfaceBg + ";border-radius:" + (usePhoneFrame ? "34px" : "0") + ";overflow:hidden;animation:fitlook-fade-in 0.2s ease-out;"
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
          void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, {
            bodyOnly: true,
            subtleLoading: true
          });
        }, 140);
      }
      if (garmentFitAvailable) {
        void loadGarmentFitSvgInto(figureArea, setupHeight, bodyVal, {
          bodyOnly: true,
          subtleLoading: false
        });
      } else if (thumbnailUrl) {
        const prevImg = document.createElement("img");
        prevImg.src = thumbnailUrl;
        prevImg.alt = productName;
        prevImg.style.cssText = "max-width:88%;max-height:72%;width:auto;height:auto;object-fit:contain;position:relative;z-index:1;";
        figureArea.appendChild(prevImg);
      } else {
        const ph = el("div", "padding:16px;text-align:center;color:#6b7280;font-size:13px;");
        ph.textContent = "商品画像が登録されていません";
        figureArea.appendChild(ph);
      }
      bodyAdjustOverlay.appendChild(figureArea);
      const controls = el(
        "div",
        "flex-shrink:0;padding:0 12px 10px;display:flex;flex-direction:column;gap:6px;background:" + interfaceBg + ";"
      );
      const hRow = el("div", "width:100%;");
      const hLabel = el("div", "display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:400;line-height:1.25;margin-bottom:4px;color:#111;");
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
      const bLabel = el("div", "font-size:9px;font-weight:400;line-height:1.25;margin-bottom:4px;color:#111;");
      bLabel.textContent = "シルエット";
      const bInput = document.createElement("input");
      bInput.type = "range";
      bInput.min = "0";
      bInput.max = "100";
      bInput.value = String(fitBodyVal);
      bInput.style.cssText = "width:100%;height:28px;accent-color:" + accent + ";";
      bInput.addEventListener("input", () => {
        bodyVal = parseInt(bInput.value, 10) || 0;
        scheduleBodyDraftPreview();
      });
      bRow.appendChild(bLabel);
      bRow.appendChild(bInput);
      controls.appendChild(bRow);
      bodyAdjustOverlay.appendChild(controls);
      const ctaPad = "padding:8px 12px;padding-bottom:max(12px, env(safe-area-inset-bottom));flex-shrink:0;background:" + interfaceBg + ";";
      const ctaWrap = el("div", ctaPad);
      const applyBtn = el(
        "button",
        `width:100%;box-sizing:border-box;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:10px 14px;border:none;border-radius:10px;background:${accent};color:#fff;font-size:13px;font-weight:700;cursor:pointer;`
      );
      applyBtn.type = "button";
      const applyMid = el("span", "flex:1;text-align:center;");
      applyMid.textContent = ctaTryOn;
      const applyRight = el(
        "div",
        "width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;"
      );
      applyRight.textContent = "→";
      const applySpacer = el("span", "display:block;flex:0 0 15px;width:15px;height:15px;flex-shrink:0;");
      applyBtn.appendChild(applySpacer);
      applyBtn.appendChild(applyMid);
      applyBtn.appendChild(applyRight);
      applyBtn.addEventListener("click", () => {
        fitHeightCm = setupHeight;
        fitBodyVal = bodyVal;
        if (eshopId && eshopId !== "unknown") {
          sendEvent({
            shopId: eshopId,
            productId: uuidRe.test(productIdForEvents) ? productIdForEvents : void 0,
            type: "height_change",
            meta: {
              heightCm: fitHeightCm,
              bodyVal: fitBodyVal,
              ...widgetEventMeta$1(params)
            }
          }).catch(() => {
          });
        }
        if (garmentFitAvailable) {
          void loadGarmentFitSvg({ subtle: true });
        }
        closeBodyAdjustOverlay();
      });
      ctaWrap.appendChild(applyBtn);
      bodyAdjustOverlay.appendChild(ctaWrap);
      screenRoot.appendChild(bodyAdjustOverlay);
    }
    bodyBtn.addEventListener("click", openBodySheet);
    if (isDevelopmentMode()) {
      console.log(`${WIDGET_LOG_PREFIX} 2D view ready`, { productName, sizes: sizeKeys });
    }
  }
  function mountEmbedIframe(overlay, contentArea, params) {
    const splashCleanup = overlay.__fitlookCleanup;
    if (splashCleanup == null ? void 0 : splashCleanup.fn) splashCleanup.fn();
    contentArea.innerHTML = "";
    contentArea.style.cssText = "flex:1;min-height:0;position:relative;width:100%;height:100%;padding:0;margin:0;overflow:hidden;background:#fafafa;";
    overlay.style.setProperty("background", "#fafafa", "important");
    const apiBase = getApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "");
    const pk = encodeURIComponent(params.publicKey || "");
    const ext = encodeURIComponent(params.externalProductId || params.productId || "");
    const iframe = document.createElement("iframe");
    iframe.src = `${apiBase}/embed/widget-fit?publicKey=${pk}&externalProductId=${ext}`;
    iframe.setAttribute("title", "FIT&LOOK 試着");
    iframe.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;border:none;display:block;";
    contentArea.style.position = "relative";
    contentArea.appendChild(iframe);
    const onMsg = (e) => {
      var _a2;
      if (((_a2 = e.data) == null ? void 0 : _a2.type) !== "fitlook-embed-close") return;
      window.removeEventListener("message", onMsg);
      closeOverlay(overlay);
    };
    window.addEventListener("message", onMsg);
    overlay.__fitlookCleanup = {
      fn: () => {
        window.removeEventListener("message", onMsg);
      }
    };
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
    padding: 24px; text-align: center; background: ${SURFACE_BG};
    padding-top: max(24px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  `;
    overlay.style.setProperty("background", SURFACE_BG, "important");
    const div = document.createElement("div");
    div.style.cssText = "color:#dc2626;font-size:15px;line-height:1.5;white-space:pre-line;";
    div.textContent = errorMessage;
    contentArea.appendChild(div);
  }
  function widgetEventMeta(params) {
    const meta = {};
    if (params.placement) meta.placement = params.placement;
    if (params.initialSize) meta.initialSize = params.initialSize;
    if (params.overlay) meta.overlay = true;
    return Object.keys(meta).length ? meta : void 0;
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
      const placement = readEmbedAttr(element, "placement");
      const initialSize = readEmbedAttr(element, "initial-size");
      const overlay = isOverlayModeFromAttr(readEmbedAttr(element, "overlay"));
      const phoneFrameDisabled = isPhoneFrameDisabledFromAttr(readEmbedAttr(element, "phone-frame"));
      if (!publicKey && !shopId) {
        console.warn(`${WIDGET_LOG_PREFIX} public-key or shop-id is required`);
        return;
      }
      try {
        let trySendCubeView = function(shopIdForEvent) {
          if (cubeViewSent || !shopIdForEvent || shopIdForEvent === "unknown") return;
          cubeViewSent = true;
          sendEvent({
            shopId: shopIdForEvent,
            productId: validProductIdForEvent,
            type: "cube_view",
            meta: widgetEventMeta(params)
          }).catch(() => {
          });
        };
        if (overlay) {
          element.style.display = "block";
          element.style.position = "absolute";
          element.style.left = "0";
          element.style.top = "0";
          element.style.right = "0";
          element.style.bottom = "0";
          element.style.width = "100%";
          element.style.height = "100%";
          element.style.zIndex = "10";
          element.style.margin = "0";
          element.style.padding = "0";
          element.style.border = "none";
          element.style.background = "transparent";
        } else if (isInlinePlacement(placement)) {
          element.style.display = "inline-block";
          element.style.verticalAlign = "middle";
        } else {
          element.style.display = "block";
        }
        if (!overlay) {
          element.style.width = "auto";
          element.style.height = "auto";
          element.style.margin = "0";
          element.style.padding = "0";
          element.style.border = "none";
          element.style.background = "transparent";
        }
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
          url,
          placement: placement || null,
          initialSize: initialSize || null,
          overlay: overlay ? true : null,
          /** オーバーレイは常に全幅モーダル（属性が効かない環境でも枠を出さない） */
          phoneFrame: phoneFrameDisabled || overlay ? false : null
        };
        const pid = productId || externalProductId || `widget-${Date.now()}-${Math.random()}`;
        const safePid = String(pid).replace(/[^a-zA-Z0-9_-]/g, "_");
        const containerId = `${WIDGET_CONTAINER_ID_PREFIX}${safePid}-${index}`;
        const designRoot = isInlinePlacement(placement) || overlay ? shadowRoot : document;
        renderCube(shadowRoot, params, handleCubeClick, null, containerId);
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const productIdForEvent = params.productId || params.externalProductId || void 0;
        const validProductIdForEvent = productIdForEvent && uuidRe.test(productIdForEvent) ? productIdForEvent : void 0;
        let cubeViewSent = false;
        if (publicKey) {
          const designFetch = fetchWidgetDesign(publicKey);
          const designTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
          Promise.race([designFetch, designTimeout]).then((design) => {
            const d = design;
            if (d == null ? void 0 : d.shopId) {
              params.shopId = d.shopId;
            }
            if (d == null ? void 0 : d.button) {
              applyDesignToButton(containerId, d, designRoot);
            } else {
              showDefaultButton(containerId, designRoot);
            }
            trySendCubeView((d == null ? void 0 : d.shopId) || params.shopId || "");
          }).catch(() => {
            showDefaultButton(containerId, designRoot);
          });
          designFetch.then((design) => {
            const d = design;
            if (!d) return;
            if (d.shopId) {
              params.shopId = d.shopId;
            }
            if (d.button) {
              applyDesignToButton(containerId, d, designRoot);
            }
            trySendCubeView(d.shopId || params.shopId || "");
          }).catch(() => {
          });
        } else {
          showDefaultButton(containerId, designRoot);
          trySendCubeView(params.shopId || "");
        }
      } catch (error) {
        console.error(`${WIDGET_LOG_PREFIX} Failed to initialize widget ${index + 1}:`, error);
      }
    });
    updateButtonPositions();
  }
  function waitForFitLookSplashElapsed(splashStartMs) {
    const elapsed = Date.now() - splashStartMs;
    const remaining = FITLOOK_LOGO_SPLASH_DURATION_MS - elapsed;
    if (remaining <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, remaining));
  }
  async function handleCubeClick(shadowRoot, params) {
    var _a2;
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
    const { overlay, contentArea } = renderModalWithLoading();
    const splashStartMs = Date.now();
    try {
      const config2 = await fetchWidgetConfig(params);
      await waitForFitLookSplashElapsed(splashStartMs);
      const resolvedShopId = params.shopId || config2.shopId || "";
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const pid = params.productId || params.externalProductId || "";
      if (resolvedShopId && resolvedShopId !== "unknown") {
        sendEvent({
          shopId: resolvedShopId,
          productId: uuidRe.test(pid) ? pid : void 0,
          type: "cube_click",
          meta: widgetEventMeta(params)
        }).catch(() => {
        });
      }
      if (config2.enabled && ((_a2 = config2.asset) == null ? void 0 : _a2.garmentFitAvailable)) {
        mountEmbedIframe(overlay, contentArea, params);
      } else if (config2.enabled) {
        updateModalWithConfig(shadowRoot, config2, params, overlay, contentArea);
      } else {
        const errorDetails = config2.error || "不明なエラー";
        showErrorInModal(shadowRoot, `この商品の試着は現在利用できません。

エラー: ${errorDetails}`, overlay, contentArea);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${WIDGET_LOG_PREFIX} Error in handleCubeClick:`, errorMessage);
      await waitForFitLookSplashElapsed(splashStartMs);
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
