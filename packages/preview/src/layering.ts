import type { ProductCategory } from "@atelier/shared";

/**
 * カテゴリーごとの着せ替え順序（レイヤー順）
 * 数値が小さいほど下（内側）に配置される
 */
export const CATEGORY_LAYER_ORDER: Record<ProductCategory, number> = {
  "ボトムス": 1,    // 最下層（パンツ・スカートなど）
  "トップス": 2,    // 中層（シャツ・Tシャツなど）
  "ジャケット": 3,  // 上層（上着）
  "コート": 4,      // 最上層（アウター）
};

/**
 * デフォルトモデルのURL
 */
export const DEFAULT_MODEL_URL = "/3d/clo_model.glb";

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
 */
export function getCategoryLayerOrder(category: ProductCategory): number {
  return CATEGORY_LAYER_ORDER[category] || 999;
}
