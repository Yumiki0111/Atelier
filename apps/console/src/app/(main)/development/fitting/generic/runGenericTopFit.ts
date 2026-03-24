/**
 * 汎用パイプライン: 手入力インデックス経由の sleeveOnly（着丈・袖丈＋外腕の腕追従）。
 * 4 区間が `customGarmentData` にあれば `applied` なしでも実行可能（基準着丈は幾何または Apply 時 baseline）。
 */

import type { CustomLandmarks, SizeMeasure } from "../lib/types";
import type { TopLandmarks } from "../lib/garmentBase";
import { buildTopPlacement } from "../lib/garmentBase";
import { tPath, getPathPoints, pointAtGlobalVertexIndex } from "../lib/pathUtils";
import { REF_HEIGHT_CM } from "../lib/constants";
import {
  getBodyParams,
  getZonesAnchored,
  warpArmOutline,
  getInterpolatedArmOutline,
} from "../lib/bodyUtils";
import {
  applySleeveOnlyGarmentTransform,
  customGarmentVertexPlotsSleeveOnlyBodySpace,
} from "../lib/sleeveOnlyTransform";
import {
  buildSymmetricTopTopologyFromGlobalVertices,
  type SymmetricTopGlobalVertexRanges,
} from "./inferSymmetricTop";
import { resolveGenericSymmetricTop, type BuildGenericScalableSpecOptions } from "./buildGenericSpec";
import type { GenericFitOutput, InferredSymmetricTopTopology } from "./types";

/**
 * 着丈グレード（scaleBodyToSpec と同じ線形係数）後の紫区間 |ΔY|（design px）。
 * Apply 後 sleeveOnly 内の胴スケールとプレース分母を measure-only と同じ考え方に揃える。
 */
function lengthMeasureDesignSpanAfterBodyScale(
  pathDs: string[],
  range: [number, number] | undefined,
  designShoulderY: number,
  specLengthCm: number,
  bodyLengthCm: number
): number | null {
  if (!range || range.length !== 2) return null;
  const lo = Math.min(Math.trunc(range[0]), Math.trunc(range[1]));
  const hi = Math.max(Math.trunc(range[0]), Math.trunc(range[1]));
  const pa = pointAtGlobalVertexIndex(pathDs, lo);
  const pb = pointAtGlobalVertexIndex(pathDs, hi);
  if (!pa || !pb || !Number.isFinite(bodyLengthCm) || bodyLengthCm <= 0) return null;
  const s = specLengthCm / bodyLengthCm;
  const mapY = (y: number) => (y <= designShoulderY ? y : designShoulderY + (y - designShoulderY) * s);
  const dy = Math.abs(mapY(pb[1]) - mapY(pa[1]));
  return dy > 1 ? dy : null;
}

function toTopLandmarks(c: CustomLandmarks): TopLandmarks {
  return {
    shoulderY: c.shoulderY,
    shoulderLx: c.shoulderLx,
    shoulderRx: c.shoulderRx,
    pitY: c.shoulderY,
    pitLx: c.shoulderLx,
    pitRx: c.shoulderRx,
    hemY: c.hemY,
    hemCx: c.hemCx,
    ...(c.garmentLengthOverride != null ? { garmentLengthOverride: c.garmentLengthOverride } : {}),
    ...(c.bodyShoulderOffsetY != null ? { bodyShoulderOffsetY: c.bodyShoulderOffsetY } : {}),
    ...(c.totalWidth != null ? { totalWidth: c.totalWidth } : {}),
    ...(c.maxWidthRatio != null ? { maxWidthRatio: c.maxWidthRatio } : {}),
  };
}

/** path 自動判定はしない。プレースメントのみ返す。 */
export function runGenericSymmetricTopFit(
  pathDs: string[],
  landmarks: CustomLandmarks,
  size: SizeMeasure,
  heightCm: number,
  weightKg: number,
  shoulderOriginY?: number
): GenericFitOutput {
  const warnings = [
    "汎用トップは連結頂点インデックスを 4 範囲入力し Apply してください（自動判定はしません）。",
  ];
  const top = toTopLandmarks(landmarks);
  const { place } = buildTopPlacement(heightCm, weightKg, size, top, shoulderOriginY, null);
  const pathDsOut = pathDs.map((d) => tPath(d, place));
  return {
    pathDsOut,
    vertexPlotsBodySpace: pathDs.flatMap((d) => getPathPoints(d).map(([x, y]) => place(x, y))),
    resolved: null,
    warnings,
  };
}

/**
 * ユーザー手入力（4 つの連結頂点範囲）から topology を確定し、変形を適用する。
 * 失敗した場合は（袖ロジックを含めず）通常の place のみを返す。
 */
export function runGenericSymmetricTopFitManual(
  pathDs: string[],
  landmarks: CustomLandmarks,
  size: SizeMeasure,
  heightCm: number,
  weightKg: number,
  shoulderOriginY: number | undefined,
  vertexRanges: SymmetricTopGlobalVertexRanges,
  specOptions?: BuildGenericScalableSpecOptions
): GenericFitOutput {
  const inferred = buildSymmetricTopTopologyFromGlobalVertices(pathDs, landmarks, vertexRanges);
  const warnings = [...inferred.warnings];
  if (!inferred.ok || !inferred.topology) {
    const top = toTopLandmarks(landmarks);
    const { place } = buildTopPlacement(heightCm, weightKg, size, top, shoulderOriginY, null);
    const pathDsOut = pathDs.map((d) => tPath(d, place));
    return {
      pathDsOut,
      vertexPlotsBodySpace: pathDs.flatMap((d) => getPathPoints(d).map(([x, y]) => place(x, y))),
      resolved: null,
      warnings,
    };
  }

  const resolved = resolveGenericSymmetricTop(pathDs, landmarks, size, inferred.topology, specOptions);
  const { scalableSpec, armConfig } = resolved;

  const debugFitting = typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_FITTING") === "1";
  if (debugFitting) {
    // ここで spec / 基準長 / sleeve 指標のズレを確定させる
    console.log("[DEBUG_FITTING][generic][manual][resolved]", {
      size: { length: size.length, sleeve: size.sleeve },
      scalableSpec: {
        designShoulderY: scalableSpec.designShoulderY,
        designHemY: scalableSpec.designHemY,
        bodyLengthCm: scalableSpec.bodyLengthCm,
        defaultSleeveCm: scalableSpec.defaultSleeveCm,
        sleeve: { ...scalableSpec.sleeve, cuffIdx: scalableSpec.sleeve.cuffIdx },
        sleeveMeasureIndices: scalableSpec.sleeveMeasureIndices,
      },
      armConfig: {
        sleeveOnly: armConfig.sleeveOnly,
        sleevePathLeft: armConfig.sleevePathLeft,
        sleevePathLeftEnd: armConfig.sleevePathLeftEnd,
        sleevePathRight: armConfig.sleevePathRight,
        sleevePathRightEnd: armConfig.sleevePathRightEnd,
        seamPathLeft: armConfig.seamPathLeft,
        seamPathLeftEnd: armConfig.seamPathLeftEnd,
        seamPathRight: armConfig.seamPathRight,
        seamPathRightEnd: armConfig.seamPathRightEnd,
      },
      specOptions,
      // bodyLength を直で解くので、specLength は size.length のはず
      specLengthCm: size.length,
    });
  }

  const specLengthCm = size.length;
  const purpleDyPlacement = lengthMeasureDesignSpanAfterBodyScale(
    pathDs,
    specOptions?.lengthMeasureGlobalForPlacement,
    scalableSpec.designShoulderY,
    specLengthCm,
    scalableSpec.bodyLengthCm
  );

  const scaledLandmarks = (() => {
    const s = specLengthCm / scalableSpec.bodyLengthCm;
    const scaledHemY = scalableSpec.designShoulderY + (scalableSpec.designHemY - scalableSpec.designShoulderY) * s;
    const designLength = scaledHemY - scalableSpec.designShoulderY;
    return {
      ...landmarks,
      shoulderY: scalableSpec.designShoulderY,
      hemY: scaledHemY,
      garmentLengthOverride: purpleDyPlacement ?? designLength,
    };
  })();

  const top = toTopLandmarks(scaledLandmarks);
  const { place } = buildTopPlacement(heightCm, weightKg, size, top, shoulderOriginY, null);

  const { yScale, xScale } = getBodyParams(heightCm, weightKg, null);
  const zones = getZonesAnchored(yScale);
  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(REF_HEIGHT_CM);
  const leftArmPts = warpArmOutline(leftArmOutline, true, yScale, xScale, zones, heightCm);
  const rightArmPts = warpArmOutline(rightArmOutline, false, yScale, xScale, zones, heightCm);
  const leftShoulder = leftArmPts[0];
  const rightShoulder = rightArmPts[0];

  const specSleeveCm = size.sleeve ?? scalableSpec.defaultSleeveCm;
  const placeFn = place;

  const sleeveParams = {
    pathDs,
    landmarks: scaledLandmarks,
    scalableSpec,
    specLengthCm,
    specSleeveCm,
    config: armConfig,
    place,
    placeFn,
    leftShoulder,
    rightShoulder,
    leftArmPts,
    rightArmPts,
    ...(purpleDyPlacement != null ? { garmentLengthPxOverride: purpleDyPlacement } : {}),
  };
  const pathDsOut = applySleeveOnlyGarmentTransform(sleeveParams);
  const vertexPlotsBodySpace = customGarmentVertexPlotsSleeveOnlyBodySpace(sleeveParams);

  return { pathDsOut, vertexPlotsBodySpace, resolved, warnings };
}

/**
 * Apply時に確定した topology を固定利用する版。
 * 毎回の再推定差をなくし、Apply 時の固定トポロジーで安定して変換する。
 */
export function runGenericSymmetricTopFitWithTopology(
  pathDs: string[],
  landmarks: CustomLandmarks,
  size: SizeMeasure,
  heightCm: number,
  weightKg: number,
  shoulderOriginY: number | undefined,
  topology: InferredSymmetricTopTopology,
  specOptions?: BuildGenericScalableSpecOptions
): GenericFitOutput {
  const resolved = resolveGenericSymmetricTop(pathDs, landmarks, size, topology, specOptions);
  const { scalableSpec, armConfig } = resolved;

  const specLengthCm = size.length;
  const purpleDyPlacement = lengthMeasureDesignSpanAfterBodyScale(
    pathDs,
    specOptions?.lengthMeasureGlobalForPlacement,
    scalableSpec.designShoulderY,
    specLengthCm,
    scalableSpec.bodyLengthCm
  );

  const scaledLandmarks = (() => {
    const s = specLengthCm / scalableSpec.bodyLengthCm;
    const scaledHemY = scalableSpec.designShoulderY + (scalableSpec.designHemY - scalableSpec.designShoulderY) * s;
    const designLength = scaledHemY - scalableSpec.designShoulderY;
    return {
      ...landmarks,
      shoulderY: scalableSpec.designShoulderY,
      hemY: scaledHemY,
      garmentLengthOverride: purpleDyPlacement ?? designLength,
    };
  })();

  const top = toTopLandmarks(scaledLandmarks);
  const { place } = buildTopPlacement(heightCm, weightKg, size, top, shoulderOriginY, null);

  const { yScale, xScale } = getBodyParams(heightCm, weightKg, null);
  const zones = getZonesAnchored(yScale);
  const { left: leftArmOutline, right: rightArmOutline } = getInterpolatedArmOutline(REF_HEIGHT_CM);
  const leftArmPts = warpArmOutline(leftArmOutline, true, yScale, xScale, zones, heightCm);
  const rightArmPts = warpArmOutline(rightArmOutline, false, yScale, xScale, zones, heightCm);
  const leftShoulder = leftArmPts[0];
  const rightShoulder = rightArmPts[0];

  const specSleeveCm = size.sleeve ?? scalableSpec.defaultSleeveCm;
  const placeFn = place;

  const sleeveParams = {
    pathDs,
    landmarks: scaledLandmarks,
    scalableSpec,
    specLengthCm,
    specSleeveCm,
    config: armConfig,
    place,
    placeFn,
    leftShoulder,
    rightShoulder,
    leftArmPts,
    rightArmPts,
    ...(purpleDyPlacement != null ? { garmentLengthPxOverride: purpleDyPlacement } : {}),
  };
  const pathDsOut = applySleeveOnlyGarmentTransform(sleeveParams);
  const vertexPlotsBodySpace = customGarmentVertexPlotsSleeveOnlyBodySpace(sleeveParams);
  return { pathDsOut, vertexPlotsBodySpace, resolved, warnings: [] };
}
