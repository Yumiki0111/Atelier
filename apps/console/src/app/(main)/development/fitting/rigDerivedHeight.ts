import { getPathPoints } from "./pathUtils";
import { REF_HEIGHT_CM } from "./constants";

/**
 * `BPATHS_RIG_LINES[0]`（中心軸・脊髄）を model→body 座標にしたときの Y 範囲。
 * リグ SVG を差し替えたら、新リグの path0 の span と合わせて `REFERENCE_RIG_SPINE_Y_SPAN` を更新する。
 */
export const REFERENCE_RIG_SPINE_Y_SPAN = 1585.92;

/** リグ線配列で脊髄に使う index（`fittingCanvasCompute` の RIG_LINE_SPINE と一致） */
export const RIG_SPINE_PATH_INDEX = 0;

export function spineYSpanFromPathD(pathD: string): number | null {
  if (!pathD) return null;
  const pts = getPathPoints(pathD);
  if (pts.length < 2) return null;
  const ys = pts.map((p) => p[1]);
  return Math.max(...ys) - Math.min(...ys);
}

/**
 * 身長スライダーは基準 yScale（cm/170）を与える。
 * ロード済みリグの脊髄（path 0）の Y 範囲が基準リグより長い／短いと、その比率だけ縦ワープを上乗せし、
 * リグ差し替えで体が追従する。
 */
export function yScaleFromHeightAndRigLinePaths(
  heightCm: number,
  rigLinePaths: string[] | null | undefined
): number {
  const base = heightCm / REF_HEIGHT_CM;
  if (!rigLinePaths?.[RIG_SPINE_PATH_INDEX]) return base;
  const span = spineYSpanFromPathD(rigLinePaths[RIG_SPINE_PATH_INDEX]!);
  if (span == null || !Number.isFinite(span) || span < 1e-3) return base;
  if (REFERENCE_RIG_SPINE_Y_SPAN < 1e-3) return base;
  return base * (span / REFERENCE_RIG_SPINE_Y_SPAN);
}
