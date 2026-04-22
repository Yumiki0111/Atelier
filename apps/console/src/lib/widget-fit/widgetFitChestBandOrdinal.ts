import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { WIDGET_FIT_CHEST_BAND_JA, type WidgetFitChestBandJaLabel } from "@/app/(main)/development/fitting/lib/fitCalc";

/** 身長レンジ（cm）。`t` の線形写像に使う上限 */
const HEIGHT_BAND_MIN = 150;
const HEIGHT_T_MAX = 185;
/** 基準体重・クリップ用の身長上限 */
const HEIGHT_REF_MAX = 198;
/**
 * この身長以上で、かつ在庫の**最大段**（例 XL）を選んでいるとき、推奨が一段下でも「ゆったり」にしない。
 * 上の段が存在しないのにゆったり扱いは不自然（195cm 付近の XL 等）。
 */
const MIN_HEIGHT_COURTESY_WHEN_PICKED_MAX_SIZE_CM = 180;
/**
 * この身長以下で、かつ在庫の**最小段**（例 S）を選んでいるとき、推奨が上の段でも「小さめ」にしない。
 * 下の段がないのに小さめは不自然（156cm 付近の S 等。体重で推奨が一段上に寄りやすい）。
 */
const MAX_HEIGHT_COURTESY_WHEN_PICKED_MIN_SIZE_CM = 168;
const REFERENCE_BMI = 22;
/** この kg 差で推奨インデックスがおおよそ 1 段動く */
const WEIGHT_KG_PER_INDEX_STEP = 11;

function standardWeightKgForHeight(heightCm: number): number {
  const hM = heightCm / 100;
  return REFERENCE_BMI * hM * hM;
}

/**
 * 身長＋体重から「一般論」の推奨サイズ段（小→大の 0…n-1）。
 * 実データが蓄積されるまではこの線形ヒューリスティックで十分、とする。
 */
export function recommendedSizeIndexForBody(heightCm: number, weightKg: number, sizeCount: number): number {
  if (sizeCount <= 1) return 0;
  const hRef = Math.max(HEIGHT_BAND_MIN, Math.min(HEIGHT_REF_MAX, heightCm));
  const hT = Math.max(HEIGHT_BAND_MIN, Math.min(HEIGHT_T_MAX, heightCm));
  const t = (hT - HEIGHT_BAND_MIN) / (HEIGHT_T_MAX - HEIGHT_BAND_MIN);
  const w = Math.max(35, Math.min(120, weightKg));
  const refKg = standardWeightKgForHeight(hRef);
  const weightSteps = (w - refKg) / WEIGHT_KG_PER_INDEX_STEP;
  const heightAnchor = Math.floor(t * (sizeCount - 1));
  const floatIdx = t * (sizeCount - 1) + weightSteps;
  const rawIdx = Math.floor(floatIdx);
  const floored = Math.max(rawIdx, heightAnchor - 1);
  return Math.max(0, Math.min(sizeCount - 1, floored));
}

export function orderedSizeLabelsFromCustomGarment(data: CustomGarmentData | null | undefined): string[] {
  const presets = data?.genericSymmetricTop?.sizePresets;
  if (!presets || presets.length === 0) return [];
  return presets.map((p) => p.label);
}

/**
 * 現在サイズを含む小→大の列を返す（商品 sizeKeys とプリセットのズレ防止）。
 */
export function resolveOrderedSizeKeysForBand(
  presetLabels: string[],
  productSizeKeys: string[],
  currentSize: string
): string[] | null {
  const cur = currentSize.trim();
  if (!cur) return null;
  if (presetLabels.length > 0 && presetLabels.includes(cur)) return presetLabels;
  if (productSizeKeys.length > 0 && productSizeKeys.includes(cur)) return productSizeKeys;
  return null;
}

export type ResolveWidgetFitChestBandBodyHeuristicInput = {
  heightCm: number;
  weightKg: number;
  orderedSizeKeys: string[];
  currentSize: string;
};

/**
 * 身長・体重から決めた推奨段と、今選んでいる段の差だけでラベルを付ける（幾何の救済なし）。
 * 高身長で最大段…（`MIN_HEIGHT_…`）、低身長で最小段…（`MAX_HEIGHT_…`）のとき「おすすめ」に寄せる。
 * 列が取れないときは呼び出し側で幾何フォールバック。
 */
export function resolveWidgetFitChestBandJaFromBodyHeuristic(
  input: ResolveWidgetFitChestBandBodyHeuristicInput
): { bandJa: "" | WidgetFitChestBandJaLabel } {
  const { heightCm, weightKg, orderedSizeKeys, currentSize } = input;
  const n = orderedSizeKeys.length;
  if (n === 0) return { bandJa: "" };
  const curIdx = orderedSizeKeys.indexOf(currentSize.trim());
  if (curIdx < 0) return { bandJa: "" };
  const recIdx = recommendedSizeIndexForBody(heightCm, weightKg, n);
  const d = curIdx - recIdx;
  if (d < 0) {
    if (curIdx === 0 && heightCm <= MAX_HEIGHT_COURTESY_WHEN_PICKED_MIN_SIZE_CM) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    return { bandJa: WIDGET_FIT_CHEST_BAND_JA.tight };
  }
  if (d > 0) {
    if (curIdx === n - 1 && heightCm >= MIN_HEIGHT_COURTESY_WHEN_PICKED_MAX_SIZE_CM) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    return { bandJa: WIDGET_FIT_CHEST_BAND_JA.loose };
  }
  return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
}
