import type { CustomGarmentData, CustomLandmarks } from "../lib/types";
import {
  pointAtGlobalVertexIndex,
  vertexRangeToCoveringPathRange,
} from "../lib/pathUtils";
import { polylineArcLengthPx } from "@/lib/fitting-compute/fittingCanvasPolylineMeasure";
import {
  resolveEffectiveMirrorSleeveGradingGeometry,
  resolveEffectiveSleeveGradingGeometry,
} from "./resolveEffectiveSleeveGradingGeometry";
import { gtWithMirrorLowerIfApplicable, hasDistinctVertexPair } from "./genericMeasureOnlyShared";
import type { GenericSleeveScaleSidePlan } from "./genericSleeveScaleAfterLengthMeshTypes";

/**
 * 主袖・ミラー袖の有効な `EffectiveSleeveGradingGeometry` を列挙（順に処理する）。
 */
export function buildGenericSleeveScaleSidePlans(
  pathDs: string[],
  lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  customPointsIn: [number, number][],
  dbg: boolean,
  dbgLog: (label: string, payload: unknown) => void
): GenericSleeveScaleSidePlan[] {
  const sidePlans: GenericSleeveScaleSidePlan[] = [];
  if (hasDistinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)) {
    const effGeom = resolveEffectiveSleeveGradingGeometry(pathDs, lm, gt);
    if (effGeom) {
      sidePlans.push({
        label: "primary",
        eff: effGeom,
        gtForLower: gt,
        chainFallback: gt.sleeveMeasureVertexChain,
      });
    }
    if (dbg) {
      const a = Math.trunc(gt.sleeveMeasureVertexStart!);
      const b = Math.trunc(gt.sleeveMeasureVertexEnd!);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const cover = vertexRangeToCoveringPathRange(pathDs, lo, hi);
      const chain = gt.sleeveMeasureVertexChain;
      const chainPts =
        chain && chain.length >= 2
          ? chain
              .map((gi) => {
                const g = Math.trunc(gi);
                if (customPointsIn && g >= 0 && g < customPointsIn.length) {
                  const p = customPointsIn[g];
                  return p && Number.isFinite(p[0]) && Number.isFinite(p[1])
                    ? ([p[0], p[1]] as [number, number])
                    : null;
                }
                return pointAtGlobalVertexIndex(pathDs, g);
              })
              .filter((p): p is [number, number] => p != null)
          : [];
      const segmentLens: number[] = [];
      for (let i = 0; i < chainPts.length - 1; i++) {
        const pA = chainPts[i]!;
        const pB = chainPts[i + 1]!;
        segmentLens.push(Math.hypot(pB[0] - pA[0], pB[1] - pA[1]));
      }
      const gEff = effGeom;
      dbgLog("gt_vertices", {
        sleeveMeasureVertexStart: gt.sleeveMeasureVertexStart,
        sleeveMeasureVertexEnd: gt.sleeveMeasureVertexEnd,
        sleeveMeasureVertexChain: chain ?? null,
        chainVertexCount: chain?.length ?? 0,
        chainSegmentEuclideanPx: segmentLens,
        chainSumArcLengthPx: chainPts.length >= 2 ? polylineArcLengthPx(chainPts) : null,
        minMaxRange: { lo, hi },
        vertexCoverPathRange: cover,
        singlePathOk: cover != null && cover.from === cover.to,
        coverFrom: cover?.from,
        coverTo: cover?.to,
        effectiveSleevePathIdx: gEff?.sleevePathIdx ?? null,
        effectiveGRange: gEff ? { gLo: gEff.gLo, gHi: gEff.gHi } : null,
        effectiveChainForPx: gEff?.globalChainForMeasure ?? null,
        effectiveChainForArcTarget: gEff?.globalChainForArcTarget ?? null,
      });
    }
    if (effGeom == null && dbg) {
      dbgLog("scale_skipped", {
        reason: "effective_sleeve_geometry_unresolved",
      });
    }
  } else if (dbg) {
    dbgLog("scale_skipped", { reason: "missing_sleeveMeasureVertexStart_or_End" });
  }

  if (hasDistinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd)) {
    const effMir = resolveEffectiveMirrorSleeveGradingGeometry(pathDs, lm, gt);
    if (effMir) {
      sidePlans.push({
        label: "mirror",
        eff: effMir,
        gtForLower: gtWithMirrorLowerIfApplicable(gt, pathDs, effMir.sleevePathIdx),
        chainFallback: gt.sleeveMirrorMeasureVertexChain,
      });
    }
  }

  return sidePlans;
}
