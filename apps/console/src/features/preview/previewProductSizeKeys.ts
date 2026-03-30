import type { Product } from "@atelier/shared";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";

/** プレビュー用のサイズチップ一覧（アセット → 汎用プリセット → 既定） */
export function getPreviewSizeKeys(product: Product, assets: { size: string }[]): string[] {
  const fromAssets = [...new Set(assets.map((a) => a.size))].filter(Boolean) as string[];
  if (fromAssets.length > 0) {
    fromAssets.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return fromAssets;
  }
  if (isGarmentSpecRenderable(product.garmentSpec)) {
    const gs = product.garmentSpec as CustomGarmentData;
    const presets = gs.genericSymmetricTop?.sizePresets ?? [];
    if (presets.length > 0) {
      return [...presets.map((p) => p.label)].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
    }
    return ["default"];
  }
  return [];
}
