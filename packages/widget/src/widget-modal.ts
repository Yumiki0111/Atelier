import type { WidgetConfig } from "./types";
import { init3DViewer, buildHeightSlider, renderCatTabs, renderThumbs, renderLeftPanel, buildAxisOverlay, renderAxis, createAxisControls, WIDGET_SIZES, OUTFIT_CATEGORIES } from "@atelier/preview";
import type { ViewerInstance, OutfitAssetItem, OutfitAssetsData } from "@atelier/preview";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";
import { sendEvent, type WidgetParams } from "./widget-api";
import { buildDragBar, makeArrowBtn, dismissSheet, openSheet, setupDragToDismiss } from "./widget-sheet";

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

  // 既存の閉じたモーダルを削除（蓄積防止）
  const existingOverlays = document.querySelectorAll<HTMLElement>("[data-atelier-modal-overlay='true']");
  existingOverlays.forEach((el) => {
    if (el.style.opacity === "0" || parseFloat(el.style.opacity) < 0.1) {
      el.remove();
    }
  });

  /* ── 全面ウィジェット（モーダルではなく） ── */
  const overlay = document.createElement("div");
  overlay.setAttribute("data-atelier-modal", "true");
  overlay.setAttribute("data-atelier-modal-overlay", "true");
  overlay.style.cssText = `
    position: fixed !important; inset: 0 !important;
    background: #fff !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    opacity: 0; animation: atelier-fade-in 0.22s ease-out forwards;
  `;

  /* ── spinner ── */
  const contentArea = document.createElement("div");
  contentArea.setAttribute("data-atelier-content-area", "true");
  contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;";

  const spinWrap = document.createElement("div");
  spinWrap.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;";
  const spin = document.createElement("img");
  spin.src = `${getApiBaseUrl()}/logo.png`;
  spin.alt = "";
  spin.style.cssText = `
    width:56px;height:56px;
    object-fit:contain;
    animation:atelier-spin 2s linear infinite;
  `;
  spinWrap.appendChild(spin);
  contentArea.appendChild(spinWrap);

  overlay.appendChild(contentArea);
  document.body.appendChild(overlay);
  
  /* ── deferred cleanup callback (filled in by updateModalWithConfig) ── */
  const cleanup = { fn: (): void => {} };

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
  contentArea.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;position:relative;";

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

  /* ── viewer area (画面上3/4, 白背景) ── */
  const viewerArea = document.createElement("div");
  viewerArea.style.cssText = `
    flex: 0 0 75%;
    min-height: 0;
    position: relative;
    overflow: hidden;
    background: #fff;
  `;

  /* ── 3D viewer container ── */
  const viewerEl = document.createElement("div");
  viewerEl.style.cssText = "position:absolute;inset:0;";

  /* ── 性別ボタンオーバーレイ（3Dモデルの上） ── */
  const genderOverlay = document.createElement("div");
  genderOverlay.style.cssText = `
    position:absolute;
    top:16px;
    left:50%;
    transform:translateX(-50%);
    display:flex;
    gap:8px;
    z-index:25;
    opacity:0;
    transition:opacity 0.3s ease-out;
  `;

  /* ── left panel (wearing asset slots – absolute overlay) ── */
  const leftPanel = document.createElement("div");
  leftPanel.setAttribute("data-atelier-left-panel", "true");
  leftPanel.style.cssText = `
    position: absolute; top: max(12px, 5vh); left: 10px;
    display: flex; flex-direction: column;
    align-items: center; gap: 8px;
    z-index: 20;
    opacity: 0;
    transition: opacity 0.3s ease-out;
  `;

  // XYZ軸オーバーレイ（右上に固定）
  const { overlay: axisOverlay, svg: axisSvg } = buildAxisOverlay();

  // 身長バーはこの画面では不要（削除）

  viewerArea.appendChild(viewerEl);
  // 性別ボタンはウィジェットでは非表示にする（将来の拡張用にDOMは保持しない）
  viewerArea.appendChild(leftPanel);
  viewerArea.appendChild(axisOverlay);

  /* ── bottom panel ── */
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
  productNameEl.textContent = config.asset?.productName || "商品名";
  leftInfo.appendChild(productNameEl);

  // サイズ選択バー
  const sizeRow = document.createElement("div");
  sizeRow.style.cssText = `
    display: flex;
    gap: 6px;
    align-items: center;
  `;

  // サイズボタンをバー形式で作成
  SIZES.forEach((size) => {
    const sizeBtn = document.createElement("button");
    sizeBtn.textContent = size;
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
      currentSize = size;
      // すべてのボタンのスタイルを更新
      sizeRow.querySelectorAll("button").forEach((btn) => {
        const btnSize = btn.textContent;
        btn.style.fontWeight = btnSize === currentSize ? 'bold' : 'normal';
        btn.style.color = btnSize === currentSize ? '#000' : '#666';
        btn.style.borderBottom = btnSize === currentSize ? '2px solid #000' : 'none';
      });
      onSizeChange(currentSize);
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
  priceEl.textContent = "74,000 JPY"; // TODO: priceをconfigから取得できるようにする

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

  /* outfit thumbnails (horizontal scroll) - 5つの空のプレースホルダー */
  const thumbsRow = document.createElement("div");
  thumbsRow.setAttribute("data-atelier-outfit-scroll", "true");
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

  // 5つの空のプレースホルダーを作成（WIDGET_SIZESに合わせて62px x 76px）
  for (let i = 0; i < 5; i++) {
    const placeholder = document.createElement("div");
    placeholder.style.cssText = `
      width: 62px;
      height: 76px;
      flex-shrink: 0;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    `;
    thumbsRow.appendChild(placeholder);
  }

  /* category tabs */
  const catTabs = document.createElement("div");
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

  /* ── step1: 初期モデル作成パネル ── */
  const setupPanel = document.createElement("div");
  setupPanel.style.cssText = `
    flex-shrink:0;
    padding:20px 20px 24px;
    display:flex;
    flex-direction:column;
    gap:20px;
    opacity:0;
    transition:opacity 0.3s ease-out;
    background:#fff;
  `;

  // 性別トグル
  let currentGender: "male" | "female" = "male";

  function makeGenderButton(label: string, value: "male" | "female"): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = `
      padding:10px 20px;
      font-size:15px;
      font-weight:700;
      border-radius:8px;
      border:${value === currentGender ? "none" : "1px solid #111"};
      cursor:pointer;
      background:${value === currentGender ? "#111" : "rgba(255,255,255,0.95)"};
      color:${value === currentGender ? "#fff" : "#111"};
      transition:background 0.15s,color 0.15s,border 0.15s;
      backdrop-filter:blur(4px);
      box-shadow:0 2px 8px rgba(0,0,0,0.1);
    `;
    btn.addEventListener("click", () => {
      currentGender = value;
      maleBtn.style.background = currentGender === "male" ? "#111" : "#fff";
      maleBtn.style.color = currentGender === "male" ? "#fff" : "#111";
      maleBtn.style.border = currentGender === "male" ? "none" : "1px solid #111";
      femaleBtn.style.background = currentGender === "female" ? "#111" : "#fff";
      femaleBtn.style.color = currentGender === "female" ? "#fff" : "#111";
      femaleBtn.style.border = currentGender === "female" ? "none" : "1px solid #111";
      // 将来的に男女別モデルに切り替える場合はここで viewer.updateModelUrl などを呼ぶ
    });
    return btn;
  }

  const maleBtn = makeGenderButton("男性", "male");
  const femaleBtn = makeGenderButton("女性", "female");
  genderOverlay.appendChild(maleBtn);
  genderOverlay.appendChild(femaleBtn);

  // ラベル付きスライダー
  function buildLabeledSlider(
    label: string,
    min: number,
    max: number,
    initial: number,
    step: number = 1
  ): { row: HTMLElement; input: HTMLInputElement; valueLabel: HTMLElement } {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-direction:column;gap:8px;width:100%;";

    const labelRow = document.createElement("div");
    labelRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#111;";
    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;
    labelSpan.style.cssText = "font-weight:500;";
    const valueSpan = document.createElement("span");
    valueSpan.textContent = String(initial);
    valueSpan.style.cssText = "font-weight:700;";
    labelRow.appendChild(labelSpan);
    labelRow.appendChild(valueSpan);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(initial);
    input.style.cssText = `
      width:100%;
      height:4px;
      border-radius:2px;
      background:#e5e7eb;
      outline:none;
      -webkit-appearance:none;
    `;
    
    // スライダーのスタイルをカスタマイズ（WebKit）
    const style = document.createElement("style");
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #111;
        cursor: pointer;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #111;
        cursor: pointer;
        border: none;
      }
    `;
    if (!document.getElementById("atelier-slider-styles")) {
      style.id = "atelier-slider-styles";
      document.head.appendChild(style);
    }

    row.appendChild(labelRow);
    row.appendChild(input);
    return { row, input, valueLabel: valueSpan };
  }

  const MIN_H = 160, MAX_H = 190;
  let setupHeightValue = 170;
  const heightSlider = buildLabeledSlider("身長", MIN_H, MAX_H, setupHeightValue, 1);

  let bodyValue = 0;
  const bodySlider = buildLabeledSlider("体型", 0, 100, 0, 1);

  // スライダーを縦に並べるコンテナ
  const slidersRow = document.createElement("div");
  slidersRow.style.cssText = "display:flex;flex-direction:column;gap:16px;width:100%;";
  slidersRow.appendChild(heightSlider.row);
  slidersRow.appendChild(bodySlider.row);

  const startBtn = document.createElement("button");
  startBtn.textContent = "試着を始める";
  startBtn.style.cssText = `
    margin-top:4px;
    width:100%;
    padding:14px 0;
    font-size:16px;
    font-weight:700;
    border-radius:999px;
    border:none;
    cursor:pointer;
    background:#000;
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:4px;
  `;
  
  // 右矢印アイコンを追加
  const arrowIcon = document.createElement("span");
  arrowIcon.textContent = "▶";
  arrowIcon.style.cssText = "font-size:12px;";
  startBtn.appendChild(arrowIcon);

  setupPanel.appendChild(slidersRow);
  setupPanel.appendChild(startBtn);

  // 「試着を始める」ボタンのイベントハンドラ
  startBtn.addEventListener("click", () => {
    enterTryOnStep();
  });

  /* ── assemble into contentArea ── */
  contentArea.appendChild(viewerArea);
  contentArea.appendChild(setupPanel);
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

  // モデルと服が完全に表示されるまでローディングオーバーレイを表示
  // contentArea に配置して viewerArea 全体を覆う（viewerArea のレイアウト変更の影響を受けない）
  const loadingOverlay = document.createElement("div");
  loadingOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    z-index: 30;
    pointer-events: none;
  `;
  const loadingLogoEl = document.createElement("img");
  loadingLogoEl.src = `${apiBaseUrl}/logo.png`;
  loadingLogoEl.alt = "";
  loadingLogoEl.style.cssText = `
    width: 56px;
    height: 56px;
    object-fit: contain;
    animation: atelier-spin 2s linear infinite;
    pointer-events: auto;
  `;
  loadingOverlay.appendChild(loadingLogoEl);
  // contentArea に追加（viewerArea のレイアウト変更の影響を受けない）
  contentArea.appendChild(loadingOverlay);

  // ─── Height / Body slider ───────────────────────────────
  let heightValue = 170;
  let viewer: ViewerInstance | null = null;
  let canAdjustBody = true; // 試着ステップ以降は身長・体型をロック

  // 身長バーはこの画面では不要（削除）

  // 初期ステップ側のスライダーと連動
  heightSlider.input.addEventListener("input", () => {
    if (!canAdjustBody) return;
    const v = parseInt(heightSlider.input.value, 10);
    setupHeightValue = isNaN(v) ? setupHeightValue : v;
    heightSlider.valueLabel.textContent = String(setupHeightValue);
    heightValue = setupHeightValue;
    viewer?.updateHeight?.(heightValue, 170);
  });

  bodySlider.input.addEventListener("input", () => {
    if (!canAdjustBody) return;
    const v = parseInt(bodySlider.input.value, 10);
    bodyValue = isNaN(v) ? bodyValue : v;
    bodySlider.valueLabel.textContent = String(bodyValue);
    const normalized = Math.max(0, Math.min(1, bodyValue / 100));
    // 体型用モーフターゲット（存在すれば適用される）
    viewer?.updateMorphTarget?.("body", normalized);
  });

  // ─── Helpers (defined early for use in init3DViewer) ────────────────────────────────────────────

  function buildAssetList(size: string) {
    const arr = (config.asset?.sizes?.[size] || []) as Array<{ glbUrl?: string; modelUrl?: string; category?: string }>;
    return arr
      .map((a) => ({ url: a.modelUrl || a.glbUrl || "", category: a.category }))
      .filter((a) => a.url);
  }

  // 初回は init3DViewer に assets を渡済みなので viewer.updateAssets を重複実行しない
  let initialAssetsLoaded = false;

  // ─── 3D viewer ─────────────────────────────────────────
  // プレビューと同じモデルを使用
  const baseModelUrl = `${apiBaseUrl}/3d/model_test.glb`;

  viewer = init3DViewer(viewerEl as HTMLElement, {
    modelUrl: baseModelUrl,
    assets: [],   // 初期ステップでは素体のみ（服は後で読み込む）
    apiBaseUrl,
    onLoad: () => {
      // ローディングオーバーレイをフェードアウト
      loadingOverlay.style.transition = "opacity 0.3s ease-out";
      loadingOverlay.style.opacity = "0";
      setTimeout(() => { if (loadingOverlay.parentNode) loadingOverlay.remove(); }, 300);
      
      // まずは初期モデル作成ステップを表示
      setupPanel.style.opacity = "1";
    },
    onError: (err) => {
      if (loadingOverlay.parentNode) loadingOverlay.remove();
      // エラー時も要素を表示
      leftPanel.style.opacity = "1";
      bottomPanel.style.opacity = "1";
      if (isDevelopmentMode()) console.error("[Atelier Widget] 3D error:", err);
    },
  });

  // ─── XYZ軸コントロール ─────────────────────────────────
  const axisControls = createAxisControls(
    axisSvg,
    () => viewer?.getCameraRotation?.() ?? null
  );

  /* register cleanup so drag-to-dismiss destroys viewer */
  const cleanup = (overlay as any).__atelierCleanup as { fn: () => void } | undefined;
  if (cleanup) cleanup.fn = () => {
    axisControls.stop();
    viewer?.destroy();
  };

  // 初期描画
  setTimeout(() => {
    renderAxis(axisSvg, () => viewer?.getCameraRotation?.() ?? null);
    axisControls.start();
  }, 500);

  // ─── Step2: 着せ替えUIへの遷移 ─────────────────────────────────
  let tryOnEntered = false;
  function enterTryOnStep() {
    if (tryOnEntered) return;
    tryOnEntered = true;

    // 初期ステップを隠し、着せ替えUIを表示
    setupPanel.style.display = "none";
    leftPanel.style.opacity = "1";
    bottomPanel.style.display = "flex";
    bottomPanel.style.opacity = "1";

    // 選択された身長・体型を反映
    heightValue = setupHeightValue;
    viewer?.updateHeight?.(heightValue, 170);
    const normalized = Math.max(0, Math.min(1, bodyValue / 100));
    viewer?.updateMorphTarget?.("body", normalized);

    // 試着ステップに入ったら身長・体型スライダーをロック
    canAdjustBody = false;
    heightSlider.input.disabled = true;
    bodySlider.input.disabled = true;
    
    // 身長バーはこの画面では不要（削除済み）

    // アセットを読み込む（初期ステップでは空配列で初期化したため、ここで初めて読み込む）
    initialAssetsLoaded = true; // フラグを立てて、loadInitialAssets内でupdateAssetsが呼ばれるようにする
    loadInitialAssets();
    fetchOutfitData();
    renderLeftPanelLocal();
    renderCatTabsLocal();
    renderThumbsLocal();
  }

  startBtn.addEventListener("click", () => {
    enterTryOnStep();
  });

  // ─── Helpers ────────────────────────────────────────────

  function loadInitialAssets() {
    activeAssets.clear();
    const list = buildAssetList(currentSize);
    list.forEach((a) => {
      if (a.category) {
        activeAssets.set(a.category, { id: a.category, url: a.url, thumbnailUrl: null, productName: "", category: a.category });
      }
    });
    if (initialAssetsLoaded) {
      viewer?.updateAssets(list);
    } else {
      // 初回: init3DViewer に渡し済みなので updateAssets はスキップ
      initialAssetsLoaded = true;
    }
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
    // activeAssetsを共通関数用の形式に変換（アクティブな商品のみ表示）
    const assetsForRender = new Map<string, { url: string; category: string; thumbnailUrl?: string | null }>();
    activeAssets.forEach((asset, cat) => {
      assetsForRender.set(cat, {
        url: asset.url,
        category: cat,
        thumbnailUrl: asset.thumbnailUrl,
      });
    });
    
    // アクティブな商品のみを表示（空のボタンは表示しない）
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
    thumbsRow.innerHTML = "";
    
    // 実際のアイテムを表示
    const items: OutfitAssetItem[] = outfitData.categories[currentCategory] || [];
    
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
            handleAssetSelect(null, category);
          } else {
            handleAssetSelect(item);
          }
        },
        WIDGET_SIZES
      );
    } else {
      // アイテムがない場合は、5つの空のプレースホルダーを表示（WIDGET_SIZESに合わせて62px x 76px）
      for (let i = 0; i < 5; i++) {
        const placeholder = document.createElement("div");
        placeholder.style.cssText = `
          width: ${WIDGET_SIZES.thumbs.cardWidth}px;
          height: ${WIDGET_SIZES.thumbs.cardHeight}px;
          flex-shrink: 0;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: ${WIDGET_SIZES.thumbs.borderRadius}px;
        `;
        thumbsRow.appendChild(placeholder);
      }
    }
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
        
        // 初期表示されている商品（activeAssets）を着せ替えパネルにも追加
        // excludeProductIdで除外されているため、手動で追加する必要がある
        const currentProductId = params.productId || params.externalProductId;
        if (currentProductId && config.asset) {
          const initialAssets = buildAssetList(currentSize);
          initialAssets.forEach((asset) => {
            if (asset.category && asset.url) {
              // 既にそのカテゴリーに存在するかチェック
              const categoryItems = outfitData.categories[asset.category] || [];
              const exists = categoryItems.some(item => item.modelUrl === asset.url);
              
              if (!exists && config.asset) {
                // OutfitAssetItem形式で追加
                const outfitItem: OutfitAssetItem = {
                  id: currentProductId, // 商品IDをIDとして使用
                  productId: currentProductId,
                  productName: config.asset.productName || "商品名",
                  modelUrl: asset.url,
                  thumbnailUrl: config.asset.thumbnailUrl || null,
                  category: asset.category,
                  size: currentSize,
                };
                
                if (!outfitData.categories[asset.category]) {
                  outfitData.categories[asset.category] = [];
                }
                // 先頭に追加（初期表示商品を最初に表示）
                outfitData.categories[asset.category].unshift(outfitItem);
              }
            }
          });
        }
        
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

// buildDragBar, makeArrowBtn, dismissSheet, openSheet, setupDragToDismiss は ./widget-sheet からインポート
