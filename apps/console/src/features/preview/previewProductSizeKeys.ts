import type { Product } from "@Atelier/shared";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";
/**
 * プレビュー用のサイズチップ一覧（ウィジェットと同一の `resolveWidgetFitSizeKeysOrder`）。
 */
export function getPreviewSizeKeys(product: Product, assets: { size: string }[]): string[] {
  const fromAssets = [...new Set(assets.map((a) => a.size))].filter(Boolean) as string[];
  return resolveWidgetFitSizeKeysOrder(fromAssets, product.garmentSpec);
}
