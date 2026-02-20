import type { ProductSize } from "@atelier/shared";

/**
 * 着せ替えパネルに表示するアセットアイテム
 */
export interface OutfitAssetItem {
  id: string;
  productId: string;
  productName: string;
  modelUrl: string;
  thumbnailUrl: string | null;
  category: string;
  size: string;
}

/**
 * カテゴリ別のアセットデータ
 */
export interface OutfitAssetsData {
  categories: Record<string, OutfitAssetItem[]>;
}

export interface PreviewPanelOptions {
  container: HTMLElement;
  glbUrl?: string; // 後方互換性のため残す
  modelUrl?: string; // GLBとFBXの両方をサポート（優先的に使用）
  assets?: Array<{ url: string; category?: string }>; // 着せ替え用のアセットリスト
  textureUrl?: string;
  apiBaseUrl?: string; // APIベースURL（デフォルトモデルのURL構築に使用）
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  availableSizes?: ProductSize[];
  initialSize?: ProductSize;
  productName?: string; // 商品名
  outfitAssets?: OutfitAssetsData; // 着せ替えパネルに表示するカテゴリ別アセット
  onHeightChange?: (height: number) => void;
  onSizeChange?: (size: ProductSize) => void;
  onModelLoad?: () => void;
  onModelError?: (error: Error) => void;
  onBackClick?: () => void; // ナビゲーションバーの戻るボタンがクリックされたときのコールバック
  onOutfitClick?: (container: HTMLElement) => void; // 着せ替えパネルを表示するコールバック（containerを渡す）
  onOutfitAssetSelect?: (asset: OutfitAssetItem | null, category?: string) => void; // 着せ替えアセットが選択されたときのコールバック（nullの場合は選択解除）
  currentProductId?: string; // 現在の商品ID（着せ替えパネル用）
  onFloatingButtonsReady?: (floatingButtons: HTMLElement) => void; // フローティングボタンが準備できたときに呼ばれるコールバック
}

export interface PreviewPanelInstance {
  updateGlbUrl(glbUrl: string | undefined): void; // 後方互換性のため残す
  updateModelUrl(modelUrl: string | undefined): void; // GLBとFBXの両方をサポート
  updateAssets(assets: Array<{ url: string; category?: string }>): void; // 着せ替え用アセットを更新
  updateOutfitAssets(data: OutfitAssetsData): void; // 着せ替えパネルのアセットデータを更新
  updateHeight(height: number, baseHeight?: number): void;
  updateSize(size: ProductSize): void;
  updateProductName(name: string): void; // 商品名を更新
  toggleAsset?(category: string, visible?: boolean): void; // アセットの表示/非表示を切り替え
  destroy(): void;
}
