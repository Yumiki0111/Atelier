import type { ProductSize } from "@atelier/shared";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface PreviewPanelOptions {
  container: HTMLElement;
  glbUrl?: string; // 後方互換性のため残す
  modelUrl?: string; // GLBとFBXの両方をサポート（優先的に使用）
  textureUrl?: string;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  availableSizes?: ProductSize[];
  initialSize?: ProductSize;
  productName?: string; // 商品名
  onHeightChange?: (height: number) => void;
  onSizeChange?: (size: ProductSize) => void;
  onMessageSend?: (message: string) => Promise<string | null>; // レスポンスを返すように変更
  onModelLoad?: () => void;
  onModelError?: (error: Error) => void;
  onBackClick?: () => void; // ナビゲーションバーの戻るボタンがクリックされたときのコールバック
}

export interface PreviewPanelInstance {
  updateGlbUrl(glbUrl: string | undefined): void; // 後方互換性のため残す
  updateModelUrl(modelUrl: string | undefined): void; // GLBとFBXの両方をサポート
  updateHeight(height: number): void;
  updateSize(size: ProductSize): void;
  destroy(): void;
}
