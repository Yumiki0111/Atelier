import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { GARMENT_FLAT_CM_ORDERED_SIZE_LABELS } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import {
  inferGarmentFlatCmSizeKey,
  parseFlatCmSizeKey,
} from "@/lib/widget-fit/widgetFitFlatCmSize";

function sortSizeKeysLocale(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function sortKeysByFlatCmCatalog(keys: string[], sizeOrder: readonly string[]): string[] {
  const uniq = [...new Set(keys.map((k) => String(k).trim()).filter(Boolean))];
  const orderIndex = new Map(sizeOrder.map((k, i) => [k, i] as const));
  return uniq.sort((a, b) => {
    const ia = orderIndex.get(a);
    const ib = orderIndex.get(b);
    if (ia != null && ib != null) return ia - ib;
    if (ia != null) return -1;
    if (ib != null) return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}

/**
 * ウィジェット／プレビュー: 平置き cm プリセットはカタログ順。それ以外のキーは locale 順。
 */
export function resolveWidgetFitSizeKeysOrder(
  fromAssetKeys: string[],
  garmentSpec: unknown
): string[] {
  const fromAssets = [...new Set(fromAssetKeys.map((k) => String(k).trim()))].filter(Boolean);
  const gs = garmentSpec as CustomGarmentData | null | undefined;
  if (gs != null && isGarmentFlatCmPresetId(gs.presetId)) {
    const flatCmSizeOrder = [...GARMENT_FLAT_CM_ORDERED_SIZE_LABELS];
    const raw = gs as unknown as Record<string, unknown>;
    const offeredRaw = raw.flatCmOfferedSizeLabels;
    if (Array.isArray(offeredRaw) && offeredRaw.length > 0) {
      const fromOffered = offeredRaw
        .map((k) => parseFlatCmSizeKey(String(k)))
        .filter((k): k is NonNullable<typeof k> => k != null);
      if (fromOffered.length > 0) {
        return sortKeysByFlatCmCatalog([...new Set(fromOffered)], flatCmSizeOrder);
      }
    }
    const parsedFromAssets = fromAssets
      .map((k) => parseFlatCmSizeKey(String(k)))
      .filter((k): k is NonNullable<typeof k> => k != null);
    if (parsedFromAssets.length > 0) {
      return sortKeysByFlatCmCatalog([...new Set(parsedFromAssets)], flatCmSizeOrder);
    }
    const inferred = inferGarmentFlatCmSizeKey(gs);
    if (inferred) return [inferred];
    return [...flatCmSizeOrder];
  }
  if (fromAssets.length > 0) return sortSizeKeysLocale(fromAssets);
  return [];
}
