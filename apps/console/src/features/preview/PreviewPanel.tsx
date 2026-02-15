"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import type { Product, ProductSize, Asset } from "@atelier/shared";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAssets } from "../products/useAssets";
import { initPreviewPanel } from "@atelier/preview";
import type { PreviewPanelInstance, OutfitAssetsData, OutfitAssetItem } from "@atelier/preview";
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
  const [height, setHeight] = useState(170);
  const [currentSize, setCurrentSize] = useState<ProductSize>(
    selectedSize || "M"
  );
  const { data: assets = [] } = useAssets(selectedProduct?.id);
  const [outfitAssets, setOutfitAssets] = useState<OutfitAssetsData>({ categories: {} });

  // 現在の3Dビューアに表示中のアセット（カテゴリ→URL のマッピング）
  const activeAssetsRef = useRef<Map<string, { url: string; category: string }>>(new Map());

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewInstanceRef = useRef<PreviewPanelInstance | null>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  // ショップ全体のアセットを取得
  const fetchOutfitAssets = useCallback(async (size: ProductSize) => {
    try {
      const params = new URLSearchParams({ size });
      const response = await authenticatedFetch(`/api/assets/by-shop?${params.toString()}`);
      if (response.ok) {
        const data: OutfitAssetsData = await response.json();
        setOutfitAssets(data);
        return data;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[PreviewPanel] Failed to fetch outfit assets:", error);
      }
    }
    return { categories: {} } as OutfitAssetsData;
  }, []);

  // 着せ替えアセット選択ハンドラ
  const handleOutfitAssetSelect = useCallback((asset: OutfitAssetItem | null, category?: string) => {
    if (!previewInstanceRef.current) return;

    // 選択解除の場合（assetがnull）
    if (asset === null && category) {
      // 指定されたカテゴリーのアセットを削除
      activeAssetsRef.current.delete(category);
      
      // 全アクティブアセットを3Dビューアに反映
      const allAssets = Array.from(activeAssetsRef.current.values());
      previewInstanceRef.current.updateAssets(allAssets);
      return;
    }

    // assetがnullでないことを確認
    if (!asset) return;

    // 選択されたアセットのカテゴリで既存アセットを置き換え
    activeAssetsRef.current.set(asset.category, {
      url: asset.modelUrl,
      category: asset.category,
    });

    // コートとジャケットは同じ階層なので、一方を選択したらもう一方を削除
    if (asset.category === "コート") {
      activeAssetsRef.current.delete("ジャケット");
    } else if (asset.category === "ジャケット") {
      activeAssetsRef.current.delete("コート");
    }

    // 全アクティブアセットを3Dビューアに反映
    const allAssets = Array.from(activeAssetsRef.current.values());
    previewInstanceRef.current.updateAssets(allAssets);
  }, []);

  // 選択されたサイズに応じたアセットを取得（すべてのアセットを表示）
  const assetsByCategory = useMemo(() => {
    if (assets.length === 0) {
      return new Map<string, Asset[]>();
    }
    
    // 現在選択されているサイズのアセットをフィルタ
    const sizeAssets = assets
      .filter((asset) => asset.size === currentSize && asset.isActive !== false)
      .sort((a, b) => b.version - a.version);

    // カテゴリーごとにすべてのアセットを取得（同じカテゴリーのアセットをすべて表示）
    const categoryMap = new Map<string, Asset[]>();
    sizeAssets.forEach((asset) => {
      if (asset.category) {
        const existing = categoryMap.get(asset.category);
        if (!existing) {
          // カテゴリーが存在しない場合は、新しい配列を作成
          categoryMap.set(asset.category, [asset]);
        } else {
          // 既にカテゴリーにアセットがある場合、同じIDのアセットがなければ追加
          // 同じカテゴリーのアセットをすべて表示（異なる商品やバージョンの場合）
          if (!existing.some(a => a.id === asset.id)) {
            existing.push(asset);
          }
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
    // 最初のアセット配列の最初のアセットを返す（後方互換性のため）
    const firstCategoryAssets = Array.from(assetsByCategory.values())[0];
    return firstCategoryAssets && firstCategoryAssets.length > 0 ? firstCategoryAssets[0] : null;
  }, [assetsByCategory]);

  // 利用可能なサイズ（固定値のためメモ化不要）
  const availableSizes: ProductSize[] = ["S", "M", "L", "XL"];

  // Vanilla JSのプレビューパネルを初期化
  useEffect(() => {
    if (!previewContainerRef.current) return;

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

    // ベースモデル（人）のURLを指定（同じリグを持つモデル）
    const baseModelUrl = "/3d/clo_model_men.glb";

    // 新しいインスタンスを初期化（初期化時はアセットなし、後でupdateAssetsで追加）
    // APIベースURLを取得（現在のオリジンを使用）
    const apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
    
    // 着せ替えアセットを取得
    fetchOutfitAssets(currentSize).then((data) => {
      if (previewInstanceRef.current) {
        previewInstanceRef.current.updateOutfitAssets(data);
      }
    });
    
    const instance = initPreviewPanel({
      container: previewContainerRef.current,
      modelUrl: baseModelUrl, // ベースモデル（人）のURL
      assets: [], // 初期化時は空、後でupdateAssetsで追加
      textureUrl: selectedProduct?.thumbnailUrl,
      apiBaseUrl, // APIベースURLを渡す（widgetと同じ）
      initialHeight: 170, // widgetと同じ固定値
      minHeight: 150,
      maxHeight: 190,
      availableSizes, // widgetと同じ固定値
      initialSize: currentSize,
      productName: currentProductName,
      outfitAssets, // カテゴリ別着せ替えアセット
      onOutfitAssetSelect: handleOutfitAssetSelect,
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
          console.error("[PreviewPanel] Failed to load 3D model:", error, baseModelUrl);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]); // 商品が変更されたときのみ再初期化

  // サイズが変更されたときに、対応するアセットを更新
  // 注意: 初期化時（previewInstanceRef.currentがnullの場合）は実行しない
  useEffect(() => {
    // 初期化が完了している場合のみ更新
    if (previewInstanceRef.current) {
      // activeAssetsRefを更新（現在の商品のアセット）
      activeAssetsRef.current.clear();
      
      // アセット情報を準備（カテゴリーごと、すべてのアセットを表示）
      const assetList: Array<{ url: string; category?: string }> = [];
      assetsByCategory.forEach((assetArray, _category) => {
        assetArray.forEach((asset) => {
          const url = asset.modelUrl || asset.glbUrl || "";
          if (url) {
            assetList.push({
              url,
              category: asset.category,
            });
            // activeAssetsRefにも登録
            if (asset.category) {
              activeAssetsRef.current.set(asset.category, {
                url,
                category: asset.category,
              });
            }
          }
        });
      });
      
      // アセットを更新
      previewInstanceRef.current.updateAssets(assetList);
    }
  }, [assetsByCategory, currentSize, selectedProduct?.name]);

  // サイズ変更時に着せ替えアセットも再取得
  useEffect(() => {
    if (previewInstanceRef.current) {
      fetchOutfitAssets(currentSize).then((data) => {
        if (previewInstanceRef.current) {
          previewInstanceRef.current.updateOutfitAssets(data);
        }
      });
    }
  }, [currentSize, fetchOutfitAssets]);

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
      className="flex h-screen flex-col overflow-hidden bg-white" 
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
        className="flex-1 relative flex items-center justify-center p-6 bg-white overflow-hidden"
      >
        {/* PhoneFrame - フレーム画像と赤枠 */}
        <PhoneFrame
          previewContainerRef={previewContainerRef}
          selectedAsset={selectedAsset}
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
