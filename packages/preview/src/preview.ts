import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { PreviewPanelOptions, PreviewPanelInstance, ChatMessage } from "./types";
import type { ProductSize } from "@atelier/shared";

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
    onHeightChange,
    onSizeChange,
    onMessageSend,
    onModelLoad,
    onModelError,
  } = options;
  
  // modelUrlを優先、なければglbUrlを使用（後方互換性）
  const currentModelUrl = modelUrl || glbUrl;

  let currentSize = initialSize;
  const chatHistory: ChatMessage[] = [];
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
    gap: 3px !important;
  `.trim();

  // サイズ選択エリア（上部）
  const sizeArea = document.createElement("div");
  sizeArea.style.cssText = `
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    gap: 12px;
  `;

  // 左矢印ボタン
  const prevButton = document.createElement("button");
  prevButton.innerHTML = "&lt;";
  prevButton.style.cssText = `
    background: white;
    border: 1px solid black;
    font-size: 14px;
    color: black;
    cursor: pointer;
    padding: 6px 10px;
    outline: none;
    transition: all 0.15s ease;
    border-radius: 4px;
    font-weight: 500;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;
  
  // タップで反転エフェクト
  prevButton.addEventListener("mousedown", () => {
    prevButton.style.background = "black";
    prevButton.style.color = "white";
  });
  prevButton.addEventListener("mouseup", () => {
    prevButton.style.background = "white";
    prevButton.style.color = "black";
  });
  prevButton.addEventListener("mouseleave", () => {
    prevButton.style.background = "white";
    prevButton.style.color = "black";
  });
  
  // タッチイベント用
  prevButton.addEventListener("touchstart", () => {
    prevButton.style.background = "black";
    prevButton.style.color = "white";
  });
  prevButton.addEventListener("touchend", () => {
    prevButton.style.background = "white";
    prevButton.style.color = "black";
  });
  
  prevButton.addEventListener("click", () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex > 0) {
      currentSize = availableSizes[currentIndex - 1];
      sizeLabel.textContent = currentSize;
      onSizeChange?.(currentSize);
    }
  });

  // サイズ表示（背景黒、文字白）
  const sizeLabel = document.createElement("div");
  sizeLabel.textContent = currentSize;
  sizeLabel.style.cssText = `
    background: black;
    color: white;
    font-size: 14px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 4px;
    width: 40px;
    height: 32px;
    text-align: center;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // 右矢印ボタン
  const nextButton = document.createElement("button");
  nextButton.innerHTML = "&gt;";
  nextButton.style.cssText = `
    background: white;
    border: 1px solid black;
    font-size: 14px;
    color: black;
    cursor: pointer;
    padding: 6px 10px;
    outline: none;
    transition: all 0.15s ease;
    border-radius: 4px;
    font-weight: 500;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;
  
  // タップで反転エフェクト
  nextButton.addEventListener("mousedown", () => {
    nextButton.style.background = "black";
    nextButton.style.color = "white";
  });
  nextButton.addEventListener("mouseup", () => {
    nextButton.style.background = "white";
    nextButton.style.color = "black";
  });
  nextButton.addEventListener("mouseleave", () => {
    nextButton.style.background = "white";
    nextButton.style.color = "black";
  });
  
  // タッチイベント用
  nextButton.addEventListener("touchstart", () => {
    nextButton.style.background = "black";
    nextButton.style.color = "white";
  });
  nextButton.addEventListener("touchend", () => {
    nextButton.style.background = "white";
    nextButton.style.color = "black";
  });
  
  nextButton.addEventListener("click", () => {
    const currentIndex = availableSizes.indexOf(currentSize);
    if (currentIndex < availableSizes.length - 1) {
      currentSize = availableSizes[currentIndex + 1];
      sizeLabel.textContent = currentSize;
      onSizeChange?.(currentSize);
    }
  });

  sizeArea.appendChild(prevButton);
  sizeArea.appendChild(sizeLabel);
  sizeArea.appendChild(nextButton);

  // 3Dモデルエリア（中央、広く取る）
  const viewerContainer = document.createElement("div");
  viewerContainer.style.cssText = `
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    transition: flex 0.3s ease;
  `;

  // チャット履歴エリア（3Dモデルの上にオーバーレイ）
  const chatHistoryArea = document.createElement("div");
  chatHistoryArea.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(4px);
    display: none;
    flex-direction: column;
    overflow-y: auto;
    z-index: 10;
    padding: 8px;
    gap: 8px;
    transition: opacity 0.3s ease;
  `;

  // チャット履歴のスクロールコンテナ
  const chatMessagesContainer = document.createElement("div");
  chatMessagesContainer.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    min-height: 0;
  `;

  // チャット履歴を閉じるボタン（キーボード表示時のみ表示）
  const closeChatButton = document.createElement("button");
  closeChatButton.innerHTML = "×";
  closeChatButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.1);
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    color: #000;
    z-index: 11;
  `;
  closeChatButton.addEventListener("click", () => {
    hideChatHistory();
    messageInput.blur(); // キーボードを閉じる
  });

  chatHistoryArea.appendChild(closeChatButton);
  chatHistoryArea.appendChild(chatMessagesContainer);
  viewerContainer.appendChild(chatHistoryArea);

  // チャット履歴を表示/非表示する関数
  const showChatHistory = (force = false) => {
    // デバッグモードまたは強制表示の場合は、メッセージがなくても表示
    if (!force && chatHistory.length === 0) return;
    
    console.log("[Atelier Preview] showChatHistory called, force:", force, "chatHistory.length:", chatHistory.length);
    
    chatHistoryArea.style.display = "flex";
    chatHistoryArea.style.opacity = "1";
    
    if (isKeyboardVisible) {
      // キーボード表示時は3Dモデルを縮小
      viewerContainer.style.flex = "0.4";
      closeChatButton.style.display = "flex";
    } else {
      // キーボード非表示時は3Dモデルを少し縮小（チャット履歴を表示）
      viewerContainer.style.flex = "0.6";
      closeChatButton.style.display = "flex";
    }
    
    // 最新のメッセージにスクロール
    setTimeout(() => {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }, 100);
  };

  const hideChatHistory = () => {
    chatHistoryArea.style.opacity = "0";
    setTimeout(() => {
      if (!isKeyboardVisible) {
        chatHistoryArea.style.display = "none";
        viewerContainer.style.flex = "1"; // 3Dモデルを元のサイズに
        closeChatButton.style.display = "none";
      }
    }, 300);
  };

  // チャット履歴にメッセージを追加する関数
  const addChatMessage = (message: ChatMessage) => {
    console.log("[Atelier Preview] Adding chat message:", message.role, message.content.substring(0, 50));
    chatHistory.push(message);
    
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = `
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 80%;
      word-wrap: break-word;
      font-size: 12px;
      line-height: 1.4;
      ${message.role === "user" 
        ? "background: #000; color: #fff; align-self: flex-end;"
        : "background: #f3f4f6; color: #000; align-self: flex-start;"
      }
    `;
    messageDiv.textContent = message.content;
    
    chatMessagesContainer.appendChild(messageDiv);
    
    // チャット履歴を強制的に表示（メッセージが追加されたら常に表示）
    console.log("[Atelier Preview] Showing chat history, chatHistory.length:", chatHistory.length);
    showChatHistory(true); // force = trueで強制表示
    
    // 最新のメッセージにスクロール
    setTimeout(() => {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }, 100);
  };

  // 下部コントロールエリア（身長 + チャット）をグループ化
  const bottomControls = document.createElement("div");
  bottomControls.style.cssText = `
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  `;

  // スライダーエリア（身長調整）
  const sliderArea = document.createElement("div");
  sliderArea.style.cssText = `
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 12px;
  `;

  const sliderWrapper = document.createElement("div");
  sliderWrapper.style.cssText = `
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;

  const sliderLabelRow = document.createElement("div");
  sliderLabelRow.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    line-height: 1.2;
    margin-bottom: 4px;
  `;

  const sliderLabel = document.createElement("label");
  sliderLabel.textContent = "身長";
  sliderLabel.style.cssText = `
    font-weight: 500;
    color: #000;
  `;

  const sliderValue = document.createElement("span");
  sliderValue.textContent = `${initialHeight}cm`;
  sliderValue.style.cssText = `
    color: #6b7280;
  `;

  sliderLabelRow.appendChild(sliderLabel);
  sliderLabelRow.appendChild(sliderValue);

  let sliderInstance: { updateValue: (value: number) => void } | null = null;
  const slider = createHeightSlider(initialHeight, minHeight, maxHeight, (value) => {
    sliderValue.textContent = `${value}cm`;
    onHeightChange?.(value);
  });
  sliderInstance = slider;

  sliderWrapper.appendChild(sliderLabelRow);
  sliderWrapper.appendChild(slider.element);
  sliderArea.appendChild(sliderWrapper);

  // 質問入力エリア（最下部）
  const messageArea = document.createElement("div");
  messageArea.style.cssText = `
    flex-shrink: 0;
    padding: 0 12px;
  `;

  const messageForm = document.createElement("form");
  messageForm.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 2px solid #e5e7eb;
    border-radius: 20px;
    background: white;
  `;

  const messageInput = document.createElement("input");
  messageInput.type = "text";
  messageInput.placeholder = "質問はありますか？";
  messageInput.style.cssText = `
    flex: 1;
    border: none;
    outline: none;
    font-size: 11px;
    background: transparent;
    color: #6b7280;
  `;

  const sendButton = document.createElement("button");
  sendButton.innerHTML = "▶";
  sendButton.style.cssText = `
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    outline: none;
    transform: rotate(0deg);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const handleSend = async () => {
    const message = messageInput.value.trim();
    if (!message || !onMessageSend) return;
    
    // ユーザーメッセージを履歴に追加
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    addChatMessage(userMessage);
    messageInput.value = "";
    
    // 送信ボタンを無効化
    sendButton.disabled = true;
    sendButton.style.opacity = "0.5";
    sendButton.style.cursor = "not-allowed";
    
    try {
      // LLM APIを呼び出し
      const response = await onMessageSend(message);
      
      if (response) {
        // アシスタントのレスポンスを履歴に追加
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };
        addChatMessage(assistantMessage);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // エラーメッセージを表示
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
        timestamp: Date.now(),
      };
      addChatMessage(errorMessage);
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

  // デバッグ用: Cmd+K (Mac) / Ctrl+K (Windows) でチャット履歴をトグル
  const handleDocumentKeyDown = (e: KeyboardEvent) => {
    // Cmd+K (Mac) または Ctrl+K (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (chatHistoryArea.style.display === "flex" && chatHistoryArea.style.opacity === "1") {
        hideChatHistory();
      } else {
        showChatHistory(true); // 強制表示
      }
    }
  };
  document.addEventListener("keydown", handleDocumentKeyDown);

  messageForm.appendChild(messageInput);
  messageForm.appendChild(sendButton);
  messageArea.appendChild(messageForm);

  // キーボード表示検出（Visual Viewport API）
  let handleViewportChange: (() => void) | null = null;
  if (typeof window !== "undefined" && window.visualViewport) {
    handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      
      // キーボードが表示されているか判定（ビューポートの高さが小さくなった場合）
      const keyboardHeight = window.innerHeight - viewport.height;
      const wasKeyboardVisible = isKeyboardVisible;
      isKeyboardVisible = keyboardHeight > 150; // 150px以上縮小したらキーボード表示と判定
      
      if (isKeyboardVisible && !wasKeyboardVisible) {
        // キーボードが表示された
        if (chatHistory.length > 0) {
          showChatHistory();
        }
      } else if (!isKeyboardVisible && wasKeyboardVisible) {
        // キーボードが閉じられた
        // メッセージがある場合は表示を維持、ない場合は非表示
        if (chatHistory.length === 0) {
          hideChatHistory();
        } else {
          // レイアウトを調整（キーボード非表示時のサイズに）
          viewerContainer.style.flex = "0.6";
        }
      }
    };
    
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    
    // フォーカスイベントでも検出（フォールバック）
    messageInput.addEventListener("focus", () => {
      setTimeout(() => {
        if (window.visualViewport) {
          const keyboardHeight = window.innerHeight - window.visualViewport.height;
          if (keyboardHeight > 150) {
            isKeyboardVisible = true;
            if (chatHistory.length > 0) {
              showChatHistory();
            }
          }
        }
      }, 300); // キーボード表示の遅延を考慮
    });
    
    messageInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (window.visualViewport) {
          const keyboardHeight = window.innerHeight - window.visualViewport.height;
          if (keyboardHeight < 100) {
            isKeyboardVisible = false;
            if (chatHistory.length === 0) {
              hideChatHistory();
            } else {
              // メッセージがある場合は表示を維持
              viewerContainer.style.flex = "0.6";
            }
          }
        }
      }, 300);
    });
  }

  // 下部コントロールに身長とチャットを追加
  bottomControls.appendChild(sliderArea);
  bottomControls.appendChild(messageArea);

  // 全要素を追加
  container.appendChild(sizeArea);
  container.appendChild(viewerContainer);
  container.appendChild(bottomControls);

  // 3Dビューアを初期化
  const viewerInstance = init3DViewer(viewerContainer, {
    glbUrl,
    modelUrl,
    textureUrl,
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
      if (sliderInstance) {
        sliderInstance.updateValue(height);
      }
      sliderValue.textContent = `${height}cm`;
    },
    updateSize(size: ProductSize) {
      currentSize = size;
      sizeLabel.textContent = size;
    },
    addChatMessage(message: ChatMessage) {
      addChatMessage(message);
    },
    showChatHistory() {
      showChatHistory(true); // 強制表示
    },
    hideChatHistory() {
      hideChatHistory();
    },
    destroy() {
      // イベントリスナーを削除
      try {
        document.removeEventListener("keydown", handleDocumentKeyDown);
      } catch (error) {
        console.error("[Atelier Preview] Error removing document keydown listener:", error);
      }
      
      // Visual Viewport APIのイベントリスナーを削除
      try {
        if (typeof window !== "undefined" && window.visualViewport && handleViewportChange) {
          window.visualViewport.removeEventListener("resize", handleViewportChange);
          window.visualViewport.removeEventListener("scroll", handleViewportChange);
        }
      } catch (error) {
        console.error("[Atelier Preview] Error removing viewport listeners:", error);
      }
      
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

/**
 * PreviewPanelのSliderThinと同じデザインのスライダー
 */
function createHeightSlider(
  initialValue: number,
  min: number,
  max: number,
  onChange: (value: number) => void
) {
  let currentValue = Math.max(min, Math.min(max, initialValue));

  const sliderContainer = document.createElement("div");
  sliderContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
    touch-action: none;
  `;

  // Track（PreviewPanelのSliderThinと同じ: h-1 bg-secondary）
  const track = document.createElement("div");
  track.style.cssText = `
    position: relative;
    width: 100%;
    height: 1px;
    background: #e5e7eb;
    border-radius: 9999px;
    overflow: visible;
  `;

  // Range（PreviewPanelのSliderThinと同じ: bg-foreground）
  const range = document.createElement("div");
  range.style.cssText = `
    position: absolute;
    height: 100%;
    background: #000;
    left: 0;
    width: ${((currentValue - min) / (max - min)) * 100}%;
    transition: width 0.1s;
  `;

  // Thumb（PreviewPanelのSliderThinと同じ: h-3 w-3 border-2 border-black bg-black）
  const thumb = document.createElement("div");
  thumb.style.cssText = `
    position: absolute;
    width: 12px;
    height: 12px;
    background: #000;
    border: 2px solid #000;
    border-radius: 50%;
    left: ${((currentValue - min) / (max - min)) * 100}%;
    transform: translate(-50%, -50%);
    top: 50%;
    cursor: grab;
    transition: left 0.1s;
    z-index: 1;
    box-sizing: border-box;
  `;

  const updateSlider = (value: number, triggerCallback = true) => {
    currentValue = Math.max(min, Math.min(max, value));
    const percent = ((currentValue - min) / (max - min)) * 100;
    range.style.width = `${percent}%`;
    thumb.style.left = `${percent}%`;
    if (triggerCallback) {
      onChange(currentValue);
    }
  };

  // マウスイベント
  thumb.addEventListener("mousedown", (e) => {
    e.preventDefault();
    thumb.style.cursor = "grabbing";

    const handleMove = (e: MouseEvent) => {
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percent = x / rect.width;
      const newValue = Math.round(min + percent * (max - min));
      updateSlider(newValue);
    };

    const handleUp = () => {
      thumb.style.cursor = "grab";
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  });

  // タッチイベント
  thumb.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];

    const handleMove = (e: TouchEvent) => {
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.touches[0].clientX - rect.left));
      const percent = x / rect.width;
      const newValue = Math.round(min + percent * (max - min));
      updateSlider(newValue);
    };

    const handleEnd = () => {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };

    document.addEventListener("touchmove", handleMove);
    document.addEventListener("touchend", handleEnd);
  });

  track.appendChild(range);
  track.appendChild(thumb);
  sliderContainer.appendChild(track);

  return {
    updateValue(value: number) {
      updateSlider(value, false); // 外部からの更新時はコールバックを呼ばない
    },
    element: sliderContainer,
  };
}

/**
 * 3Dビューアの初期化（PreviewPanelのModelViewerと同じ設定）
 */
interface ViewerOptions {
  glbUrl?: string; // 後方互換性のため残す
  modelUrl?: string; // GLBとFBXの両方をサポート（優先的に使用）
  textureUrl?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface ViewerInstance {
  updateGlbUrl(glbUrl: string | undefined): void;
  updateModelUrl(modelUrl: string | undefined): void;
  destroy(): void;
}

function init3DViewer(
  container: HTMLElement,
  options: ViewerOptions
): ViewerInstance {
  const { glbUrl, modelUrl, textureUrl, onLoad, onError } = options;
  // modelUrlを優先、なければglbUrlを使用（後方互換性）
  const currentModelUrl = modelUrl || glbUrl;

  // コンテナのサイズを取得（初期化時に0の場合はデフォルト値を使用）
  const getContainerSize = () => {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    return { width, height };
  };

  const { width: initialWidth, height: initialHeight } = getContainerSize();

  console.log("[Atelier Preview] Initializing 3D viewer:", {
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight,
    initialWidth,
    initialHeight,
  });

  // Scene setup（背景なし、透明）
  const scene = new THREE.Scene();
  scene.background = null; // 背景なし（透明）

  // Camera（PreviewPanelのModelViewerと同じ: position: [0, 0, 5], fov: 50）
  const camera = new THREE.PerspectiveCamera(
    50, // fov: 50
    initialWidth / initialHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 5);

  // Renderer（背景透明）
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true, // 背景を透明にする
  });
  renderer.setSize(initialWidth, initialHeight);
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x000000, 0); // 背景を透明にする
  const canvasElement = renderer.domElement;
  canvasElement.style.touchAction = "none"; // タッチイベントを有効化
  container.appendChild(canvasElement);

  // Lights（PreviewPanelのModelViewerと同じ）
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight1.position.set(10, 10, 5);
  directionalLight1.castShadow = true;
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight2.position.set(-10, -10, -5);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight3.position.set(0, 10, 0);
  scene.add(directionalLight3);

  // OrbitControls（PreviewPanelのModelViewerと同じ制約）
  // enableZoom: false, enablePan: false
  // minPolarAngle: Math.PI / 4 (45度 - 上限), maxPolarAngle: (Math.PI * 3) / 4 (135度 - 下限)
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  const minPolarAngle = Math.PI / 4; // 45度（上方向の限界）
  const maxPolarAngle = (Math.PI * 3) / 4; // 135度（下方向の限界）

  // canvas要素にイベントリスナーを追加
  canvasElement.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    canvasElement.style.cursor = "grabbing";
  });

  canvasElement.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    // Rotate camera around the model（OrbitControlsと同じロジック）
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    spherical.theta -= deltaX * 0.01;
    spherical.phi -= deltaY * 0.01; // 上にドラッグ→カメラが下を向く（phiを増やす）= モデルが上に見える
    // minPolarAngle, maxPolarAngleの制約を適用
    spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));
    // z軸方向（前後方向）の動きを制限：radiusを固定（5に固定）
    spherical.radius = 5;

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvasElement.addEventListener("mouseup", () => {
    isDragging = false;
    canvasElement.style.cursor = "grab";
  });

  canvasElement.addEventListener("mouseleave", () => {
    isDragging = false;
    canvasElement.style.cursor = "grab";
  });

  // タッチイベントも追加
  canvasElement.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  });

  canvasElement.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - previousMousePosition.x;
    const deltaY = e.touches[0].clientY - previousMousePosition.y;

    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    spherical.theta -= deltaX * 0.01;
    spherical.phi -= deltaY * 0.01; // 上にドラッグ→カメラが下を向く（phiを増やす）= モデルが上に見える
    spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));
    // z軸方向（前後方向）の動きを制限：radiusを固定（5に固定）
    spherical.radius = 5;

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  canvasElement.addEventListener("touchend", () => {
    isDragging = false;
  });

  canvasElement.style.cursor = "grab";

  // Load model
  let currentModel: THREE.Group | null = null;
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();

  // ファイル拡張子からモデル形式を判定
  function getModelFormat(url: string): "glb" | "fbx" | "unknown" {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith(".glb") || lowerUrl.endsWith(".gltf")) {
      return "glb";
    } else if (lowerUrl.endsWith(".fbx")) {
      return "fbx";
    }
    return "unknown";
  }

  function loadModel(url: string | undefined) {
    if (currentModel) {
      scene.remove(currentModel);
      currentModel = null;
    }

    // 既存のメッセージを削除（安全な方法）
    const existingMessage = container.querySelector("[data-atelier-message]");
    if (existingMessage) {
      try {
        // remove()メソッドを使用（親子関係を確認する必要がない）
        existingMessage.remove();
      } catch (error) {
        // エラーが発生した場合は、display: noneで非表示にする
        (existingMessage as HTMLElement).style.display = "none";
      }
    }

    if (!url) {
      // URLが指定されていない場合はメッセージを表示
      const messageDiv = document.createElement("div");
      messageDiv.setAttribute("data-atelier-message", "true");
      messageDiv.textContent = "3Dモデルが設定されていません";
      messageDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #6b7280;
        font-size: 14px;
        pointer-events: none;
        z-index: 10;
      `;
      container.appendChild(messageDiv);
      return;
    }

    console.log("[Atelier Preview] Loading 3D model:", url);
    const format = getModelFormat(url);

    // モデル形式に応じて適切なローダーを使用
    if (format === "fbx") {
      fbxLoader.load(
        url,
        (fbx) => {
          console.log("[Atelier Preview] FBX model loaded successfully:", url);
          currentModel = fbx;
          
          // まずスケールを適用（バウンディングボックス計算前に）
          // FBXファイルは通常メートル単位なので、より大きなスケールを試す
          // まずは大きめのスケールで表示を確認
          const initialScale = 0.02; // より大きなスケールを試す
          currentModel.scale.set(initialScale, initialScale, initialScale);
          
          // スケール適用後にバウンディングボックスを計算
          const box = new THREE.Box3().setFromObject(currentModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z);
          console.log("[Atelier Preview] FBX bounding box (after scale):", { center, size, maxSize, initialScale });
          
          // 原点を中心に移動
          currentModel.position.set(-center.x, -center.y, -center.z);
          
          // 回転は一旦なし（表示確認後、必要に応じて調整）
          currentModel.rotation.set(0, 0, 0);
          
          console.log("[Atelier Preview] FBX model settings:", {
            position: currentModel.position,
            scale: currentModel.scale,
            rotation: currentModel.rotation,
            maxSize,
            initialScale,
            boundingBoxCenter: center,
            boundingBoxSize: size,
          });
          
          scene.add(currentModel);
          
          // モデルがシーンに追加されたことを確認
          console.log("[Atelier Preview] FBX model added to scene. Scene children count:", scene.children.length);
          
          // カメラをモデルに向ける（念のため）
          if (camera) {
            camera.lookAt(0, 0, 0);
            console.log("[Atelier Preview] Camera positioned at:", camera.position, "looking at:", [0, 0, 0]);
          }
          
          // 成功したらメッセージを削除（安全な方法）
          const existingMessage = container.querySelector("[data-atelier-message]");
          if (existingMessage) {
            try {
              existingMessage.remove();
            } catch (error) {
              (existingMessage as HTMLElement).style.display = "none";
            }
          }
          
          onLoad?.();
        },
        undefined,
        (error) => {
          handleModelError(error, url);
        }
      );
    } else {
      // GLB/GLTFの場合はGLTFLoaderを使用
      gltfLoader.load(
        url,
        (gltf) => {
          console.log("[Atelier Preview] GLB model loaded successfully:", url);
          currentModel = gltf.scene;
          // PreviewPanelのModelViewerと同じ: scale: [3.5, 3.5, 3.5], rotation: [0, -Math.PI / 2, 0]
          currentModel.scale.set(3.5, 3.5, 3.5);
          currentModel.rotation.y = -Math.PI / 2;
          scene.add(currentModel);
          
          // 成功したらメッセージを削除（安全な方法）
          const existingMessage = container.querySelector("[data-atelier-message]");
          if (existingMessage) {
            try {
              existingMessage.remove();
            } catch (error) {
              (existingMessage as HTMLElement).style.display = "none";
            }
          }
          
          onLoad?.();
        },
        undefined,
        (error) => {
          handleModelError(error, url);
        }
      );
    }
  }

  function handleModelError(error: unknown, url: string) {
    // 接続エラーの場合は、コンソールログを抑制（ブラウザのネットワークエラーは表示されるが、JavaScript側では抑制）
    const isConnectionError =
      error instanceof Error &&
      (error.message === "Failed to fetch" ||
        error.message.includes("network") ||
        error.message.includes("connection"));
    
    if (!isConnectionError) {
      console.error("[Atelier Preview] Failed to load 3D model:", error, url);
    }
    
    // エラーメッセージを表示
    const errorDiv = document.createElement("div");
    errorDiv.setAttribute("data-atelier-message", "true");
    
    // 接続エラーの場合は、より詳細なメッセージを表示
    let errorMessage = "3Dモデルの読み込みに失敗しました";
    if (isConnectionError) {
      errorMessage = "consoleサーバーが起動していません\nnpm run dev:console を実行してください";
    }
    
    errorDiv.textContent = errorMessage;
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ef4444;
      font-size: 14px;
      pointer-events: none;
      z-index: 10;
      text-align: center;
      white-space: pre-line;
    `;
    container.appendChild(errorDiv);
    
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  // Load initial model
  loadModel(currentModelUrl);

  // Animation loop
  let animationId: number;
  function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = getContainerSize();
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      console.log("[Atelier Preview] Resized 3D viewer:", { width, height });
    }
  });
  resizeObserver.observe(container);

  return {
    updateGlbUrl(newGlbUrl: string | undefined) {
      // 後方互換性のため
      loadModel(newGlbUrl);
    },
    updateModelUrl(newModelUrl: string | undefined) {
      // GLBとFBXの両方をサポート
      loadModel(newModelUrl);
    },
    destroy() {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (currentModel) {
        scene.remove(currentModel);
      }
      // renderer.domElementを削除（安全な方法）
      try {
        // DOMに接続されているか確認してから削除
        if (renderer.domElement && renderer.domElement.isConnected) {
          // remove()メソッドを使用（親子関係を確認する必要がない）
          renderer.domElement.remove();
        } else if (renderer.domElement && renderer.domElement.parentNode) {
          // isConnectedがfalseでもparentNodeがある場合は削除を試みる
          try {
            renderer.domElement.remove();
          } catch (error) {
            // エラーが発生した場合は、display: noneで非表示にする
            (renderer.domElement as HTMLElement).style.display = "none";
          }
        }
      } catch (error) {
        // エラーが発生した場合は、display: noneで非表示にする
        try {
          (renderer.domElement as HTMLElement).style.display = "none";
        } catch (innerError) {
          // それでもエラーが発生する場合は無視
          console.warn("[Atelier Preview] Could not hide renderer element:", innerError);
        }
      }
      renderer.dispose();
    },
  };
}
