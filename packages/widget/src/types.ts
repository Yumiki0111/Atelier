export interface WidgetConfig {
  enabled: boolean;
  error?: string; // エラーメッセージ（enabled: falseの場合）
  asset?: {
    defaultSize: string; // 柔軟なサイズ形式（"S", "M", "L", "1", "2", "3", "28", "30"など）
    sizes: Record<string, { glbUrl?: string; modelUrl?: string }>; // GLBとFBXの両方をサポート
  };
}
