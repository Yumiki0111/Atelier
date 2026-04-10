import { getPathPoints, tPathWithPointIndex } from "../lib/pathUtils";
import { globalToLocal } from "./genericMeasureOnlyShared";
import { sleeveVerticalPxFromGlobalVertices } from "./genericSleeveChainMeasure";

/** lengthStart → lengthEnd 方向のパス上で、lengthStart の次の頂点（連続1辺の相手端） */
export function pickNeighborTowardLengthEnd(
  lengthStartIdx: number,
  lengthEndIdx: number,
  pathPointCount: number
): number | null {
  if (lengthEndIdx > lengthStartIdx) {
    const j = lengthStartIdx + 1;
    return j < pathPointCount ? j : null;
  }
  if (lengthEndIdx < lengthStartIdx) {
    const j = lengthStartIdx - 1;
    return j >= 0 ? j : null;
  }
  return null;
}

/**
 * 採寸帯の **袖口側 lengthEnd** に隣接する内側頂点（肩側）。1 辺伸縮で動かすのは lengthEnd 側 i1 とし、
 * 肩・path 分岐付近をいじらない（胴 path との段差を抑える）。
 */
export function pickNeighborTowardLengthStart(
  lengthStartIdx: number,
  lengthEndIdx: number,
  pathPointCount: number
): number | null {
  if (lengthEndIdx > lengthStartIdx) {
    const j = lengthEndIdx - 1;
    return j >= lengthStartIdx && j >= 0 ? j : null;
  }
  if (lengthEndIdx < lengthStartIdx) {
    const j = lengthEndIdx + 1;
    return j <= lengthStartIdx && j < pathPointCount ? j : null;
  }
  return null;
}

/**
 * gt で指定したグローバル2点が同一袖 path 上で隣なら、上側（Y 小）を i0、下側を i1 として返す。
 * 無効なら null。
 */
export function resolveLocalFirstEdgePairFromGlobalPair(
  pathDs: string[],
  sleevePathIdx: number,
  pts: [number, number][],
  pair: [number, number] | undefined
): { i0: number; i1: number } | null {
  if (!pair || pair.length !== 2) return null;
  const gA = Math.trunc(pair[0]!);
  const gB = Math.trunc(pair[1]!);
  const lia = globalToLocal(pathDs, sleevePathIdx, gA);
  const lib = globalToLocal(pathDs, sleevePathIdx, gB);
  if (lia == null || lib == null || lia === lib) return null;
  if (Math.abs(lia - lib) !== 1) return null;
  const pa = pts[lia]!;
  const pb = pts[lib]!;
  const i0 = pa[1] <= pb[1] ? lia : lib;
  const i1 = pa[1] <= pb[1] ? lib : lia;
  return { i0, i1 };
}

/**
 * チェーン上の弧長（各セグメント √(Δx²+Δy²) の和）が targetArcPx になるよう、
 * 袖パスの i1 だけを i0→i1 直線上に動かす。t は格子探索＋局所二分で求める。
 */
export function applyFirstEdgeStretchForTargetSleeveChainArcLength(
  pathD: string,
  i0: number,
  i1: number,
  pathDs: string[],
  sleevePathIdx: number,
  chainGlobals: number[],
  _customPoints: [number, number][] | undefined,
  targetArcPx: number
): string {
  const pts = getPathPoints(pathD);
  if (i0 < 0 || i1 < 0 || i0 >= pts.length || i1 >= pts.length || i0 === i1) return pathD;
  const p0 = pts[i0]!;
  const p1o = pts[i1]!;
  const raw = [p1o[0] - p0[0], p1o[1] - p0[1]];
  const len0 = Math.hypot(raw[0], raw[1]);
  if (len0 < 1e-9) return pathD;
  const ux = raw[0] / len0;
  const uy = raw[1] / len0;

  const evalArc = (t: number): number => {
    const p1n: [number, number] = [p0[0] + t * ux, p0[1] + t * uy];
    const newD = tPathWithPointIndex(pathD, (pointIndex, x, y) => {
      if (pointIndex === i1) return p1n;
      return [x, y];
    });
    const ds = [...pathDs];
    ds[sleevePathIdx] = newD;
    /** customPoints は path 更新と同期していない（canvas 後段のキャッシュ）。試行中の弧長は path のみで評価する。 */
    return sleeveVerticalPxFromGlobalVertices(ds, 0, 0, chainGlobals, undefined);
  };

  const tMax = Math.max(50000, targetArcPx * 4, len0 * 8);
  const steps = 100;
  let bestT = len0;
  let bestErr = Infinity;
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * tMax;
    const err = Math.abs(evalArc(t) - targetArcPx);
    if (err < bestErr) {
      bestErr = err;
      bestT = t;
    }
  }
  let lo = Math.max(1e-6, bestT - (tMax / steps) * 3);
  let hi = Math.min(tMax, bestT + (tMax / steps) * 3);
  for (let i = 0; i < 55; i++) {
    const mid = (lo + hi) / 2;
    if (evalArc(mid) < targetArcPx) lo = mid;
    else hi = mid;
  }
  const tSol = (lo + hi) / 2;
  const errBisect = Math.abs(evalArc(tSol) - targetArcPx);
  const tUse = errBisect <= bestErr + 0.5 ? tSol : bestT;
  const p1New: [number, number] = [p0[0] + tUse * ux, p0[1] + tUse * uy];
  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    if (pointIndex === i1) return p1New;
    return [x, y];
  });
}
