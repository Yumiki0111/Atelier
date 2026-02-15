export interface WidgetDesignConfig {
  backgroundImage?: string;
  backgroundColor?: string;
  theme?: "light" | "dark";
  button?: {
    text?: string;
    color?: string;
    radius?: number;
    width?: number;
    height?: number;
    fontSize?: number;
    borderWidth?: number;
    borderColor?: string;
    shadow?: boolean;
  };
}

export interface WidgetConfig {
  enabled: boolean;
  error?: string; // エラーメッセージ（enabled: falseの場合）
  asset?: {
    defaultSize: string; // 柔軟なサイズ形式（"S", "M", "L", "1", "2", "3", "28", "30"など）
    sizes: Record<string, { glbUrl?: string; modelUrl?: string; category?: string }[]>; // 各サイズに対して複数のカテゴリーのアセットを配列で返す
    productName?: string; // 商品名
    thumbnailUrl?: string; // 商品画像URL
  };
  design?: WidgetDesignConfig;
}
