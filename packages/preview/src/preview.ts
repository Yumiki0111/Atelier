import type { PreviewPanelOptions, PreviewPanelInstance, OutfitAssetsData, OutfitAssetItem } from "./types";
import type { ProductSize } from "@atelier/shared";
import { init3DViewer } from "./viewer";
import type { ViewerInstance } from "./viewer";
import { getBackgroundImageUrl } from "./viewer-container";

const OUTFIT_CATEGORIES: readonly string[] = ["トップス", "ボトムス", "アウター", "シューズ"];

// ─── CSS injection ─────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById("atelier-preview-styles")) return;
  const s = document.createElement("style");
  s.id = "atelier-preview-styles";
  s.textContent = `
    [data-atelier-preview-thumbs]::-webkit-scrollbar { display: none; }
    [data-atelier-preview-thumbs] { scrollbar-width: none; -ms-overflow-style: none; }
    [data-atelier-preview-cattabs]::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(s);
}

/**
 * PreviewPanel の Vanilla JS 実装
 * レイアウトはモーフデザイン（バックドロップ + ボトムシート）に準拠
 */
export function initPreviewPanel(
  options: PreviewPanelOptions
): PreviewPanelInstance {
  const {
    container,
    glbUrl,
    modelUrl,
    assets,
    apiBaseUrl = "",
    initialHeight = 170,
    minHeight = 160,
    maxHeight = 190,
    availableSizes = ["S", "M", "L", "XL"],
    initialSize = "M",
    outfitAssets,
    onHeightChange,
    onSizeChange,
    onModelLoad,
    onModelError,
    onOutfitAssetSelect,
  } = options;

  injectStyles();

  // コンテナをクリア（position: relative の全画面ラッパー）
  try {
    Array.from(container.children).forEach((c) => { try { c.remove(); } catch { /* ignore */ } });
  } catch { /* ignore */ }

  container.style.cssText = `
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  `;

  // ─── Backdrop ─────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.48);";
  container.appendChild(backdrop);

  // ─── Bottom sheet ──────────────────────────────────────
  const sheet = document.createElement("div");
  sheet.style.cssText = `
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 96%;
    background: #fff;
    border-radius: 16px 16px 0 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  container.appendChild(sheet);

  // ─── Drag handle ──────────────────────────────────────
  const dragHandle = document.createElement("div");
  dragHandle.style.cssText = `
    flex-shrink: 0; display: flex; justify-content: center;
    padding: 3px 0 2px;
  `;
  const pill = document.createElement("div");
  pill.style.cssText = "width:32px;height:3px;background:#d1d5db;border-radius:99px;";
  dragHandle.appendChild(pill);
  sheet.appendChild(dragHandle);

  // ─── Viewer area (flex:1) ──────────────────────────────
  const viewerArea = document.createElement("div");
  viewerArea.style.cssText = "flex:1;min-height:0;position:relative;overflow:hidden;";

  // 3D canvas
  const viewerEl = document.createElement("div");
  const bgUrl = getBackgroundImageUrl();
  viewerEl.style.cssText = `
    position: absolute; inset: 0;
    ${bgUrl ? `background-image:url(${bgUrl});background-size:cover;background-position:center;` : ""}
  `;

  // Left slots overlay (top-left)
  const leftSlots = document.createElement("div");
  leftSlots.style.cssText = `
    position: absolute; top: 8px; left: 6px;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    z-index: 20;
  `;

  // Height slider overlay (bottom-right)
  const sliderOverlay = document.createElement("div");
  sliderOverlay.style.cssText = `
    position: absolute; bottom: 8px; right: 6px;
    width: 28px; height: 180px;
    display: flex; flex-direction: column; align-items: center;
    user-select: none; touch-action: none; z-index: 20;
  `;

  viewerArea.appendChild(viewerEl);
  viewerArea.appendChild(leftSlots);
  viewerArea.appendChild(sliderOverlay);
  sheet.appendChild(viewerArea);

  // ─── Bottom panel ──────────────────────────────────────
  const bottomPanel = document.createElement("div");
  bottomPanel.style.cssText = "flex-shrink:0;background:#fff;";

  // Size row ‹ M ›
  const sizeRow = document.createElement("div");
  sizeRow.style.cssText = `
    display: flex; align-items: center; justify-content: center;
    gap: 8px; padding: 1px 16px 1px;
  `;
  const prevSizeBtn = makeArrowBtn("‹");
  const sizeLabel = document.createElement("div");
  sizeLabel.style.cssText = `
    min-width: 40px; padding: 4px 12px;
    text-align: center; font-size: 13px; font-weight: 700;
    color: #fff; background: #3b82f6;
    border-radius: 4px;
  `;
  sizeLabel.textContent = initialSize as string;
  const nextSizeBtn = makeArrowBtn("›");

  let currentSize = initialSize as string;

  prevSizeBtn.addEventListener("click", () => {
    const i = (availableSizes as string[]).indexOf(currentSize);
    if (i > 0) {
      currentSize = availableSizes[i - 1] as string;
      sizeLabel.textContent = currentSize;
      onSizeChange?.(currentSize as ProductSize);
    }
  });
  nextSizeBtn.addEventListener("click", () => {
    const i = (availableSizes as string[]).indexOf(currentSize);
    if (i < availableSizes.length - 1) {
      currentSize = availableSizes[i + 1] as string;
      sizeLabel.textContent = currentSize;
      onSizeChange?.(currentSize as ProductSize);
    }
  });

  sizeRow.appendChild(prevSizeBtn);
  sizeRow.appendChild(sizeLabel);
  sizeRow.appendChild(nextSizeBtn);

  // Thumbnails row
  const thumbsRow = document.createElement("div");
  thumbsRow.setAttribute("data-atelier-preview-thumbs", "true");
  thumbsRow.style.cssText = "display:flex;gap:6px;padding:2px 10px 2px;overflow-x:auto;overflow-y:hidden;";

  // Category tabs
  const catTabs = document.createElement("div");
  catTabs.setAttribute("data-atelier-preview-cattabs", "true");
  catTabs.style.cssText = "display:flex;gap:2px;padding:2px 10px 5px;overflow-x:auto;";

  bottomPanel.appendChild(sizeRow);
  bottomPanel.appendChild(thumbsRow);
  bottomPanel.appendChild(catTabs);
  sheet.appendChild(bottomPanel);

  // ─── State ────────────────────────────────────────────
  let currentCategory: string = OUTFIT_CATEGORIES[0];
  let currentOutfitData: OutfitAssetsData = outfitAssets || { categories: {} };
  let selectedAssetId: string | null = null;
  const activeAssets = new Map<string, { url: string; category: string }>();

  // ─── 3D Viewer ─────────────────────────────────────────
  let viewer: ViewerInstance | null = null;
  viewer = init3DViewer(viewerEl, {
    apiBaseUrl,
    glbUrl,
    modelUrl,
    assets: assets?.map((a) => ({ url: a.url, category: a.category })) ?? [],
    onLoad: onModelLoad,
    onError: onModelError,
  });

  // ─── Height slider ─────────────────────────────────────
  buildHeightSlider(sliderOverlay, minHeight, maxHeight, initialHeight, (h) => {
    viewer?.updateHeight?.(h, initialHeight);
    onHeightChange?.(h);
  });

  // ─── Render helpers ────────────────────────────────────

  function renderLeftSlots() {
    leftSlots.innerHTML = "";
    // 着ている商品だけを表示（activeAssetsに値が入っているもののみ）
    activeAssets.forEach((wearing, cat) => {
      const isActive = cat === currentCategory;
      // 下のパネルと同じ商品画像を取得（currentOutfitDataから該当するアイテムを探す）
      const items = currentOutfitData.categories[cat] || [];
      const item = items.find((i) => i.modelUrl === wearing.url);
      const thumbnailUrl = item?.thumbnailUrl;

      const card = document.createElement("div");
      card.style.cssText = `
        width: 30px; height: 30px; flex-shrink: 0;
        border: 2px solid ${isActive ? "#3b82f6" : "#e5e7eb"};
        border-radius: 6px;
        background: rgba(249,250,251,0.9);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; overflow: hidden; box-sizing: border-box;
      `;
      // 下のパネルと同じスタイルで画像を表示
      const imgWrap = document.createElement("div");
      imgWrap.style.cssText = `
        width: 24px; height: 24px; flex-shrink: 0;
        border-radius: 3px; background: #f3f4f6;
        overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        font-size: 8px; color: #9ca3af;
      `;
      if (thumbnailUrl) {
        const img = document.createElement("img");
        img.src = thumbnailUrl;
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        imgWrap.appendChild(img);
      } else {
        imgWrap.textContent = "3D";
      }
      card.appendChild(imgWrap);
      card.addEventListener("click", () => {
        currentCategory = cat;
        renderLeftSlots();
        renderCatTabs();
        renderThumbs();
      });
      leftSlots.appendChild(card);
    });
  }

  function renderCatTabs() {
    catTabs.innerHTML = "";
    const cats = Object.keys(currentOutfitData.categories).length > 0
      ? Object.keys(currentOutfitData.categories)
      : [...OUTFIT_CATEGORIES];

    if (!cats.includes(currentCategory)) currentCategory = cats[0] || OUTFIT_CATEGORIES[0];

    cats.forEach((cat) => {
      const isActive = cat === currentCategory;
      const btn = document.createElement("button");
      btn.textContent = cat;
      btn.style.cssText = `
        padding: 3px 8px; font-size: 9px;
        font-weight: ${isActive ? "700" : "500"};
        color: ${isActive ? "#fff" : "#374151"};
        background: ${isActive ? "#111" : "transparent"};
        border: none; border-radius: 99px;
        cursor: pointer; white-space: nowrap; flex-shrink: 0; outline: none;
        transition: background 0.15s, color 0.15s;
      `;
      btn.addEventListener("click", () => {
        currentCategory = cat;
        renderCatTabs();
        renderThumbs();
        renderLeftSlots();
      });
      catTabs.appendChild(btn);
    });
  }

  function renderThumbs() {
    thumbsRow.innerHTML = "";
    const items: OutfitAssetItem[] = currentOutfitData.categories[currentCategory] || [];

    if (items.length === 0) {
      const msg = document.createElement("div");
      msg.textContent = "アイテムがありません";
      msg.style.cssText = "font-size:11px;color:#9ca3af;padding:8px;align-self:center;";
      thumbsRow.appendChild(msg);
      return;
    }

    items.forEach((item) => {
      const isSelected = item.id === selectedAssetId && activeAssets.get(item.category)?.url === item.modelUrl;
      const card = document.createElement("div");
      card.style.cssText = `
        width: 38px; min-width: 38px; height: 38px;
        border-radius: 7px; background: #fff;
        border: 2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"};
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; overflow: hidden; flex-shrink: 0;
        box-sizing: border-box; transition: border-color 0.15s;
      `;

      const imgWrap = document.createElement("div");
      imgWrap.style.cssText = `
        width: 28px; height: 28px; border-radius: 3px; background: #f3f4f6;
        display: flex; align-items: center; justify-content: center;
        font-size: 8px; color: #9ca3af; overflow: hidden; flex-shrink: 0;
      `;
      if (item.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = item.thumbnailUrl;
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        imgWrap.appendChild(img);
      } else {
        imgWrap.textContent = "3D";
      }
      card.appendChild(imgWrap);

      card.addEventListener("click", () => {
        if (isSelected) {
          selectedAssetId = null;
          activeAssets.delete(item.category);
          onOutfitAssetSelect?.(null, item.category);
        } else {
          selectedAssetId = item.id;
          activeAssets.set(item.category, { url: item.modelUrl, category: item.category });
          
          // ジャケット、コート、トップスは同じレイヤーなので、一方を選択したら他方を削除
          if (item.category === "コート") {
            activeAssets.delete("ジャケット");
            activeAssets.delete("トップス");
          } else if (item.category === "ジャケット") {
            activeAssets.delete("コート");
            activeAssets.delete("トップス");
          } else if (item.category === "トップス") {
            activeAssets.delete("コート");
            activeAssets.delete("ジャケット");
          }
          
          onOutfitAssetSelect?.(item);
        }
        viewer?.updateAssets(Array.from(activeAssets.values()));
        renderLeftSlots();
        renderThumbs();
      });
      thumbsRow.appendChild(card);
    });
  }

  // Initial render
  renderLeftSlots();
  renderCatTabs();
  renderThumbs();

  // ─── Public instance ───────────────────────────────────
  return {
    updateGlbUrl(newGlbUrl) {
      viewer?.updateGlbUrl(newGlbUrl);
    },
    updateModelUrl(newModelUrl) {
      viewer?.updateModelUrl(newModelUrl);
    },
    updateAssets(newAssets) {
      activeAssets.clear();
      newAssets.forEach((a) => {
        if (a.category) activeAssets.set(a.category, { url: a.url, category: a.category });
      });
      viewer?.updateAssets(newAssets.map((a) => ({ url: a.url, category: a.category })));
      renderLeftSlots();
    },
    updateOutfitAssets(data) {
      currentOutfitData = data;
      renderCatTabs();
      renderThumbs();
    },
    updateHeight(height, baseHeight) {
      viewer?.updateHeight?.(height, baseHeight);
      onHeightChange?.(height);
    },
    updateSize(size) {
      currentSize = size as string;
      sizeLabel.textContent = size as string;
    },
    updateProductName(_name) {
      // 商品名はモーフレイアウトでは表示しない
    },
    toggleAsset(category, visible) {
      viewer?.toggleAsset?.(category, visible);
    },
    destroy() {
      try { viewer?.destroy(); } catch { /* ignore */ }
      try {
        Array.from(container.children).forEach((c) => { try { c.remove(); } catch { /* ignore */ } });
      } catch { /* ignore */ }
    },
  };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function makeArrowBtn(symbol: string): HTMLElement {
  const btn = document.createElement("button");
  btn.textContent = symbol;
  btn.style.cssText = `
    width: 22px; height: 22px;
    background: transparent; border: none; outline: none;
    cursor: pointer; font-size: 18px; color: #111;
    display: flex; align-items: center; justify-content: center;
    line-height: 1; padding: 0; border-radius: 50%;
    transition: background 0.15s;
  `;
  btn.addEventListener("mouseenter", () => { btn.style.background = "#f3f4f6"; });
  btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
  return btn;
}

function buildHeightSlider(
  container: HTMLElement,
  min: number,
  max: number,
  initial: number,
  onChange: (v: number) => void
) {
  const plus = document.createElement("div");
  plus.textContent = "+";
  plus.style.cssText = `
    font-size: 12px; font-weight: 700; color: #374151;
    cursor: pointer; line-height: 1; flex-shrink: 0; user-select: none;
    width: 100%; text-align: center; padding: 2px 0;
  `;

  const trackWrap = document.createElement("div");
  trackWrap.style.cssText = `
    flex: 1; min-height: 0; position: relative;
    display: flex; align-items: center; justify-content: center;
    margin: 3px 0;
  `;
  const track = document.createElement("div");
  track.style.cssText = "position:absolute;top:0;bottom:0;width:2px;background:#d1d5db;border-radius:1px;left:50%;transform:translateX(-50%);";

  // 数値表示用の要素を作成
  const valueLabel = document.createElement("div");
  valueLabel.textContent = `${initial}`;
  valueLabel.style.cssText = `
    position: absolute;
    left: -30px;
    transform: translateY(-50%);
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 2;
  `;

  const handle = document.createElement("div");
  handle.style.cssText = `
    position: absolute;
    width: 12px; height: 12px;
    background: #111; border-radius: 50%;
    left: 50%; transform: translate(-50%, -50%);
    cursor: grab; touch-action: none; z-index: 1;
  `;

  const minus = document.createElement("div");
  minus.textContent = "−";
  minus.style.cssText = `
    font-size: 12px; font-weight: 700; color: #374151;
    cursor: pointer; line-height: 1; flex-shrink: 0; user-select: none;
    width: 100%; text-align: center; padding: 2px 0;
  `;

  trackWrap.appendChild(track);
  trackWrap.appendChild(valueLabel);
  trackWrap.appendChild(handle);
  container.appendChild(plus);
  container.appendChild(trackWrap);
  container.appendChild(minus);

  let dragging = false;
  let currentValue = initial;

  const valueToY = (v: number): number => {
    const h = trackWrap.clientHeight;
    return (1 - (v - min) / (max - min)) * h;
  };
  const yToValue = (y: number): number => {
    const h = trackWrap.clientHeight || 1;
    return Math.round(max - Math.max(0, Math.min(1, y / h)) * (max - min));
  };
  const positionHandle = (v: number) => {
    const y = valueToY(v);
    handle.style.top = `${y}px`;
    valueLabel.style.top = `${y}px`;
    valueLabel.textContent = `${v}`;
  };

  requestAnimationFrame(() => positionHandle(currentValue));
  window.addEventListener("resize", () => positionHandle(currentValue), { passive: true });

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    handle.style.cursor = "grabbing";
    valueLabel.style.opacity = "1";
  });
  handle.addEventListener("touchstart", (e) => {
    e.preventDefault();
    dragging = true;
    valueLabel.style.opacity = "1";
  }, { passive: false });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = trackWrap.getBoundingClientRect();
    const v = yToValue(e.clientY - rect.top);
    if (v !== currentValue) { currentValue = v; positionHandle(v); onChange(v); }
  });
  document.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    e.preventDefault();
    const rect = trackWrap.getBoundingClientRect();
    const v = yToValue(e.touches[0].clientY - rect.top);
    if (v !== currentValue) { currentValue = v; positionHandle(v); onChange(v); }
  }, { passive: false });
  document.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      handle.style.cursor = "grab";
      valueLabel.style.opacity = "0";
    }
  });
  document.addEventListener("touchend", () => {
    if (dragging) {
      dragging = false;
      valueLabel.style.opacity = "0";
    }
  });

  plus.addEventListener("click", () => {
    currentValue = Math.min(max, currentValue + 1);
    positionHandle(currentValue); onChange(currentValue);
  });
  minus.addEventListener("click", () => {
    currentValue = Math.max(min, currentValue - 1);
    positionHandle(currentValue); onChange(currentValue);
  });
}
