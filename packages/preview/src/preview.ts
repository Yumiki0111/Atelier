import type { PreviewPanelOptions, PreviewPanelInstance, OutfitAssetsData, OutfitAssetItem } from "./types";
import type { ProductSize } from "@Atelier/shared";
import { init3DViewer } from "./viewer";
import type { ViewerInstance } from "./viewer";
import { getBackgroundImageUrl } from "./viewer-container";
import { buildHeightSlider } from "./height-slider";
import { renderCatTabs, renderThumbs, renderLeftPanel, PREVIEW_SIZES, OUTFIT_CATEGORIES, buildAxisOverlay, renderAxis, createAxisControls } from "./ui-components";

// ─── CSS injection ─────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById("fitlook-preview-styles")) return;
  const s = document.createElement("style");
  s.id = "fitlook-preview-styles";
  s.textContent = `
    [data-fitlook-preview-thumbs]::-webkit-scrollbar { display: none; }
    [data-fitlook-preview-thumbs] { scrollbar-width: none; -ms-overflow-style: none; }
    [data-fitlook-preview-cattabs]::-webkit-scrollbar { display: none; }
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
    display: flex !important;
    flex-direction: column !important;
    background: #fff !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  `;

  // ─── 全面ウィジェットレイアウト（モーダルではなく） ──
  // バックドロップとボトムシートは削除し、直接コンテナに配置

  // ─── Viewer area (画面上3/4, 白背景) ──────────────────────────────
  const viewerArea = document.createElement("div");
  viewerArea.style.cssText = `
    flex: 0 0 75%;
    min-height: 0;
    position: relative;
    overflow: hidden;
    background: #fff;
  `;

  // 3D canvas
  const viewerEl = document.createElement("div");
  viewerEl.style.cssText = "position: absolute; inset: 0;";

  // Left slots overlay (top-left) - 4つの正方形ボタン
  // 上5%をセーフエリアとして確保
  const leftSlots = document.createElement("div");
  leftSlots.style.cssText = `
    position: absolute;
    top: max(12px, 5vh);
    left: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 20;
  `;

  // XYZ軸オーバーレイ（右上に固定）
  const { overlay: axisOverlay, svg: axisSvg } = buildAxisOverlay();

  viewerArea.appendChild(viewerEl);
  viewerArea.appendChild(leftSlots);
  viewerArea.appendChild(axisOverlay);
  container.appendChild(viewerArea);

  // ─── Bottom panel ──────────────────────────────────────
  const bottomPanel = document.createElement("div");
  bottomPanel.style.cssText = `
    flex-shrink: 0;
    background: #fff;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
    gap: 0;
  `;

  // ─── 商品情報行（商品名、サイズ選択、価格） ──
  const productInfoRow = document.createElement("div");
  productInfoRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 6px 12px 4px;
    padding-top: max(6px, env(safe-area-inset-top));
  `;

  // 左側：商品名とサイズ選択
  const leftInfo = document.createElement("div");
  leftInfo.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `;

  // 商品名
  const productNameEl = document.createElement("div");
  productNameEl.style.cssText = `
    font-size: 12px;
    font-weight: bold;
    color: #000;
    line-height: 1.2;
  `;
  productNameEl.textContent = options.productName || "商品名";
  leftInfo.appendChild(productNameEl);

  // サイズ選択バー
  const sizeRow = document.createElement("div");
  sizeRow.style.cssText = `
    display: flex;
    gap: 6px;
    align-items: center;
  `;
  // サイズボタンをバー形式で作成
  let currentSize = initialSize as string;
  availableSizes.forEach((size) => {
    const sizeBtn = document.createElement("button");
    sizeBtn.textContent = size as string;
    sizeBtn.style.cssText = `
      padding: 0;
      font-size: 12px;
      font-weight: ${size === currentSize ? 'bold' : 'normal'};
      color: ${size === currentSize ? '#000' : '#666'};
      background: transparent;
      border: none;
      border-bottom: ${size === currentSize ? '2px solid #000' : 'none'};
      cursor: pointer;
      transition: all 0.2s;
      line-height: 1.2;
    `;
    sizeBtn.addEventListener("click", () => {
      currentSize = size as string;
      // すべてのボタンのスタイルを更新
      sizeRow.querySelectorAll("button").forEach((btn) => {
        const btnSize = btn.textContent;
        btn.style.fontWeight = btnSize === currentSize ? 'bold' : 'normal';
        btn.style.color = btnSize === currentSize ? '#000' : '#666';
        btn.style.borderBottom = btnSize === currentSize ? '2px solid #000' : 'none';
      });
      onSizeChange?.(currentSize as ProductSize);
    });
    sizeRow.appendChild(sizeBtn);
  });
  leftInfo.appendChild(sizeRow);

  // 右側：価格
  const priceEl = document.createElement("div");
  priceEl.style.cssText = `
    font-size: 12px;
    font-weight: bold;
    color: #000;
    white-space: nowrap;
    line-height: 1.2;
  `;
  priceEl.textContent = "74,000 JPY";

  productInfoRow.appendChild(leftInfo);
  productInfoRow.appendChild(priceEl);
  bottomPanel.appendChild(productInfoRow);

  // 商品情報行の下に区切り線を追加
  const divider = document.createElement("div");
  divider.style.cssText = `
    height: 1px;
    background: #e5e7eb;
    margin: 0 12px;
  `;
  bottomPanel.appendChild(divider);

  // Thumbnails row
  const thumbsRow = document.createElement("div");
  thumbsRow.setAttribute("data-fitlook-preview-thumbs", "true");
  thumbsRow.style.cssText = `
    display: flex;
    flex-direction: row;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 4px 12px;
    align-items: center;
    min-height: 0;
  `;

  // Category tabs
  const catTabs = document.createElement("div");
  catTabs.setAttribute("data-fitlook-preview-cattabs", "true");
  catTabs.style.cssText = `
    display: flex;
    flex-direction: row;
    gap: 2px;
    padding: 4px 12px 6px;
    overflow-x: auto;
    flex-shrink: 0;
  `;

  bottomPanel.appendChild(thumbsRow);
  bottomPanel.appendChild(catTabs);
  container.appendChild(bottomPanel);

  // ─── State ────────────────────────────────────────────
  let currentCategory: string = OUTFIT_CATEGORIES[0];
  let currentOutfitData: OutfitAssetsData = outfitAssets || { categories: {} };
  let selectedAssetId: string | null = null;
  const activeAssets = new Map<string, { url: string; category: string; id?: string }>();

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

  // 身長バーはこの画面では不要（削除）

  // ─── XYZ軸コントロール ─────────────────────────────────
  const axisControls = createAxisControls(
    axisSvg,
    () => viewer?.getCameraRotation?.() ?? null
  );

  // 初期描画
  setTimeout(() => {
    renderAxis(axisSvg, () => viewer?.getCameraRotation?.() ?? null);
    axisControls.start();
  }, 500);

  // ─── Render helpers ────────────────────────────────────

  function renderLeftSlots() {
    // activeAssetsを共通関数用の形式に変換（アクティブな商品のみ表示）
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
    
    // アクティブな商品のみを表示（空のボタンは表示しない）
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
    thumbsRow.innerHTML = "";
    
    // 実際のアイテムを表示
    const items: OutfitAssetItem[] = currentOutfitData.categories[currentCategory] || [];
    
    if (items.length > 0) {
      // 実際のアイテムがある場合は、それらを表示
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
            activeAssets.set(item.category, { url: item.modelUrl, category: item.category, id: item.id });
          
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
    } else {
      // アイテムがない場合は、5つの空のプレースホルダーを表示（PREVIEW_SIZESに合わせて46px x 56px）
      for (let i = 0; i < 5; i++) {
        const placeholder = document.createElement("div");
        placeholder.style.cssText = `
          width: 46px;
          height: 56px;
          flex-shrink: 0;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
        `;
        thumbsRow.appendChild(placeholder);
      }
    }
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
      renderThumbsLocal();
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
      // すべてのサイズボタンのスタイルを更新
      sizeRow.querySelectorAll("button").forEach((btn) => {
        const btnSize = btn.textContent;
        btn.style.fontWeight = btnSize === currentSize ? 'bold' : 'normal';
        btn.style.color = btnSize === currentSize ? '#000' : '#666';
        btn.style.borderBottom = btnSize === currentSize ? '2px solid #000' : '2px solid transparent';
      });
    },
    updateProductName(name) {
      if (name && productNameEl) {
        productNameEl.textContent = name;
      }
    },
    toggleAsset(category, visible) {
      viewer?.toggleAsset?.(category, visible);
    },
    destroy() {
      axisControls.stop();
      try { viewer?.destroy(); } catch { /* ignore */ }
      try {
        Array.from(container.children).forEach((c) => { try { c.remove(); } catch { /* ignore */ } });
      } catch { /* ignore */ }
    },
  };
}

// buildHeightSlider は height-slider.ts からインポート
