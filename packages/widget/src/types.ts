export interface WidgetConfig {
  enabled: boolean;
  asset?: {
    defaultSize: string; // 柔軟なサイズ形式（"S", "M", "L", "1", "2", "3", "28", "30"など）
    sizes: Record<string, { glbUrl?: string; modelUrl?: string }>; // GLBとFBXの両方をサポート
  };
}
