/**
 * 共通UIコンポーネント
 * プレビューとウィジェットの両方で使用されるUI要素の生成関数
 */

import type { OutfitAssetItem, OutfitAssetsData } from "./types";

export const OUTFIT_CATEGORIES: readonly string[] = ["トップス", "ボトムス", "ジャケット", "コート"];

/**
 * UIサイズ設定
 */
export interface UISizes {
  leftPanel: {
    cardSize: number;
    imageSize: number;
    fontSize: number;
    borderRadius: number;
  };
  catTabs: {
    padding: string;
    fontSize: number;
  };
  thumbs: {
    cardSize: number;
    imageSize: number;
    fontSize: number;
    borderRadius: number;
    emptyMessageFontSize: number;
    emptyMessagePadding: string;
  };
}

/**
 * デフォルトサイズ設定（プレビュー用）
 */
export const PREVIEW_SIZES: UISizes = {
  leftPanel: {
    cardSize: 30,
    imageSize: 24,
    fontSize: 8,
    borderRadius: 6,
  },
  catTabs: {
    padding: "3px 8px",
    fontSize: 9,
  },
  thumbs: {
    cardSize: 38,
    imageSize: 28,
    fontSize: 8,
    borderRadius: 7,
    emptyMessageFontSize: 11,
    emptyMessagePadding: "8px",
  },
};

/**
 * ウィジェット用サイズ設定
 */
export const WIDGET_SIZES: UISizes = {
  leftPanel: {
    cardSize: 44,
    imageSize: 36,
    fontSize: 10,
    borderRadius: 8,
  },
  catTabs: {
    padding: "6px 12px",
    fontSize: 12,
  },
  thumbs: {
    cardSize: 50,
    imageSize: 40,
    fontSize: 10,
    borderRadius: 8,
    emptyMessageFontSize: 13,
    emptyMessagePadding: "12px",
  },
};

/**
 * カテゴリタブをレンダリング
 */
export function renderCatTabs(
  container: HTMLElement,
  outfitData: OutfitAssetsData,
  currentCategory: string,
  onCategoryChange: (category: string) => void,
  sizes: UISizes
): string {
  container.innerHTML = "";
  const cats = Object.keys(outfitData.categories).length > 0
    ? Object.keys(outfitData.categories)
    : [...OUTFIT_CATEGORIES];

  let selectedCategory = currentCategory;
  if (!cats.includes(selectedCategory)) {
    selectedCategory = cats[0] || OUTFIT_CATEGORIES[0];
  }

  cats.forEach((cat) => {
    const isActive = cat === selectedCategory;
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.style.cssText = `
      padding: ${sizes.catTabs.padding};
      font-size: ${sizes.catTabs.fontSize}px;
      font-weight: ${isActive ? "700" : "500"};
      color: ${isActive ? "#fff" : "#374151"};
      background: ${isActive ? "#111" : "transparent"};
      border: none; border-radius: 99px;
      cursor: pointer; white-space: nowrap;
      flex-shrink: 0; outline: none;
      transition: background 0.15s, color 0.15s;
    `;
    btn.addEventListener("click", () => {
      onCategoryChange(cat);
    });
    container.appendChild(btn);
  });

  return selectedCategory;
}

/**
 * サムネイルをレンダリング
 */
export function renderThumbs(
  container: HTMLElement,
  items: OutfitAssetItem[],
  currentCategory: string,
  selectedAssetId: string | null,
  activeAssets: Map<string, { url: string; category: string; id?: string }>,
  onItemClick: (item: OutfitAssetItem | null, category: string) => void,
  sizes: UISizes
) {
  container.innerHTML = "";

  if (items.length === 0) {
    const msg = document.createElement("div");
    msg.textContent = "アイテムがありません";
    msg.style.cssText = `
      font-size: ${sizes.thumbs.emptyMessageFontSize}px;
      color: #9ca3af;
      padding: ${sizes.thumbs.emptyMessagePadding};
      align-self: center;
    `;
    container.appendChild(msg);
    return;
  }

  items.forEach((item) => {
    const isSelected = item.id === selectedAssetId && 
      (activeAssets.get(item.category)?.id === item.id || 
       activeAssets.get(item.category)?.url === item.modelUrl);
    
    const card = document.createElement("div");
    card.style.cssText = `
      width: ${sizes.thumbs.cardSize}px;
      min-width: ${sizes.thumbs.cardSize}px;
      height: ${sizes.thumbs.cardSize}px;
      border-radius: ${sizes.thumbs.borderRadius}px;
      background: #fff;
      border: 2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"};
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; overflow: hidden;
      flex-shrink: 0; box-sizing: border-box;
      transition: border-color 0.15s;
    `;

    const imgWrap = document.createElement("div");
    imgWrap.style.cssText = `
      width: ${sizes.thumbs.imageSize}px;
      height: ${sizes.thumbs.imageSize}px;
      flex-shrink: 0;
      border-radius: ${sizes.thumbs.borderRadius === 8 ? 4 : 3}px;
      background: #f3f4f6;
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      font-size: ${sizes.thumbs.fontSize}px;
      color: #9ca3af;
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
        onItemClick(null, item.category);
      } else {
        onItemClick(item, item.category);
      }
    });
    container.appendChild(card);
  });
}

/**
 * 左パネル（選択中の商品スロット）をレンダリング
 */
export function renderLeftPanel(
  container: HTMLElement,
  activeAssets: Map<string, { url: string; category: string; thumbnailUrl?: string | null }>,
  outfitData: OutfitAssetsData,
  currentCategory: string,
  onCategoryClick: (category: string) => void,
  sizes: UISizes
) {
  container.innerHTML = "";
  
  activeAssets.forEach((asset, cat) => {
    const isActive = cat === currentCategory;
    
    // サムネイルURLを取得（outfitDataから該当するアイテムを探す）
    const items = outfitData.categories[cat] || [];
    const item = items.find((i) => i.modelUrl === asset.url);
    const thumbnailUrl = item?.thumbnailUrl || asset.thumbnailUrl;

    const card = document.createElement("div");
    card.style.cssText = `
      width: ${sizes.leftPanel.cardSize}px;
      height: ${sizes.leftPanel.cardSize}px;
      flex-shrink: 0;
      border: 2px solid ${isActive ? "#3b82f6" : "#e5e7eb"};
      border-radius: ${sizes.leftPanel.borderRadius}px;
      background: rgba(249,250,251,0.9);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; overflow: hidden; box-sizing: border-box;
    `;

    const imgWrap = document.createElement("div");
    imgWrap.style.cssText = `
      width: ${sizes.leftPanel.imageSize}px;
      height: ${sizes.leftPanel.imageSize}px;
      flex-shrink: 0;
      border-radius: ${sizes.leftPanel.borderRadius === 8 ? 4 : 3}px;
      background: #f3f4f6;
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      font-size: ${sizes.leftPanel.fontSize}px;
      color: #9ca3af;
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
      onCategoryClick(cat);
    });
    container.appendChild(card);
  });
}
