import type { ProductCategory } from "@Atelier/shared";

/**
 * カテゴリーごとの着せ替え順序（レイヤー順）
 * 数値が小さいほど下（内側）に配置される
 */
export const CATEGORY_LAYER_ORDER: Record<ProductCategory, number> = {
  "ボトムス": 1,    // 最下層（パンツ・スカートなど）
  "トップス": 2,    // 中層（シャツ・Tシャツ・ジャケット・コート - 同じレイヤー）
  "ジャケット": 2,  // 中層（トップス・コートと同じレイヤー）
  "コート": 2,      // 中層（トップス・ジャケットと同じレイヤー）
};

/**
 * デフォルトモデルのURL
 */
export const DEFAULT_MODEL_URL = "/3d/Model.fbx";

/**
 * カテゴリーの順序に従ってソート
 */
export function sortCategoriesByLayer(categories: ProductCategory[]): ProductCategory[] {
  return [...categories].sort((a, b) => {
    const orderA = CATEGORY_LAYER_ORDER[a] || 999;
    const orderB = CATEGORY_LAYER_ORDER[b] || 999;
    return orderA - orderB;
  });
}

/**
 * カテゴリーのレイヤー順序を取得
 * 未知のカテゴリーの場合は999（最後尾）を返す
 */
export function getCategoryLayerOrder(category: string): number {
  return CATEGORY_LAYER_ORDER[category as ProductCategory] || 999;
}
