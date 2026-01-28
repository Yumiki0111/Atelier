// Shop (ショップ/テナント)
export interface Shop {
  id: string; // UUID
  name: string;
  domain?: string;
  platform?: "shopify" | "custom" | "other";
  apiKey?: string; // 暗号化推奨
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// User (認証ユーザー)
export interface User {
  id: string; // UUID (auth.users.idと一致)
  shopId: string; // UUID
  role: "owner" | "admin" | "member";
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

// Size Type (サイズタイプ)
export interface SizeType {
  id: string; // UUID
  name: string; // 'letter', 'number', 'waist', 'custom'
  displayName: string; // 'レターサイズ', '数字サイズ', 'ウエストサイズ'
  sizes: string[]; // 利用可能なサイズの配列
  createdAt: string;
}

// Widget Config (ウィジェット設定)
export interface WidgetConfig {
  id: string; // UUID
  shopId: string; // UUID
  config: Record<string, unknown>; // ウィジェット設定
  createdAt: string;
  updatedAt: string;
}
