import type { ProductSize } from "@atelier/shared";

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
  onHeightChange?: (height: number) => void;
  onSizeChange?: (size: ProductSize) => void;
  onModelLoad?: () => void;
  onModelError?: (error: Error) => void;
  onBackClick?: () => void; // ナビゲーションバーの戻るボタンがクリックされたときのコールバック
  onOutfitClick?: (container: HTMLElement) => void; // 着せ替えパネルを表示するコールバック（containerを渡す）
  currentProductId?: string; // 現在の商品ID（着せ替えパネル用）
  onFloatingButtonsReady?: (floatingButtons: HTMLElement) => void; // フローティングボタンが準備できたときに呼ばれるコールバック
}

export interface PreviewPanelInstance {
  updateGlbUrl(glbUrl: string | undefined): void; // 後方互換性のため残す
  updateModelUrl(modelUrl: string | undefined): void; // GLBとFBXの両方をサポート
  updateAssets(assets: Array<{ url: string; category?: string }>): void; // 着せ替え用アセットを更新
  updateHeight(height: number): void;
  updateSize(size: ProductSize): void;
  destroy(): void;
}
