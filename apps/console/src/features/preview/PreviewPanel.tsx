"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Product, ProductSize, Asset } from "@atelier/shared";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAssets } from "../products/useAssets";
import { useAuth } from "@/contexts/AuthContext";
import { initPreviewPanel } from "@atelier/preview";
import type { PreviewPanelInstance } from "@atelier/preview";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { PhoneFrame } from "./PhoneFrame";

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
  const [frameBounds, setFrameBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const phoneFrameRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  // 選択されたサイズに応じたアセットをカテゴリーごとに取得
  const assetsByCategory = useMemo(() => {
    if (assets.length === 0) {
      return new Map<string, Asset>();
    }
    
    // 現在選択されているサイズのアセットをフィルタ
    const sizeAssets = assets
      .filter((asset) => asset.size === currentSize && asset.isActive !== false)
      .sort((a, b) => b.version - a.version);
    
    // カテゴリーごとに最新のアセットを取得
    const categoryMap = new Map<string, Asset>();
    sizeAssets.forEach((asset) => {
      if (asset.category) {
        // 既にカテゴリーにアセットがない場合、またはより新しいバージョンの場合
        const existing = categoryMap.get(asset.category);
        if (!existing || asset.version > existing.version) {
          categoryMap.set(asset.category, asset);
        }
      }
    });
    
    return categoryMap;
  }, [assets, currentSize]);
  
  // 後方互換性のため、selectedAssetも保持（最初のアセット）
  const selectedAsset = useMemo(() => {
    if (assetsByCategory.size === 0) {
      return null;
    }
    // 最初のアセットを返す（後方互換性のため）
    return Array.from(assetsByCategory.values())[0];
  }, [assetsByCategory]);

  // 利用可能なサイズ（固定値のためメモ化不要）
  const availableSizes: ProductSize[] = ["S", "M", "L", "XL"];

  // Vanilla JSのプレビューパネルを初期化
  useEffect(() => {
    if (!previewContainerRef.current) return;

    // modelUrlを優先、なければglbUrlを使用
    const modelUrl = selectedAsset?.modelUrl || selectedAsset?.glbUrl;
    
    // 既存のインスタンスを破棄
    if (previewInstanceRef.current) {
      try {
        previewInstanceRef.current.destroy();
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[PreviewPanel] Error destroying previous instance:", error);
        }
      } finally {
        previewInstanceRef.current = null;
      }
    }

    // コンテナをクリア
    if (previewContainerRef.current) {
      try {
        const children = Array.from(previewContainerRef.current.children);
        for (const child of children) {
          try {
            child.remove();
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[PreviewPanel] Could not remove child element:", error);
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[PreviewPanel] Could not clear container:", error);
        }
      }
    }

    const currentProductName = selectedProduct?.name;

    // アセット情報を準備（カテゴリーごと）
    const assetList = Array.from(assetsByCategory.values()).map((asset) => ({
      url: asset.modelUrl || asset.glbUrl || "",
      category: asset.category,
    })).filter((asset) => asset.url); // URLがあるもののみ

    // 新しいインスタンスを初期化（デフォルトモデル + アセット）
    // APIベースURLを取得（現在のオリジンを使用）
    const apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
    
    const instance = initPreviewPanel({
      container: previewContainerRef.current,
      glbUrl: selectedAsset?.glbUrl, // 後方互換性のため残す
      modelUrl: modelUrl, // 後方互換性のため残す
      assets: assetList, // 着せ替え用アセット
      textureUrl: selectedProduct?.thumbnailUrl,
      apiBaseUrl, // APIベースURLを渡す（widgetと同じ）
      initialHeight: 170, // widgetと同じ固定値
      minHeight: 150,
      maxHeight: 190,
      availableSizes, // widgetと同じ固定値
      initialSize: currentSize,
      productName: currentProductName,
      onBackClick: () => {
        // 戻るボタンは不要
      },
      onSizeChange: (newSize) => {
        setCurrentSize(newSize);
      },
      onHeightChange: (newHeight) => {
        setHeight(newHeight);
      },
      onModelLoad: () => {
        // モデル読み込み完了
      },
      onModelError: (error) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[PreviewPanel] Failed to load 3D model:", error, modelUrl);
        }
      },
    });

    previewInstanceRef.current = instance;

    // クリーンアップ
    return () => {
      if (previewInstanceRef.current) {
        try {
          previewInstanceRef.current.destroy();
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("[PreviewPanel] Error destroying preview instance:", error);
          }
        } finally {
          previewInstanceRef.current = null;
        }
      }
    };
  }, [selectedAsset?.modelUrl, selectedAsset?.glbUrl, selectedProduct?.thumbnailUrl, selectedProduct?.name, assetsByCategory, currentSize, availableSizes]);

  // サイズが変更されたときに、対応するアセットを更新
  useEffect(() => {
    if (previewInstanceRef.current) {
      // アセット情報を準備（カテゴリーごと）
      const assetList = Array.from(assetsByCategory.values()).map((asset) => ({
        url: asset.modelUrl || asset.glbUrl || "",
        category: asset.category,
      })).filter((asset) => asset.url); // URLがあるもののみ
      
      // アセットを更新
      previewInstanceRef.current.updateAssets(assetList);
    }
  }, [assetsByCategory, currentSize]);

  // 身長が変更されたときに更新
  useEffect(() => {
    if (previewInstanceRef.current) {
      previewInstanceRef.current.updateHeight(height);
    }
  }, [height]);


  // Enterキーでモーダルが閉じるのを防ぐ
  const rootRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      if (!(e instanceof KeyboardEvent)) return;
      
      if (e.key === "Enter") {
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    const rootElement = rootRef.current;
    if (rootElement) {
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
      className="flex h-screen flex-col shadow-lg overflow-hidden bg-white" 
      style={{ width: '400px' }}
      onKeyDownCapture={(e) => {
        if (e.key === "Enter") {
          const activeElement = document.activeElement;
          if (
            activeElement &&
            (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
          ) {
            return;
          }
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

      {/* Preview container - フレーム画像と赤枠、3Dプレビューを配置 */}
      <div 
        ref={previewWrapperRef}
        className="flex-1 relative flex items-center justify-center p-6 bg-gray-100 overflow-hidden"
      >
        {/* PhoneFrame - フレーム画像と赤枠 */}
        <PhoneFrame 
          ref={phoneFrameRef}
          previewContainerRef={previewContainerRef}
          selectedAsset={selectedAsset}
          onFrameBoundsChange={setFrameBounds}
          borderRef={borderRef}
        >
          {/* 3Dプレビューコンテナ - 赤枠の中に配置 */}
          <div
            ref={previewContainerRef}
            style={{
              position: 'absolute',
              left: '0px',
              top: '0px',
              width: '100%',
              height: '100%',
              zIndex: 10,
            }}
          />
        </PhoneFrame>
      </div>
    </div>
  );
}
