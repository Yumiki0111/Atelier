/** 体型スライダー 0–100 から体重（kg）へ。プレビュー・API 共通。 */
/** 下端が細すぎる場合は下限を上げる（横幅は `sqrt(w/60)` で効く）。 */
export const PREVIEW_FIT_BODY_WEIGHT_MIN_KG = 48;
/** 上端が太さが足りない場合は上限を上げる。 */
export const PREVIEW_FIT_BODY_WEIGHT_MAX_KG = 105;

export function weightKgFromBodyVal(bodyVal: number): number {
  const t = Math.max(0, Math.min(100, bodyVal)) / 100;
  return Math.round(
    PREVIEW_FIT_BODY_WEIGHT_MIN_KG +
      t * (PREVIEW_FIT_BODY_WEIGHT_MAX_KG - PREVIEW_FIT_BODY_WEIGHT_MIN_KG)
  );
}
