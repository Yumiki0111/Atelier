import {
  scaleBodyToSpec,
  scaleSleevePathToSpec,
  rotateAround,
} from "./scalableGarmentArmLogic";
import { tPath, getPathPoints, flattenSvgPathToPolyline } from "./pathUtils";
import {
  buildSleeveOnlyCtx,
  pathIdxInConfigRange,
  shouldScaleSleevePathAsBody,
  type SleeveOnlyCtx,
  type SleeveOnlyTransformParams,
} from "./sleeveOnlyTransformCtx";

function dToUseForPath(d: string, pathIdx: number, ctx: SleeveOnlyCtx): string {
  const {
    scalableSpec,
    specLengthCm,
    specSleeveCm,
    garmentLengthPx,
    scaleSleeve,
    scaleBody,
    config,
  } = ctx;
  const {
    sleevePathLeft,
    sleevePathLeftEnd,
    sleevePathRight,
    sleevePathRightEnd,
  } = config;

  let dToUse = d;
  if (pathIdxInConfigRange(pathIdx, sleevePathLeft, sleevePathLeftEnd) || pathIdxInConfigRange(pathIdx, sleevePathRight, sleevePathRightEnd)) {
    const bodyForThisPath =
      scaleBody(pathIdx) || (!scaleSleeve && shouldScaleSleevePathAsBody(d, scalableSpec));
    if (bodyForThisPath) {
      dToUse = scaleBodyToSpec(dToUse, pathIdx, scalableSpec, specLengthCm, scalableSpec.designShoulderY);
    }
    if (scaleSleeve) {
      dToUse = scaleSleevePathToSpec(dToUse, scalableSpec, specSleeveCm, garmentLengthPx);
    }
  } else if (scaleBody(pathIdx)) {
    dToUse = scaleBodyToSpec(d, pathIdx, scalableSpec, specLengthCm, scalableSpec.designShoulderY);
  }
  return dToUse;
}

function makeVertexFn(pathIdx: number, ctx: SleeveOnlyCtx): (gx: number, gy: number) => [number, number] {
  const {
    lm,
    scalableSpec,
    placeFn,
    leftShoulder,
    rightShoulder,
    hemFadeBuffer,
    attachLx,
    attachRx,
    leftArmRange,
    rightArmRange,
    innerLeftY0,
    innerLeftY1,
    innerRightY0,
    innerRightY1,
    config,
  } = ctx;
  const {
    seamPathLeft,
    seamPathLeftEnd,
    seamPathRight,
    seamPathRightEnd,
    sleevePathLeft,
    sleevePathLeftEnd,
    sleevePathRight,
    sleevePathRightEnd,
  } = config;
  const isOuterArmPath =
    pathIdxInConfigRange(pathIdx, seamPathLeft, seamPathLeftEnd) ||
    pathIdxInConfigRange(pathIdx, seamPathRight, seamPathRightEnd);

  return (gx: number, gy: number): [number, number] => {
    const pt = placeFn(gx, gy);

    if (isOuterArmPath) {
      const yFactor = Math.max(0, Math.min(1, (lm.hemY - gy) / hemFadeBuffer));
      const leftWeight = Math.max(0, Math.min(1, (attachLx - gx) / leftArmRange)) * yFactor;
      if (leftWeight > 0) {
        const rotated = rotateAround(pt, leftShoulder, ctx.sleeveRotationL);
        return [
          pt[0] * (1 - leftWeight) + rotated[0] * leftWeight,
          pt[1] * (1 - leftWeight) + rotated[1] * leftWeight,
        ];
      }
      const rightWeight = Math.max(0, Math.min(1, (gx - attachRx) / rightArmRange)) * yFactor;
      if (rightWeight > 0) {
        const rotated = rotateAround(pt, rightShoulder, ctx.sleeveRotationR);
        return [
          pt[0] * (1 - rightWeight) + rotated[0] * rightWeight,
          pt[1] * (1 - rightWeight) + rotated[1] * rightWeight,
        ];
      }
    } else if (pathIdxInConfigRange(pathIdx, sleevePathLeft, sleevePathLeftEnd)) {
      /** 内袖は gx が attach より体側で (attachLx−gx) が効かないため、肩〜袖口の Y で外腕と同じ回転をブレンド */
      const yFactor = Math.max(0, Math.min(1, (lm.hemY - gy) / hemFadeBuffer));
      const ySpan = Math.max(1e-6, innerLeftY1 - innerLeftY0);
      const yAlong = Math.max(0, Math.min(1, (gy - innerLeftY0) / ySpan));
      const leftWeight = yAlong * yFactor;
      if (leftWeight > 0) {
        const rotated = rotateAround(pt, leftShoulder, ctx.sleeveRotationL);
        return [
          pt[0] * (1 - leftWeight) + rotated[0] * leftWeight,
          pt[1] * (1 - leftWeight) + rotated[1] * leftWeight,
        ];
      }
    } else if (pathIdxInConfigRange(pathIdx, sleevePathRight, sleevePathRightEnd)) {
      const yFactor = Math.max(0, Math.min(1, (lm.hemY - gy) / hemFadeBuffer));
      const ySpan = Math.max(1e-6, innerRightY1 - innerRightY0);
      const yAlong = Math.max(0, Math.min(1, (gy - innerRightY0) / ySpan));
      const rightWeight = yAlong * yFactor;
      if (rightWeight > 0) {
        const rotated = rotateAround(pt, rightShoulder, ctx.sleeveRotationR);
        return [
          pt[0] * (1 - rightWeight) + rotated[0] * rightWeight,
          pt[1] * (1 - rightWeight) + rotated[1] * rightWeight,
        ];
      }
    }

    return pt;
  };
}

function renderOnePath(d: string, pathIdx: number, ctx: SleeveOnlyCtx): string {
  if (getPathPoints(d).length <= 2) return "";

  const dToUse = dToUseForPath(d, pathIdx, ctx);
  const { seamPathLeft, seamPathLeftEnd, seamPathRight, seamPathRightEnd } = ctx.config;
  const isOuterArmPath =
    pathIdxInConfigRange(pathIdx, seamPathLeft, seamPathLeftEnd) ||
    pathIdxInConfigRange(pathIdx, seamPathRight, seamPathRightEnd);

  const fn = makeVertexFn(pathIdx, ctx);
  const skipFlatten =
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_NO_SEAM_FLATTEN") === "1";
  const dForTransform =
    isOuterArmPath && !skipFlatten ? flattenSvgPathToPolyline(dToUse, 16, 12) : dToUse;
  return tPath(dForTransform, fn);
}

function plotPointsOnePath(d: string, pathIdx: number, ctx: SleeveOnlyCtx): [number, number][] {
  const pts = getPathPoints(d);
  if (pts.length === 0) return [];
  if (pts.length <= 2) return pts.map(([gx, gy]) => ctx.placeFn(gx, gy));

  const dToUse = dToUseForPath(d, pathIdx, ctx);
  const fn = makeVertexFn(pathIdx, ctx);
  return getPathPoints(dToUse).map(([gx, gy]) => fn(gx, gy));
}

/**
 * 服プロット用: 各 path の SVG 連結頂点（着丈・袖スケール後の座標）に、描画と同じ fn をかけたボディ座標。
 * flatten による中間点はプロットに含めない（# は入力 path の頂点だけ）。
 */
export function customGarmentVertexPlotsSleeveOnlyBodySpace(p: SleeveOnlyTransformParams): [number, number][] {
  const ctx = buildSleeveOnlyCtx(p);
  const out: [number, number][] = [];
  for (let i = 0; i < p.pathDs.length; i++) {
    out.push(...plotPointsOnePath(p.pathDs[i]!, i, ctx));
  }
  return out;
}

/** `config.sleeveOnly` が true のパイプラインから呼ぶ。false のときは呼び出し側で分岐。 */
export function applySleeveOnlyGarmentTransform(p: SleeveOnlyTransformParams): string[] {
  const ctx = buildSleeveOnlyCtx(p);
  let scaledSleevePaths = 0;
  const scaledSleevePathIdxs: number[] = [];

  const out = p.pathDs.map((d, pathIdx) => {
    if (getPathPoints(d).length <= 2) return "";
    if (ctx.debugFitting) {
      const { sleevePathLeft, sleevePathLeftEnd, sleevePathRight, sleevePathRightEnd } = ctx.config;
      if (
        pathIdxInConfigRange(pathIdx, sleevePathLeft, sleevePathLeftEnd) ||
        pathIdxInConfigRange(pathIdx, sleevePathRight, sleevePathRightEnd)
      ) {
        scaledSleevePaths++;
        scaledSleevePathIdxs.push(pathIdx);
      }
    }
    return renderOnePath(d, pathIdx, ctx);
  });

  if (ctx.debugFitting) {
    console.log("[DEBUG_FITTING][sleeveOnlyTransform]", {
      specSleeveCm: ctx.specSleeveCm,
      scaledSleevePaths,
      scaledSleevePathIdxs,
      sleeveMeasureIndices: ctx.scalableSpec.sleeveMeasureIndices,
      sleeve: {
        lengthStartIdx: ctx.scalableSpec.sleeve.lengthStartIdx,
        lengthEndIdx: ctx.scalableSpec.sleeve.lengthEndIdx,
        cuffIdx: ctx.scalableSpec.sleeve.cuffIdx,
      },
    });
  }

  return out;
}
