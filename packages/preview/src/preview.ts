import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { TextureLoader } from "three";
import type { PreviewPanelOptions, PreviewPanelInstance, ChatMessage } from "./types";
import type { ProductSize } from "@atelier/shared";

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
    gap: 0 !important;
  `.trim();

  // ナビゲーションバーは削除

  // サイズ選択エリア（ナビゲーションバーの下、3Dモデルの下に配置）
  const sizeArea = document.createElement("div");
  sizeArea.style.cssText = `
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    gap: 8px;
  `;

  // サイズ選択ボタンコンテナ
  const sizeButtonsContainer = document.createElement("div");
  sizeButtonsContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;

  // サイズボタン配列（先に宣言）
  const sizeButtons: HTMLElement[] = [];

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
      // すべてのボタンのスタイルを更新
      sizeButtons.forEach((btn, idx) => {
        const btnSize = availableSizes[idx];
        const selected = btnSize === currentSize;
        btn.style.background = selected ? "black" : "white";
        btn.style.color = selected ? "white" : "black";
      });
      onSizeChange?.(currentSize);
    }
  });


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
      // すべてのボタンのスタイルを更新
      sizeButtons.forEach((btn, idx) => {
        const btnSize = availableSizes[idx];
        const selected = btnSize === currentSize;
        btn.style.background = selected ? "black" : "white";
        btn.style.color = selected ? "white" : "black";
      });
      onSizeChange?.(currentSize);
    }
  });

  // サイズボタンを横並びで表示（S, M, L, XLなど）
  availableSizes.forEach((size) => {
    const sizeBtn = document.createElement("button");
    sizeBtn.textContent = size;
    const isSelected = size === currentSize;
    sizeBtn.style.cssText = `
      background: ${isSelected ? "black" : "white"};
      color: ${isSelected ? "white" : "black"};
      border: 1px solid black;
      font-size: 14px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 40px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    `;
    sizeBtn.addEventListener("click", () => {
      currentSize = size;
      // すべてのボタンのスタイルを更新
      sizeButtons.forEach((btn, idx) => {
        const btnSize = availableSizes[idx];
        const selected = btnSize === currentSize;
        btn.style.background = selected ? "black" : "white";
        btn.style.color = selected ? "white" : "black";
      });
      onSizeChange?.(currentSize);
    });
    sizeButtons.push(sizeBtn);
    sizeButtonsContainer.appendChild(sizeBtn);
  });

  sizeButtonsContainer.appendChild(prevButton);
  sizeButtonsContainer.appendChild(nextButton);
  sizeArea.appendChild(sizeButtonsContainer);

  // 商品名表示
  if (productName) {
    const productNameDiv = document.createElement("div");
    productNameDiv.textContent = productName;
    productNameDiv.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: black;
      text-align: center;
      margin-top: 4px;
    `;
    sizeArea.appendChild(productNameDiv);
  }

  // 3Dモデルエリア（中央、広く取る）
  const viewerContainer = document.createElement("div");
  viewerContainer.style.cssText = `
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    transition: flex 0.3s ease;
  `;

  // 右側フローティングアクションボタン
  const floatingButtons = document.createElement("div");
  floatingButtons.style.cssText = `
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 5;
  `;

  // ジャケットアイコンボタン
  const jacketButton = document.createElement("button");
  jacketButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 7h-3M4 7h3m13 0v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7m13 0V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/>
    </svg>
  `;
  jacketButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    color: black;
  `;
  jacketButton.addEventListener("mouseenter", () => {
    jacketButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    jacketButton.style.transform = "scale(1.05)";
  });
  jacketButton.addEventListener("mouseleave", () => {
    jacketButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    jacketButton.style.transform = "scale(1)";
  });

  // ユーザーアイコンボタン
  const userButton = document.createElement("button");
  userButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  `;
  userButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    color: black;
  `;
  userButton.addEventListener("mouseenter", () => {
    userButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    userButton.style.transform = "scale(1.05)";
  });
  userButton.addEventListener("mouseleave", () => {
    userButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    userButton.style.transform = "scale(1)";
  });

  // チャットアイコンボタン
  const chatButton = document.createElement("button");
  chatButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `;
  chatButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    color: black;
  `;
  chatButton.addEventListener("mouseenter", () => {
    chatButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    chatButton.style.transform = "scale(1.05)";
  });
  chatButton.addEventListener("mouseleave", () => {
    chatButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    chatButton.style.transform = "scale(1)";
  });
  // チャットモーダルの状態管理
  let isChatModalOpen = false;
  
  chatButton.addEventListener("click", () => {
    if (isChatModalOpen) {
      closeChatModal();
    } else {
      openChatModal();
    }
  });

  floatingButtons.appendChild(jacketButton);
  floatingButtons.appendChild(userButton);
  floatingButtons.appendChild(chatButton);
  viewerContainer.appendChild(floatingButtons);

  // チャットモーダル（viewerContainer内に配置）
  const chatModal = document.createElement("div");
  chatModal.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    display: none;
    flex-direction: column;
    z-index: 20;
    transition: opacity 0.3s ease;
  `;

  // チャット履歴エリア（モーダル内）
  const chatHistoryArea = document.createElement("div");
  chatHistoryArea.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 16px;
    gap: 12px;
    min-height: 0;
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

  // チャットモーダルヘッダーは削除（閉じるボタンのみ右上に配置）
  const closeChatButton = document.createElement("button");
  closeChatButton.innerHTML = "×";
  closeChatButton.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.1);
    border: none;
    font-size: 24px;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
    z-index: 21;
  `;
  closeChatButton.addEventListener("mouseenter", () => {
    closeChatButton.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
  });
  closeChatButton.addEventListener("mouseleave", () => {
    closeChatButton.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
  });
  closeChatButton.addEventListener("click", () => {
    closeChatModal();
  });

  chatHistoryArea.appendChild(chatMessagesContainer);
  chatModal.appendChild(closeChatButton);
  chatModal.appendChild(chatHistoryArea);
  viewerContainer.appendChild(chatModal);

  // チャットモーダルを開く関数
  const openChatModal = () => {
    isChatModalOpen = true;
    chatModal.style.display = "flex";
    chatModal.style.opacity = "1";
    
    // 3Dモデルエリアを縮小
    viewerContainer.style.flex = "0.5";
    
    // 最新のメッセージにスクロール
    setTimeout(() => {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }, 100);
  };

  // チャットモーダルを閉じる関数
  const closeChatModal = () => {
    isChatModalOpen = false;
    chatModal.style.opacity = "0";
    messageInput.blur(); // キーボードを閉じる
    
    setTimeout(() => {
      chatModal.style.display = "none";
      viewerContainer.style.flex = "1"; // 3Dモデルを元のサイズに
    }, 300);
  };

  // チャット履歴を表示する関数（メッセージ追加時に使用）
  const showChatHistory = (force = false) => {
    // モーダルが開いていない場合は開く
    if (!isChatModalOpen) {
      openChatModal();
    }
    
    // 最新のメッセージにスクロール
    setTimeout(() => {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }, 100);
  };

  const hideChatHistory = () => {
    // モーダルを閉じる
    closeChatModal();
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

  // チャットモーダル下部のチャットボックスエリア
  const chatInputArea = document.createElement("div");
  chatInputArea.style.cssText = `
    flex-shrink: 0;
    padding: 12px 16px;
    background: white;
    transition: transform 0.3s ease;
  `;

  // 下部コントロールエリア（通常時は非表示）
  const bottomControls = document.createElement("div");
  bottomControls.style.cssText = `
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  `;

  // 質問入力エリア（通常時は非表示）
  const messageArea = document.createElement("div");
  messageArea.style.cssText = `
    flex-shrink: 0;
    padding: 0 12px;
    display: none;
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

  // チャットモーダル用のメッセージフォーム（先に定義）
  let chatMessageInput: HTMLInputElement | null = null;
  let chatSendButton: HTMLButtonElement | null = null;

  const handleSend = async () => {
    // チャットモーダルが開いている場合はchatMessageInputを使用
    const input = (isChatModalOpen && chatMessageInput) ? chatMessageInput : messageInput;
    const message = input.value.trim();
    if (!message || !onMessageSend) return;
    
    // ユーザーメッセージを履歴に追加
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    addChatMessage(userMessage);
    input.value = "";
    
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
  messageArea.appendChild(messageForm.cloneNode(true) as HTMLFormElement);
  
  // チャットモーダル用のメッセージフォーム（別インスタンス）
  const chatMessageForm = messageForm.cloneNode(true) as HTMLFormElement;
  chatMessageInput = chatMessageForm.querySelector('input') as HTMLInputElement;
  chatSendButton = chatMessageForm.querySelector('button') as HTMLButtonElement;
  
  // チャットモーダル用のイベントリスナー
  chatMessageForm.addEventListener("submit", handleFormSubmit, true);
  chatMessageForm.addEventListener("submit", handleFormSubmit, false);
  chatSendButton.type = "button";
  chatSendButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    handleSend();
  });
  
  const handleChatKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleSend();
      return false;
    }
  };
  chatMessageInput.addEventListener("keydown", handleChatKeyDown, true);
  chatMessageInput.addEventListener("keydown", handleChatKeyDown, false);
  
  chatInputArea.appendChild(chatMessageForm);

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
        // キーボードが表示された（チャットモーダルが開いている場合のみ）
        if (isChatModalOpen) {
          // チャットボックスを上に移動
          chatInputArea.style.transform = "translateY(-200px)";
          // 3Dモデルを非表示
          const canvasElement = viewerContainer.querySelector('canvas');
          if (canvasElement) {
            (canvasElement as HTMLElement).style.display = "none";
          }
        }
      } else if (!isKeyboardVisible && wasKeyboardVisible) {
        // キーボードが閉じられた
        if (isChatModalOpen) {
          // チャットボックスを元の位置に戻す
          chatInputArea.style.transform = "translateY(0)";
          // 3Dモデルを再表示
          const canvasElement = viewerContainer.querySelector('canvas');
          if (canvasElement) {
            (canvasElement as HTMLElement).style.display = "block";
          }
        }
      }
    };
    
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    
    // フォーカスイベントでも検出（フォールバック）
    chatMessageInput.addEventListener("focus", () => {
      setTimeout(() => {
        if (window.visualViewport) {
          const keyboardHeight = window.innerHeight - window.visualViewport.height;
          if (keyboardHeight > 150) {
            isKeyboardVisible = true;
            if (isChatModalOpen) {
              // チャットボックスを上に移動
              chatInputArea.style.transform = "translateY(-200px)";
              // 3Dモデルを非表示
              const canvasElement = viewerContainer.querySelector('canvas');
              if (canvasElement) {
                (canvasElement as HTMLElement).style.display = "none";
              }
            }
          }
        }
      }, 300); // キーボード表示の遅延を考慮
    });
    
    chatMessageInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (window.visualViewport) {
          const keyboardHeight = window.innerHeight - window.visualViewport.height;
          if (keyboardHeight < 100) {
            isKeyboardVisible = false;
            if (isChatModalOpen) {
              // チャットボックスを元の位置に戻す
              chatInputArea.style.transform = "translateY(0)";
              // 3Dモデルを再表示
              const canvasElement = viewerContainer.querySelector('canvas');
              if (canvasElement) {
                (canvasElement as HTMLElement).style.display = "block";
              }
            }
          }
        }
      }, 300);
    });
  }

  // 下部コントロールにチャットを追加
  bottomControls.appendChild(messageArea);

  // 全要素を追加
  container.appendChild(viewerContainer);
  container.appendChild(sizeArea);
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
      // すべてのボタンのスタイルを更新
      sizeButtons.forEach((btn, idx) => {
        const btnSize = availableSizes[idx];
        const selected = btnSize === currentSize;
        btn.style.background = selected ? "black" : "white";
        btn.style.color = selected ? "white" : "black";
      });
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
  backgroundImageUrl?: string; // 背景画像のURL
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
  const { glbUrl, modelUrl, textureUrl, backgroundImageUrl, onLoad, onError } = options;
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

  // Scene setup（背景画像を設定）
  const scene = new THREE.Scene();
  
  // 背景画像を読み込む
  if (backgroundImageUrl) {
    console.log("[Atelier Preview] Loading background image:", backgroundImageUrl);
    // 読み込み中は一時的に白背景を設定
    scene.background = new THREE.Color(0xffffff);
    
    const textureLoader = new TextureLoader();
    textureLoader.load(
      backgroundImageUrl,
      (texture) => {
        console.log("[Atelier Preview] Background image loaded successfully");
        // テクスチャの色空間を設定
        if ('colorSpace' in texture) {
          (texture as any).colorSpace = 'srgb';
        } else if ('encoding' in texture) {
          (texture as any).encoding = (THREE as any).sRGBEncoding;
        }
        // テクスチャの繰り返しを無効化
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        scene.background = texture;
      },
      undefined,
      (error) => {
        console.warn("[Atelier Preview] Failed to load background image:", error, backgroundImageUrl);
        // 背景画像の読み込みに失敗した場合は白背景を維持
        scene.background = new THREE.Color(0xffffff);
      }
    );
  } else {
    console.log("[Atelier Preview] No background image URL provided");
    scene.background = null; // 背景なし（透明）
  }

  // Camera（PreviewPanelのModelViewerと同じ: position: [0, 0, 5], fov: 50）
  const camera = new THREE.PerspectiveCamera(
    50, // fov: 50
    initialWidth / initialHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 5);

  // Renderer（背景画像がある場合は不透明、ない場合は透明）
  // 背景画像のURLが提供されている場合は不透明、ない場合は透明
  const hasBackground = !!backgroundImageUrl;
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: !hasBackground, // 背景画像がある場合は不透明、ない場合は透明
    powerPreference: "high-performance", // 高性能モード
  });
  // 高解像度レンダリング（Retinaディスプレイ対応）
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // 最大2倍まで
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(initialWidth, initialHeight);
  
  // 色の再現性を向上（sRGB色空間）
  // Three.js r152以降ではoutputColorSpaceを使用
  if ('outputColorSpace' in renderer) {
    (renderer as any).outputColorSpace = 'srgb';
  } else if ('outputEncoding' in renderer) {
    // 古いバージョンのThree.js用
    (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2; // 露出を少し上げて明るく
  
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ソフトシャドウ
  if (hasBackground) {
    renderer.setClearColor(0xffffff, 1); // 背景画像がある場合は白背景
  } else {
    renderer.setClearColor(0x000000, 0); // 背景を透明にする
  }
  const canvasElement = renderer.domElement;
  canvasElement.style.touchAction = "none"; // タッチイベントを有効化
  container.appendChild(canvasElement);

  // Lights（彩度を向上させるため、ライトの強度を調整）
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // 環境光を少し強く
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.0); // メインライトを強く
  directionalLight1.position.set(10, 10, 5);
  directionalLight1.castShadow = true;
  // 影の設定
  directionalLight1.shadow.mapSize.width = 2048;
  directionalLight1.shadow.mapSize.height = 2048;
  directionalLight1.shadow.camera.near = 0.5;
  directionalLight1.shadow.camera.far = 50;
  directionalLight1.shadow.camera.left = -10;
  directionalLight1.shadow.camera.right = 10;
  directionalLight1.shadow.camera.top = 10;
  directionalLight1.shadow.camera.bottom = -10;
  directionalLight1.shadow.bias = -0.0001;
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
  
  // 初期のphi（上下回転）を保存して固定
  const initialSpherical = new THREE.Spherical();
  initialSpherical.setFromVector3(camera.position);
  const fixedPhi = initialSpherical.phi; // 上下回転を固定

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

    // Rotate camera around the model（z軸回転のみ許可）
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    // z軸回転（theta）のみ変更可能、水平方向のドラッグで回転
    spherical.theta -= deltaX * 0.01; // 横方向のドラッグでz軸回転
    // 上下回転（phi）は固定
    spherical.phi = fixedPhi; // 上下回転を固定
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
    // z軸回転（theta）のみ変更可能、水平方向のドラッグで回転
    spherical.theta -= deltaX * 0.01; // 横方向のドラッグでz軸回転
    // 上下回転（phi）は固定
    spherical.phi = fixedPhi; // 上下回転を固定
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

  // 地面を追加（影を受けるため）
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0 // 透明だが影を受ける
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // 地面を水平にする
  ground.position.y = -3; // モデルの下に配置
  ground.receiveShadow = true;
  scene.add(ground);

  // Load model
  let currentModel: THREE.Group | null = null;
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();
  
  // モデルのすべてのメッシュにcastShadowを設定し、マテリアルの色空間を設定する関数
  const enableShadow = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // マテリアルの色空間を設定（彩度向上）
        if (child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          if ('colorSpace' in material) {
            (material as any).colorSpace = 'srgb';
          } else if ('encoding' in material) {
            // 古いバージョンのThree.js用
            (material as any).encoding = (THREE as any).sRGBEncoding;
          }
        }
      }
    });
  };

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
          
          // 影を有効化
          enableShadow(currentModel);
          
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
          
          // 影を有効化
          enableShadow(currentModel);
          
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
      // 地面を削除
      scene.remove(ground);
      groundGeometry.dispose();
      groundMaterial.dispose();
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
