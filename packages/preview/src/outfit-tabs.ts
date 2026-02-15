/**
 * 着せ替えタブのUI要素
 */
import type { OutfitAssetItem, OutfitAssetsData } from "./types";

export interface OutfitTabsElements {
  outfitTabsContainer: HTMLElement;
  categorySelect: HTMLElement;
  /** アセットデータを更新する */
  updateAssets: (data: OutfitAssetsData) => void;
}

/**
 * 着せ替え用タブのUI要素を作成（カテゴリ別3Dアセット表示）
 */
export function createOutfitTabs(
  initialData?: OutfitAssetsData,
  onAssetSelect?: (asset: OutfitAssetItem) => void
): OutfitTabsElements {
  let currentData: OutfitAssetsData = initialData || { categories: {} };
  let currentCategory: string = "";
  let selectedAssetId: string | null = null;

  // コンテナ — flexの子要素として下部に固定（高さはコンテナの20%）
  const outfitTabsContainer = document.createElement("div");
  outfitTabsContainer.setAttribute("data-atelier-outfit-tabs", "true");
  outfitTabsContainer.style.cssText = `
    position: relative;
    width: 100%;
    background: white;
    border-top: 1px solid #e5e7eb;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 20%;
    max-height: 20%;
    flex-shrink: 0;
    z-index: 20;
    box-sizing: border-box;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  `;

  // カテゴリタブバー
  const categoryBar = document.createElement("div");
  categoryBar.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0;
    border-bottom: 1px solid #e5e7eb;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex-shrink: 0;
  `;

  // アセットリストエリア（横スクロール可能）
  const body = document.createElement("div");
  body.className = "atelier-outfit-tabs-body";
  body.style.cssText = `
    flex: 1;
    overflow-y: hidden;
    overflow-x: auto;
    padding: 4px 3%;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    position: relative;
    width: 100%;
    box-sizing: border-box;
  `;

  // スクロールバーを非表示
  if (!document.getElementById("atelier-outfit-tabs-scrollbar-style")) {
    const style = document.createElement("style");
    style.id = "atelier-outfit-tabs-scrollbar-style";
    style.textContent = `
      [data-atelier-outfit-tabs]::-webkit-scrollbar { display: none; }
      .atelier-outfit-tabs-body::-webkit-scrollbar { display: none; }
      .atelier-outfit-tabs-body { scrollbar-width: none; -ms-overflow-style: none; }
    `;
    document.head.appendChild(style);
  }

  // カテゴリ選択ボタン（右上に配置 - レガシー互換、実際はカテゴリバーを使用）
  const categorySelect = document.createElement("div");
  categorySelect.style.cssText = `display: none;`;

  /** カテゴリタブバーを構築 */
  function renderCategoryBar() {
    categoryBar.innerHTML = "";

    const categories = Object.keys(currentData.categories);
    if (categories.length === 0) {
      // カテゴリなし：メッセージを表示
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "アセットがありません";
      emptyMsg.style.cssText = `
        padding: 4px 10px;
        font-size: 11px;
        color: #9ca3af;
      `;
      categoryBar.appendChild(emptyMsg);
      return;
    }

    // デフォルトカテゴリを設定
    if (!currentCategory || !categories.includes(currentCategory)) {
      currentCategory = categories[0];
    }

    categories.forEach((cat) => {
      const tab = document.createElement("button");
      tab.textContent = cat;
      const isSelected = cat === currentCategory;
      tab.style.cssText = `
        padding: 4px 10px;
        font-size: 11px;
        font-weight: ${isSelected ? "700" : "500"};
        color: ${isSelected ? "#000" : "#6b7280"};
        background: transparent;
        border: none;
        border-bottom: 2px solid ${isSelected ? "#000" : "transparent"};
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
        flex-shrink: 0;
      `;

      tab.addEventListener("mouseenter", () => {
        if (cat !== currentCategory) {
          tab.style.color = "#374151";
          tab.style.borderBottomColor = "#d1d5db";
        }
      });
      tab.addEventListener("mouseleave", () => {
        if (cat !== currentCategory) {
          tab.style.color = "#6b7280";
          tab.style.borderBottomColor = "transparent";
        }
      });

      tab.addEventListener("click", () => {
        currentCategory = cat;
        renderCategoryBar();
        renderAssets();
      });

      categoryBar.appendChild(tab);
    });
  }

  /** アセットリストを構築 */
  function renderAssets() {
    body.innerHTML = "";

    const items = currentData.categories[currentCategory] || [];

    if (items.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "このカテゴリにアセットはありません";
      emptyMsg.style.cssText = `
        padding: 8px;
        font-size: 11px;
        color: #9ca3af;
        text-align: center;
        width: 100%;
      `;
      body.appendChild(emptyMsg);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      const isSelected = item.id === selectedAssetId;
      card.style.cssText = `
        width: 56px;
        min-width: 56px;
        height: 68px;
      background: white;
        border-radius: 6px;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
        flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      overflow: hidden;
        box-shadow: ${isSelected ? "0 0 0 2px #000, 0 2px 8px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0, 0, 0, 0.1)"};
        gap: 3px;
        padding: 3px;
    `;

      card.addEventListener("mouseenter", () => {
        if (!isSelected) {
          card.style.backgroundColor = "#f3f4f6";
          card.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
          card.style.transform = "translateY(-2px)";
        }
    });
      card.addEventListener("mouseleave", () => {
        if (!isSelected) {
          card.style.backgroundColor = "white";
          card.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
          card.style.transform = "translateY(0)";
        }
      });

      card.addEventListener("click", () => {
        selectedAssetId = item.id;
        onAssetSelect?.(item);
        renderAssets(); // 選択状態を更新
      });

      // サムネイル画像 or プレースホルダー
      const thumbSize = "40px";
      if (item.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = item.thumbnailUrl;
        img.alt = item.productName;
        img.style.cssText = `
          width: ${thumbSize};
          height: ${thumbSize};
          object-fit: cover;
          border-radius: 4px;
          background: #f3f4f6;
          flex-shrink: 0;
        `;
        img.onerror = () => {
          img.style.display = "none";
          const placeholder = document.createElement("div");
          placeholder.textContent = "3D";
          placeholder.style.cssText = `
            width: ${thumbSize};
            height: ${thumbSize};
    display: flex;
    align-items: center;
    justify-content: center;
            background: #f3f4f6;
            border-radius: 4px;
            font-size: 9px;
            color: #9ca3af;
            flex-shrink: 0;
  `;
          card.insertBefore(placeholder, card.firstChild);
        };
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.textContent = "3D";
        placeholder.style.cssText = `
          width: ${thumbSize};
          height: ${thumbSize};
      display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 9px;
          color: #9ca3af;
          flex-shrink: 0;
    `;
        card.appendChild(placeholder);
      }

      // 商品名ラベル
      const label = document.createElement("div");
      label.textContent = item.productName;
      label.title = item.productName;
      label.style.cssText = `
        font-size: 9px;
        color: #374151;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
        line-height: 1.2;
      `;
      card.appendChild(label);

      body.appendChild(card);
    });
  }

  /** アセットデータを更新 */
  function updateAssets(data: OutfitAssetsData) {
    currentData = data;
    selectedAssetId = null;
    renderCategoryBar();
    renderAssets();
  }

  // DOM構築
  outfitTabsContainer.appendChild(categoryBar);
  outfitTabsContainer.appendChild(body);

  // 初期レンダリング
  renderCategoryBar();
  renderAssets();

  return { outfitTabsContainer, categorySelect, updateAssets };
}
