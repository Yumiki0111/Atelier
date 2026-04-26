import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { WIDGET_FIT_CHEST_BAND_JA, type WidgetFitChestBandJaLabel } from "@/app/(main)/development/fitting/lib/fitCalc";

/** 身長レンジ（cm）。`t` の線形写像に使う上限 */
const HEIGHT_BAND_MIN = 150;
const HEIGHT_T_MAX = 185;
/** 基準体重・クリップ用の身長上限 */
const HEIGHT_REF_MAX = 198;
/**
 * この身長以上で、かつ**推奨が最大の 1 段下**のときに限り、最大段を選んでも「ゆったり」にしない。
 * 閾値を 180 にすると（M 推奨・L 選択）まで救済され、中高身長で S〜L がすべて「おすすめ」になるため高めに取る。
 */
const MIN_HEIGHT_COURTESY_WHEN_PICKED_MAX_SIZE_CM = 190;
/**
 * この身長以下で、かつ在庫の**最小段**を選び推奨が**ちょうど 1 段上**のときだけ「小さめ」にしない。
 * `d<-1` まで広げると低身長で全段「おすすめ」になりうる。
 */
const MAX_HEIGHT_COURTESY_WHEN_PICKED_MIN_SIZE_CM = 168;
const REFERENCE_BMI = 22;
/** この kg 差で推奨インデックスがおおよそ 1 段動く */
const WEIGHT_KG_PER_INDEX_STEP = 11;
/**
 * この身長以下は低身長扱い: 推奨段を下げる／`recIdx===0` でも 1 段大きいを「おすすめ」にしない（S だけ主におすすめに見せる）。
 */
const LOW_STATURE_MAX_CM = 168;
/** インデックス換算で約 1 段強め下げ（-0.95 では体重 65kg 前後でまだ M 推奨になりやすい） */
const LOW_STATURE_RECOMMEND_INDEX_BIAS = -1.35;
/**
 * 中高身長帯で、まだ S 推奨（float の床が 0）に留まるときだけ M 寄せする。
 * 定数を常に足すと 175/70 などで推奨が L に振れ、SM おすすめにならない。
 */
const MID_TALL_RECOMMEND_BIAS_MIN_CM = 170;
const MID_TALL_RECOMMEND_BIAS_MAX_CM = 185;
const MID_TALL_RECOMMEND_INDEX_BIAS = 0.48;
/**
 * 検証用ボディ（`lineArtVerification`）のみ: 身長由来の基準体重（BMI 22）よりこれだけ重いとき、推奨を **最大 1 段**だけ上げる。
 */
const VERIFICATION_OVER_REF_KG_FOR_ONE_SIZE_STEP = 8;

function standardWeightKgForHeight(heightCm: number): number {
  const hM = heightCm / 100;
  return REFERENCE_BMI * hM * hM;
}

/**
 * 検証用モデル: 身長（＋身長帯バイアス）だけで基準段を決め、体重は基準より十分重いときだけ **1 段**上げる。
 */
function recommendedSizeIndexForBodyLineArtVerification(
  heightCm: number,
  weightKg: number,
  sizeCount: number
): number {
  if (sizeCount <= 1) return 0;
  const hRef = Math.max(HEIGHT_BAND_MIN, Math.min(HEIGHT_REF_MAX, heightCm));
  const hT = Math.max(HEIGHT_BAND_MIN, Math.min(HEIGHT_T_MAX, heightCm));
  const t = (hT - HEIGHT_BAND_MIN) / (HEIGHT_T_MAX - HEIGHT_BAND_MIN);
  const w = Math.max(35, Math.min(120, weightKg));
  const refKg = standardWeightKgForHeight(hRef);
  const heightAnchor = Math.floor(t * (sizeCount - 1));
  const shortBias =
    heightCm <= LOW_STATURE_MAX_CM ? LOW_STATURE_RECOMMEND_INDEX_BIAS : 0;
  let floatIdx = t * (sizeCount - 1) + shortBias;
  if (
    sizeCount >= 3 &&
    heightCm >= MID_TALL_RECOMMEND_BIAS_MIN_CM &&
    heightCm <= MID_TALL_RECOMMEND_BIAS_MAX_CM &&
    Math.floor(floatIdx) === 0
  ) {
    floatIdx += MID_TALL_RECOMMEND_INDEX_BIAS;
  }
  const rawIdx = Math.floor(floatIdx);
  let idx = Math.max(rawIdx, heightAnchor - 1);
  idx = Math.max(0, Math.min(sizeCount - 1, idx));
  if (w > refKg + VERIFICATION_OVER_REF_KG_FOR_ONE_SIZE_STEP) {
    idx = Math.min(sizeCount - 1, idx + 1);
  }
  return idx;
}

/**
 * 身長＋体重から「一般論」の推奨サイズ段（小→大の 0…n-1）。
 * 既定は身長・体重を線形合成。検証用ボディは身長優位＋重すぎるときだけ 1 段上げ。
 */
export function recommendedSizeIndexForBody(
  heightCm: number,
  weightKg: number,
  sizeCount: number,
  bodyModelVariant?: BodyModelVariant
): number {
  if (bodyModelVariant === "lineArtVerification") {
    return recommendedSizeIndexForBodyLineArtVerification(heightCm, weightKg, sizeCount);
  }
  if (sizeCount <= 1) return 0;
  const hRef = Math.max(HEIGHT_BAND_MIN, Math.min(HEIGHT_REF_MAX, heightCm));
  const hT = Math.max(HEIGHT_BAND_MIN, Math.min(HEIGHT_T_MAX, heightCm));
  const t = (hT - HEIGHT_BAND_MIN) / (HEIGHT_T_MAX - HEIGHT_BAND_MIN);
  const w = Math.max(35, Math.min(120, weightKg));
  const refKg = standardWeightKgForHeight(hRef);
  const weightSteps = (w - refKg) / WEIGHT_KG_PER_INDEX_STEP;
  const heightAnchor = Math.floor(t * (sizeCount - 1));
  const shortBias =
    heightCm <= LOW_STATURE_MAX_CM ? LOW_STATURE_RECOMMEND_INDEX_BIAS : 0;
  let floatIdx = t * (sizeCount - 1) + weightSteps + shortBias;
  if (
    sizeCount >= 3 &&
    heightCm >= MID_TALL_RECOMMEND_BIAS_MIN_CM &&
    heightCm <= MID_TALL_RECOMMEND_BIAS_MAX_CM &&
    Math.floor(floatIdx) === 0
  ) {
    floatIdx += MID_TALL_RECOMMEND_INDEX_BIAS;
  }
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
  /** 検証用ボディのとき推奨段の出し方が変わる（身長優位＋重めだけ 1 段上げ） */
  bodyModelVariant?: BodyModelVariant;
};

/**
 * 身長・体重から決めた推奨段と、今選んでいる段の差だけでラベルを付ける（幾何の救済なし）。
 * 高身長で最大段…（`MIN_HEIGHT_…`）、低身長で最小段…（`MAX_HEIGHT_…`）のとき「おすすめ」に寄せる。
 * 列が取れないときは呼び出し側で幾何フォールバック。
 */
export function resolveWidgetFitChestBandJaFromBodyHeuristic(
  input: ResolveWidgetFitChestBandBodyHeuristicInput
): { bandJa: "" | WidgetFitChestBandJaLabel } {
  const { heightCm, weightKg, orderedSizeKeys, currentSize, bodyModelVariant } = input;
  const n = orderedSizeKeys.length;
  if (n === 0) return { bandJa: "" };
  const curIdx = orderedSizeKeys.indexOf(currentSize.trim());
  if (curIdx < 0) return { bandJa: "" };
  const recIdx = recommendedSizeIndexForBody(heightCm, weightKg, n, bodyModelVariant);
  const d = curIdx - recIdx;
  if (d < 0) {
    if (
      d === -1 &&
      curIdx === 0 &&
      heightCm <= MAX_HEIGHT_COURTESY_WHEN_PICKED_MIN_SIZE_CM
    ) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    /** 中高身長で推奨が M（index 1）のとき、S も「おすすめ」（SML で SM おすすめ・L ゆったり） */
    if (
      d === -1 &&
      curIdx === 0 &&
      recIdx === 1 &&
      heightCm >= MID_TALL_RECOMMEND_BIAS_MIN_CM
    ) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    return { bandJa: WIDGET_FIT_CHEST_BAND_JA.tight };
  }
  if (d > 0) {
    /**
     * 推奨が最小段かつ**低身長帯より高い**ときだけ、1 段大きいも「おすすめ」（178 付近など）。
     * 168cm 以下では M を「おすすめ」にしないと S と並んで全部おすすめに見える。
     */
    if (d === 1 && recIdx === 0 && heightCm > LOW_STATURE_MAX_CM) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    if (
      d === 1 &&
      curIdx === n - 1 &&
      recIdx === n - 2 &&
      heightCm >= MIN_HEIGHT_COURTESY_WHEN_PICKED_MAX_SIZE_CM
    ) {
      return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
    }
    return { bandJa: WIDGET_FIT_CHEST_BAND_JA.loose };
  }
  return { bandJa: WIDGET_FIT_CHEST_BAND_JA.ok };
}
