import type { CustomGarmentData, CustomLandmarks, SizeMeasure } from "../lib/types";
import { applySleeveFirstEdgeEuclideanStretchToPath } from "../lib/scalableGarmentArmLogic";
import { cumulativePathPointOffsets, getPathPoints } from "../lib/pathUtils";
import { globalToLocal } from "./genericMeasureOnlyShared";
import { applySleeveScaleThenLowerFollow } from "./genericMeasureOnlySleeveScale";
import { sleeveVerticalPxFromGlobalVertices } from "./genericSleeveChainMeasure";
import {
  applyFirstEdgeStretchForTargetSleeveChainArcLength,
  pickNeighborTowardLengthEnd,
  pickNeighborTowardLengthStart,
  resolveLocalFirstEdgePairFromGlobalPair,
} from "./genericSleeveFirstEdgeArc";
import type {
  GenericSleeveScaleAppliedSide,
  GenericSleeveScaleSidePlan,
} from "./genericSleeveScaleAfterLengthMeshTypes";

/**
 * 各袖について初回の袖丈スケールを適用する（**最優先: 入力袖丈に対する採寸チェーン弧長**）。
 *
 * 採寸はチェーン弧長（三平方の和）または端点2点距離。変形は **隣接2頂点の1辺のみ** を直線上で伸縮し、
 * 目標弧長をそこで合わせる。**袖丈で動かす1辺**は `sleeveFirstEdgeGlobalPair` / `sleeveMirrorFirstEdgeGlobalPair` を最優先（未指定時のみ採寸終端の Y ヒューリスティック）。
 * 下袖の角度・胴接点・ジャンクション追従は `applySleeveScaleThenLowerFollow` に任せ、ここでは上袖の収束を壊さない。
 */
export function applyGenericSleeveScaleFirstPass(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  pxPerCm: number,
  customPointsIn: [number, number][],
  sidePlans: GenericSleeveScaleSidePlan[],
  dbgLog: (label: string, payload: unknown) => void
): GenericSleeveScaleAppliedSide[] {
  const appliedSides: GenericSleeveScaleAppliedSide[] = [];

  for (const plan of sidePlans) {
    const { eff, gtForLower, chainFallback, label } = plan;
    const sleevePathIdx = eff.sleevePathIdx;
    const gLo = eff.gLo;
    const gHi = eff.gHi;
    const pxChain =
      eff.globalChainForArcTarget && eff.globalChainForArcTarget.length >= 2
        ? eff.globalChainForArcTarget
        : eff.globalChainForMeasure && eff.globalChainForMeasure.length >= 2
          ? eff.globalChainForMeasure
          : chainFallback;

    const li0 = globalToLocal(pathDs, sleevePathIdx, gLo);
    const li1 = globalToLocal(pathDs, sleevePathIdx, gHi);
    if (li0 == null || li1 == null) {
      dbgLog("scale_skipped", {
        reason: "globalToLocal_failed",
        label,
        sleevePathIdx,
        gLo,
        gHi,
        li0,
        li1,
      });
      continue;
    }
    const pts = getPathPoints(pathDs[sleevePathIdx]!);
    const pa = pts[li0]!;
    const pb = pts[li1]!;
    const topIs0 = pa[1] <= pb[1];
    const lengthStartIdx = topIs0 ? li0 : li1;
    const lengthEndIdx = topIs0 ? li1 : li0;
    const anchorIdx = lengthStartIdx;

    const pathOff = cumulativePathPointOffsets(pathDs)[sleevePathIdx]!;
    const explicitPair =
      label === "primary" ? gt.sleeveFirstEdgeGlobalPair : gt.sleeveMirrorFirstEdgeGlobalPair;
    const fromExplicit = resolveLocalFirstEdgePairFromGlobalPair(
      pathDs,
      sleevePathIdx,
      pts as [number, number][],
      explicitPair
    );
    if (explicitPair != null && fromExplicit == null) {
      dbgLog("first_edge_global_pair_invalid", {
        label,
        pair: explicitPair,
        note: "隣接でないか path 外。採寸終端の Y ヒューリスティックにフォールバック",
      });
    }

    let i0: number | null;
    let i1: number | null;
    if (fromExplicit != null) {
      i0 = fromExplicit.i0;
      i1 = fromExplicit.i1;
      dbgLog("first_edge_from_explicit_pair", { label, i0, i1, globalPair: explicitPair });
    } else {
      /** フォールバック: 採寸終端（袖口寄り）の頂点 i1 を動かす隣接1辺 */
      i0 = pickNeighborTowardLengthStart(lengthStartIdx, lengthEndIdx, pts.length);
      i1 = lengthEndIdx;
      if (i0 == null) {
        i0 = lengthStartIdx;
        i1 = pickNeighborTowardLengthEnd(lengthStartIdx, lengthEndIdx, pts.length);
      }
      dbgLog("first_edge_y_heuristic_fallback", {
        label,
        i0,
        i1,
        lengthStartIdx,
        lengthEndIdx,
        hint: "袖口の実1辺を固定するには隣接2グローバルを sleeveFirstEdgeGlobalPair（ミラーは sleeveMirrorFirstEdgeGlobalPair）に指定",
      });
    }

    const p0 = i0 != null ? pts[i0]! : null;
    const p1 = i1 != null ? pts[i1]! : null;
    const edgeUx = p0 != null && p1 != null ? p1[0] - p0[0] : 0;
    const edgeUy = p0 != null && p1 != null ? p1[1] - p0[1] : 0;
    const edgeLen = Math.hypot(edgeUx, edgeUy);

    const preMeasurePxFull = sleeveVerticalPxFromGlobalVertices(
      pathDs,
      gLo,
      gHi,
      pxChain,
      customPointsIn
    );

    const gI0 = i0 != null ? pathOff + i0 : null;
    const gI1 = i1 != null ? pathOff + i1 : null;
    const consecutiveInChain =
      gI0 != null &&
      gI1 != null &&
      pxChain != null &&
      pxChain.length >= 2 &&
      pxChain.some(
        (g, idx) =>
          idx + 1 < pxChain.length &&
          Math.trunc(g) === gI0 &&
          Math.trunc(pxChain[idx + 1]!) === gI1
      );
    const chainHasConsecutivePair =
      consecutiveInChain || (fromExplicit != null && pxChain != null && pxChain.length >= 2);
    const useChainArcSolver = pxChain != null && pxChain.length >= 2;

    const pathVertexSpan = Math.abs(lengthEndIdx - lengthStartIdx);
    const canStretchOneEdge =
      i0 != null && i1 != null && edgeLen > 1e-9 && preMeasurePxFull > 1e-9;

    dbgLog("local_sleeve_interval", {
      label,
      sleevePathIdx,
      gLo,
      gHi,
      li0,
      li1,
      lengthStartIdx,
      lengthEndIdx,
      pathVertexSpan,
      anchorIdx,
      pathLocalPointCount: pts.length,
      i0,
      i1,
      explicitFirstEdgePair: explicitPair ?? null,
      fromExplicitFirstEdge: fromExplicit != null,
      canStretchOneEdge,
      chainHasConsecutivePair,
      useChainArcSolver,
      pxChainLen: pxChain?.length ?? null,
      preMeasurePx: preMeasurePxFull,
      targetArcPx: size.sleeve * pxPerCm,
    });

    if (preMeasurePxFull > 0 && pxPerCm > 0 && size.sleeve > 0) {
      if (!canStretchOneEdge) {
        dbgLog("scale_skipped", {
          label,
          reason: "no_valid_first_edge_neighbor_or_zero_edge",
          i1,
          edgeLen,
          preMeasurePxFull,
        });
        continue;
      }
      const targetArcPx = size.sleeve * pxPerCm;
      const scaleOnceFirstEdge = (d: string) => {
        if (useChainArcSolver) {
          return applyFirstEdgeStretchForTargetSleeveChainArcLength(
            d,
            i0!,
            i1!,
            pathDs,
            sleevePathIdx,
            pxChain!,
            customPointsIn,
            targetArcPx
          );
        }
        return applySleeveFirstEdgeEuclideanStretchToPath(d, i0!, i1!, targetArcPx);
      };
      applySleeveScaleThenLowerFollow(
        pathDs,
        lm,
        sleevePathIdx,
        lengthStartIdx,
        lengthEndIdx,
        gt,
        scaleOnceFirstEdge,
        gtForLower,
        { i0: i0!, i1: i1! },
        { sideLabel: label === "mirror" ? "mirror" : "primary" }
      );
      appliedSides.push({
        label,
        gLo,
        gHi,
        pxChain,
        anchorIdx,
        lengthStartIdx,
        lengthEndIdx,
        spIdx: sleevePathIdx,
        gtForLower,
        firstEdgeLocal: { i0: i0!, i1: i1! },
        firstEdgeChainArc: useChainArcSolver,
      });
      dbgLog("first_scale_applied", { label, mode: "first_edge_stretch_only", targetArcPx });
    } else {
      dbgLog("first_scale_skipped", {
        label,
        reason: "preMeasurePx_pxPerCm_or_sleeve_invalid",
        preMeasurePx: preMeasurePxFull,
        pxPerCm,
        sizeSleeve: size.sleeve,
      });
    }
  }

  return appliedSides;
}
