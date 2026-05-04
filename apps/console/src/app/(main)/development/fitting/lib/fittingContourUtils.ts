/**
 * フィット用：肩・襟付近の輪郭抽出、肩点の算出など。
 * React の `useMemo` 連鎖やプレビューから使う純関数群。
 */

import type { CustomGarmentData, GarmentType } from "./types";
import { getPathPoints } from "./pathUtils";

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

/** CustomGarmentData から肩線Yを算出（アニメーション時の from/to 用）。幾何推定。 */
export function getShoulderSeamYForData(data: CustomGarmentData): number {
  const band = 15;
  const c = data.landmarks;
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

/** 点列の X 範囲の中点（胴〜袖を含む輪郭の「左右中央」近似） */
export function boundingCenterX(points: [number, number][]): number {
  if (points.length === 0) return 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
  }
  return (minX + maxX) / 2;
}

/**
 * 袖丈計測弦に直交する方向へ `normalDistance` だけ離すとき、胴中心より腕の外側（左袖は X が小さい側）になる候補を選ぶ。
 * 採寸オーバーレイ・服プロットの袖丈デバッグ位置に使用。
 */
export function anchorSleeveMeasureDebugOnArmOuter(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  bodyCenterX: number,
  normalDistance: number
): [number, number] {
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const dx = ex - sx;
  const dy = ey - sy;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const d = normalDistance;
  const a: [number, number] = [mx + nx * d, my + ny * d];
  const b: [number, number] = [mx - nx * d, my - ny * d];
  const onLeftSideOfBody = mx < bodyCenterX;
  return onLeftSideOfBody ? (a[0] <= b[0] ? a : b) : a[0] >= b[0] ? a : b;
}
