/**
 * sleeveOnly 用コンテキスト構築（`buildSleeveOnlyCtx`）。
 * 本体のパス変形は `sleeveOnlyTransformApply.ts`。
 */

import type { CustomLandmarks, ScalableGarmentSpec } from "./types";
import { getPathPoints, getPathsBBox, collectPtsGlobalVertexRange } from "./pathUtils";
import {
  computeSleeveRotations,
  computeGradingHemAlignTargetY,
  type ArmLogicConfig,
} from "./coatArmLogic";

export function pathIdxInConfigRange(pathIdx: number, start: number, end?: number): boolean {
  const e = end ?? start;
  const lo = Math.min(start, e);
  const hi = Math.max(start, e);
  return pathIdx >= lo && pathIdx <= hi;
}

function collectPtsLineRange(pathDs: string[], start: number, end?: number): [number, number][] {
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

/**
 * sleeveOnly 系で sleevePath が「実質的に胴体サイド（肩〜裾）」なら
 * body スケール対象として扱うための判定。
 */
export function shouldScaleSleevePathAsBody(pathD: string, spec: ScalableGarmentSpec): boolean {
  const pts = getPathPoints(pathD);
  if (pts.length < 2) return false;
  const ys = pts.map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const shoulderBand = 140;
  const hemBand = 140;
  const reachesShoulder = minY <= spec.designShoulderY + shoulderBand;
  const reachesHem = maxY >= spec.designHemY - hemBand;
  return reachesShoulder && reachesHem;
}

export interface SleeveOnlyTransformParams {
  pathDs: string[];
  landmarks: CustomLandmarks;
  scalableSpec: ScalableGarmentSpec;
  specLengthCm: number;
  specSleeveCm: number;
  config: ArmLogicConfig;
  place: (x: number, y: number) => [number, number];
  placeFn: (x: number, y: number) => [number, number];
  leftShoulder: [number, number];
  rightShoulder: [number, number];
  leftArmPts: [number, number][];
  rightArmPts: [number, number][];
  /**
   * `scaleSleevePathToSpec` の garmentLengthPx。指定時は designHem−designShoulder の代わりに使う（着丈紫とプレースを一致）。
   */
  garmentLengthPxOverride?: number;
}

export type SleeveOnlyCtx = {
  pathDs: string[];
  lm: CustomLandmarks;
  scalableSpec: ScalableGarmentSpec;
  specLengthCm: number;
  specSleeveCm: number;
  config: ArmLogicConfig;
  placeFn: (x: number, y: number) => [number, number];
  leftShoulder: [number, number];
  rightShoulder: [number, number];
  garmentLengthPx: number;
  sleeveRotationL: number;
  sleeveRotationR: number;
  scaleSleeve: boolean;
  scaleBody: (pathIdx: number) => boolean;
  hemFadeBuffer: number;
  attachLx: number;
  attachRx: number;
  leftArmRange: number;
  rightArmRange: number;
  originX: number;
  centerSnapThresh: number;
  debugFitting: boolean;
};

export function buildSleeveOnlyCtx(p: SleeveOnlyTransformParams): SleeveOnlyCtx {
  const {
    pathDs,
    landmarks: lm,
    scalableSpec: specIn,
    specLengthCm,
    specSleeveCm,
    config,
    placeFn,
    leftShoulder,
    rightShoulder,
    leftArmPts,
    rightArmPts,
    place,
  } = p;

  const bbox = getPathsBBox(pathDs);
  const originX = bbox ? (bbox.minX + bbox.maxX) / 2 : (lm.shoulderLx + lm.shoulderRx) / 2;
  const spanX = bbox && bbox.maxX > bbox.minX ? bbox.maxX - bbox.minX : 400;
  let scalableSpec = specIn;
  if (specIn.gradingHemAlignOriginX != null && Number.isFinite(specIn.gradingHemAlignOriginX)) {
    const targetY = computeGradingHemAlignTargetY(pathDs, specIn, specIn.designShoulderY);
    const stripHalf = Math.max(20, spanX * 0.052);
    scalableSpec = {
      ...specIn,
      gradingHemAlignTargetY: targetY,
      gradingHemAlignStripHalf: stripHalf,
    };
  }

  const garmentLengthPx =
    p.garmentLengthPxOverride != null && Number.isFinite(p.garmentLengthPxOverride) && p.garmentLengthPxOverride > 1
      ? p.garmentLengthPxOverride
      : scalableSpec.designHemY - scalableSpec.designShoulderY;
  const { sleeveRotationL, sleeveRotationR } = computeSleeveRotations(
    pathDs,
    config,
    specSleeveCm,
    garmentLengthPx,
    place,
    leftShoulder,
    rightShoulder,
    leftArmPts,
    rightArmPts
  );
  const debugFitting = typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_FITTING") === "1";
  const scaleSleeve = true;
  const scaleBody = (pathIdx: number) => scalableSpec.bodyPathIndices.includes(pathIdx);
  const {
    seamPathLeft,
    seamPathLeftEnd,
    seamPathRight,
    seamPathRightEnd,
  } = config;

  const centerSnapThresh = 3;
  const attachLxFallback = config.attachLSvg[0];
  const attachRxFallback = config.attachRSvg[0];
  const hemFadeBuffer = Math.max(120, (lm.hemY - lm.shoulderY) * 0.075);

  let leftWristGx = attachLxFallback;
  let rightWristGx = attachRxFallback;
  const leftSeamPtsForWrist =
    config.seamOuterLeftVertices != null
      ? collectPtsGlobalVertexRange(pathDs, config.seamOuterLeftVertices[0], config.seamOuterLeftVertices[1])
      : collectPtsLineRange(pathDs, seamPathLeft, seamPathLeftEnd);
  const rightSeamPtsForWrist =
    config.seamOuterRightVertices != null
      ? collectPtsGlobalVertexRange(pathDs, config.seamOuterRightVertices[0], config.seamOuterRightVertices[1])
      : collectPtsLineRange(pathDs, seamPathRight, seamPathRightEnd);
  for (const pt of leftSeamPtsForWrist) {
    if (pt[0] < leftWristGx) leftWristGx = pt[0];
  }
  for (const pt of rightSeamPtsForWrist) {
    if (pt[0] > rightWristGx) rightWristGx = pt[0];
  }
  let attachLx = attachLxFallback;
  if (leftSeamPtsForWrist.length > 0) {
    let bestDist = Infinity;
    for (const pt of leftSeamPtsForWrist) {
      const dist = Math.abs(pt[1] - lm.shoulderY);
      if (dist < bestDist) {
        bestDist = dist;
        attachLx = pt[0];
      }
    }
  }
  let attachRx = attachRxFallback;
  if (rightSeamPtsForWrist.length > 0) {
    let bestDist = Infinity;
    for (const pt of rightSeamPtsForWrist) {
      const dist = Math.abs(pt[1] - lm.shoulderY);
      if (dist < bestDist) {
        bestDist = dist;
        attachRx = pt[0];
      }
    }
  }

  const leftArmRange = Math.max(1, attachLx - leftWristGx);
  const rightArmRange = Math.max(1, rightWristGx - attachRx);

  /** `sessionStorage.setItem("DEBUG_SLEEVE_JUNCTION","1")` で有効。 */
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_SLEEVE_JUNCTION") === "1") {
    try {
      const si = config.sleevePathLeft;
      const so = config.seamPathLeft;
      const innerD = pathDs[si];
      const outerD = pathDs[so];
      if (innerD && outerD) {
        const iPts = getPathPoints(innerD);
        const oPts = getPathPoints(outerD);
        let outerMaxLw = 0;
        let outerVertsNearShoulderWithZeroW = 0;
        const band = lm.shoulderY + (lm.hemY - lm.shoulderY) * 0.35;
        for (const [gx, gy] of oPts) {
          const yFactor = Math.max(0, Math.min(1, (lm.hemY - gy) / hemFadeBuffer));
          const lw = Math.max(0, Math.min(1, (attachLx - gx) / leftArmRange)) * yFactor;
          outerMaxLw = Math.max(outerMaxLw, lw);
          if (gy <= band && lw < 0.01) outerVertsNearShoulderWithZeroW++;
        }
        console.log("[DEBUG_SLEEVE_JUNCTION]", {
          innerPathIdx: si,
          outerPathIdx: so,
          innerVerts: iPts.length,
          outerVerts: oPts.length,
          hemFadeBuffer: Math.round(hemFadeBuffer),
          attachLx: Math.round(attachLx * 10) / 10,
          leftArmRange: Math.round(leftArmRange * 10) / 10,
          outerMaxLeftBlendWeight: outerMaxLw.toFixed(3),
          outerVertsNearShoulderBandWithZeroBlend: outerVertsNearShoulderWithZeroW,
          causes: [
            "内袖(sleeveInner*)は makeVertexFn で isOuterArmPath=false → 腕回転ブレンドなし、place のアフィンのみ",
            "外腕は (attachLx-gx)/range * yFactor でブレンド。袖付け付近は意図的に重み0",
            "getBodyParams の体重は xScale のみ → place の deltaY は体重で変わらない（縦の交点ずれは別ロジックが必要）",
          ],
        });
      }
    } catch (e) {
      console.warn("[DEBUG_SLEEVE_JUNCTION] failed", e);
    }
  }

  return {
    pathDs,
    lm,
    scalableSpec,
    specLengthCm,
    specSleeveCm,
    config,
    placeFn,
    leftShoulder,
    rightShoulder,
    garmentLengthPx,
    sleeveRotationL,
    sleeveRotationR,
    scaleSleeve,
    scaleBody,
    hemFadeBuffer,
    attachLx,
    attachRx,
    leftArmRange,
    rightArmRange,
    originX,
    centerSnapThresh,
    debugFitting,
  };
}
