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
      const prevLen = data.size.length;
      const nextLen = match.length;
      let chest = data.size.chest;
      let shoulder = data.size.shoulder;
      // プリセットには身幅・肩幅が無いので着丈比でグレード（`chestDiff` と「小さめ〜ゆったり」がサイズで変わるようにする）
      if (prevLen > 0.01 && Number.isFinite(chest) && Number.isFinite(shoulder)) {
        const f = nextLen / prevLen;
        chest = Math.round(chest * f * 10) / 10;
        shoulder = Math.round(shoulder * f * 10) / 10;
      }
      data.size = {
        ...data.size,
        length: nextLen,
        sleeve: match.sleeve,
        chest,
        shoulder,
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
