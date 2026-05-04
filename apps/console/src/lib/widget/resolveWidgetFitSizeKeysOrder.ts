import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { GRADING_V4_ORDERED_SIZE_LABELS } from "@/app/(main)/development/fitting/gradingV4/gradingV4GarmentCm";
import { parseGradingV4SizeKey } from "@/lib/widget-fit/widgetFitGradingSize";

function sortSizeKeysLocale(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function sortKeysByGradingCatalog(keys: string[], gradingOrder: readonly string[]): string[] {
  const uniq = [...new Set(keys.map((k) => String(k).trim()).filter(Boolean))];
  const orderIndex = new Map(gradingOrder.map((k, i) => [k, i] as const));
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
 * ウィジェット／プレビュー: Grading v4 はカタログ順。それ以外のキーは locale 順。
 */
export function resolveWidgetFitSizeKeysOrder(
  fromAssetKeys: string[],
  garmentSpec: unknown
): string[] {
  const fromAssets = [...new Set(fromAssetKeys.map((k) => String(k).trim()))].filter(Boolean);
  const gs = garmentSpec as CustomGarmentData | null | undefined;
  if (gs?.presetId === "gradingV4") {
    const gradingOrder = [...GRADING_V4_ORDERED_SIZE_LABELS];
    const parsed = fromAssets.map((k) => parseGradingV4SizeKey(String(k))).filter((k): k is NonNullable<typeof k> => k != null);
    if (parsed.length === 0) {
      return [...gradingOrder];
    }
    if (parsed.length !== fromAssets.length) {
      return [...gradingOrder];
    }
    return sortKeysByGradingCatalog([...new Set(parsed)], gradingOrder);
  }
  if (fromAssets.length > 0) return sortSizeKeysLocale(fromAssets);
  return [];
}
