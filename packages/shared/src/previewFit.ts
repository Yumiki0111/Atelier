/** 体型スライダー 0–100 から体重（kg）へ。プレビュー・API 共通。 */
export const PREVIEW_FIT_BODY_WEIGHT_MIN_KG = 40;
export const PREVIEW_FIT_BODY_WEIGHT_MAX_KG = 90;

export function weightKgFromBodyVal(bodyVal: number): number {
  const t = Math.max(0, Math.min(100, bodyVal)) / 100;
  return Math.round(
    PREVIEW_FIT_BODY_WEIGHT_MIN_KG +
      t * (PREVIEW_FIT_BODY_WEIGHT_MAX_KG - PREVIEW_FIT_BODY_WEIGHT_MIN_KG)
  );
}
