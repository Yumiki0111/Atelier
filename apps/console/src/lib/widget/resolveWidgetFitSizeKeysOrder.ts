import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { compareGenericSizePresetRow } from "@/app/(main)/development/fitting/generic/genericDevDefaults";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";

function sortSizeKeysLocale(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** プリセット行の着丈→袖丈→ラベル。行に無いキーは末尾に locale 順。 */
function sortKeysByPresetMeasures(
  keys: string[],
  presetRows: { label: string; length: number; sleeve: number }[]
): string[] {
  const uniq = [...new Set(keys)];
  const byLabel = new Map<string, { label: string; length: number; sleeve: number }>();
  for (const p of presetRows) {
    const L = String(p.label).trim();
    if (!L || byLabel.has(L)) continue;
    if (!Number.isFinite(p.length) || !Number.isFinite(p.sleeve)) continue;
    byLabel.set(L, { label: L, length: p.length, sleeve: p.sleeve });
  }
  if (byLabel.size === 0) return sortSizeKeysLocale(uniq);

  return uniq.sort((a, b) => {
    const pa = byLabel.get(a);
    const pb = byLabel.get(b);
    if (pa && pb) return compareGenericSizePresetRow(pa, pb);
    if (pa && !pb) return -1;
    if (!pa && pb) return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}

function validPresetRows(garmentSpec: unknown): { label: string; length: number; sleeve: number }[] {
  if (garmentSpec == null || typeof garmentSpec !== "object") return [];
  const gs = garmentSpec as CustomGarmentData;
  const presets = gs.genericSymmetricTop?.sizePresets ?? [];
  return presets.filter(
    (p) =>
      String(p.label).trim() !== "" &&
      Number.isFinite(p.length) &&
      Number.isFinite(p.sleeve)
  );
}

/**
 * ウィジェット／プレビュー共通: 2D 試着＋sizePresets があるときは着丈→袖丈順。
 * アセット由来のキーとプリセットラベルを和集合し、上記で並べる。
 */
export function resolveWidgetFitSizeKeysOrder(
  fromAssetKeys: string[],
  garmentSpec: unknown
): string[] {
  const fromAssets = [...new Set(fromAssetKeys.map((k) => String(k).trim()))].filter(Boolean);
  const renderable = isGarmentSpecRenderable(garmentSpec);
  const presetRows = renderable ? validPresetRows(garmentSpec) : [];
  const presetLabels = presetRows.map((p) => String(p.label).trim());

  if (renderable && presetLabels.length > 0) {
    return sortKeysByPresetMeasures([...new Set([...fromAssets, ...presetLabels])], presetRows);
  }
  if (fromAssets.length > 0) return sortSizeKeysLocale(fromAssets);
  if (renderable) {
    return presetRows.length > 0
      ? [...presetRows].sort(compareGenericSizePresetRow).map((p) => String(p.label).trim())
      : ["default"];
  }
  return [];
}
