import { PREVIEW_FIT_BODY_WEIGHT_MIN_KG } from "@Atelier/shared";

import { REF_WEIGHT_KG } from "../lib/constants";
import { yScaleFromHeightAndRigLinePaths } from "../lib/rig/rigDerivedHeight";

export interface BodyParams {
  yScale: number;
  xScale: number;
}

/**
 * 横幅に使う体重の下限（kg）。プレビュー体型スライダー下限と揃え、極端に細い表示を抑える。
 */
const MIN_WEIGHT_KG_FOR_X_SCALE = PREVIEW_FIT_BODY_WEIGHT_MIN_KG;

/**
 * 身長・体重からワープ用スケールを返す。
 * - 縦 yScale: 身長 cm/170 を基準に、ロード済みリグの脊髄（path 0）Y 範囲で補正（`rigDerivedHeight`）。
 * - 横 xScale: 体重の平方根比のみ。BMI（身長に依存）を使うと身長スライダーだけで肩幅が変わるため使わない。
 */
export function getBodyParams(
  heightCm: number,
  weightKg: number,
  rigLinePaths?: string[] | null
): BodyParams {
  const yScale = yScaleFromHeightAndRigLinePaths(heightCm, rigLinePaths ?? null);
  const widthW = Math.max(weightKg, MIN_WEIGHT_KG_FOR_X_SCALE);
  const xScale = Math.sqrt(widthW / REF_WEIGHT_KG);
  return { yScale, xScale };
}
