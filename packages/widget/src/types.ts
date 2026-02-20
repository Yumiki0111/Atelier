export interface WidgetDesignConfig {
  button?: {
    color?: string; // ボタンの色
    text?: string; // 文言
    shape?: "circle" | "pill"; // 形状: 円 or 横長円
    imageUrl?: string; // 画像URL（円の場合は必須、横長円の場合は任意）
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
