import type { PreviewPanelOptions, PreviewPanelInstance } from "./types";
import type { ProductSize } from "@atelier/shared";
import { init3DViewer } from "./viewer";
import { createSizeArea, createViewerContainer, createMessageArea } from "./ui-elements";

/**
 * 背景画像のURLを取得する
 * 開発環境と本番環境で異なるパスを返す
 */
function getBackgroundImageUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  
  // 開発環境では、consoleサーバーのpublicフォルダから取得
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    const port = window.location.port || "3000";
    return `http://localhost:${port}/model_background.png`;
  }
  
  // 本番環境では、widget.jsが読み込まれたドメインから取得
  // widget.jsのスクリプトタグのsrcから取得を試みる
  const scriptTag = document.querySelector('script[src*="widget.js"]');
  if (scriptTag) {
    const src = scriptTag.getAttribute("src");
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        return `${url.protocol}//${url.host}/model_background.png`;
      } catch (e) {
        // URL解析に失敗した場合は現在のオリジンを使用
      }
    }
  }
  
  // フォールバック: 現在のオリジンを使用
  return `${window.location.origin}/model_background.png`;
}

/**
 * PreviewPanelのVanilla JS実装
 * Widget向けの新しいデザイン（サイズ選択 + 質問入力）
 */
export function initPreviewPanel(
  options: PreviewPanelOptions
): PreviewPanelInstance {
  const {
    container,
    glbUrl,
    modelUrl,
    textureUrl,
    initialHeight = 170,
    minHeight = 150,
    maxHeight = 190,
    availableSizes = ["S", "M", "L"],
    initialSize = "M",
    productName,
    onHeightChange,
    onSizeChange,
    onMessageSend,
    onModelLoad,
    onModelError,
    onBackClick,
  } = options;
  
  // modelUrlを優先、なければglbUrlを使用（後方互換性）
  const currentModelUrl = modelUrl || glbUrl;

  let currentSize = initialSize;
  let isKeyboardVisible = false;

  // 既存の要素を個別に削除（innerHTMLを使わない - Reactとの競合を避けるため）
  // PreviewPanel.tsxでdestroy()の後にクリアしているが、念のためここでもクリア
  // ただし、innerHTMLは使わず、個別にremove()で削除
  try {
    // 子要素を配列にコピーしてから削除（削除中にDOMが変更されるのを防ぐ）
    const children = Array.from(container.children);
    for (const child of children) {
      try {
        child.remove();
      } catch (error) {
        // 個別の削除エラーは無視
        console.warn("[Atelier Preview] Could not remove child element:", error);
      }
    }
  } catch (error) {
    // エラーは無視（既にクリアされている可能性がある）
    console.warn("[Atelier Preview] Could not clear container, continuing anyway:", error);
  }

  // コンテナのスタイルを設定
  const currentStyle = container.style.cssText || "";
  container.style.cssText = `
    ${currentStyle}
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: transparent !important;
    gap: 0 !important;
  `.trim();

  // UI要素を作成
  console.log("[Atelier Preview] initPreviewPanel - availableSizes:", availableSizes, "length:", availableSizes.length);
  const sizeAreaElements = createSizeArea(availableSizes, initialSize, productName);
  const { sizeArea, sizeButtons, sizeButtonsContainer, prevButton, nextButton } = sizeAreaElements;
  console.log("[Atelier Preview] initPreviewPanel - sizeButtons length:", sizeButtons.length);
  console.log("[Atelier Preview] initPreviewPanel - sizeButtonsContainer children:", sizeButtonsContainer.children.length);
  
  // 選択されたサイズボタンを中央にスクロールする関数
  const scrollToSelectedSize = () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex >= 0 && sizeButtons[currentIndex]) {
      const selectedButton = sizeButtons[currentIndex];
      const containerRect = sizeButtonsContainer.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();
      const scrollLeft = sizeButtonsContainer.scrollLeft;
      const buttonLeft = buttonRect.left - containerRect.left + scrollLeft;
      const buttonWidth = buttonRect.width;
      const containerWidth = containerRect.width;
      const targetScroll = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
      
      sizeButtonsContainer.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  };
  
  // 初期表示時に選択されたサイズを中央にスクロール
  setTimeout(() => {
    scrollToSelectedSize();
  }, 100);

  const viewerElements = createViewerContainer(productName);
  const { viewerContainer, floatingButtons, jacketButton, userButton } = viewerElements;

  // 各ボタンにpointer-eventsを設定
  const setButtonPointerEvents = (button: HTMLElement) => {
    button.style.pointerEvents = "auto";
  };
  setButtonPointerEvents(jacketButton);
  setButtonPointerEvents(userButton);

  // フローティングボタンのホバーエフェクト
  jacketButton.addEventListener("mouseenter", () => {
    jacketButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    jacketButton.style.transform = "scale(1.05)";
  });
  jacketButton.addEventListener("mouseleave", () => {
    jacketButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    jacketButton.style.transform = "scale(1)";
  });
  userButton.addEventListener("mouseenter", () => {
    userButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    userButton.style.transform = "scale(1.05)";
  });
  userButton.addEventListener("mouseleave", () => {
    userButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    userButton.style.transform = "scale(1)";
  });

  // サイズボタンのイベントハンドラー
  const updateSizeButtons = () => {
    sizeButtons.forEach((btn, idx) => {
      const btnSize = availableSizes[idx];
      const selected = btnSize === currentSize;
      btn.style.background = selected ? "black" : "#d1d5db";
      btn.style.color = "white";
    });
    // 選択されたサイズを中央にスクロール
    scrollToSelectedSize();
  };

  // タップで反転エフェクト（prevButton）
  prevButton.addEventListener("mousedown", () => {
    prevButton.style.opacity = "0.5";
  });
  prevButton.addEventListener("mouseup", () => {
    prevButton.style.opacity = "1";
  });
  prevButton.addEventListener("mouseleave", () => {
    prevButton.style.opacity = "1";
  });
  prevButton.addEventListener("touchstart", () => {
    prevButton.style.opacity = "0.5";
  });
  prevButton.addEventListener("touchend", () => {
    prevButton.style.opacity = "1";
  });
  prevButton.addEventListener("click", () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex > 0) {
      currentSize = availableSizes[currentIndex - 1];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    }
  });

  // サイズボタンコンテナのタッチイベントでスワイプを許可
  let isScrolling = false;
  sizeButtonsContainer.addEventListener("touchstart", () => {
    isScrolling = false;
  });
  sizeButtonsContainer.addEventListener("touchmove", () => {
    isScrolling = true;
  });

  // タップで反転エフェクト（nextButton）
  nextButton.addEventListener("mousedown", () => {
    nextButton.style.opacity = "0.5";
  });
  nextButton.addEventListener("mouseup", () => {
    nextButton.style.opacity = "1";
  });
  nextButton.addEventListener("mouseleave", () => {
    nextButton.style.opacity = "1";
  });
  nextButton.addEventListener("touchstart", () => {
    nextButton.style.opacity = "0.5";
  });
  nextButton.addEventListener("touchend", () => {
    nextButton.style.opacity = "1";
  });
  nextButton.addEventListener("click", () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex < availableSizes.length - 1) {
      currentSize = availableSizes[currentIndex + 1];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    }
  });

  // サイズボタンのクリックイベント
  sizeButtons.forEach((sizeBtn, idx) => {
    sizeBtn.addEventListener("click", (e) => {
      // スクロール中はクリックイベントを無視
      if (isScrolling) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      currentSize = availableSizes[idx];
      updateSizeButtons();
      onSizeChange?.(currentSize);
    });
  });

  // メッセージ入力エリアを作成
  const messageElements = createMessageArea();
  const { bottomControls, messageArea, messageForm, messageInput, sendButton } = messageElements;

  const handleSend = async () => {
    const message = messageInput.value.trim();
    if (!message || !onMessageSend) return;
    
    messageInput.value = "";
    
    // 送信ボタンを無効化
    sendButton.disabled = true;
    sendButton.style.opacity = "0.5";
    sendButton.style.cursor = "not-allowed";
    
    try {
      // LLM APIを呼び出し
      const response = await onMessageSend(message);
      
      // レスポンスはonMessageSendのコールバックで処理される
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      // 送信ボタンを再有効化
      sendButton.disabled = false;
      sendButton.style.opacity = "1";
      sendButton.style.cursor = "pointer";
    }
  };

  // フォーム送信を防ぐ（captureフェーズでも処理）
  const handleFormSubmit = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    handleSend();
    return false;
  };
  
  messageForm.addEventListener("submit", handleFormSubmit, true); // capture phase
  messageForm.addEventListener("submit", handleFormSubmit, false); // bubble phase

  sendButton.type = "button"; // フォーム送信を防ぐ
  sendButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    handleSend();
  });
  
  // Enterキーで送信（フォームのデフォルト動作を防ぐ）
  // captureフェーズでイベントをキャッチして、親要素のイベントハンドラーより先に処理する
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault(); // フォーム送信を防ぐ
      e.stopPropagation(); // イベントの伝播を止める
      e.stopImmediatePropagation(); // 同じ要素の他のイベントリスナーも止める
      handleSend();
      return false; // さらに確実にイベントを止める
    }
  };
  
  // captureフェーズとbubbleフェーズの両方でイベントをキャッチ
  messageInput.addEventListener("keydown", handleKeyDown, true); // capture phase
  messageInput.addEventListener("keydown", handleKeyDown, false); // bubble phase
  
  // keypressイベントも止める（念のため）
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // messageFormでもEnterキーをキャッチ（念のため）
  messageForm.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target === messageInput) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  // 全要素を追加
  container.appendChild(viewerContainer);
  // sizeAreaはviewerContainer内に絶対配置されるため、viewerContainerに追加
  viewerContainer.appendChild(sizeArea);
  container.appendChild(bottomControls);

  // 3Dビューアを初期化（背景画像を指定）
  const backgroundImageUrl = getBackgroundImageUrl();
  const viewerInstance = init3DViewer(viewerContainer, {
    glbUrl,
    modelUrl,
    textureUrl,
    backgroundImageUrl,
    onLoad: onModelLoad,
    onError: onModelError,
  });

  // 作成した要素への参照を保持（destroy()で個別に削除するため）
  const createdElements = [sizeArea, viewerContainer, bottomControls];

  return {
    updateGlbUrl(newGlbUrl: string | undefined) {
      // 後方互換性のため
      viewerInstance.updateGlbUrl(newGlbUrl);
    },
    updateModelUrl(newModelUrl: string | undefined) {
      // GLBとFBXの両方をサポート
      viewerInstance.updateModelUrl(newModelUrl);
    },
    updateHeight(height: number) {
      // 身長スライダーは削除されたため、コールバックのみ呼び出す
      onHeightChange?.(height);
    },
    updateSize(size: ProductSize) {
      currentSize = size;
      updateSizeButtons();
    },
    destroy() {
      // イベントリスナーの削除（チャット機能削除により不要）
      
      // 3Dビューアを破棄（viewerContainer内の要素も削除される）
      try {
        viewerInstance.destroy();
      } catch (error) {
        console.error("[Atelier Preview] Error destroying viewer instance:", error);
      }
      
      // DOMのクリーンアップ - 作成した要素を個別に削除（innerHTMLは使わない）
      // container要素自体はReactが管理しているが、子要素はVanilla JSで作成したものなので削除可能
      try {
        // 作成した要素を個別に削除（remove()メソッドを使用）
        for (const element of createdElements) {
          try {
            if (element && element.isConnected) {
              element.remove();
            } else if (element && element.parentNode) {
              // isConnectedがfalseでもparentNodeがある場合は削除を試みる
              element.remove();
            }
          } catch (error) {
            // 個別の削除エラーは無視
            console.warn("[Atelier Preview] Could not remove element:", error);
          }
        }
      } catch (error) {
        // エラーが発生した場合は無視（既に削除されている可能性がある）
        console.warn("[Atelier Preview] Could not clean up container:", error);
      }
    },
  };
}
