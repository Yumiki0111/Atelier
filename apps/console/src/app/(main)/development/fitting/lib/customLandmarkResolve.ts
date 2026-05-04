/**
 * リグ用直線 path 群から肩・裾の参照座標（CustomLandmarks 形）を推定する。
 */

import type { CustomLandmarks } from "./types";
import { getLandmarksFromPaths } from "@/app/(main)/development/fitting/customGarment/svgGarmentSplit";
import { getPathPoints } from "./pathUtils";

function roundTo(v: number, step: number): number {
  if (!Number.isFinite(v)) return v;
  return Math.round(v / step) * step;
}

/**
 * リグっぽい「直線パス群」から、トップス用の肩Y・肩幅・裾を推定する。
 *
 * 前提: リグは直線（M/L/H/V中心）で、肩幅と裾がはっきり出る。
 * 格子 Vector(9) は軸線フィルタ後に縦スパン不足で落ちるため、9 本のとき `getLandmarksFromPaths` にフォールバック。
 */
export function inferLandmarksFromRigPaths(rigPathDs: string[]): CustomLandmarks | null {
  const h = inferLandmarksFromRigPathsHeuristic(rigPathDs);
  if (h != null) return h;
  if (rigPathDs.length === 9) return getLandmarksFromPaths(rigPathDs);
  return null;
}

function inferLandmarksFromRigPathsHeuristic(rigPathDs: string[]): CustomLandmarks | null {
  const straightPathDs = rigPathDs.filter((d) => !/[CcQqSsTtAa]/.test(d));
  if (straightPathDs.length < 4) return null;

  const pathStats: Array<{ pts: [number, number][]; xSpan: number; ySpan: number }> = [];
  for (const d of straightPathDs) {
    const pts = getPathPoints(d);
    if (pts.length < 2) continue;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const xSpan = maxX - minX;
    const ySpan = maxY - minY;
    if (Number.isFinite(xSpan) && Number.isFinite(ySpan)) {
      pathStats.push({ pts, xSpan, ySpan });
    }
  }

  if (pathStats.length < 2) return null;

  const allPtsAll = pathStats.flatMap((p) => p.pts);
  if (allPtsAll.length < 2) return null;

  const overallMinXAll = roundTo(allPtsAll.reduce((m, p) => Math.min(m, p[0]), Infinity), 0.5);
  const overallMaxXAll = roundTo(allPtsAll.reduce((m, p) => Math.max(m, p[0]), -Infinity), 0.5);
  const overallMinYAll = roundTo(allPtsAll.reduce((m, p) => Math.min(m, p[1]), Infinity), 0.5);
  const overallMaxYAll = roundTo(allPtsAll.reduce((m, p) => Math.max(m, p[1]), -Infinity), 0.5);

  const ySpanAll = overallMaxYAll - overallMinYAll;
  if (!Number.isFinite(ySpanAll) || ySpanAll < 200) return null;
  const xSpanAll = overallMaxXAll - overallMinXAll;

  const axisXSpanThresh = Math.max(2, xSpanAll * 0.05);
  const axisYSpanThresh = ySpanAll * 0.35;

  const nonAxisStats = pathStats.filter((p) => !(p.xSpan <= axisXSpanThresh && p.ySpan >= axisYSpanThresh));
  const useStats = nonAxisStats.length >= 2 ? nonAxisStats : pathStats;

  const allPts = useStats.flatMap((p) => p.pts);

  const overallMinX = roundTo(allPts.reduce((m, p) => Math.min(m, p[0]), Infinity), 0.5);
  const overallMaxX = roundTo(allPts.reduce((m, p) => Math.max(m, p[0]), -Infinity), 0.5);
  const overallMinY = roundTo(allPts.reduce((m, p) => Math.min(m, p[1]), Infinity), 0.5);
  const overallMaxY = roundTo(allPts.reduce((m, p) => Math.max(m, p[1]), -Infinity), 0.5);

  const ySpan = overallMaxY - overallMinY;
  if (!Number.isFinite(ySpan) || ySpan < 200) return null;
  const xSpan = overallMaxX - overallMinX;

  const yEps = Math.max(2, ySpan * 0.0009);
  const shoulderBandMin = overallMinY + ySpan * 0.1;
  const shoulderBandMax = overallMinY + ySpan * 0.35;
  const hemBandMin = overallMinY + ySpan * 0.6;

  const yCandidates = new Set<number>();
  for (const p of allPts) {
    const y = roundTo(p[1], 0.5);
    if (y > shoulderBandMin && y <= shoulderBandMax) yCandidates.add(y);
    if (y >= hemBandMin && y <= overallMaxY) yCandidates.add(y);
  }

  function pickYInBand(yMin: number, yMax: number): number | null {
    let bestY: number | null = null;
    let bestScore = -Infinity;
    for (const y of yCandidates) {
      if (y < yMin || y > yMax) continue;
      const near = allPts.filter((p) => Math.abs(p[1] - y) <= yEps);
      if (near.length < 2) continue;

      let minX = Infinity;
      let maxX = -Infinity;
      for (const [x] of near) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      const span = maxX - minX;
      if (span < xSpan * 0.18) continue;

      const xEps = Math.max(2, span * 0.01);
      const leftCount = near.filter((p) => Math.abs(p[0] - minX) <= xEps).length;
      const rightCount = near.filter((p) => Math.abs(p[0] - maxX) <= xEps).length;
      const score = span * Math.min(leftCount, rightCount);
      if (score > bestScore) {
        bestScore = score;
        bestY = y;
      }
    }
    return bestY;
  }

  const shoulderY = pickYInBand(shoulderBandMin, shoulderBandMax);
  const hemY = pickYInBand(hemBandMin, overallMaxY);
  if (shoulderY == null || hemY == null) return null;

  const nearShoulder = allPts.filter((p) => Math.abs(p[1] - shoulderY) <= yEps);
  if (nearShoulder.length < 2) return null;

  let shoulderLx = Infinity;
  let shoulderRx = -Infinity;
  for (const [x] of nearShoulder) {
    if (x < shoulderLx) shoulderLx = x;
    if (x > shoulderRx) shoulderRx = x;
  }
  if (!Number.isFinite(shoulderLx) || !Number.isFinite(shoulderRx)) return null;

  const nearHem = allPts.filter((p) => Math.abs(p[1] - hemY) <= yEps);
  if (nearHem.length < 2) return null;

  let hemMinX = Infinity;
  let hemMaxX = -Infinity;
  for (const [x] of nearHem) {
    if (x < hemMinX) hemMinX = x;
    if (x > hemMaxX) hemMaxX = x;
  }

  return {
    shoulderY,
    shoulderLx,
    shoulderRx,
    hemY,
    hemCx: (hemMinX + hemMaxX) / 2,
  };
}
