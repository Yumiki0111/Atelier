/**
 * 共通UIコンポーネント
 * プレビューとウィジェットの両方で使用されるUI要素の生成関数
 */

import * as THREE from "three";
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
    cardWidth: number;
    cardHeight: number;
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
    cardSize: 44,
    imageSize: 36,
    fontSize: 10,
    borderRadius: 8,
  },
  catTabs: {
    padding: "3px 8px",
    fontSize: 9,
  },
  thumbs: {
    cardWidth: 46,
    cardHeight: 56,
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
    cardWidth: 62,
    cardHeight: 76,
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

  // カテゴリをOUTFIT_CATEGORIESの順序でソート
  const sortedCats = [...cats].sort((a, b) => {
    const indexA = OUTFIT_CATEGORIES.indexOf(a);
    const indexB = OUTFIT_CATEGORIES.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  sortedCats.forEach((cat) => {
    const isActive = cat === selectedCategory;
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.style.cssText = `
      padding: ${sizes.catTabs.padding};
      font-size: ${sizes.catTabs.fontSize}px;
      font-weight: ${isActive ? "bold" : "normal"};
      color: ${isActive ? "#fff" : "#666"};
      background: ${isActive ? "#000" : "transparent"};
      border: none;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      outline: none;
      transition: all 0.2s;
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
      width: ${sizes.thumbs.cardWidth}px;
      min-width: ${sizes.thumbs.cardWidth}px;
      height: ${sizes.thumbs.cardHeight}px;
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
      width: calc(100% - 8px);
      height: calc(100% - 8px);
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
      border: 2px solid ${isActive ? "#3b82f6" : "#fff"};
      border-radius: ${sizes.leftPanel.borderRadius}px;
      background: #fff;
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

// ─── Axis Overlay ─────────────────────────────────────────────────────────────

/**
 * XYZ軸オーバーレイのDOMを生成（右上固定）
 */
export function buildAxisOverlay(): { overlay: HTMLElement; svg: SVGSVGElement } {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-atelier-axis-overlay", "true");
  overlay.style.cssText = `
    position: absolute;
    top: max(12px, 5vh);
    right: 10px;
    width: 50px;
    height: 50px;
    z-index: 20;
    pointer-events: none;
    overflow: visible;
  `;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
  svg.setAttribute("width", "50");
  svg.setAttribute("height", "50");
  svg.setAttribute("viewBox", "-25 -25 50 50");
  svg.setAttribute("overflow", "visible");
  svg.style.cssText = "width: 100%; height: 100%;";
  overlay.appendChild(svg);

  return { overlay, svg };
}

type CameraRotationGetter = () => { quaternion: THREE.Quaternion; position: THREE.Vector3 } | null;

/**
 * SVG要素にXYZ軸を描画する（カメラ回転を反映）
 */
export function renderAxis(
  axisSvg: SVGSVGElement,
  getCameraRotation: CameraRotationGetter
): void {
  const cameraInfo = getCameraRotation();
  if (!cameraInfo) return;

  axisSvg.innerHTML = "";

  const quaternion = cameraInfo.quaternion;
  const invQuaternion = quaternion.clone().invert();

  const threeX = new THREE.Vector3(1, 0, 0);
  const threeY = new THREE.Vector3(0, 1, 0);
  const threeZ = new THREE.Vector3(0, 0, 1); // 前方（手前）方向

  threeX.applyQuaternion(invQuaternion);
  threeY.applyQuaternion(invQuaternion);
  threeZ.applyQuaternion(invQuaternion);

  // Blender座標系に変換（X=右、Y=前方（手前）、Z=上）
  const worldX = threeX;
  const worldY = threeZ; // 前方（手前）をY軸として表示
  const worldZ = threeY;

  const axisLength = 18;
  const originX = -5;
  const originY = 0;

  function makeLine(x2: number, y2: number, color: string): SVGLineElement {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(originX));
    line.setAttribute("y1", String(originY));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "2");
    return line;
  }

  function makeCircle(cx: number, cy: number, color: string): SVGCircleElement {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", color);
    return circle;
  }

  function makeText(x: number, y: number, label: string, color: string): SVGTextElement {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(x));
    text.setAttribute("y", String(y));
    text.setAttribute("fill", color);
    text.setAttribute("font-size", "10");
    text.setAttribute("font-weight", "bold");
    text.textContent = label;
    return text;
  }

  // X軸（赤）
  const xEndX = originX + worldX.x * axisLength;
  const xEndY = originY - worldX.y * axisLength;
  axisSvg.appendChild(makeLine(xEndX, xEndY, "#ff0000"));
  axisSvg.appendChild(makeCircle(xEndX, xEndY, "#ff0000"));
  axisSvg.appendChild(makeText(xEndX + 3, xEndY + 4, "X", "#ff0000"));

  // Y軸（オリーブグリーン）- 前方（短め）
  const yEndX = originX + worldY.x * axisLength * 0.7;
  const yEndY = originY - worldY.y * axisLength * 0.7;
  axisSvg.appendChild(makeLine(yEndX, yEndY, "#808000"));
  axisSvg.appendChild(makeCircle(yEndX, yEndY, "#808000"));
  axisSvg.appendChild(makeText(yEndX - 4, yEndY - 4, "Y", "#808000"));

  // Z軸（青）- 上方向
  const zEndX = originX + worldZ.x * axisLength;
  const zEndY = originY - worldZ.y * axisLength;
  axisSvg.appendChild(makeLine(zEndX, zEndY, "#0000ff"));
  axisSvg.appendChild(makeCircle(zEndX, zEndY, "#0000ff"));
  axisSvg.appendChild(makeText(zEndX - 4, zEndY - 4, "Z", "#0000ff"));

  // 原点
  const originCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  originCircle.setAttribute("cx", String(originX));
  originCircle.setAttribute("cy", String(originY));
  originCircle.setAttribute("r", "2");
  originCircle.setAttribute("fill", "#ffffff");
  axisSvg.appendChild(originCircle);
}

/**
 * 軸を定期更新するコントローラを返す（100ms間隔）
 */
export function createAxisControls(
  axisSvg: SVGSVGElement,
  getCameraRotation: CameraRotationGetter
): { start(): void; stop(): void } {
  let intervalId: number | null = null;

  function start() {
    if (intervalId !== null) return;
    intervalId = window.setInterval(() => renderAxis(axisSvg, getCameraRotation), 100);
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { start, stop };
}
