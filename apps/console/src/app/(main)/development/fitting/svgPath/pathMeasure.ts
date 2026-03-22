import { getPathPoints } from "./extractPoints";

export function getSleeveMeasurePoints(
  pathD: string,
  shoulderY: number
): { shoulderPt: [number, number]; sleeveEndPt: [number, number] } | null {
  const pts = getPathPoints(pathD);
  if (pts.length < 2) return null;

  let shoulderP: [number, number] | null = null;
  let shoulderIdx = -1;

  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if ((y0 <= shoulderY && y1 >= shoulderY) || (y0 >= shoulderY && y1 <= shoulderY)) {
      const t = (shoulderY - y0) / (y1 - y0 || 1e-6);
      shoulderP = [x0 + (x1 - x0) * t, shoulderY];
      shoulderIdx = i + 1;
      break;
    }
  }
  if (!shoulderP) return null;

  const sleeveEndPt = pts[pts.length - 1];
  return { shoulderPt: shoulderP, sleeveEndPt };
}

/**
 * 全頂点配列からインデックス start 〜 end までパスに沿った距離を合計し、pxPerCm で cm に変換。
 * コート等で袖丈を #10→#17 のように特定頂点間で計測するときに使用。
 */
export function measurePathLengthBetweenIndices(
  pts: [number, number][],
  startIdx: number,
  endIdx: number,
  pxPerCm: number
): number {
  if (startIdx < 0 || endIdx >= pts.length || startIdx >= endIdx) return 0;
  let len = 0;
  let prev = pts[startIdx];
  for (let i = startIdx + 1; i <= endIdx; i++) {
    const p = pts[i];
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len / pxPerCm;
}

/**
 * 袖の外側輪郭パスから袖丈を推定。
 * 肩の高さ shoulderY を跨ぐ点を補間し、袖先（パス終端）との Y 差を px→cm 変換する。
 */
export function measureSleeveLengthFromPath(
  pathD: string,
  shoulderY: number,
  pxPerCm: number
): number {
  const pts = getPathPoints(pathD);
  if (pts.length < 2) return 0;

  let shoulderP: [number, number] | null = null;

  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if ((y0 <= shoulderY && y1 >= shoulderY) || (y0 >= shoulderY && y1 <= shoulderY)) {
      const t = (shoulderY - y0) / (y1 - y0 || 1e-6);
      shoulderP = [x0 + (x1 - x0) * t, shoulderY];
      break;
    }
  }
  if (!shoulderP) {
    const firstY = pts[0][1];
    const lastY = pts[pts.length - 1][1];
    if (firstY <= shoulderY && lastY >= shoulderY) {
      shoulderP = [pts[0][0], pts[0][1]];
    } else {
      return 0;
    }
  }

  const endPt = pts[pts.length - 1];
  return Math.abs(endPt[1] - shoulderP[1]) / pxPerCm;
}
