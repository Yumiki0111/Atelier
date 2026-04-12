import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import {
  WIDGET_FIT_CHEST_BAND_JA,
  widgetChestEaseBand,
  type WidgetFitChestBandJaLabel,
} from "@/app/(main)/development/fitting/lib/fitCalc";

/** 身長レンジ（cm）。`t` の線形写像に使う上限（これ以上は同じ「最上段」扱いで、中間身長の段付けが壊れないようにする） */
const HEIGHT_BAND_MIN = 150;
const HEIGHT_T_MAX = 185;
/** 基準体重・クリップ用の身長上限（高身長の体重補正は実身長に近づける） */
const HEIGHT_REF_MAX = 198;
/** 標準的な胸囲感の目安（身長からの BMI=22 相当 kg） */
const REFERENCE_BMI = 22;
/** この kg 差で推奨インデックスがおおよそ 1 段動く（身長項と足し合わせて floor） */
const WEIGHT_KG_PER_INDEX_STEP = 11;
/**
 * この身長以上で、かつ列の最大サイズを選んでいるときだけ「大きめなサイズ」を出さず「おすすめのサイズ」にする
 * （もう上のサイズがないのに「大きめなサイズ」は不自然。186cm 付近でも効かせるため 180 から）。
 * 低めの身長では最大でも序数どおり「大きめなサイズ」を出し、一段下が「大きめなサイズ」のときと整合させる。
 */
const HEIGHT_SOFT_MAX_SIZE_BAND_CM = 180;
/**
 * 推奨よりちょうど 1 段小さいとき、胸ゆとりがこの値以上（余裕がある・ほぼ中立）なら「小さめなサイズ」にしない（cm）。
 */
const EASE_ONE_STEP_DOWN_NOT_TIGHT_MIN_CM = -2.5;
/**
 * 表が一段上を推すときに「おすすめ」へ寄せる胸ゆとりの上限（cm）。
 * `delta === 0` と同様に e > 14 はゆとり大。ジャケットでは e=15〜25 が「ok」のまま残りがちなため、`loose` しきい値だけでは足りない。
 */
const EASE_ONE_STEP_DOWN_OK_MAX_CM = 14;

/**
 * `genericSymmetricTop.sizePresets` の並び（小→大想定）からサイズラベル列を返す。
 */
export function orderedSizeLabelsFromCustomGarment(data: CustomGarmentData | null | undefined): string[] {
  const presets = data?.genericSymmetricTop?.sizePresets;
  if (!presets || presets.length === 0) return [];
  return presets.map((p) => p.label);
}

/**
 * 身長×サイズ帯に使う「並び配列」を決める。
 * プリセット列だけを優先すると、商品の `sizeKeys`（例: 3/4/5）とラベルが食い違い `indexOf === -1` でバッジが空になるため、
 * **現在サイズを含む列**を優先して選ぶ。
 * @returns 序数バンドに使えるときだけ配列。どちらにも `currentSize` が無いときは `null`（呼び出し側は幾何フォールバック）。
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

function standardWeightKgForHeight(heightCm: number): number {
  const hM = heightCm / 100;
  return REFERENCE_BMI * hM * hM;
}

/**
 * 身長（一般レンジ）＋体重（身長に対する標準体重からの差）で推奨インデックスを決める。
 * - 身長項は `round` ではなく `floor`（例: S/M/L/XL の 4 段で 169cm → M 寄り）。
 * - 体重は BMI=22 相当の基準体重より重いほど大きいサイズ側へシフト。
 * - 極端に軽いときでも **身長アンカーより 2 段以上小さい推奨**（例: 190cm で S）にならないよう、
 *   `max(floor(合成), heightAnchor - 1)` で下限を敷く（細身でも「身長に見合う最小サイズ」は維持）。
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

export type ResolveWidgetFitChestBandOrdinalInput = {
  heightCm: number;
  weightKg: number;
  orderedSizeKeys: string[];
  currentSize: string;
  /** 胸まわりの幾何ゆとり（cm）。曖昧・矛盾のときはバッジを出さない判定に使う */
  chestEaseCm: number | null;
  /** `widgetChestEaseBand` と同じしきい値（トップスは「大きめ」が早めに付く） */
  fitChestBandMode?: "shirt" | "jacket";
};

/**
 * - おすすめサイズより小さい → 小さめなサイズ、大きい → 大きめなサイズ（`WIDGET_FIT_CHEST_BAND_JA`）。
 * - **1 段小さい**でも胸がきつくなければ「おすすめのサイズ」に寄せるが、幾何ゆとりが「大きめ」または14cm 超の ok なら表より上と矛盾するので「大きめなサイズ」。
 * - **1 段大きい**でも胸ゆとりが幾何上「ok」なら「おすすめのサイズ」に寄せる（細身で推奨が一段小さいときの誤「大きめ」防止）。
 * - **高身長（180cm 以上）かつ最大サイズ**も同様、胸ゆとりが大きいときは「おすすめ」にしない。
 * - 胸ゆとりとサイズの関係が強く矛盾する場合はバッジなし（数値行のみ）。
 */
export function resolveWidgetFitChestBandJaOrdinal(
  input: ResolveWidgetFitChestBandOrdinalInput
): { bandJa: "" | WidgetFitChestBandJaLabel } {
  const { heightCm, weightKg, orderedSizeKeys, currentSize, chestEaseCm } = input;
  const easeMode = input.fitChestBandMode ?? "jacket";
  const n = orderedSizeKeys.length;
  if (n === 0) return { bandJa: "" };

  const curIdx = orderedSizeKeys.indexOf(currentSize);
  if (curIdx < 0) return { bandJa: "" };

  const recIdx = recommendedSizeIndexForBody(heightCm, weightKg, n);
  const delta = curIdx - recIdx;

  const e = chestEaseCm;
  const hasE = e != null && Number.isFinite(e);

  const contradicts =
    hasE &&
    ((delta === 0 && (e < -3.5 || e > 14)) || (delta > 0 && e < -2.5));

  if (contradicts) return { bandJa: "" };

  if (delta < 0) {
    const easeBand = hasE ? widgetChestEaseBand(e, easeMode) : null;
    const oneStepDownOk =
      hasE &&
      delta === -1 &&
      e >= EASE_ONE_STEP_DOWN_NOT_TIGHT_MIN_CM &&
      e <= EASE_ONE_STEP_DOWN_OK_MAX_CM &&
      easeBand !== "loose";
    if (oneStepDownOk) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    if (hasE && easeBand === "loose") {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.loose };
    }
    // 一段下げでも胸ゆとりが大きい → 大きめ寄り（表の一段上は無理にすすめない）
    if (hasE && delta === -1 && e > EASE_ONE_STEP_DOWN_OK_MAX_CM) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.loose };
    }
    return { bandJa: WIDGET_FIT_CHEST_BAND_JA.tight };
  }
  if (delta > 0) {
    const easeBandUp = hasE ? widgetChestEaseBand(e, easeMode) : null;
    const oneStepUpOk = hasE && delta === 1 && easeBandUp === "ok";
    if (oneStepUpOk) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    const tallMaxSizeOk =
      curIdx >= n - 1 &&
      heightCm >= HEIGHT_SOFT_MAX_SIZE_BAND_CM &&
      (!hasE ||
        (widgetChestEaseBand(e, easeMode) !== "loose" && e <= EASE_ONE_STEP_DOWN_OK_MAX_CM));
    if (tallMaxSizeOk) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    return { bandJa: WIDGET_FIT_CHEST_BAND_JA.loose };
  }
  return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
}
