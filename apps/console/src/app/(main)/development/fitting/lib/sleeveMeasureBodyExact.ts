import type { LineIndexRange } from "../generic/types";
import { getPathPoints, globalVertexBoundsForPath } from "./pathUtils";

function globalSpanForInnerRange(
  pathDs: string[],
  range: LineIndexRange
): [number, number] | null {
  const p0 = Math.min(range.from, range.to);
  const p1 = Math.max(range.from, range.to);
  let lo: number | null = null;
  let hi: number | null = null;
  for (let p = p0; p <= p1; p++) {
    const b = globalVertexBoundsForPath(pathDs, p);
    if (!b) continue;
    const [a, c] = b;
    if (lo === null || a < lo) lo = a;
    if (hi === null || c > hi) hi = c;
  }
  if (lo === null || hi === null) return null;
  return [lo, hi];
}

/** true = パス上で Y が概ね増える向き（肩→袖先の典型）。点が少ないときは null */
function pathFlowsDownY(pathDs: string[], pathIdx: number): boolean | null {
  const d = pathDs[pathIdx];
  if (d == null) return null;
  const pts = getPathPoints(d);
  if (pts.length < 2) return null;
  const dy = pts[pts.length - 1]![1] - pts[0]![1];
  if (Math.abs(dy) < 1e-3) return null;
  return dy > 0;
}

/**
 * 左内袖の連結頂点範囲を、右内袖上の対応範囲に写す（左右 path の頂点順が逆のときは反転）。
 * 頂点数が違う場合は 0〜1 の弧長パラメータで対応づける。
 */
export function mirrorSleeveMeasureRangeToOppositeInner(
  pathDs: string[],
  sleeveInnerLeft: LineIndexRange,
  sleeveInnerRight: LineIndexRange,
  leftRange: [number, number]
): [number, number] | null {
  const leftSpan = globalSpanForInnerRange(pathDs, sleeveInnerLeft);
  const rightSpan = globalSpanForInnerRange(pathDs, sleeveInnerRight);
  if (!leftSpan || !rightSpan) return null;

  const [lMin, lMax] = leftSpan;
  const [rMin, rMax] = rightSpan;
  const nL = lMax - lMin + 1;
  const nR = rMax - rMin + 1;
  if (nL < 1 || nR < 1) return null;

  let a = Math.trunc(leftRange[0]);
  let b = Math.trunc(leftRange[1]);
  if (a > b) [a, b] = [b, a];
  const lo = Math.max(a, lMin);
  const hi = Math.min(b, lMax);
  if (lo > hi) return null;

  const dLo = lo - lMin;
  const dHi = hi - lMin;

  const lFlow = pathFlowsDownY(pathDs, sleeveInnerLeft.from);
  const rFlow = pathFlowsDownY(pathDs, sleeveInnerRight.from);
  const reverse = lFlow != null && rFlow != null && lFlow !== rFlow;

  const denomL = Math.max(1, nL - 1);
  const denomR = Math.max(1, nR - 1);

  let uLo = dLo / denomL;
  let uHi = dHi / denomL;
  if (reverse) {
    uLo = 1 - dHi / denomL;
    uHi = 1 - dLo / denomL;
  }
  if (uLo > uHi) [uLo, uHi] = [uHi, uLo];

  const rA = rMin + Math.round(uLo * denomR);
  const rB = rMin + Math.round(uHi * denomR);
  return [Math.min(rA, rB), Math.max(rA, rB)];
}
