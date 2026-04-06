import type { CustomGarmentData, CustomLandmarks, ScalableGarmentSpec, SizeMeasure } from "../lib/types";
import { applySleeveUniformYScaleFromAnchor } from "../lib/scalableGarmentArmLogic";
import {
  getPathPoints,
  pointAtGlobalVertexIndex,
  vertexRangeToCoveringPathRange,
} from "../lib/pathUtils";
import { polylineVerticalAbsDySumPx } from "@/lib/fitting-compute/fittingCanvasPolylineMeasure";
import { isDebugFittingSleevePipelineEnabled } from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import {
  resolveEffectiveMirrorSleeveGradingGeometry,
  resolveEffectiveSleeveGradingGeometry,
  snapVerticalConstructionPathsToLayoutCenterX,
  type EffectiveSleeveGradingGeometry,
} from "./resolveEffectiveSleeveGradingGeometry";
import {
  bodyLengthCmForGenericSleeveCal,
  resolveGarmentLengthPxForSleeveMeasure,
} from "./genericMeasureOnlyLengthRefs";
import { gtWithMirrorLowerIfApplicable, hasDistinctVertexPair, globalToLocal } from "./genericMeasureOnlyShared";
import {
  applySleeveScaleThenLowerFollow,
  runLowerSleeveSnapAfterSleeveScale,
} from "./genericMeasureOnlySleeveScale";

export type GenericSleeveMeasureVertexOverride = {
  start: number;
  end: number;
  chain?: number[];
};

export function sleeveVerticalPxFromGlobalVertices(
  pathDs: string[],
  start: number,
  end: number,
  chain?: number[],
  customPoints?: [number, number][]
): number {
  const getPt = (gi: number): [number, number] | null => {
    const g = Math.trunc(gi);
    if (customPoints && g >= 0 && g < customPoints.length) {
      const p = customPoints[g];
      if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) return [p[0], p[1]];
    }
    return pointAtGlobalVertexIndex(pathDs, g);
  };
  if (chain && chain.length >= 2) {
    const pts = chain.map((g) => getPt(g)).filter((p): p is [number, number] => p != null);
    if (pts.length >= 2) return polylineVerticalAbsDySumPx(pts);
  }
  const a = getPt(start);
  const b = getPt(end);
  if (!a || !b) return 0;
  return Math.abs(b[1] - a[1]);
}

export function resolveGenericSleevePxPerCmForMeasure(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  bodyPxPerCm?: number | null
): number {
  const bodyLengthCmForSleeveCal = bodyLengthCmForGenericSleeveCal(pathDs, lm, size, gt);
  const garmentLengthPxForSleeve = resolveGarmentLengthPxForSleeveMeasure(
    pathDs,
    lm,
    size,
    gt,
    bodyPxPerCm
  );
  const pxPerCm = garmentLengthPxForSleeve / Math.max(bodyLengthCmForSleeveCal, 1e-6);
  return Number.isFinite(pxPerCm) && pxPerCm > 0 ? pxPerCm : 1;
}

export function measureGenericTopSleeveCmFromPath(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  vertexOverride?: GenericSleeveMeasureVertexOverride,
  customPoints?: [number, number][],
  bodyPxPerCm?: number | null
): { px: number; cm: number } | null {
  const s = vertexOverride?.start ?? gt.sleeveMeasureVertexStart;
  const e = vertexOverride?.end ?? gt.sleeveMeasureVertexEnd;
  if (!hasDistinctVertexPair(s, e)) return null;
  let gLo = Math.min(Math.trunc(s!), Math.trunc(e!));
  let gHi = Math.max(Math.trunc(s!), Math.trunc(e!));
  let chain = vertexOverride?.chain ?? gt.sleeveMeasureVertexChain;
  if (!vertexOverride) {
    const eff = resolveEffectiveSleeveGradingGeometry(pathDs, lm, gt);
    if (eff) {
      gLo = eff.gLo;
      gHi = eff.gHi;
      chain = eff.globalChainForMeasure ?? chain;
    }
  }
  const px = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, chain, customPoints);
  if (!(px > 0)) return null;
  const pxPerCm = resolveGenericSleevePxPerCmForMeasure(pathDs, lm, size, gt, bodyPxPerCm);
  return { px, cm: px / pxPerCm };
}

export function measureOriginalSleeveCmFromDesignPaths(
  pathDs: string[],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  lm: CustomLandmarks,
  size: SizeMeasure,
  vertexOverride?: GenericSleeveMeasureVertexOverride,
  bodyPxPerCm?: number | null
): { px: number; cm: number } | null {
  const s = vertexOverride?.start ?? gt.sleeveMeasureVertexStart;
  const e = vertexOverride?.end ?? gt.sleeveMeasureVertexEnd;
  if (!hasDistinctVertexPair(s, e)) return null;
  let gLo = Math.min(Math.trunc(s!), Math.trunc(e!));
  let gHi = Math.max(Math.trunc(s!), Math.trunc(e!));
  let chain = vertexOverride?.chain ?? gt.sleeveMeasureVertexChain;
  if (!vertexOverride) {
    const eff = resolveEffectiveSleeveGradingGeometry(pathDs, lm, gt);
    if (eff) {
      gLo = eff.gLo;
      gHi = eff.gHi;
      chain = eff.globalChainForMeasure ?? chain;
    }
  }
  const px = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, chain);
  if (!(px > 0)) return null;
  const pxPerCm = resolveGenericSleevePxPerCmForMeasure(pathDs, lm, size, gt, bodyPxPerCm);
  return { px, cm: px / pxPerCm };
}

/**
 * 袖丈のスケールは place 前の設計 path では行わず、ここ（ファブリックワープ＋着丈 Y メッシュ**後**のキャンバス path）で
 * 入力袖丈へ合わせる（二重スケール＋二重下袖スナップを避ける）。
 * 胴の `scaleBodyToSpec` は呼ばない。
 *
 * スケール計算と採寸（`measureGenericTopSleeveCmFromPath`）を同じ定義に揃える:
 * - pre-scale 採寸は global chain + `customPointsIn` で行う（cross-path チェーン含む）
 * - 残差は追加スケールで最大3回まで（脇スナップは最後に1回のみ。二重スナップによる縮み→戻りを防ぐ）
 * - `maxSleeveCorrectionIters` で残差ループ回数を抑えられる（サイズ補間中は 1 で十分なことが多い）。
 */
export function applyGenericSleeveScaleAfterLengthMesh(
  pathDsIn: string[],
  customPointsIn: [number, number][],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  bodyPxPerCm?: number | null,
  opts?: { maxSleeveCorrectionIters?: number }
): { pathDs: string[]; customPoints: [number, number][] } {
  const dbg = isDebugFittingSleevePipelineEnabled();
  const dbgLog = (label: string, payload: unknown) => {
    if (dbg) console.info(`[FITTING_SLEEVE_PIPELINE] ${label}`, payload);
  };

  const pathDs = [...pathDsIn];
  const n = pathDs.length;
  if (n === 0) {
    dbgLog("early_exit", { reason: "empty_pathDs" });
    return { pathDs, customPoints: customPointsIn.map((p) => [p[0], p[1]] as [number, number]) };
  }

  if (dbg) console.groupCollapsed("[FITTING_SLEEVE_PIPELINE] applyGenericSleeveScaleAfterLengthMesh");
  try {
    type SidePlan = {
      label: "primary" | "mirror";
      eff: EffectiveSleeveGradingGeometry;
      gtForLower: NonNullable<CustomGarmentData["genericSymmetricTop"]>;
      chainFallback: number[] | undefined;
    };

    const sidePlans: SidePlan[] = [];
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
        const segmentDys: number[] = [];
        for (let i = 0; i < chainPts.length - 1; i++) {
          segmentDys.push(Math.abs(chainPts[i + 1]![1] - chainPts[i]![1]));
        }
        const gEff = effGeom;
        dbgLog("gt_vertices", {
          sleeveMeasureVertexStart: gt.sleeveMeasureVertexStart,
          sleeveMeasureVertexEnd: gt.sleeveMeasureVertexEnd,
          sleeveMeasureVertexChain: chain ?? null,
          chainVertexCount: chain?.length ?? 0,
          chainSegmentAbsDyPx: segmentDys,
          chainSumAbsDyPx: chainPts.length >= 2 ? polylineVerticalAbsDySumPx(chainPts) : null,
          minMaxRange: { lo, hi },
          vertexCoverPathRange: cover,
          singlePathOk: cover != null && cover.from === cover.to,
          coverFrom: cover?.from,
          coverTo: cover?.to,
          effectiveSleevePathIdx: gEff?.sleevePathIdx ?? null,
          effectiveGRange: gEff ? { gLo: gEff.gLo, gHi: gEff.gHi } : null,
          effectiveChainForPx: gEff?.globalChainForMeasure ?? null,
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

    const bodyLengthCmForSleeveCal = bodyLengthCmForGenericSleeveCal(pathDs, lm, size, gt);
    const garmentLengthPxForSleeve = resolveGarmentLengthPxForSleeveMeasure(
      pathDs,
      lm,
      size,
      gt,
      bodyPxPerCm
    );
    const pxPerCm = garmentLengthPxForSleeve / Math.max(bodyLengthCmForSleeveCal, 1e-6);
    dbgLog("px_per_cm", {
      bodyLengthCmForSleeveCal,
      garmentLengthPxForSleeve,
      pxPerCm,
      bodyPxPerCmPassed: bodyPxPerCm ?? null,
      inputSleeveCm: size.sleeve,
      sleeveSidesPlanned: sidePlans.map((p) => p.label),
    });

    type AppliedSide = {
      label: "primary" | "mirror";
      gLo: number;
      gHi: number;
      pxChain: number[] | undefined;
      anchorIdx: number;
      lengthStartIdx: number;
      lengthEndIdx: number;
      spIdx: number;
      gtForLower: NonNullable<CustomGarmentData["genericSymmetricTop"]>;
    };

    const appliedSides: AppliedSide[] = [];

    for (const plan of sidePlans) {
      const { eff, gtForLower, chainFallback, label } = plan;
      const sleevePathIdx = eff.sleevePathIdx;
      const gLo = eff.gLo;
      const gHi = eff.gHi;
      const pxChain =
        eff.globalChainForMeasure && eff.globalChainForMeasure.length >= 2
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

      const preMeasurePx = sleeveVerticalPxFromGlobalVertices(
        pathDs,
        gLo,
        gHi,
        pxChain,
        customPointsIn
      );

      dbgLog("local_sleeve_interval", {
        label,
        sleevePathIdx,
        gLo,
        gHi,
        li0,
        li1,
        lengthStartIdx,
        lengthEndIdx,
        anchorIdx,
        pathLocalPointCount: pts.length,
        preMeasurePx,
        targetVertPx: size.sleeve * pxPerCm,
      });

      if (preMeasurePx > 0 && pxPerCm > 0 && size.sleeve > 0) {
        const s = (size.sleeve * pxPerCm) / preMeasurePx;
        const sleeveStructure: ScalableGarmentSpec["sleeve"] = {
          anchorIdx,
          lengthStartIdx,
          lengthEndIdx,
          cuffIdx: lengthEndIdx,
        };
        applySleeveScaleThenLowerFollow(
          pathDs,
          lm,
          sleevePathIdx,
          lengthStartIdx,
          lengthEndIdx,
          gt,
          (d) => applySleeveUniformYScaleFromAnchor(d, sleeveStructure, s),
          gtForLower,
          { skipLowerSnap: true }
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
        });
        dbgLog("first_scale_applied", { label, scaleS: s });
      } else {
        dbgLog("first_scale_skipped", {
          label,
          reason: "preMeasurePx_pxPerCm_or_sleeve_invalid",
          preMeasurePx,
          pxPerCm,
          sizeSleeve: size.sleeve,
        });
      }
    }

    snapVerticalConstructionPathsToLayoutCenterX(pathDs, lm);
    let flatPoints = pathDs.flatMap((d) =>
      getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
    );
    if (flatPoints.length !== customPointsIn.length) {
      dbgLog("rollback_vertex_count_mismatch", {
        flatPointsCount: flatPoints.length,
        customPointsInCount: customPointsIn.length,
        note: "pathDs を入力に戻す。袖スケールは破棄。",
      });
      return {
        pathDs: [...pathDsIn],
        customPoints: customPointsIn.map((p) => [p[0], p[1]] as [number, number]),
      };
    }

    /** 残差スケール（脇スナップなし）。収束後に {@link runLowerSleeveSnapAfterSleeveScale} を各袖1回。 */
    const SLEEVE_CM_EPS = 0.05;
    const MAX_SLEEVE_CORRECTION_ITERS = 3;
    const maxCorrectionIters =
      opts?.maxSleeveCorrectionIters != null
        ? Math.min(MAX_SLEEVE_CORRECTION_ITERS, Math.max(1, Math.floor(opts.maxSleeveCorrectionIters)))
        : MAX_SLEEVE_CORRECTION_ITERS;
    if (appliedSides.length > 0 && pxPerCm > 0 && size.sleeve > 0) {
      for (const side of appliedSides) {
        const { gLo, gHi, pxChain, anchorIdx, lengthStartIdx, lengthEndIdx, spIdx, gtForLower, label } =
          side;
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
              measuredPx > 0 && measuredCm > 0 && Math.abs(measuredCm - size.sleeve) > SLEEVE_CM_EPS,
          });
          if (!(measuredPx > 0 && measuredCm > 0) || Math.abs(measuredCm - size.sleeve) <= SLEEVE_CM_EPS) {
            break;
          }
          const correctionS = size.sleeve / measuredCm;
          const correctionSpec: ScalableGarmentSpec["sleeve"] = {
            anchorIdx,
            lengthStartIdx,
            lengthEndIdx,
            cuffIdx: lengthEndIdx,
          };
          applySleeveScaleThenLowerFollow(
            pathDs,
            lm,
            spIdx,
            lengthStartIdx,
            lengthEndIdx,
            gt,
            (d) => applySleeveUniformYScaleFromAnchor(d, correctionSpec, correctionS),
            gtForLower,
            { skipLowerSnap: true }
          );
          snapVerticalConstructionPathsToLayoutCenterX(pathDs, lm);
          flatPoints = pathDs.flatMap((d) =>
            getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
          );
          if (flatPoints.length !== customPointsIn.length) {
            dbgLog("correction_aborted", {
              label,
              reason: "flatPoints_length_mismatch_after_correction",
              flatPointsCount: flatPoints.length,
              customPointsInCount: customPointsIn.length,
            });
            return {
              pathDs: [...pathDsIn],
              customPoints: customPointsIn.map((p) => [p[0], p[1]] as [number, number]),
            };
          }
          const px2 = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, pxChain, flatPoints);
          dbgLog("correction_applied", {
            label,
            iter,
            correctionS,
            measuredCmAfter: px2 / pxPerCm,
            measuredPxAfter: px2,
          });
        }
      }
    }

    for (const side of appliedSides) {
      runLowerSleeveSnapAfterSleeveScale(
        pathDs,
        lm,
        side.spIdx,
        side.lengthStartIdx,
        side.lengthEndIdx,
        gt,
        side.gtForLower
      );
    }

    snapVerticalConstructionPathsToLayoutCenterX(pathDs, lm);
    flatPoints = pathDs.flatMap((d) =>
      getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
    );

    let finalMeasuredCm: number | null = null;
    let finalMeasuredPx: number | null = null;
    const summarySide = appliedSides.find((s) => s.label === "primary") ?? appliedSides[0];
    if (summarySide != null) {
      const fp = sleeveVerticalPxFromGlobalVertices(
        pathDs,
        summarySide.gLo,
        summarySide.gHi,
        summarySide.pxChain,
        flatPoints
      );
      if (fp > 0 && pxPerCm > 0) {
        finalMeasuredPx = fp;
        finalMeasuredCm = fp / pxPerCm;
      }
    }
    dbgLog("result_summary", {
      returnBranch: "default_flatPoints",
      finalMeasuredCm,
      finalMeasuredPx,
      inputSleeveCm: size.sleeve,
      deltaCmVsInput: finalMeasuredCm != null ? finalMeasuredCm - size.sleeve : null,
    });
    return { pathDs, customPoints: flatPoints };
  } finally {
    if (dbg) console.groupEnd();
  }
}
