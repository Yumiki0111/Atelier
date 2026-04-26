import type { CustomGarmentData, CustomLandmarks, SizeMeasure } from "../lib/types";
import { cumulativePathPointOffsets, getPathPoints } from "../lib/pathUtils";
import { isDebugFittingSleevePipelineEnabled } from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import {
  applyBodySleeveSeamSyncAfterLengthMesh,
  computeBodySleeveSeamPairsForSleeveVerticesInGlobalRanges,
  lowerSleeveGlobalIndexRangesFromGt,
  LOWER_SLEEVE_BODY_SEAM_OUTLINE_SNAP_MAX_DIST_PX,
  POST_SLEEVE_PIPELINE_LOWER_SEAM_SYNC_TOL_PX,
  snapSleeveBodySeamVertexToBodyOutline,
} from "@/lib/fitting-compute/fittingCanvasCustomGarmentGradeLength";
import {
  bodyLengthCmForGenericSleeveCal,
  resolveGarmentLengthPxForSleeveMeasure,
} from "./genericMeasureOnlyLengthRefs";
import { GenericSleevePipelineInvariantError } from "./genericSleevePipelineInvariantError";
import {
  sleeveVerticalPxFromGlobalVertices,
  type SleeveVertexLockForPipelineMeasure,
} from "./genericSleeveChainMeasure";
import { buildGenericSleeveScaleSidePlans } from "./buildGenericSleeveScaleSidePlans";
import { applyGenericSleeveScaleFirstPass } from "./applyGenericSleeveScaleFirstPass";
import { runGenericSleeveResidualCorrectionLoops } from "./applyGenericSleeveScaleCorrectionLoops";
import { resolveMaxSleeveCorrectionIters } from "./genericSleeveScaleAfterLengthMeshTypes";
import { collectSleevePathIndicesForGrading } from "./resolveEffectiveSleeveGradingGeometry";
import { tryLowerSleeveFollowArgs } from "./genericMeasureOnlySleeveFollowArgs";
import { globalToLocal } from "./genericMeasureOnlyShared";
import { resolveLowerSleeveBodySeamLocal } from "../lib/scalableGarmentArmLogic";
import { applyLowerSleeveInteriorFairingOnly } from "./genericMeasureOnlySleeveScale";

/**
 * 袖丈のスケールは place 前の設計 path では行わず、ここ（ファブリックワープ＋着丈 Y メッシュ**後**のキャンバス path）で
 * 入力袖丈へ合わせる（二重スケール＋二重下袖スナップを避ける）。
 * 胴の `scaleBodyToSpec` は呼ばない。
 *
 * **優先順位**
 * 1. 上袖: 採寸チェーンで入力 `size.sleeve` に一致（first pass + 残差ループ）
 * 2. 袖上〜袖口出口の角・胴–袖下の接点（下袖内点は `generic/sleeveLower`）
 * 3. 胴折れ線への胴接点投影（`snapSleeveBodySeamVertexToBodyOutline`）は post seam sync の **後に 1 回**（各袖）。
 *    その直後に `applyLowerSleeveInteriorFairingOnly` で下袖チェーンのみ再フェアリング（sync／snap で付いた折れを抑える）。
 *
 * スケール計算と採寸（`measureGenericTopSleeveCmFromPath`）を同じ定義に揃える:
 * - 採寸 px はチェーンの **弧長**（各辺を三平方で √(Δx²+Δy²) として合算）／端点のみなら2点距離。
 *   チェーン全体の弧長が `size.sleeve×pxPerCm` になるよう **袖口側の隣接1辺** を直線上で動かす（first pass）。
 *   袖口1辺は `sleeveFirstEdgeGlobalPair` / `sleeveMirrorFirstEdgeGlobalPair` を推奨（未指定時は採寸終端の Y 推定）。
 * - pre-scale 採寸は global chain + `customPointsIn` で行う（cross-path チェーン含む）
 * - 残差は同じ1辺伸縮の繰り返し（既定最大10回、上限24）。末尾に下袖帯のみ胴–袖近傍同期のあと、胴接点を胴折れ線 **辺**への最近傍投影で一度ずらし食い込みを抑える。
 * - `maxSleeveCorrectionIters` で残差ループ回数を抑えられる（サイズ補間中は 1〜2 で十分なことが多い）。
 * - 縦構築線のレイアウト中心 X スナップは本関数では行わない（`applyGenericMeasureOnlyGrading` 等の別段で実施）。
 */
export function applyGenericSleeveScaleAfterLengthMesh(
  pathDsIn: string[],
  customPointsIn: [number, number][],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  bodyPxPerCm?: number | null,
  opts?: { maxSleeveCorrectionIters?: number }
): {
  pathDs: string[];
  customPoints: [number, number][];
  /** 袖スケール・残差補正に使った px/cm（採寸オーバーレイの cm 表示と揃える） */
  sleevePxPerCmUsedForScale?: number;
  /** スケールが収束したチェーン。再 `resolveEffectiveSleeveGradingGeometry` との取り違いを防ぐ */
  sleeveVertexLockForMeasure?: {
    primary?: SleeveVertexLockForPipelineMeasure;
    mirror?: SleeveVertexLockForPipelineMeasure;
  };
  /**
   * 関数末尾の pathDs/customPoints で、補正ループと同じ式で測った値（オーバーレイはこれのみを使う）。
   * `measureGenericTopSleeveCmFromPath` を再実行すると path/頂点参照がずれることがある。
   */
  sleevePipelineGeomReported?: {
    primary?: { px: number; cm: number };
    mirror?: { px: number; cm: number };
  };
} {
  const dbg = isDebugFittingSleevePipelineEnabled();
  const dbgLog = (label: string, payload: unknown) => {
    if (dbg) console.info(`[FITTING_SLEEVE_PIPELINE] ${label}`, payload);
  };

  const pathDs = [...pathDsIn];
  const n = pathDs.length;
  if (n === 0) {
    dbgLog("early_exit", { reason: "empty_pathDs" });
    throw new GenericSleevePipelineInvariantError(
      "applyGenericSleeveScaleAfterLengthMesh: pathDs is empty"
    );
  }

  if (!Number.isFinite(size.sleeve) || size.sleeve <= 0) {
    dbgLog("early_exit", { reason: "no_sleeve_length_input" });
    return {
      pathDs: pathDsIn.map((d) => d),
      customPoints: customPointsIn.map((p) => [p[0], p[1]] as [number, number]),
    };
  }

  if (dbg) console.groupCollapsed("[FITTING_SLEEVE_PIPELINE] applyGenericSleeveScaleAfterLengthMesh");
  try {
    const sidePlans = buildGenericSleeveScaleSidePlans(pathDs, lm, gt, customPointsIn, dbg, dbgLog);

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

    const appliedSides = applyGenericSleeveScaleFirstPass(
      pathDs,
      lm,
      size,
      gt,
      pxPerCm,
      customPointsIn,
      sidePlans,
      dbgLog
    );

    let flatPoints = pathDs.flatMap((d) =>
      getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
    );
    if (flatPoints.length !== customPointsIn.length) {
      dbgLog("rollback_vertex_count_mismatch", {
        flatPointsCount: flatPoints.length,
        customPointsInCount: customPointsIn.length,
        note: "pathDs/customPoints 頂点本数不一致（例外にする）",
      });
      throw new GenericSleevePipelineInvariantError(
        `applyGenericSleeveScaleAfterLengthMesh: flatPoints length (${flatPoints.length}) !== customPointsIn.length (${customPointsIn.length}) after first sleeve scale`
      );
    }

    const maxCorrectionIters = resolveMaxSleeveCorrectionIters(opts);
    flatPoints = runGenericSleeveResidualCorrectionLoops(
      pathDs,
      lm,
      gt,
      size,
      pxPerCm,
      customPointsIn.length,
      appliedSides,
      maxCorrectionIters,
      dbgLog
    );

    const runPostSeamSyncForRanges = (
      ranges: { lo: number; hi: number }[],
      tolPx: number,
      dbgLabel: string
    ) => {
      if (ranges.length === 0) return;
      const sleeveIdx = collectSleevePathIndicesForGrading(pathDs, lm, gt);
      if (sleeveIdx.size === 0) return;
      const postPairs = computeBodySleeveSeamPairsForSleeveVerticesInGlobalRanges(
        pathDs,
        sleeveIdx,
        ranges,
        tolPx
      );
      if (postPairs.length === 0) return;
      const syncedDs = applyBodySleeveSeamSyncAfterLengthMesh(pathDs, postPairs);
      const rebuiltPost = syncedDs.flatMap((d) =>
        getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
      );
      if (rebuiltPost.length !== flatPoints.length) return;
      for (let i = 0; i < n; i++) pathDs[i] = syncedDs[i]!;
      flatPoints = rebuiltPost;
      dbgLog(dbgLabel, { pairs: postPairs.length, tolPx });
    };

    runPostSeamSyncForRanges(
      lowerSleeveGlobalIndexRangesFromGt(gt),
      POST_SLEEVE_PIPELINE_LOWER_SEAM_SYNC_TOL_PX,
      "post_lower_seam_body_sync"
    );

    const sleeveIdxForOutline = collectSleevePathIndicesForGrading(pathDs, lm, gt);
    for (const side of appliedSides) {
      const args = tryLowerSleeveFollowArgs(
        pathDs,
        lm,
        side.spIdx,
        side.lengthStartIdx,
        side.lengthEndIdx,
        gt
      );
      if (args == null) continue;
      const offS = cumulativePathPointOffsets(pathDs)[side.spIdx]!;
      const la = Math.min(args.lowGlo, args.lowGhi) - offS;
      const lb = Math.max(args.lowGlo, args.lowGhi) - offS;
      const liHi = Math.max(side.lengthStartIdx, side.lengthEndIdx);
      const lowerOnHigher = args.junction === liHi;
      let bodySnapLocal: number | null = null;
      const gSnap = gt.lowerSleeveSnapToBodyGlobalVertex;
      if (gSnap != null && Number.isFinite(gSnap)) {
        const liSnap = globalToLocal(pathDs, side.spIdx, Math.trunc(gSnap));
        if (liSnap != null && liSnap >= la && liSnap <= lb) {
          bodySnapLocal = liSnap;
        }
      }
      const fixLocal = resolveLowerSleeveBodySeamLocal(
        args.junction,
        la,
        lb,
        lowerOnHigher,
        bodySnapLocal
      );
      if (fixLocal == null) continue;
      const snapped = snapSleeveBodySeamVertexToBodyOutline(
        pathDs,
        side.spIdx,
        fixLocal,
        sleeveIdxForOutline,
        LOWER_SLEEVE_BODY_SEAM_OUTLINE_SNAP_MAX_DIST_PX
      );
      if (snapped != null) {
        pathDs[side.spIdx] = snapped;
      }
    }

    for (const side of appliedSides) {
      applyLowerSleeveInteriorFairingOnly(
        pathDs,
        lm,
        side.spIdx,
        side.lengthStartIdx,
        side.lengthEndIdx,
        gt,
        side.firstEdgeLocal,
        { sideLabel: side.label === "mirror" ? "mirror" : "primary" }
      );
    }

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
    const primaryApplied = appliedSides.find((s) => s.label === "primary");
    const mirrorApplied = appliedSides.find((s) => s.label === "mirror");
    const sleeveVertexLockForMeasure =
      appliedSides.length > 0
        ? {
            ...(primaryApplied != null
              ? {
                  primary: {
                    start: primaryApplied.gLo,
                    end: primaryApplied.gHi,
                    chain: primaryApplied.pxChain,
                  } satisfies SleeveVertexLockForPipelineMeasure,
                }
              : {}),
            ...(mirrorApplied != null
              ? {
                  mirror: {
                    start: mirrorApplied.gLo,
                    end: mirrorApplied.gHi,
                    chain: mirrorApplied.pxChain,
                  } satisfies SleeveVertexLockForPipelineMeasure,
                }
              : {}),
          }
        : undefined;

    const geomReportedForSide = (side: (typeof appliedSides)[0] | undefined) => {
      if (side == null || !(pxPerCm > 0)) return undefined;
      const fp = sleeveVerticalPxFromGlobalVertices(pathDs, side.gLo, side.gHi, side.pxChain, flatPoints);
      if (!(fp > 0)) return undefined;
      return { px: Math.round(fp), cm: fp / pxPerCm };
    };
    const pgP = geomReportedForSide(primaryApplied);
    const pgM = geomReportedForSide(mirrorApplied);
    const sleevePipelineGeomReported =
      pgP != null || pgM != null
        ? {
            ...(pgP != null ? { primary: pgP } : {}),
            ...(pgM != null ? { mirror: pgM } : {}),
          }
        : undefined;

    dbgLog("result_summary", {
      returnBranch: "default_flatPoints",
      finalMeasuredCm,
      finalMeasuredPx,
      inputSleeveCm: size.sleeve,
      deltaCmVsInput: finalMeasuredCm != null ? finalMeasuredCm - size.sleeve : null,
      sleevePxPerCmUsedForScale: appliedSides.length > 0 ? pxPerCm : undefined,
      sleeveVertexLockForMeasure,
      sleevePipelineGeomReported,
    });
    return {
      pathDs,
      customPoints: flatPoints,
      ...(appliedSides.length > 0
        ? {
            sleevePxPerCmUsedForScale: pxPerCm,
            sleeveVertexLockForMeasure,
            ...(sleevePipelineGeomReported != null ? { sleevePipelineGeomReported } : {}),
          }
        : {}),
    };
  } finally {
    if (dbg) console.groupEnd();
  }
}
