// サイズは柔軟な形式に対応（文字列として扱う）
// 例: "S", "M", "L", "1", "2", "3", "28", "30", "32" など
export type ProductSize = string;

// 商品カテゴリ
export type ProductCategory = "ジャケット" | "コート" | "トップス" | "ボトムス";

export interface Product {
  id: string;
  shopId: string; // 現時点ではTEXT型（将来的にUUID型に変更予定）
  externalProductId?: string; // 外部システムの商品ID（CSV取り込み時に使用）
  name: string;
  brand?: string;
  category?: ProductCategory;
  sku?: string;
  handle?: string;
  url?: string;
  sizeTypeId?: string; // UUID形式の文字列（size_typesテーブルへの参照）
  thumbnailUrl?: string;
  previewImageUrl?: string;
  description?: string; // 商品説明
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  productId: string;
  size: ProductSize; // 柔軟な形式（商品のsizeTypeIdに応じて異なる）
  glbUrl: string;
  thumbnailUrl?: string;
  version: number;
  isActive?: boolean; // アクティブなアセットかどうか（最新バージョンのみtrue推奨）
  createdAt: string;
  updatedAt: string;
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
