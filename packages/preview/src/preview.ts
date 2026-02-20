import type { PreviewPanelOptions, PreviewPanelInstance, OutfitAssetsData, OutfitAssetItem } from "./types";
import type { ProductSize } from "@atelier/shared";
import { init3DViewer } from "./viewer";
import type { ViewerInstance } from "./viewer";
import { getBackgroundImageUrl } from "./viewer-container";
import { buildHeightSlider } from "./height-slider";
import { renderCatTabs, renderThumbs, renderLeftPanel, PREVIEW_SIZES, OUTFIT_CATEGORIES } from "./ui-components";

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
    // activeAssetsを共通関数用の形式に変換
    const assetsForRender = new Map<string, { url: string; category: string; thumbnailUrl?: string | null }>();
    activeAssets.forEach((wearing, cat) => {
      const items = currentOutfitData.categories[cat] || [];
      const item = items.find((i) => i.modelUrl === wearing.url);
      assetsForRender.set(cat, {
        url: wearing.url,
        category: cat,
        thumbnailUrl: item?.thumbnailUrl,
      });
    });
    
    renderLeftPanel(
      leftSlots,
      assetsForRender,
      currentOutfitData,
      currentCategory,
      (cat: string) => {
        currentCategory = cat;
        renderLeftSlots();
        renderCatTabsLocal();
        renderThumbsLocal();
      },
      PREVIEW_SIZES
    );
  }

  function renderCatTabsLocal() {
    currentCategory = renderCatTabs(
      catTabs,
      currentOutfitData,
      currentCategory,
      (cat: string) => {
        currentCategory = cat;
        renderCatTabsLocal();
        renderThumbsLocal();
        renderLeftSlots();
      },
      PREVIEW_SIZES
    );
  }

  function renderThumbsLocal() {
    const items: OutfitAssetItem[] = currentOutfitData.categories[currentCategory] || [];
    
    renderThumbs(
      thumbsRow,
      items,
      currentCategory,
      selectedAssetId,
      activeAssets,
      (item: OutfitAssetItem | null, category: string) => {
        if (item === null) {
          selectedAssetId = null;
          activeAssets.delete(category);
          onOutfitAssetSelect?.(null, category);
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
        renderThumbsLocal();
      },
      PREVIEW_SIZES
    );
  }

  // Initial render
  renderLeftSlots();
  renderCatTabsLocal();
  renderThumbsLocal();

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
      renderCatTabsLocal();
      renderThumbsLocal();
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

// buildHeightSlider は height-slider.ts からインポート
