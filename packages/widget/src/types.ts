export interface WidgetDesignConfig {
  /** public-key 経由で解決したショップ ID（分析・イベント紐付け用） */
  shopId?: string;
  button?: {
    color?: string; // ボタンの色
    text?: string; // 文言
    shape?: "circle" | "pill"; // 形状: 円 or 横長円
    imageUrl?: string; // 画像URL（円の場合は必須、横長円の場合は任意）
  };
  /** フォン画面内のベース背景（ヘッダー〜フッター） */
  interfaceBackgroundColor?: string;
  /** 試着 SVG 描画エリアの背景 */
  canvasBackgroundColor?: string;
  /** メイン下部 CTA（カート）の文言 */
  ctaCartLabel?: string;
  /** 体型調整シートの確定ボタン文言 */
  ctaTryOnLabel?: string;
  /** カート／体型確定ボタン・サイズ選択・スライダー等のアクセント色 */
  ctaAccentColor?: string;
  /** `inline` = size-row embed; `floating` = fixed bottom-right */
  launcherPlacement?: "floating" | "inline";
}

/** カラー切替用。API の asset.colors を返したときのみウィジェットに色 UI を表示する */
export interface WidgetColorSwatch {
  id: string;
  hex: string;
  label?: string;
}

export interface WidgetConfig {
  enabled: boolean;
  /** public-key 経由で解決したショップ ID（分析・イベント紐付け用） */
  shopId?: string;
  error?: string; // エラーメッセージ（enabled: falseの場合）
  asset?: {
    defaultSize: string; // 柔軟なサイズ形式（"S", "M", "L", "1", "2", "3", "28", "30"など）
    /** サイズキー一覧（2Dウィジェットではグレーディング表示のみに使用） */
    sizes: Record<string, { category?: string }[]>;
    productName?: string;
    thumbnailUrl?: string;
    /** 例: "¥ 110,000 tax in" */
    priceDisplay?: string;
    colors?: WidgetColorSwatch[];
    /** 商品DBの garment_spec により `/api/public/widget-fit-svg` で試着表示可能 */
    garmentFitAvailable?: boolean;
  };
  design?: WidgetDesignConfig;
}
