import type { WidgetConfig } from "./types";
import { init3DViewer, buildHeightSlider, renderCatTabs, renderThumbs, renderLeftPanel, WIDGET_SIZES, OUTFIT_CATEGORIES } from "@atelier/preview";
import type { ViewerInstance, OutfitAssetItem, OutfitAssetsData } from "@atelier/preview";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { sendEvent, type WidgetParams } from "./widget-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveAsset {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  productName: string;
  category: string;
}

// ─── CSS injection ─────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById("atelier-bs-styles")) return;
  const s = document.createElement("style");
  s.id = "atelier-bs-styles";
  s.textContent = `
    @keyframes atelier-fade-in  { from{opacity:0} to{opacity:1} }
    @keyframes atelier-slide-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
    @keyframes atelier-spin     { to{transform:rotate(360deg)} }
    [data-atelier-modal] * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    [data-atelier-outfit-scroll]::-webkit-scrollbar,
    [data-atelier-left-panel]::-webkit-scrollbar  { display: none }
    [data-atelier-outfit-scroll],
    [data-atelier-left-panel]  { scrollbar-width: none; -ms-overflow-style: none }
  `;
  document.head.appendChild(s);
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function renderModalWithLoading(
  _shadowRoot: ShadowRoot,
  _params: WidgetParams
): { overlay: HTMLElement; contentArea: HTMLElement } {
  injectStyles();

  /* ── backdrop ── */
  const overlay = document.createElement("div");
  overlay.setAttribute("data-atelier-modal", "true");
  overlay.setAttribute("data-atelier-modal-overlay", "true");
  overlay.style.cssText = `
    position: fixed !important; inset: 0 !important;
    background: rgba(0,0,0,0.48) !important;
    z-index: 10000 !important;
    opacity: 0; animation: atelier-fade-in 0.22s ease-out forwards;
  `;

  /* ── bottom sheet ── */
  const sheet = document.createElement("div");
  sheet.setAttribute("data-atelier-sheet", "true");
  sheet.style.cssText = `
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 95%;
    background: #fff;
    border-radius: 16px 16px 0 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    transform: translateY(calc(100% - 20px));
    animation: atelier-slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  `;

  /* ── drag handle ── */
  const dragBar = buildDragBar();
  sheet.appendChild(dragBar);

  /* ── spinner ── */
  const contentArea = document.createElement("div");
  contentArea.setAttribute("data-atelier-content-area", "true");
  contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;";

  const spinWrap = document.createElement("div");
  spinWrap.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;";
  const spin = document.createElement("div");
  spin.style.cssText = `
    width:36px;height:36px;
    border:3px solid #f0f0f0;border-top-color:#333;
    border-radius:50%;
    animation:atelier-spin 0.8s linear infinite;
  `;
  spinWrap.appendChild(spin);
  contentArea.appendChild(spinWrap);

  sheet.appendChild(contentArea);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  
  /* ── deferred cleanup callback (filled in by updateModalWithConfig) ── */
  const cleanup = { fn: (): void => {} };

  setupDragToDismiss(dragBar, sheet, overlay, () => cleanup.fn());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      cleanup.fn();
      dismissSheet(sheet, overlay);
    }
  });

  /* expose cleanup holder so updateModalWithConfig can register viewer.destroy */
  (overlay as any).__atelierCleanup = cleanup;
  
  return { overlay, contentArea };
}

export function updateModalWithConfig(
  _shadowRoot: ShadowRoot,
  config: WidgetConfig,
  params: WidgetParams,
  overlay: HTMLElement,
  contentArea: HTMLElement
) {
  if (!overlay || !contentArea) return;
  injectStyles();

  contentArea.innerHTML = "";
  contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;";

  /* ── analytics ── */
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const eshopId = params.shopId || undefined;
  if (eshopId && eshopId !== "unknown") {
    const pid = params.productId || params.externalProductId || "";
    sendEvent({
      shopId: eshopId as string,
      productId: uuidRe.test(pid) ? pid : undefined,
      type: "widget_open",
    }).catch(() => {});
  }

  const apiBaseUrl = getApiBaseUrl() || "http://localhost:3000";
  const SIZES = ["S", "M", "L", "XL"];
  let currentSize: string = config.asset?.defaultSize || "M";

  const activeAssets = new Map<string, ActiveAsset>();
  let outfitData: OutfitAssetsData = { categories: {} };
  let currentCategory: string = OUTFIT_CATEGORIES[0];
  let selectedAssetId: string | null = null;

  // ─── Layout ────────────────────────────────────────────
  //   viewerArea (flex:1, position:relative)
  //     viewerEl           (absolute, inset:0)
  //     leftPanel overlay  (absolute, top-left)
  //     sliderOverlay      (absolute, bottom-right)
  //   bottomPanel
  //     sizeRow
  //     outfitPanel
  //       thumbsRow
  //       catTabs
  // ───────────────────────────────────────────────────────

  /* ── viewer area ── */
  const viewerArea = document.createElement("div");
  viewerArea.style.cssText = "flex:1;min-height:0;position:relative;overflow:hidden;";

  /* ── 3D viewer container ── */
  const viewerEl = document.createElement("div");
  viewerEl.style.cssText = "position:absolute;inset:0;";

  /* ── left panel (wearing asset slots – absolute overlay) ── */
  const leftPanel = document.createElement("div");
  leftPanel.setAttribute("data-atelier-left-panel", "true");
  leftPanel.style.cssText = `
    position: absolute; top: 12px; left: 10px;
    display: flex; flex-direction: column;
    align-items: center; gap: 8px;
    z-index: 20;
  `;

  /* ── height slider overlay (absolute, bottom-right) ── */
  const sliderPanel = document.createElement("div");
  sliderPanel.style.cssText = `
    position: absolute; bottom: 8px; right: 20px;
    width: 28px; height: 180px;
    display: flex; flex-direction: column; align-items: center;
    user-select: none; touch-action: none; z-index: 20;
  `;

  viewerArea.appendChild(viewerEl);
  viewerArea.appendChild(leftPanel);
  viewerArea.appendChild(sliderPanel);

  /* ── bottom panel ── */
  const bottomPanel = document.createElement("div");
  bottomPanel.style.cssText = "flex-shrink:0;background:#fff;";

  /* ── size row  ‹ M › ── */
  const sizeRow = document.createElement("div");
  sizeRow.style.cssText = `
    display: flex; align-items: center; justify-content: center;
    gap: 10px; padding: 4px 20px 4px;
  `;
  const prevBtn = makeArrowBtn("‹");
  const sizeLabel = document.createElement("div");
  sizeLabel.style.cssText = `
    min-width: 48px; padding: 6px 14px;
    text-align: center; font-size: 15px; font-weight: 700;
    color: #fff; background: #3b82f6;
    border-radius: 6px;
  `;
  sizeLabel.textContent = currentSize;
  const nextBtn = makeArrowBtn("›");

  prevBtn.addEventListener("click", () => {
    const i = SIZES.indexOf(currentSize);
    if (i > 0) { currentSize = SIZES[i - 1]; sizeLabel.textContent = currentSize; onSizeChange(currentSize); }
  });
  nextBtn.addEventListener("click", () => {
    const i = SIZES.indexOf(currentSize);
    if (i < SIZES.length - 1) { currentSize = SIZES[i + 1]; sizeLabel.textContent = currentSize; onSizeChange(currentSize); }
  });

  sizeRow.appendChild(prevBtn);
  sizeRow.appendChild(sizeLabel);
  sizeRow.appendChild(nextBtn);

  /* ── outfit panel ── */
  const outfitPanelEl = document.createElement("div");
  outfitPanelEl.style.cssText = "flex-shrink:0;display:flex;flex-direction:column;background:#fff;";

  /* outfit thumbnails (horizontal scroll) */
  const thumbsRow = document.createElement("div");
  thumbsRow.setAttribute("data-atelier-outfit-scroll", "true");
  thumbsRow.style.cssText = "display:flex;gap:8px;padding:4px 12px 4px;overflow-x:auto;overflow-y:hidden;";

  /* category tabs */
  const catTabs = document.createElement("div");
  catTabs.style.cssText = "display:flex;gap:4px;padding:4px 12px 8px;overflow-x:auto;";

  outfitPanelEl.appendChild(thumbsRow);
  outfitPanelEl.appendChild(catTabs);

  bottomPanel.appendChild(sizeRow);
  bottomPanel.appendChild(outfitPanelEl);

  /* ── assemble into contentArea ── */
  contentArea.appendChild(viewerArea);
  contentArea.appendChild(bottomPanel);
  
  // シート全体をドラッグできるようにする（ドラッグハンドルだけでなく、シート上部もドラッグ可能）
  // シートの上部60pxをドラッグエリアとして設定
  const dragArea = document.createElement("div");
  dragArea.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    z-index: 15;
    cursor: grab;
    touch-action: none;
    pointer-events: auto;
  `;
  viewerArea.appendChild(dragArea);
  
  // シート要素を取得（overlayの子要素から）
  const sheet = overlay.querySelector('[data-atelier-sheet]') as HTMLElement;
  if (sheet) {
    // ドラッグエリアでもドラッグを開始できるようにする
    setupDragToDismiss(dragArea, sheet, overlay, () => {
      const cleanup = (overlay as any).__atelierCleanup as { fn: () => void } | undefined;
      if (cleanup) cleanup.fn();
    });
  }

  // ─── Height slider ──────────────────────────────────────
  let heightValue = 170;
  const MIN_H = 160, MAX_H = 190;
  let viewer: ViewerInstance | null = null;

  buildHeightSlider(sliderPanel, MIN_H, MAX_H, heightValue, (h) => {
    heightValue = h;
    viewer?.updateHeight?.(h, 170);
  });

  // ─── 3D viewer ─────────────────────────────────────────
  const baseModelUrl = `${apiBaseUrl}/3d/Model.fbx`;
  viewer = init3DViewer(viewerEl as HTMLElement, {
    modelUrl: baseModelUrl,
    assets: [],
    apiBaseUrl,
    onLoad: () => {},
    onError: (err) => {
      if (isDevelopmentMode()) console.error("[Atelier Widget] 3D error:", err);
    },
  });

  /* register cleanup so drag-to-dismiss destroys viewer */
  const cleanup = (overlay as any).__atelierCleanup as { fn: () => void } | undefined;
  if (cleanup) cleanup.fn = () => { viewer?.destroy(); };

  // ─── Initial state ──────────────────────────────────────
  loadInitialAssets();
  fetchOutfitData();
  renderLeftPanelLocal();
  renderCatTabsLocal();
  renderThumbsLocal();

  // ─── Helpers ────────────────────────────────────────────

  function buildAssetList(size: string) {
    const arr = (config.asset?.sizes?.[size] || []) as Array<{ glbUrl?: string; modelUrl?: string; category?: string }>;
    return arr
      .map((a) => ({ url: a.modelUrl || a.glbUrl || "", category: a.category }))
      .filter((a) => a.url);
  }

  function loadInitialAssets() {
    activeAssets.clear();
    const list = buildAssetList(currentSize);
    list.forEach((a) => {
      if (a.category) {
        activeAssets.set(a.category, { id: a.category, url: a.url, thumbnailUrl: null, productName: "", category: a.category });
      }
    });
    viewer?.updateAssets(list);
  }

  function onSizeChange(size: string) {
    // 新しいサイズのアセットリストを取得
    const newSizeAssets = buildAssetList(size);
    const newSizeCategories = new Set(newSizeAssets.map(a => a.category).filter(Boolean));
    
    // 新しいサイズのアセットで更新するカテゴリーだけを更新
    // ユーザーが手動で選択した他のカテゴリーの商品は保持
    newSizeAssets.forEach((a) => {
      if (a.category) {
        activeAssets.set(a.category, { id: a.category, url: a.url, thumbnailUrl: null, productName: "", category: a.category });
      }
    });
    
    // 現在のactiveAssetsを全てviewerに反映（新しいサイズのアセット + ユーザーが選択した他のカテゴリー）
    const allAssets = Array.from(activeAssets.values()).map((a) => ({ url: a.url, category: a.category }));
    viewer?.updateAssets(allAssets);
    
    // 新しいサイズのアセットに含まれないカテゴリーのselectedAssetIdはクリアしない（保持）
    // ただし、新しいサイズのアセットに含まれるカテゴリーで、以前選択していたアセットが存在しない場合はクリア
    if (selectedAssetId) {
      const selectedItem = Object.values(outfitData.categories).flat().find(item => item.id === selectedAssetId);
      if (selectedItem && newSizeCategories.has(selectedItem.category)) {
        // 選択中のアセットが新しいサイズのカテゴリーに含まれる場合は、そのカテゴリーのアセットを確認
        const categoryItems = outfitData.categories[selectedItem.category] || [];
        const itemExists = categoryItems.some(item => item.id === selectedAssetId);
        if (!itemExists) {
          selectedAssetId = null;
        }
      }
    }
    
    renderLeftPanelLocal();
    renderThumbsLocal();
    fetchOutfitData();

    if (eshopId && eshopId !== "unknown") {
      const pid = params.productId || params.externalProductId || "";
      sendEvent({ shopId: eshopId as string, productId: uuidRe.test(pid) ? pid : undefined, type: "size_change", meta: { size } }).catch(() => {});
    }
  }

  function handleAssetSelect(item: OutfitAssetItem | null, category?: string) {
    if (!item && category) {
      activeAssets.delete(category);
      selectedAssetId = null;
    } else if (item) {
      activeAssets.set(item.category, {
        id: item.id, url: item.modelUrl,
        thumbnailUrl: item.thumbnailUrl, productName: item.productName, category: item.category,
      });
      selectedAssetId = item.id;
      currentCategory = item.category;

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

      if (eshopId && eshopId !== "unknown") {
        const pid = params.productId || params.externalProductId || "";
        sendEvent({
          shopId: eshopId as string, productId: uuidRe.test(pid) ? pid : undefined,
          type: "outfit_asset_select", meta: { assetId: item.id, category: item.category },
        }).catch(() => {});
      }
    }
    viewer?.updateAssets(Array.from(activeAssets.values()).map((a) => ({ url: a.url, category: a.category })));
    renderLeftPanelLocal();
    renderCatTabsLocal();
    renderThumbsLocal();
  }

  /* ── Left panel (wearing slots – absolute overlay) ── */
  function renderLeftPanelLocal() {
    // activeAssetsを共通関数用の形式に変換
    const assetsForRender = new Map<string, { url: string; category: string; thumbnailUrl?: string | null }>();
    activeAssets.forEach((asset, cat) => {
      assetsForRender.set(cat, {
        url: asset.url,
        category: cat,
        thumbnailUrl: asset.thumbnailUrl,
      });
    });
    
    renderLeftPanel(
      leftPanel,
      assetsForRender,
      outfitData,
      currentCategory,
      (cat: string) => {
        currentCategory = cat;
        renderLeftPanelLocal();
        renderCatTabsLocal();
        renderThumbsLocal();
      },
      WIDGET_SIZES
    );
  }

  /* ── Category tabs ── */
  function renderCatTabsLocal() {
    currentCategory = renderCatTabs(
      catTabs,
      outfitData,
      currentCategory,
      (cat: string) => {
        currentCategory = cat;
        renderCatTabsLocal();
        renderThumbsLocal();
        renderLeftPanelLocal();
      },
      WIDGET_SIZES
    );
  }

  /* ── Outfit thumbnails ── */
  function renderThumbsLocal() {
    const items: OutfitAssetItem[] = outfitData.categories[currentCategory] || [];
    
    renderThumbs(
      thumbsRow,
      items,
      currentCategory,
      selectedAssetId,
      activeAssets,
      (item: OutfitAssetItem | null, category: string) => {
        if (item === null) {
          handleAssetSelect(null, category);
        } else {
          handleAssetSelect(item);
        }
      },
      WIDGET_SIZES
    );
  }

  /* ── Fetch outfit data from API ── */
  async function fetchOutfitData() {
    try {
      const u = new URL(`${apiBaseUrl}/api/public/assets/by-shop`);
      if (params.publicKey) u.searchParams.set("publicKey", params.publicKey);
      if (currentSize) u.searchParams.set("size", currentSize);
      const excl = params.externalProductId || params.productId;
      if (excl) u.searchParams.set("excludeProductId", excl);
      const res = await fetch(u.toString());
      if (res.ok) {
        outfitData = (await res.json()) as OutfitAssetsData;
        renderThumbsLocal();
      }
    } catch (_) {
      // silent fail
    }
  }
}

export function showErrorInModal(
  _shadowRoot: ShadowRoot,
  errorMessage: string,
  overlay: HTMLElement,
  contentArea: HTMLElement
) {
  if (!overlay || !contentArea) return;
  contentArea.innerHTML = "";
  contentArea.style.cssText = `
    flex: 1; display: flex; flex-direction: column;
    overflow: hidden; align-items: center; justify-content: center;
    padding: 24px; text-align: center;
  `;
  const div = document.createElement("div");
  div.style.cssText = "color:#dc2626;font-size:15px;line-height:1.5;white-space:pre-line;";
  div.textContent = errorMessage;
  contentArea.appendChild(div);
}

// ─── UI component helpers ──────────────────────────────────────────────────────

function buildDragBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.setAttribute("data-atelier-drag-bar", "true");
  bar.style.cssText = `
    flex-shrink: 0;
    display: flex; justify-content: center;
    padding: 3px 0 2px; cursor: grab; touch-action: none;
  `;
  const pill = document.createElement("div");
  pill.style.cssText = "width:32px;height:3px;background:#d1d5db;border-radius:99px;";
  bar.appendChild(pill);
  return bar;
}

function makeArrowBtn(symbol: string): HTMLElement {
  const btn = document.createElement("button");
  btn.textContent = symbol;
  btn.style.cssText = `
    width: 32px; height: 32px;
    background: transparent; border: none; outline: none;
    cursor: pointer; font-size: 22px; color: #111;
    display: flex; align-items: center; justify-content: center;
    line-height: 1; padding: 0; border-radius: 50%;
    transition: background 0.15s;
  `;
  btn.addEventListener("mouseenter", () => { btn.style.background = "#f3f4f6"; });
  btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
  return btn;
}

// buildHeightSlider は @atelier/preview からインポート

// ─── Dismiss helpers ───────────────────────────────────────────────────────────

function dismissSheet(sheet: HTMLElement, overlay: HTMLElement) {
  sheet.style.animation = "none";
  sheet.style.transition = "transform 0.3s cubic-bezier(0.32,0.72,0,1)";
  // 閉じた状態でもドラッグハンドルが見えるように、少しだけ表示
  sheet.style.transform = "translateY(calc(100% - 20px))";
  overlay.style.animation = "none";
  overlay.style.transition = "opacity 0.3s ease-out";
  overlay.style.opacity = "0";
  // モーダルの開閉状態を更新
  if ((sheet as any).__atelierSetOpen) {
    (sheet as any).__atelierSetOpen(false);
  }
  // モーダルを削除せずに非表示にする（再度開けるようにするため）
  // setTimeout(() => overlay.remove(), 320);
}

function openSheet(sheet: HTMLElement, overlay: HTMLElement) {
  sheet.style.animation = "none";
  sheet.style.transition = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
  sheet.style.transform = "translateY(0)";
  overlay.style.animation = "none";
  overlay.style.transition = "opacity 0.22s ease-out";
  overlay.style.opacity = "1";
  // モーダルの開閉状態を更新
  if ((sheet as any).__atelierSetOpen) {
    (sheet as any).__atelierSetOpen(true);
  }
}

function setupDragToDismiss(
  handle: HTMLElement,
  sheet: HTMLElement,
  overlay: HTMLElement,
  onDismiss: () => void
) {
  let startY = 0, curY = 0, dragging = false;
  let isOpen = true; // モーダルの開閉状態を管理
  const sheetHeight = sheet.offsetHeight || parseInt(sheet.style.height) || window.innerHeight * 0.9;

  const onStart = (y: number) => {
    startY = curY = y;
    dragging = true;
    sheet.style.transition = "none";
    overlay.style.transition = "none";
  };
  
  const onMove = (y: number) => {
    if (!dragging) return;
    curY = y;
    const delta = y - startY;
    
    if (isOpen) {
      // 開いている状態：下にドラッグで閉じる
      const translateY = Math.max(0, delta);
      sheet.style.transform = `translateY(${translateY}px)`;
      // オーバーレイの透明度も調整
      const opacity = Math.max(0, 1 - translateY / sheetHeight);
      overlay.style.opacity = String(opacity);
    } else {
      // 閉じている状態：上にドラッグで開く
      const translateY = Math.min(0, delta);
      // 閉じた状態は translateY(calc(100% - 20px)) なので、そこから上に移動
      sheet.style.transform = `translateY(calc(100% - 20px + ${translateY}px))`;
      // オーバーレイの透明度も調整
      const opacity = Math.min(1, Math.abs(translateY) / sheetHeight);
      overlay.style.opacity = String(opacity);
    }
  };
  
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    const delta = curY - startY;
    const threshold = 90; // ドラッグの閾値
    
    sheet.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
    overlay.style.transition = "opacity 0.3s ease-out";
    
    if (isOpen) {
      // 開いている状態：下に十分ドラッグしたら閉じる
      if (delta > threshold) {
        isOpen = false;
        onDismiss();
        dismissSheet(sheet, overlay);
      } else {
        // 元の位置に戻す
        sheet.style.transform = "translateY(0)";
        overlay.style.opacity = "1";
      }
    } else {
      // 閉じている状態：上に十分ドラッグしたら開く
      if (delta < -threshold) {
        isOpen = true;
        openSheet(sheet, overlay);
      } else {
        // 元の位置（閉じた状態）に戻す（ドラッグハンドルが見えるように少し表示）
        sheet.style.transform = "translateY(calc(100% - 20px))";
        overlay.style.opacity = "0";
      }
    }
  };
  
  // モーダルの開閉状態を追跡（dismissSheet/openSheetから更新できるように）
  (sheet as any).__atelierIsOpen = () => isOpen;
  (sheet as any).__atelierSetOpen = (open: boolean) => { isOpen = open; };

  handle.addEventListener("mousedown", (e) => { 
    e.preventDefault(); 
    onStart(e.clientY); 
  });
  handle.addEventListener("touchstart", (e) => { 
    e.preventDefault();
    onStart(e.touches[0].clientY); 
  }, { passive: false });
  document.addEventListener("mousemove", (e) => { 
    if (dragging) { 
      e.preventDefault(); 
      onMove(e.clientY); 
    } 
  });
  document.addEventListener("touchmove", (e) => { 
    if (dragging) {
      e.preventDefault();
      onMove(e.touches[0].clientY); 
    }
  }, { passive: false });
  document.addEventListener("mouseup", onEnd);
  document.addEventListener("touchend", onEnd);
}
