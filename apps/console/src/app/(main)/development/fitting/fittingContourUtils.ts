/**
 * フィット用：肩・襟付近の輪郭抽出、肩点の算出など。
 * FittingCanvas の useMemo 内で使う純粋関数群。
 */

import type { CustomGarmentData, GarmentType } from "./types";
import { getPathPoints } from "./pathUtils";
import { getEffectiveCustomLandmarks } from "./customLandmarkResolve";

/** ジャケットの肩点インデックス（パス順） */
export const JACKET_SHOULDER_INDEX = 92;

/**
 * パス群から肩Y帯域の輪郭点列を返す。
 * pathOrder: true = 1本のpathの描画順を保つ。false = 全pathの点をX順でつなぐ。
 */
export function shoulderContourFromPath(
  pathDs: string[],
  yMin: number,
  yMax: number,
  pathOrder: boolean = true
): [number, number][] {
  const allInBand: [number, number][] = [];
  const segments: [number, number][][] = [];
  for (const d of pathDs) {
    const pathOrdered = getPathPoints(d);
    const inBand = pathOrdered.filter((p) => p[1] >= yMin && p[1] <= yMax);
    if (inBand.length >= 2) segments.push(inBand);
    for (const p of inBand) allInBand.push(p);
  }
  if (pathOrder && segments.length > 0) {
    const best = segments.reduce<[number, number][]>(
      (a, b) => (a.length >= b.length ? a : b),
      segments[0]
    );
    if (best.length >= 2) return best;
  }
  if (allInBand.length < 2) return allInBand;
  return [...allInBand].sort((a, b) => a[0] - b[0]);
}

/** 襟付近の点のうち、中心からxが外側の点だけを対象にする */
export function outerCollarPoints(
  pts: [number, number][],
  shoulderLx: number,
  shoulderRx: number,
  marginRatio: number = 0.2
): [number, number][] {
  if (pts.length === 0) return pts;
  const centerX = (shoulderLx + shoulderRx) / 2;
  const minDist = (shoulderRx - shoulderLx) * marginRatio;
  return pts.filter((p) => Math.abs(p[0] - centerX) >= minDist);
}

/** 服の輪郭上の一点：左側の輪郭パス頂点のうち X が最小の頂点 */
export function onePointOnGarmentOutline(
  outerPts: [number, number][],
  rawPts: [number, number][],
  shoulderLx: number,
  shoulderRx: number
): [number, number] | null {
  const centerX = (shoulderLx + shoulderRx) / 2;
  const left = outerPts.filter((p) => p[0] < centerX);
  const from = left.length > 0 ? left : outerPts;
  if (from.length === 0 && rawPts.length === 0) return null;
  const sortedByX = [...(from.length > 0 ? from : rawPts)].sort(
    (a, b) => a[0] - b[0]
  );
  return sortedByX[0];
}

/** 肩ライン上にある輪郭点のうち、左側でいちばん左の点 */
export function shoulderPointOnLine(
  allOutline: [number, number][],
  shoulderSeamY: number,
  centerX: number,
  yTolerance: number = 12
): [number, number] | null {
  const yMin = shoulderSeamY - yTolerance;
  const yMax = shoulderSeamY + yTolerance;
  const onLine = allOutline.filter(
    (p) => p[0] < centerX && p[1] >= yMin && p[1] <= yMax
  );
  if (onLine.length === 0) return null;
  return onLine.reduce((a, b) => (a[0] < b[0] ? a : b));
}

/** 全頂点リストから、指定点に最も近いインデックスを返す */
export function indexOfClosest(
  allPoints: [number, number][],
  shoulderPt: [number, number] | null
): number | null {
  if (shoulderPt === null || allPoints.length === 0) return null;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < allPoints.length; i++) {
    const [ax, ay] = allPoints[i];
    const d = (ax - shoulderPt[0]) ** 2 + (ay - shoulderPt[1]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** パス群から全頂点を取得 */
export function getAllPathPoints(pathDs: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (const d of pathDs) {
    out.push(...getPathPoints(d));
  }
  return out;
}

/** CustomGarmentData から肩線Yを算出（アニメーション時の from/to 用）。プリセット指定時はそのインデックスのY、それ以外は幾何から。 */
export function getShoulderSeamYForData(data: CustomGarmentData): number {
  const idx = data.shoulderPointIndex;
  if (idx != null) {
    const outline = getAllPathPoints(data.pathDs);
    if (outline.length > idx) return outline[idx][1];
  }
  const band = 15;
  const c = getEffectiveCustomLandmarks(data);
  const raw = shoulderContourFromPath(
    data.pathDs,
    c.shoulderY - band,
    c.shoulderY + band,
    false
  );
  const outer = outerCollarPoints(raw, c.shoulderLx, c.shoulderRx);
  return outer.length > 0
    ? Math.max(c.shoulderY, Math.max(...outer.map((p) => p[1])))
    : c.shoulderY;
}
