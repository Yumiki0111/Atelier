import type { ProductSize } from "@atelier/shared";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface PreviewPanelOptions {
  container: HTMLElement;
  glbUrl?: string;
  textureUrl?: string;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  availableSizes?: ProductSize[];
  initialSize?: ProductSize;
  onHeightChange?: (height: number) => void;
  onSizeChange?: (size: ProductSize) => void;
  onMessageSend?: (message: string) => Promise<string | null>; // レスポンスを返すように変更
  onModelLoad?: () => void;
  onModelError?: (error: Error) => void;
}

export interface PreviewPanelInstance {
  updateGlbUrl(glbUrl: string | undefined): void;
  updateHeight(height: number): void;
  updateSize(size: ProductSize): void;
  addChatMessage(message: ChatMessage): void;
  showChatHistory(): void;
  hideChatHistory(): void;
  destroy(): void;
}
