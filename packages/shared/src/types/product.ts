// サイズは柔軟な形式に対応（文字列として扱う）
// 例: "S", "M", "L", "1", "2", "3", "28", "30", "32" など
export type ProductSize = string;

// 商品カテゴリ
export type ProductCategory = "ジャケット" | "コート" | "トップス" | "ボトムス";

export interface Product {
  id: string;
  shopId: string; // 現時点ではTEXT型（将来的にUUID型に変更予定）
  externalProductId?: string; // 外部システムの商品ID（ウィジェット連携で使用）
  name: string;
  brand?: string;
  category?: ProductCategory;
  /** 販売金額（円の整数）。税込／税抜は店舗運用に任せる */
  priceYen?: number | null;
  thumbnailUrl?: string;
  /** 開発フィットから登録した SVG＋採寸・グレーディング（リグ・デバッグ除く） */
  garmentSpec?: unknown;
  /**
   * GET /api/products の一覧レスポンスでのみ付与。アクティブな assets 行のサイズラベル（重複なし・ソート済み）。
   */
  assetSizes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  productId: string;
  size: ProductSize; // 柔軟な形式（商品のsizeTypeIdに応じて異なる）
  thumbnailUrl?: string;
  version: number;
  isActive?: boolean; // アクティブなアセットかどうか（最新バージョンのみtrue推奨）
  createdAt: string;
  updatedAt: string;
  // 着せ替え用のカテゴリー情報（Productから取得）
  category?: ProductCategory;
}

export interface Event {
  id: string;
  shopId: string; // 現時点ではTEXT型（将来的にUUID型に変更予定）
  productId?: string;
  type: EventType;
  meta?: Record<string, unknown>;
  sessionId?: string; // セッション識別子（オプション）
  userAgent?: string; // ユーザーエージェント（オプション）
  ipAddress?: string; // IPアドレス（オプション、GDPR対応）
  createdAt: string;
}

export type EventType =
  | "cube_view"
  | "cube_click"
  | "widget_open"
  | "size_change"
  | "height_change"
  | "add_to_cart_click";
