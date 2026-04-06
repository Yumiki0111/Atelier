import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { validateGarmentSpecForProduction } from "@/lib/products/validateGarmentSpecForProduction";

/** ウィジェットで選んだサイズラベルに合わせて `sizePresets` の着丈・袖丈を反映（開発のプリセット切替と同趣旨） */
export function applyWidgetSizeToCustomGarmentData(
  base: CustomGarmentData,
  selectedSize: string
): CustomGarmentData {
  const data = JSON.parse(JSON.stringify(base)) as CustomGarmentData;
  const presets = data.genericSymmetricTop?.sizePresets;
  if (presets && presets.length > 0) {
    const match = presets.find((p) => p.label === selectedSize);
    if (match) {
      data.size = {
        ...data.size,
        length: match.length,
        sleeve: match.sleeve,
      };
    }
  }
  return data;
}

/**
 * ウィジェット・プレビューで 2D 試着を出せるか（本番: 汎用トップ + モデルと同本数のリグ）。
 */
export function isGarmentSpecRenderable(spec: unknown): spec is CustomGarmentData {
  if (!spec || typeof spec !== "object") return false;
  const p = spec as { pathDs?: unknown };
  if (!Array.isArray(p.pathDs) || p.pathDs.length === 0 || typeof p.pathDs[0] !== "string") {
    return false;
  }
  return validateGarmentSpecForProduction(spec).ok;
}
