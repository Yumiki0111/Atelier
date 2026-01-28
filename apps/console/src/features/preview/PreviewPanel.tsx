"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Product, ProductSize } from "@atelier/shared";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAssets } from "../products/useAssets";
import { useAuth } from "@/contexts/AuthContext";
import { initPreviewPanel } from "@atelier/preview";
import type { PreviewPanelInstance } from "@atelier/preview";
import { authenticatedFetch } from "@/lib/auth/api-client";

interface PreviewPanelProps {
  selectedProduct?: Product;
  selectedSize?: ProductSize;
}

export function PreviewPanel({
  selectedProduct,
  selectedSize,
}: PreviewPanelProps) {
  const { togglePreview } = useProductSelection();
  const { shopId } = useAuth();
  const [height, setHeight] = useState(170);
  const [currentSize, setCurrentSize] = useState<ProductSize>(
    selectedSize || "M"
  );
  const { data: assets = [] } = useAssets(selectedProduct?.id);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewInstanceRef = useRef<PreviewPanelInstance | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const sessionIdRef = useRef<string | undefined>(undefined);

  // 選択されたサイズに応じたアセットの最新バージョンを取得
  const selectedAsset = useMemo(() => {
    if (assets.length === 0) {
      // アセットがない場合はnullを返す（モックデータは使用しない）
      return null;
    }
    
    // 現在選択されているサイズのアセットをフィルタ
    const sizeAssets = assets
      .filter((asset) => asset.size === currentSize && asset.isActive !== false)
      .sort((a, b) => b.version - a.version);
    
    // 該当サイズのアセットがない場合、他のサイズから最新のものを取得
    if (sizeAssets.length === 0) {
      const allAssets = assets
        .filter((asset) => asset.isActive !== false)
        .sort((a, b) => b.version - a.version);
      return allAssets.length > 0 ? allAssets[0] : null;
    }
    
    return sizeAssets[0];
  }, [assets, currentSize]);

  // 利用可能なサイズを取得（アセットから動的に取得）
  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    assets.forEach((asset) => {
      if (asset.isActive !== false) {
        sizes.add(asset.size);
      }
    });
    // アセットがない場合はデフォルトサイズを返す
    return sizes.size > 0 ? Array.from(sizes).sort() : ["S", "M", "L"];
  }, [assets]);

  // Vanilla JSのプレビューパネルを初期化
  useEffect(() => {
    if (!previewContainerRef.current) return;

    console.log("[PreviewPanel] Initializing preview panel:", {
      glbUrl: selectedAsset?.glbUrl,
      hasAsset: !!selectedAsset,
      assetsCount: assets.length,
      availableSizes,
      currentSize,
    });

    // 既存のインスタンスを破棄（新しいインスタンスを作成する前に）
    if (previewInstanceRef.current) {
      try {
        previewInstanceRef.current.destroy();
      } catch (error) {
        console.error("[PreviewPanel] Error destroying previous instance:", error);
      } finally {
        previewInstanceRef.current = null;
      }
    }

    // コンテナをクリア（destroy()の後、新しいインスタンスを作成する前）
    // innerHTMLは使わず、個別にremove()で削除（Reactとの競合を避けるため）
    if (previewContainerRef.current) {
      try {
        // 子要素を配列にコピーしてから削除（削除中にDOMが変更されるのを防ぐ）
        const children = Array.from(previewContainerRef.current.children);
        for (const child of children) {
          try {
            child.remove();
          } catch (error) {
            // 個別の削除エラーは無視
            console.warn("[PreviewPanel] Could not remove child element:", error);
          }
        }
      } catch (error) {
        console.warn("[PreviewPanel] Could not clear container:", error);
      }
    }

    // アセットがない場合は初期化しない
    if (!selectedAsset?.glbUrl) {
      console.warn("[PreviewPanel] No asset available, skipping initialization");
      return;
    }

    // 新しいインスタンスを初期化
    const instance = initPreviewPanel({
      container: previewContainerRef.current,
      glbUrl: selectedAsset.glbUrl,
      textureUrl: selectedProduct?.previewImageUrl,
      initialHeight: height,
      minHeight: 150,
      maxHeight: 190,
      availableSizes: availableSizes as ProductSize[],
      initialSize: currentSize,
      onSizeChange: (newSize) => {
        setCurrentSize(newSize);
      },
      onHeightChange: (newHeight) => {
        setHeight(newHeight);
      },
      onMessageSend: async (message) => {
        // isSendingMessageの状態を確認（refを使用して最新の値を取得）
        if (isSendingMessage) return null;
        
        setIsSendingMessage(true);
        try {
          // 最新の値を取得するために、現在の値を直接使用
          const currentProductId = selectedProduct?.id;
          const currentShopId = shopId;
          const currentProductName = selectedProduct?.name;
          const currentSizeValue = currentSize;
          const currentHeightValue = height;
          
          const response = await authenticatedFetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message,
              productId: currentProductId,
              shopId: currentShopId,
              conversationId: conversationIdRef.current,
              sessionId: sessionIdRef.current,
              context: {
                productName: currentProductName,
                size: currentSizeValue,
                height: currentHeightValue,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error("[PreviewPanel] Chat API error:", error);
            throw new Error(error.message || "メッセージの送信に失敗しました");
          }

          const data = await response.json();
          
          // 会話IDとセッションIDを保存（次回のリクエストで使用）
          if (data.conversationId) {
            conversationIdRef.current = data.conversationId;
          }
          if (data.sessionId) {
            sessionIdRef.current = data.sessionId;
          }
          
          return data.response;
        } catch (error) {
          console.error("[PreviewPanel] Failed to send message:", error);
          throw error;
        } finally {
          setIsSendingMessage(false);
        }
      },
      onModelLoad: () => {
        console.log("[PreviewPanel] 3D model loaded:", selectedAsset.glbUrl);
      },
      onModelError: (error) => {
        console.error("[PreviewPanel] Failed to load 3D model:", error, selectedAsset.glbUrl);
      },
    });

    previewInstanceRef.current = instance;

    // クリーンアップ
    return () => {
      if (previewInstanceRef.current) {
        try {
          previewInstanceRef.current.destroy();
        } catch (error) {
          console.error("[PreviewPanel] Error destroying preview instance:", error);
        } finally {
          previewInstanceRef.current = null;
        }
      }
    };
    // 依存配列を最小限に（isSendingMessageは削除 - コールバック内で最新の値を取得）
    // availableSizesはuseMemoでメモ化されているので、参照が変わったときだけ再初期化される
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset?.glbUrl, selectedProduct?.previewImageUrl, availableSizes, currentSize, height]);

  // サイズが変更されたときに、対応するアセットのGLB URLを更新
  useEffect(() => {
    if (previewInstanceRef.current && selectedAsset?.glbUrl) {
      previewInstanceRef.current.updateGlbUrl(selectedAsset.glbUrl);
    }
  }, [selectedAsset?.glbUrl, currentSize]);

  // 身長が変更されたときに更新
  useEffect(() => {
    if (previewInstanceRef.current) {
      previewInstanceRef.current.updateHeight(height);
    }
  }, [height]);

  // Enterキーでモーダルが閉じるのを防ぐ（ネイティブイベントリスナー）
  const rootRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      if (!(e instanceof KeyboardEvent)) return;
      
      if (e.key === "Enter") {
        // アクティブな要素がinputまたはtextareaの場合、preview.tsで処理される
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
        ) {
          // 入力フィールド内でのEnterキーは、preview.tsで処理される
          // ここでは何もしない（イベントの伝播を止めない）
          return;
        }
        // 入力フィールド外でのEnterキーは無視（モーダルを閉じない）
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    const rootElement = rootRef.current;
    if (rootElement) {
      // captureフェーズとbubbleフェーズの両方でイベントをキャッチ
      rootElement.addEventListener("keydown", handleKeyDown, true);
      rootElement.addEventListener("keydown", handleKeyDown, false);
    }

    return () => {
      if (rootElement) {
        rootElement.removeEventListener("keydown", handleKeyDown, true);
        rootElement.removeEventListener("keydown", handleKeyDown, false);
      }
    };
  }, []);

  return (
    <div 
      ref={rootRef}
      className="flex h-screen flex-col shadow-lg overflow-hidden" 
      style={{ width: '390px' }}
      onKeyDownCapture={(e) => {
        // captureフェーズでイベントをキャッチ（他のイベントリスナーより先に処理）
        if (e.key === "Enter") {
          // アクティブな要素がinputまたはtextareaの場合、preview.tsで処理される
          const activeElement = document.activeElement;
          if (
            activeElement &&
            (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
          ) {
            // 入力フィールド内でのEnterキーは、preview.tsで処理される
            // ここでは何もしない（イベントの伝播を止めない）
            return;
          }
          // 入力フィールド外でのEnterキーは無視（モーダルを閉じない）
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b bg-white">
        <h2 className="text-lg font-semibold">プレビュー</h2>
        <button
          onClick={togglePreview}
          className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
          aria-label="プレビューを閉じる"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Product info */}
      {selectedProduct && (
        <div className="px-6 py-3 text-sm text-gray-600 border-b bg-gray-50">
          <p className="font-medium">{selectedProduct.name}</p>
        </div>
      )}

      {/* Modal container - 中央配置用 */}
      <div 
        className="flex-1 flex items-center justify-center p-6 bg-gray-100 overflow-hidden"
      >
        {/* Frame container - 300px x 600px、transformなし */}
        <div 
          className="flex flex-col relative overflow-hidden"
          style={{
            width: '300px',
            height: '600px',
            border: '3px solid black',
            borderRadius: '16px',
            background: 'white',
          }}
        >
          {/* Content wrapper - 横padding 4px、縦padding 24px */}
          <div 
            className="flex-1 flex flex-col relative overflow-hidden"
            style={{
              padding: '24px 4px',
              boxSizing: 'border-box',
            }}
          >
            {/* Content area - widgetのcontentAreaと同じ */}
            {selectedAsset?.glbUrl ? (
              <div 
                ref={previewContainerRef}
                className="flex-1 flex flex-col overflow-hidden"
                style={{
                  minHeight: 0,
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">アセットがありません</p>
                  <p className="text-xs">アセット管理から3Dモデルを追加してください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
