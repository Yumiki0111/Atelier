import type { FlatCmSizeKey } from "./garmentFlatCmGradingConstants";
import {
  GARMENT_FLAT_CM_ORDERED_SIZE_LABELS,
  matchGarmentFlatCmToPreset,
  type GarmentFlatCm,
} from "./garmentFlatCmGradingMeasurements";
import type { GarmentFlatCmPresetsState } from "./garmentFlatCmGradingPresetsStorage";
import { parseFlatCmSizeKey } from "@/lib/widget-fit/widgetFitFlatCmSize";

/**
 * 開発画面の保存プリセット＋現在編集中の平置き cm から、ウィジェット用サイズチップ候補を復元する。
 * 商品登録時に `garment_spec.flatCmOfferedSizeLabels` へ入れ、資産行が無いプレビューでも帯を絞れるようにする。
 */
export function flatCmOfferedSizeLabelsForRegister(
  state: GarmentFlatCmPresetsState | null | undefined,
  currentGarmentCm: GarmentFlatCm
): FlatCmSizeKey[] {
  const set = new Set<FlatCmSizeKey>();
  const cur = matchGarmentFlatCmToPreset(currentGarmentCm);
  if (cur) set.add(cur);
  for (const p of state?.userPresets ?? []) {
    const byCm = matchGarmentFlatCmToPreset(p.cm);
    if (byCm) set.add(byCm);
    else {
      const byName = parseFlatCmSizeKey(p.name);
      if (byName) set.add(byName);
    }
  }
  const orderIdx = new Map<string, number>(GARMENT_FLAT_CM_ORDERED_SIZE_LABELS.map((k, i) => [k, i]));
  return [...set].sort((a, b) => (orderIdx.get(a) ?? 0) - (orderIdx.get(b) ?? 0));
}
