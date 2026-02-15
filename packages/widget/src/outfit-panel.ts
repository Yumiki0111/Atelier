import { fetchWidgetConfig, type WidgetParams } from "./widget-api";
import type { WidgetConfig } from "./types";
import { isDevelopmentMode, getApiBaseUrl } from "./widget-utils";

interface CategoryProduct {
  id: string;
  externalProductId?: string;
  name: string;
  thumbnailUrl?: string;
  category?: string;
}

/** 商品選択時のコールバック */
export interface OutfitChangeCallbacks {
  /** 商品が選択されたときに呼ばれる（config取得済み） */
  onProductSelect?: (product: CategoryProduct, config: WidgetConfig) => void;
}

// 画像キャッシュ
const imageCache = new Map<string, HTMLImageElement>();

// キャッシュから画像を取得、なければ読み込む
async function loadCachedImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// 着せ替えパネルを表示（3Dビューアーの下に表示）
export async function showOutfitChangePanel(
  container: HTMLElement,
  params: WidgetParams,
  callbacks?: OutfitChangeCallbacks
) {
  if (isDevelopmentMode()) {
    console.log("[Atelier Widget] showOutfitChangePanel called", params);
  }
  
  const currentProductId = params.productId || params.externalProductId || "";
  const publicKey = params.publicKey || "";
  const shopId = params.shopId || "";
  
  if (!publicKey && !shopId) {
    console.error("[Atelier Widget] publicKey or shopId is required for outfit change panel");
    if (isDevelopmentMode()) {
      alert("着せ替えパネルを開くには、publicKeyまたはshopIdが必要です");
    }
    return;
  }
  
  // 3Dビューアーコンテナを取得（パネルと同期して縮小するため）
  const viewerContainer = container.querySelector('[data-atelier-viewer-container]') as HTMLElement || 
                          container.querySelector('div[style*="flex: 1"]') as HTMLElement ||
                          container.firstElementChild as HTMLElement;
  
  // サイズボタンとフローティングボタンを取得
  const sizeArea = container.querySelector('[data-atelier-size-area]') as HTMLElement;
  // floatingButtonsはoverlayの子要素として追加されているため、overlayから取得を試みる
  // なければdocument.bodyから取得（後方互換性）
  const overlay = document.querySelector('[data-atelier-modal-overlay="true"]') as HTMLElement;
  const floatingButtons = overlay?.querySelector('[data-atelier-floating-buttons]') as HTMLElement ||
                          document.body.querySelector('[data-atelier-floating-buttons]') as HTMLElement;
  
  /** パネルを閉じる共通処理 */
  const closePanel = (targetPanel: HTMLElement, animationFrameIdRef?: { current: number | null }) => {
    const closeTransition = "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.6s ease-out";
    targetPanel.style.transition = closeTransition;
    targetPanel.style.transform = "translateY(100%)";
    targetPanel.style.opacity = "0";

    if (viewerContainer) {
      viewerContainer.style.transition = "max-height 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)";
      const containerRect = container.getBoundingClientRect();
      viewerContainer.style.maxHeight = `${containerRect.height}px`;
    }

    // サイズボタンとフローティングボタンを再表示
    if (sizeArea) {
      sizeArea.style.display = "flex";
    }
    const currentOverlay = document.querySelector('[data-atelier-modal-overlay="true"]') as HTMLElement;
    if (floatingButtons && currentOverlay?.isConnected) {
      floatingButtons.style.display = "flex";
    }

    setTimeout(() => {
      if (animationFrameIdRef?.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      targetPanel.remove();
      if (viewerContainer) {
        viewerContainer.style.transition = "";
        viewerContainer.style.maxHeight = "";
      }
    }, 600);
  };

  // 既存のパネルがあれば閉じてリスナーも解除
  const existingPanel = container.querySelector("#atelier-outfit-change-panel");
  if (existingPanel) {
    closePanel(existingPanel as HTMLElement);
    return;
  }
  
  // パネルを作成（画面の約50%の高さ）
  const panel = document.createElement("div");
  panel.id = "atelier-outfit-change-panel";
  panel.style.cssText = `
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    background: white !important;
    border-top: 1px solid #e5e7eb !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    max-height: 50vh !important;
    height: 50vh !important;
    transform: translateY(100%) !important;
    opacity: 0 !important;
    transition: transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.5s ease-in-out !important;
    will-change: transform, opacity !important;
    z-index: 10 !important;
  `;
  
  // ドラッグハンドル
  const handle = document.createElement("div");
  handle.style.cssText = `
    width: 40px !important;
    height: 4px !important;
    background: #d1d5db !important;
    border-radius: 2px !important;
    margin: 12px auto 0 !important;
    cursor: grab !important;
    flex-shrink: 0 !important;
  `;
  panel.appendChild(handle);
  
  // 商品リストエリア
  const body = document.createElement("div");
  body.className = "atelier-outfit-change-panel-body";
  body.style.cssText = `
    flex: 1 !important;
    overflow-y: auto !important;
    padding: 0 20px 20px !important;
  `;
  
  // ローディング表示
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = `
    text-align: center !important;
    padding: 40px !important;
    color: #6b7280 !important;
    font-size: 14px !important;
  `;
  loadingDiv.textContent = "読み込み中...";
  body.appendChild(loadingDiv);
  panel.appendChild(body);
  
  // コンテナに追加（sizeAreaの後）
  container.appendChild(panel);
  
  // サイズボタンとフローティングボタンを非表示
  if (sizeArea) {
    sizeArea.style.display = "none";
  }
  if (floatingButtons) {
    floatingButtons.style.display = "none";
  }
  
  // 3Dビューアーとパネルを連結させる関数
  // パネルの位置（translateY）に基づいて3Dビューアーのmax-heightを調整
  const updateViewerHeight = () => {
    if (!viewerContainer) return;
    
    const panelRect = panel.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const panelHeight = panel.offsetHeight; // 66.67vh相当
    const containerHeight = containerRect.height;
    
    // パネルの現在位置を計算（コンテナの下端からの距離）
    const panelTop = panelRect.top;
    const containerBottom = containerRect.bottom;
    const panelTopWhenHidden = containerBottom; // パネルが完全に下にある時の位置
    const panelTopWhenVisible = containerBottom - panelHeight; // パネルが表示されている時の位置
    
    // 進捗を計算（0 = 完全に下, 1 = 完全に表示）
    const distance = panelTopWhenHidden - panelTop;
    const totalDistance = panelTopWhenHidden - panelTopWhenVisible;
    const progress = Math.max(0, Math.min(1, distance / totalDistance));
    
    // パネルが上に上がってくる分だけ、3Dビューアーのmax-heightを減らす
    // パネルが完全に下（progress = 0）の時: 3Dビューアーは全高さ
    // パネルが完全に表示（progress = 1）の時: 3Dビューアーは高さからパネル分を引いた高さ
    const panelVisibleHeight = panelHeight * progress;
    const viewerMaxHeight = containerHeight - panelVisibleHeight;
    
    // 3Dビューアーのmax-heightを設定（flex: 1は維持）
    viewerContainer.style.maxHeight = `${viewerMaxHeight}px`;
  };
  
  // 3Dビューアーの初期設定
  if (viewerContainer) {
    viewerContainer.style.transition = "max-height 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)";
    // 初期max-heightを設定（パネルが完全に下にある状態）
    const containerRect = container.getBoundingClientRect();
    viewerContainer.style.maxHeight = `${containerRect.height}px`;
    // flex: 1は維持（flexboxレイアウトを保持）
  }
  
  // パネルの位置変化を監視して3Dビューアーを連動させる
  const animationFrameIdRef = { current: null as number | null };
  let lastPanelTop = -1;
  const observePanelPosition = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    const checkPosition = () => {
      const panelRect = panel.getBoundingClientRect();
      const currentPanelTop = panelRect.top;

      if (Math.abs(currentPanelTop - lastPanelTop) > 0.1) {
        lastPanelTop = currentPanelTop;
        updateViewerHeight();
      }

      const computedStyle = window.getComputedStyle(panel);
      const hasTransition = computedStyle.transition !== "none" && computedStyle.transition !== "all 0s ease 0s";
      if (hasTransition || panel.style.transition !== "none") {
        animationFrameIdRef.current = requestAnimationFrame(checkPosition);
      }
    };
    animationFrameIdRef.current = requestAnimationFrame(checkPosition);
  };
  
  // スムーズに表示（次のフレームでアニメーション開始）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.transform = "translateY(0)";
      panel.style.opacity = "1";
      
      // パネルの位置変化を監視開始
      observePanelPosition();
    });
  });
  
  // 商品データを取得して表示
  try {
    const apiUrl = getApiBaseUrl() || "http://localhost:3000";
    const searchParams = new URLSearchParams();
    if (publicKey) {
      searchParams.append("publicKey", publicKey);
    } else if (shopId) {
      throw new Error("publicKey is required. shopId only is not supported for security reasons.");
    } else {
      throw new Error("publicKey or shopId is required");
    }
    
    const response = await fetch(`${apiUrl}/api/public/products?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const products: CategoryProduct[] = await response.json();
    
    // 現在の商品を除外してカテゴリ別に分類
    const categorized: { [key: string]: CategoryProduct[] } = {};
    products.forEach((product) => {
      const isCurrentProduct = 
        product.id === currentProductId || 
        product.externalProductId === currentProductId;
      
      if (!isCurrentProduct) {
        // カテゴリが空文字列やnullの場合は「その他」に分類
        const category = (product.category && product.category.trim() !== "") 
          ? product.category 
          : "その他";
        if (!categorized[category]) {
          categorized[category] = [];
        }
        categorized[category].push(product);
      }
    });
    
    // ローディングを削除して商品リストを表示
    body.innerHTML = "";
    
    if (Object.keys(categorized).length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.cssText = `
        text-align: center !important;
        padding: 40px !important;
        color: #6b7280 !important;
        font-size: 14px !important;
      `;
      emptyDiv.textContent = "商品が見つかりませんでした";
      body.appendChild(emptyDiv);
    } else {
      // Webkit系ブラウザ用のスクロールバースタイル（一度だけ追加）
      if (!document.getElementById('atelier-outfit-panel-scrollbar-style')) {
        const style = document.createElement("style");
        style.id = 'atelier-outfit-panel-scrollbar-style';
        style.textContent = `
          #atelier-outfit-change-panel .atelier-outfit-change-panel-body div::-webkit-scrollbar {
            height: 4px !important;
          }
          #atelier-outfit-change-panel .atelier-outfit-change-panel-body div::-webkit-scrollbar-track {
            background: transparent !important;
          }
          #atelier-outfit-change-panel .atelier-outfit-change-panel-body div::-webkit-scrollbar-thumb {
            background: #d1d5db !important;
            border-radius: 2px !important;
          }
        `;
        document.head.appendChild(style);
      }
      
      // カテゴリごとに商品を表示（順次処理でパフォーマンス向上）
      for (const [categoryName, categoryProducts] of Object.entries(categorized)) {
        // カテゴリタイトル
        const categoryTitle = document.createElement("h4");
        categoryTitle.style.cssText = `
          font-size: 18px !important;
          font-weight: 600 !important;
          margin-bottom: 12px !important;
          margin-top: 0 !important;
          color: #1f2937 !important;
        `;
        categoryTitle.textContent = categoryName;
        body.appendChild(categoryTitle);
        
        // 商品グリッド（横スクロール可能）
        const productList = document.createElement("div");
        productList.style.cssText = `
          display: flex !important;
          gap: 12px !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding-bottom: 8px !important;
          margin-bottom: 24px !important;
          scrollbar-width: thin !important;
          scrollbar-color: #d1d5db transparent !important;
        `;
        
        // 画像を並列で読み込む
        const productPromises = categoryProducts.map(async (product) => {
          const productItem = document.createElement("div");
          productItem.style.cssText = `
            cursor: pointer !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 8px !important;
            border-radius: 8px !important;
            transition: background-color 0.2s !important;
            flex-shrink: 0 !important;
            min-width: 100px !important;
          `;
          
          productItem.addEventListener("mouseenter", () => {
            productItem.style.backgroundColor = "#f3f4f6";
          });
          productItem.addEventListener("mouseleave", () => {
            productItem.style.backgroundColor = "transparent";
          });
          
          productItem.addEventListener("click", async () => {
            // コールバックがある場合はウィジェット内で着せ替え
            if (callbacks?.onProductSelect) {
              // ローディング状態を表示
              productItem.style.opacity = "0.5";
              productItem.style.pointerEvents = "none";

              try {
                const externalProductId = product.externalProductId || product.id;
                // 選択された商品のwidget configを取得
                const config = await fetchWidgetConfig({
                  publicKey: publicKey || null,
                  shopId: shopId || null,
                  externalProductId,
                  productId: null,
                });

                if (config.enabled) {
                  // コールバックで着せ替え実行
                  callbacks.onProductSelect(product, config);
                  // パネルを閉じる
                  removeDocumentListeners();
                  closePanel(panel, animationFrameIdRef);
                  observePanelPosition();
                } else {
                  alert("この商品の3Dモデルが登録されていません。");
                  productItem.style.opacity = "1";
                  productItem.style.pointerEvents = "auto";
                }
              } catch (error) {
                console.error("[Atelier Widget] Failed to fetch product config:", error);
                alert("商品データの取得に失敗しました。");
                productItem.style.opacity = "1";
                productItem.style.pointerEvents = "auto";
              }
            } else {
              // コールバックがない場合は従来のページ遷移
            const productId = product.externalProductId || product.id;
            const currentUrl = new URL(window.location.href);
            currentUrl.pathname = `/product/${productId}`;
            window.location.href = currentUrl.toString();
            }
          });
          
          // 商品画像
          const productImage = document.createElement("div");
          productImage.style.cssText = `
            width: 100px !important;
            height: 100px !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            background: #f3f4f6 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
          `;
          
          // プレースホルダー
          const placeholder = document.createElement("div");
          placeholder.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          `;
          productImage.appendChild(placeholder);
          
          if (product.thumbnailUrl) {
            // キャッシュから画像を取得（既に読み込まれている場合は即座に表示）
            if (imageCache.has(product.thumbnailUrl)) {
              const cachedImg = imageCache.get(product.thumbnailUrl)!;
              // cloneNodeではなく、新しいimg要素を作成してキャッシュされたsrcを使用
              const img = document.createElement("img");
              img.src = cachedImg.src; // キャッシュされた画像のsrcを直接使用
              img.alt = product.name;
              img.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
              `;
              // 既に読み込まれているので即座に表示
              placeholder.remove();
              productImage.appendChild(img);
            } else {
              // キャッシュにない場合は非同期で読み込む
              loadCachedImage(product.thumbnailUrl)
                .then((cachedImg) => {
                  const img = document.createElement("img");
                  img.src = cachedImg.src; // キャッシュされた画像のsrcを直接使用
                  img.alt = product.name;
                  img.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                  `;
                  img.onload = () => {
                    placeholder.remove();
                  };
                  productImage.appendChild(img);
                })
                .catch((error) => {
                  console.warn("[Atelier Widget] Failed to load product image:", product.thumbnailUrl);
                });
            }
          }
          
          productItem.appendChild(productImage);
          
          // 商品名
          const productTitle = document.createElement("div");
          productTitle.style.cssText = `
            font-size: 12px !important;
            text-align: center !important;
            color: #374151 !important;
            font-weight: 500 !important;
            line-height: 1.4 !important;
            width: 100px !important;
          `;
          productTitle.textContent = product.name;
          productItem.appendChild(productTitle);
          
          return productItem;
        });
        
        // 並列で読み込むが、完了を待たずに順次追加（パフォーマンス向上）
        productPromises.forEach(async (promise) => {
          const productItem = await promise;
          productList.appendChild(productItem);
        });
        
        body.appendChild(productList);
      }
    }
  } catch (error) {
    // エラー表示
    body.innerHTML = "";
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      text-align: center !important;
      padding: 40px !important;
      color: #dc2626 !important;
      font-size: 14px !important;
    `;
    const errorMessage = error instanceof Error ? error.message : "商品の読み込みに失敗しました";
    errorDiv.textContent = errorMessage;
    body.appendChild(errorDiv);
    
    console.error("[Atelier Widget] Failed to load products:", error);
    if (isDevelopmentMode()) {
      alert("着せ替えパネルのエラー: " + errorMessage);
    }
  }
  
  // スワイプで閉じる機能
  let dragStartY = 0;
  let dragCurrentY = 0;
  let isDragging = false;

  /** documentレベルのイベントリスナーを解除する */
  const removeDocumentListeners = () => {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
  
  const handleStart = (clientY: number) => {
    dragStartY = clientY;
    dragCurrentY = clientY;
    isDragging = true;
    panel.style.transition = "none";
    // ドラッグ開始時もトランジションを無効化
    if (viewerContainer) {
      viewerContainer.style.transition = "none";
    }
  };
  
  const handleMove = (clientY: number) => {
    if (!isDragging) return;
    dragCurrentY = clientY;
    const deltaY = dragCurrentY - dragStartY;
    if (deltaY > 0) {
      // パネルを下に移動
      panel.style.transform = `translateY(${deltaY}px)`;
      
      // 3Dビューアーも連動してmax-heightを調整（パネルの位置に基づいて動的に計算）
      if (viewerContainer) {
        viewerContainer.style.transition = "none"; // ドラッグ中はトランジション無効
        updateViewerHeight(); // パネルの位置に基づいてmax-heightを更新
      }
    }
  };
  
  const handleEnd = () => {
    if (!isDragging) return;
    const deltaY = dragCurrentY - dragStartY;
    const threshold = 100;

    if (deltaY > threshold) {
      // 閉じる（リスナーも解除）
      removeDocumentListeners();
      closePanel(panel, animationFrameIdRef);
      observePanelPosition();
    } else {
      // 元に戻す
      panel.style.transition = "transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.5s ease-in-out";
      panel.style.transform = "translateY(0)";
      panel.style.opacity = "1";

      if (viewerContainer) {
        viewerContainer.style.transition = "max-height 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)";
      }
      observePanelPosition();
    }
    isDragging = false;
  };
  
  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (body.contains(target) && body.scrollTop > 0) return;
    handleStart(e.touches[0].clientY);
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    if (body.scrollTop > 0) return;
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => handleEnd();
  
  const handleMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (body.contains(target) && body.scrollTop > 0) return;
    handleStart(e.clientY);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    if (body.scrollTop > 0) return;
    e.preventDefault();
    handleMove(e.clientY);
  };

  const handleMouseUp = () => handleEnd();
  
  panel.addEventListener("touchstart", handleTouchStart, { passive: false });
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", handleTouchEnd);
  panel.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  
  // ハンドルをクリックしても閉じる
  handle.addEventListener("click", () => {
    removeDocumentListeners();
    closePanel(panel, animationFrameIdRef);
    observePanelPosition();
  });
}
