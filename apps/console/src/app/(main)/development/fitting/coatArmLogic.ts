/**
 * 着丈・袖丈スケールと sleeveOnly 用の設定。
 * 回転量は computeSleeveRotations で算出し、sleeveOnlyTransform で外腕にブレンド（袖付けは weight=0）。
 */

import type { ScalableGarmentSpec } from "./types";
import { tPath, tPathWithPointIndex, getPathPoints, collectPtsGlobalVertexRange } from "./pathUtils";

/** 連続する複数輪郭線の点列（順に結合） */
function collectPathPointsInLineRange(pathDs: string[], start: number, end?: number): [number, number][] {
  const e = end ?? start;
  const lo = Math.min(start, e);
  const hi = Math.max(start, e);
  const out: [number, number][] = [];
  for (let i = lo; i <= hi; i++) {
    const d = pathDs[i];
    if (d) out.push(...getPathPoints(d));
  }
  return out;
}

export interface ArmLogicConfig {
  /** 袖パス（輪郭線インデックス開始）。着丈・袖丈スケールの対象（外腕の肩帯回転とは別 path） */
  sleevePathLeft: number;
  /** 左袖の終了インデックス（包含）。省略時は sleevePathLeft のみ */
  sleevePathLeftEnd?: number;
  sleevePathRight: number;
  sleevePathRightEnd?: number;
  /** 外腕シーム開始インデックス */
  seamPathLeft: number;
  seamPathLeftEnd?: number;
  seamPathRight: number;
  seamPathRightEnd?: number;
  attachLSvg: [number, number];
  attachRSvg: [number, number];
  scalableSpec: ScalableGarmentSpec;
  seamBlendMaxDist: number;
  skinningMaxDist: number;
  /** true なら外腕シームの flatten＋胴と分離したスケール経路。回転は袖付けで重み 0 */
  sleeveOnly?: boolean;
  /** 指定時、左外腕シームの点列は連結頂点この範囲に限定（path 範囲より優先） */
  seamOuterLeftVertices?: [number, number];
  seamOuterRightVertices?: [number, number];
}

/** 前中心付近・裾帯のみ。着丈グレーディング前に design Y をサイド裾レベルまで揃える */
const GRADING_HEM_ALIGN_STRIP_HALF_FALLBACK = 18;
const GRADING_HEM_ALIGN_BAND_FRAC = 0.18;

/**
 * `bodyPathIndices` の裾帯で、前中心以外（サイド）の最深 Y を取る。
 * `designHemY` だけでは前中心が浅いまま残るため、ここをターゲットにする。
 */
export function computeGradingHemAlignTargetY(
  pathDs: string[],
  spec: ScalableGarmentSpec,
  _shoulderY: number
): number {
  const ox = spec.gradingHemAlignOriginX;
  if (ox == null || !Number.isFinite(ox)) return spec.designHemY;

  const pts: [number, number][] = [];
  for (const idx of spec.bodyPathIndices) {
    const d = pathDs[idx];
    if (d) pts.push(...getPathPoints(d));
  }
  if (pts.length < 2) return spec.designHemY;

  const ys = pts.map((p) => p[1]);
  const xs = pts.map((p) => p[0]);
  const yMax = Math.max(...ys);
  const yMin = Math.min(...ys);
  const spanY = Math.max(yMax - yMin, 1);
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1);
  const bandTop = yMax - spanY * 0.22;
  const hemBand = pts.filter((p) => p[1] >= bandTop);
  if (hemBand.length === 0) return Math.max(spec.designHemY, yMax);

  const lateralDist = Math.max(28, spanX * 0.045);
  const sideOnly = hemBand.filter((p) => Math.abs(p[0] - ox) > lateralDist);
  const sideMaxY =
    sideOnly.length > 0 ? Math.max(...sideOnly.map((p) => p[1])) : Math.max(...hemBand.map((p) => p[1]));
  return Math.max(spec.designHemY, sideMaxY);
}

function designYAfterHemGradingAlign(
  gx: number,
  gy: number,
  spec: ScalableGarmentSpec,
  shoulderY: number
): number {
  const ox = spec.gradingHemAlignOriginX;
  if (ox == null || !Number.isFinite(ox)) return gy;
  const stripHalf = Math.max(3, spec.gradingHemAlignStripHalf ?? GRADING_HEM_ALIGN_STRIP_HALF_FALLBACK);
  if (Math.abs(gx - ox) > stripHalf) return gy;
  const targetY = spec.gradingHemAlignTargetY ?? spec.designHemY;
  const depth = Math.max(targetY - shoulderY, 1);
  const hemBandTop = targetY - depth * GRADING_HEM_ALIGN_BAND_FRAC;
  if (gy < hemBandTop) return gy;
  return Math.max(gy, targetY);
}

/** 着丈を採寸どおりにスケール。肩Y固定、それより下をY方向にスケール（裾揃えは任意で先に design Y を補正） */
export function scaleBodyToSpec(
  pathD: string,
  pathIdx: number,
  spec: ScalableGarmentSpec,
  specLengthCm: number,
  shoulderY: number
): string {
  const s = specLengthCm / spec.bodyLengthCm;
  if (!spec.bodyPathIndices.includes(pathIdx)) return pathD;
  return tPath(pathD, (gx, gy) => {
    let gyDesign = gy;
    if (gyDesign > shoulderY) {
      gyDesign = designYAfterHemGradingAlign(gx, gyDesign, spec, shoulderY);
    }
    if (gyDesign <= shoulderY) return [gx, gyDesign];
    const newY = shoulderY + (gyDesign - shoulderY) * s;
    return [gx, newY];
  });
}

/** 袖パスを採寸スケールに合わせて変換（基準袖丈は lengthStart〜lengthEnd の |ΔY|） */
export function scaleSleevePathToSpec(
  pathD: string,
  spec: ScalableGarmentSpec,
  specSleeveCm: number,
  garmentLengthPx: number
): string {
  const pts = getPathPoints(pathD);
  const { sleeve } = spec;
  const minLen = Math.max(sleeve.lengthStartIdx, sleeve.lengthEndIdx, sleeve.innerAnchorIdx ?? 0) + 1;
  if (pts.length < minLen) return pathD;

  const anchor = pts[sleeve.anchorIdx];
  const pxPerCm = garmentLengthPx / spec.bodyLengthCm;
  const startPt = pts[sleeve.lengthStartIdx];
  const endPt = pts[sleeve.lengthEndIdx];
  const lenPx = Math.abs(endPt[1] - startPt[1]);
  const measuredCm = lenPx / pxPerCm;
  if (measuredCm <= 0) return pathD;
  const s = specSleeveCm / measuredCm;

  const scaleInner = sleeve.innerScaleFn?.(specSleeveCm) ?? 1;
  const innerAnchor = sleeve.innerAnchorIdx != null ? pts[sleeve.innerAnchorIdx!] : null;
  const applyExclusiveEnd = sleeve.lengthApplyEndExclusive ?? sleeve.lengthEndIdx + 1;

  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    if (pointIndex < sleeve.lengthStartIdx) return [x, y];
    if (sleeve.innerIndices && innerAnchor != null && pointIndex >= sleeve.innerIndices[0] && pointIndex <= sleeve.innerIndices[1]) {
      return [
        innerAnchor[0] + (x - innerAnchor[0]) * scaleInner,
        innerAnchor[1] + (y - innerAnchor[1]) * scaleInner,
      ];
    }
    if (pointIndex >= sleeve.lengthStartIdx && pointIndex < applyExclusiveEnd) {
      return [anchor[0] + (x - anchor[0]) * s, anchor[1] + (y - anchor[1]) * s];
    }
    return [x, y];
  });
}

export function rotateAround(
  pt: [number, number],
  pivot: [number, number],
  theta: number
): [number, number] {
  const dx = pt[0] - pivot[0];
  const dy = pt[1] - pivot[1];
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
}

/** 袖を腕の角度に合わせた回転量（sleeveOnlyTransform で外腕にブレンド） */
export function computeSleeveRotations(
  pathDs: string[],
  config: ArmLogicConfig,
  specSleeveCm: number,
  garmentLengthPx: number,
  place: (x: number, y: number) => [number, number],
  leftShoulder: [number, number],
  rightShoulder: [number, number],
  leftArmPts: [number, number][],
  rightArmPts: [number, number][]
): { sleeveRotationL: number; sleeveRotationR: number } {
  let sleeveRotationL = 0;
  let sleeveRotationR = 0;

  if (config.sleeveOnly) {
    const { seamPathLeft, seamPathLeftEnd, seamPathRight, seamPathRightEnd } = config;
    const leftSeamPts =
      config.seamOuterLeftVertices != null
        ? collectPtsGlobalVertexRange(
            pathDs,
            config.seamOuterLeftVertices[0],
            config.seamOuterLeftVertices[1]
          )
        : collectPathPointsInLineRange(pathDs, seamPathLeft, seamPathLeftEnd);
    const rightSeamPts =
      config.seamOuterRightVertices != null
        ? collectPtsGlobalVertexRange(
            pathDs,
            config.seamOuterRightVertices[0],
            config.seamOuterRightVertices[1]
          )
        : collectPathPointsInLineRange(pathDs, seamPathRight, seamPathRightEnd);
    if (leftSeamPts.length === 0 || rightSeamPts.length === 0) {
      return { sleeveRotationL: 0, sleeveRotationR: 0 };
    }

    let leftSeamWristSvg = leftSeamPts[0];
    let minPlacedX = Infinity;
    for (const pt of leftSeamPts) {
      const px = place(pt[0], pt[1])[0];
      if (px < minPlacedX) {
        minPlacedX = px;
        leftSeamWristSvg = pt;
      }
    }
    const placedSeamCuffL = place(leftSeamWristSvg[0], leftSeamWristSvg[1]);
    const sleeveAngleL = Math.atan2(
      placedSeamCuffL[1] - leftShoulder[1],
      placedSeamCuffL[0] - leftShoulder[0]
    );

    let targetArmL = leftArmPts[leftArmPts.length - 1];
    let bestYDistL = Infinity;
    for (const pt of leftArmPts) {
      const dist = Math.abs(pt[1] - placedSeamCuffL[1]);
      if (dist < bestYDistL) {
        bestYDistL = dist;
        targetArmL = pt;
      }
    }
    const armAngleL = Math.atan2(targetArmL[1] - leftShoulder[1], targetArmL[0] - leftShoulder[0]);
    sleeveRotationL = armAngleL - sleeveAngleL;

    let rightSeamWristSvg = rightSeamPts[0];
    let maxPlacedX = -Infinity;
    for (const pt of rightSeamPts) {
      const px = place(pt[0], pt[1])[0];
      if (px > maxPlacedX) {
        maxPlacedX = px;
        rightSeamWristSvg = pt;
      }
    }
    const placedSeamCuffR = place(rightSeamWristSvg[0], rightSeamWristSvg[1]);
    const sleeveAngleR = Math.atan2(
      placedSeamCuffR[1] - rightShoulder[1],
      placedSeamCuffR[0] - rightShoulder[0]
    );

    let targetArmR = rightArmPts[rightArmPts.length - 1];
    let bestYDistR = Infinity;
    for (const pt of rightArmPts) {
      const dist = Math.abs(pt[1] - placedSeamCuffR[1]);
      if (dist < bestYDistR) {
        bestYDistR = dist;
        targetArmR = pt;
      }
    }
    const armAngleR = Math.atan2(targetArmR[1] - rightShoulder[1], targetArmR[0] - rightShoulder[0]);
    sleeveRotationR = armAngleR - sleeveAngleR;

    return { sleeveRotationL, sleeveRotationR };
  }

  return { sleeveRotationL: 0, sleeveRotationR: 0 };
}
