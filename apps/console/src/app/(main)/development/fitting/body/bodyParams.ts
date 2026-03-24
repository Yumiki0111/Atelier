import { REF_WEIGHT_KG } from "../lib/constants";
import { yScaleFromHeightAndRigLinePaths } from "../lib/rigDerivedHeight";

export interface BodyParams {
  yScale: number;
  xScale: number;
}

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
  const safeW = Math.max(weightKg, 0.01);
  const xScale = Math.sqrt(safeW / REF_WEIGHT_KG);
  return { yScale, xScale };
}
