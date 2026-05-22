import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import { inferGarmentFlatCmSizeKey } from "@/lib/widget-fit/widgetFitFlatCmSize";
import {
  dedupeWidgetFitSizeLabelsInOrder,
  normalizeWidgetFitSizeLabel,
} from "@/lib/widget-fit/widgetFitSizeLabels";

function sortSizeKeysLocale(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function flatCmKeysFromOfferedCm(gs: CustomGarmentData): string[] {
  const raw = gs.flatCmOfferedSizeCm;
  if (raw == null || typeof raw !== "object") return [];
  return dedupeWidgetFitSizeLabelsInOrder(Object.keys(raw));
}

/**
 * ウィジェット／プレビュー: 平置き cm 商品のサイズチップは登録済みラベルのみ（XS〜XXL 全カタログは出さない）。
 * 並びは `flatCmOfferedSizeLabels` の保存順（上＝左）。
 */
export function resolveWidgetFitSizeKeysOrder(
  fromAssetKeys: string[],
  garmentSpec: unknown
): string[] {
  const fromAssets = [...new Set(fromAssetKeys.map((k) => String(k).trim()).filter(Boolean))];
  const gs = garmentSpec as CustomGarmentData | null | undefined;
  if (gs != null && isGarmentFlatCmPresetId(gs.presetId)) {
    const offeredRaw = gs.flatCmOfferedSizeLabels;
    if (Array.isArray(offeredRaw) && offeredRaw.length > 0) {
      const fromOffered = dedupeWidgetFitSizeLabelsInOrder(
        offeredRaw.map((k) => normalizeWidgetFitSizeLabel(String(k)))
      );
      if (fromOffered.length > 0) return fromOffered;
    }
    const fromOfferedCm = flatCmKeysFromOfferedCm(gs);
    if (fromOfferedCm.length > 0) return fromOfferedCm;
    const inferred = inferGarmentFlatCmSizeKey(gs);
    if (inferred) {
      return [inferred];
    }
    return [];
  }
  if (fromAssets.length > 0) return sortSizeKeysLocale(fromAssets);
  return [];
}
