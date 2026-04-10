import type { CustomGarmentData, CustomLandmarks, SizeMeasure } from "../lib/types";
import { applySleeveFirstEdgeEuclideanStretchToPath } from "../lib/scalableGarmentArmLogic";
import { getPathPoints } from "../lib/pathUtils";
import { applySleeveScaleThenLowerFollow } from "./genericMeasureOnlySleeveScale";
import { GenericSleevePipelineInvariantError } from "./genericSleevePipelineInvariantError";
import { sleeveVerticalPxFromGlobalVertices } from "./genericSleeveChainMeasure";
import { applyFirstEdgeStretchForTargetSleeveChainArcLength } from "./genericSleeveFirstEdgeArc";
import type { GenericSleeveScaleAppliedSide } from "./genericSleeveScaleAfterLengthMeshTypes";
import { SLEEVE_SCALE_CM_EPS } from "./genericSleeveScaleAfterLengthMeshTypes";

function reflatPathDsToPoints(pathDs: string[]): [number, number][] {
  return pathDs.flatMap((d) =>
    getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
  );
}

/**
 * 初回スケール後の残差補正（指定1辺の弧長／ユークリッド目標への再伸縮を繰り返し。下袖はスケール前弧長へ合わせた再配置）。
 */
export function runGenericSleeveResidualCorrectionLoops(
  pathDs: string[],
  lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  size: SizeMeasure,
  pxPerCm: number,
  customPointsInLength: number,
  appliedSides: GenericSleeveScaleAppliedSide[],
  maxCorrectionIters: number,
  dbgLog: (label: string, payload: unknown) => void
): [number, number][] {
  let flatPoints = reflatPathDsToPoints(pathDs);

  if (appliedSides.length === 0 || !(pxPerCm > 0) || !(size.sleeve > 0)) {
    return flatPoints;
  }

  for (const side of appliedSides) {
    const { gLo, gHi, pxChain, lengthStartIdx, lengthEndIdx, spIdx, gtForLower, label } = side;
    const fe = side.firstEdgeLocal;
    if (fe == null) {
      dbgLog("correction_skipped", { label, reason: "missing_firstEdgeLocal" });
      continue;
    }
    const feChainArc = side.firstEdgeChainArc === true;
    const targetArcPxLoop = size.sleeve * pxPerCm;
    for (let iter = 0; iter < maxCorrectionIters; iter++) {
      const measuredPx = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, pxChain, flatPoints);
      const measuredCm = measuredPx / pxPerCm;
      const deltaCm = measuredCm - size.sleeve;
      dbgLog(iter === 0 ? "after_first_scale_measure" : "correction_iter_measure", {
        label,
        iter,
        measuredPx,
        measuredCm,
        inputSleeveCm: size.sleeve,
        deltaCm,
        correctionWouldRun:
          measuredPx > 0 && measuredCm > 0 && Math.abs(measuredCm - size.sleeve) > SLEEVE_SCALE_CM_EPS,
      });
      if (!(measuredPx > 0 && measuredCm > 0) || Math.abs(measuredCm - size.sleeve) <= SLEEVE_SCALE_CM_EPS) {
        break;
      }
      applySleeveScaleThenLowerFollow(
        pathDs,
        lm,
        spIdx,
        lengthStartIdx,
        lengthEndIdx,
        gt,
        (d) =>
          feChainArc && pxChain != null && pxChain.length >= 2
            ? applyFirstEdgeStretchForTargetSleeveChainArcLength(
                d,
                fe.i0,
                fe.i1,
                pathDs,
                spIdx,
                pxChain,
                flatPoints,
                targetArcPxLoop
              )
            : applySleeveFirstEdgeEuclideanStretchToPath(d, fe.i0, fe.i1, targetArcPxLoop),
        gtForLower,
        fe,
        { sideLabel: label === "mirror" ? "mirror" : "primary" }
      );
      flatPoints = reflatPathDsToPoints(pathDs);
      if (flatPoints.length !== customPointsInLength) {
        dbgLog("correction_aborted", {
          label,
          reason: "flatPoints_length_mismatch_after_correction",
          flatPointsCount: flatPoints.length,
          customPointsInCount: customPointsInLength,
        });
        throw new GenericSleevePipelineInvariantError(
          `applyGenericSleeveScaleAfterLengthMesh: flatPoints length (${flatPoints.length}) !== customPointsIn.length (${customPointsInLength}) during sleeve correction (label=${label})`
        );
      }
      const px2 = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, pxChain, flatPoints);
      dbgLog("correction_applied", {
        label,
        iter,
        mode: "first_edge_stretch",
        measuredCmAfter: px2 / pxPerCm,
        measuredPxAfter: px2,
      });
    }
  }

  return flatPoints;
}
