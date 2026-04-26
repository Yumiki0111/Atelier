import type {
  CustomGarmentData,
  CustomLandmarks,
  GarmentLengthGeomBeforeLengthMeshDebug,
  GenericVertexPlotHighlight,
  SizeMeasure,
} from "@/app/(main)/development/fitting/lib/types";
import {
  applyGenericSleeveScaleAfterLengthMesh,
  measureGenericTopSleeveCmFromPath,
  resolveGenericSleevePxPerCmForMeasure,
} from "@/app/(main)/development/fitting/generic/applyGenericMeasureOnlyGrading";
import { hasDistinctVertexPair } from "@/app/(main)/development/fitting/generic/genericMeasureOnlyShared";
import { sleeveVerticalPxFromGlobalVertices } from "@/app/(main)/development/fitting/generic/genericSleeveChainMeasure";
import type { SleeveVertexLockForPipelineMeasure } from "@/app/(main)/development/fitting/generic/genericSleeveMeasurePublic";
import {
  resolveEffectiveMirrorSleeveGradingGeometry,
  resolveEffectiveSleeveGradingGeometry,
} from "@/app/(main)/development/fitting/generic/resolveEffectiveSleeveGradingGeometry";
import {
  applyGradeLengthHorizontalScaleToMeshPaths,
  applyGradeLengthVerticalScaleToMeshPaths,
  computeGradeLengthVerticalScaleParams,
  wrapDesignToGarmentCanvasWithYScale,
} from "./fittingCanvasCustomGarmentGradeLength";
import { isDebugFittingMeasureEnabled, isDebugFittingSleevePipelineEnabled } from "./fittingCanvasDebugFlags";

function resolvePrimarySleeveGRangeAndChain(
  pathDs: string[],
  lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): { gLo: number; gHi: number; chain: number[] | undefined } | null {
  const s = gt.sleeveMeasureVertexStart;
  const e = gt.sleeveMeasureVertexEnd;
  if (!hasDistinctVertexPair(s, e)) return null;
  let gLo = Math.min(Math.trunc(s!), Math.trunc(e!));
  let gHi = Math.max(Math.trunc(s!), Math.trunc(e!));
  let chain = gt.sleeveMeasureVertexChain;
  const eff = resolveEffectiveSleeveGradingGeometry(pathDs, lm, gt);
  if (eff) {
    gLo = eff.gLo;
    gHi = eff.gHi;
    chain = eff.globalChainForMeasure ?? chain;
  }
  return { gLo, gHi, chain };
}

/**
 * 頂点列から紫着丈区間の縦スパン（px）。ワープ前後どちらの `customPoints` でも可。
 * `computeGradeLengthVerticalScaleParams` の tryLengthFromVertices と同じ端点定義。
 *
 * 【注意】オーバーレイで「入力着丈 cm」を実測と同じ行に並べて見せないこと（誤魔化し）。
 * 目標との差は `targetLengthPx` / `deltaPxFromTarget` で示す。
 */
export function purpleLengthVerticalSpanPxFromVertices(
  pts: [number, number][],
  customGarmentData: CustomGarmentData,
  genericVertexPlotHighlight: GenericVertexPlotHighlight | null
): number | null {
  const gtLen = customGarmentData.genericSymmetricTop;
  const lmLenA = gtLen?.lengthMeasureVertexStart;
  const lmLenB = gtLen?.lengthMeasureVertexEnd;
  const hlLen = genericVertexPlotHighlight?.lengthMeasure;

  const trySpan = (a: number, b: number): number | null => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
    const lo = Math.min(Math.trunc(a), Math.trunc(b));
    const hi = Math.max(Math.trunc(a), Math.trunc(b));
    const pa = lo >= 0 && lo < pts.length ? pts[lo] : null;
    const pb = hi >= 0 && hi < pts.length ? pts[hi] : null;
    if (pa == null || pb == null) return null;
    const topW = pa[1] <= pb[1] ? pa : pb;
    const hemW = pa[1] >= pb[1] ? pa : pb;
    return Math.abs(hemW[1] - topW[1]);
  };

  if (
    lmLenA != null &&
    lmLenB != null &&
    Number.isFinite(lmLenA) &&
    Number.isFinite(lmLenB) &&
    lmLenA !== lmLenB
  ) {
    const s = trySpan(lmLenA, lmLenB);
    if (s != null && s > 1e-6) return s;
  }
  if (
    hlLen &&
    Number.isFinite(hlLen[0]) &&
    Number.isFinite(hlLen[1]) &&
    hlLen[0] !== hlLen[1]
  ) {
    const s = trySpan(hlLen[0], hlLen[1]);
    if (s != null && s > 1e-6) return s;
  }
  return null;
}

export type GenericTopLengthMeshResult = {
  customPathDs: string[];
  customPoints: [number, number][];
  designToGarmentCanvasForOverlay: (gx: number, gy: number) => [number, number];
  canvasYGradeScale: { lengthTopY: number; scale: number; midShoulderX?: number } | null;
  lengthGeomBeforeLengthMeshDebug?: GarmentLengthGeomBeforeLengthMeshDebug;
  customPointsBeforeFabricWarpOut: [number, number][] | null;
  /** 紫着丈＋baseline 適格だがメッシュをかけなかったときの理由（デバッグ用） */
  lengthMeshSkipReason?: string;
  /**
   * 着丈 Y メッシュ適用時の目標縦 px（`size.length×bodyPxPerCm` またはフォールバック）。
   * オーバーレイの紫矢印・指定範囲と整合させる。
   */
  appliedTargetLengthPx?: number;
};

/**
 * 汎用トップ: 紫着丈＋ベースラインが揃えばワープ後メッシュに縦スケールを適用。
 * サイズ補間中は `lengthMeshSizeForGrade`（from→to の補間）を渡し、目標着丈だけが常に「to」固定にならないようにする。
 */
export function applyGenericTopLengthMeshIfEligible(input: {
  canApplyLengthMeshGrade: boolean;
  animatingCustomSizeBlend: boolean;
  customGarmentData: CustomGarmentData;
  /**
   * 補間フレーム用: `computeGradeLengthVerticalScaleParams` の `size.length` 等。
   * 未指定時は `customGarmentData.size`（通常は確定時の to）。
   */
  lengthMeshSizeForGrade?: SizeMeasure;
  customPathDs: string[];
  customPoints: [number, number][];
  customAllOutline: [number, number][];
  c: CustomGarmentData["landmarks"];
  rigLm: CustomLandmarks | null;
  useRigLandmarksForPlacement: boolean;
  shoulderSeamY: number;
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  bodyPxPerCm: number;
  genericVertexPlotHighlight: GenericVertexPlotHighlight | null;
  customPointsBeforeFabricWarp: [number, number][] | null;
}): GenericTopLengthMeshResult {
  const {
    canApplyLengthMeshGrade,
    animatingCustomSizeBlend,
    customGarmentData,
    lengthMeshSizeForGrade,
    customPathDs: pathIn,
    customPoints: ptsIn,
    customAllOutline,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    shoulderSeamY,
    designToGarmentCanvas,
    bodyPxPerCm,
    genericVertexPlotHighlight,
    customPointsBeforeFabricWarp,
  } = input;

  let customPathDs = pathIn;
  let customPoints = ptsIn;
  let designToGarmentCanvasForOverlay = designToGarmentCanvas;
  let canvasYGradeScale: { lengthTopY: number; scale: number; midShoulderX?: number } | null = null;
  let lengthGeomBeforeLengthMeshDebug: GarmentLengthGeomBeforeLengthMeshDebug | undefined;
  let outBeforeWarp: [number, number][] | null = customPointsBeforeFabricWarp;
  let lengthMeshSkipReason: string | undefined;
  let appliedTargetLengthPx: number | undefined;

  const sizeForGrade = lengthMeshSizeForGrade ?? customGarmentData.size;

  if (canApplyLengthMeshGrade) {
    const gradeParams = computeGradeLengthVerticalScaleParams({
      customGarmentData,
      customPathDs,
      customPoints,
      customAllOutline,
      c,
      rigLm,
      useRigLandmarksForPlacement,
      shoulderSeamY,
      designToGarmentCanvas,
      bodyPxPerCm,
      size: sizeForGrade,
      genericVertexPlotHighlight,
    });
    if (gradeParams.ok) {
      const prePx = gradeParams.preScaleSpanPx;
      let lengthDebugPx = prePx;
      if (
        customPointsBeforeFabricWarp != null &&
        customPointsBeforeFabricWarp.length === ptsIn.length
      ) {
        const preWarpSpan = purpleLengthVerticalSpanPxFromVertices(
          customPointsBeforeFabricWarp,
          customGarmentData,
          genericVertexPlotHighlight
        );
        if (preWarpSpan != null && preWarpSpan > 1e-6) {
          lengthDebugPx = preWarpSpan;
        }
      }
      const cmFromBodySlider = lengthDebugPx / bodyPxPerCm;
      const lenIn = sizeForGrade.length;
      const targetLengthPx =
        Number.isFinite(lenIn) && lenIn > 0.5 ? lenIn * bodyPxPerCm : lengthDebugPx;
      appliedTargetLengthPx = targetLengthPx;
      const pxRounded = Math.round(lengthDebugPx);
      const targetRounded = Math.round(targetLengthPx);
      lengthGeomBeforeLengthMeshDebug = {
        px: pxRounded,
        cmFromBodySlider,
        targetLengthPx: targetRounded,
        deltaPxFromTarget: pxRounded - targetRounded,
      };
      /** 縦スケールが実質 1 なら path 再構築・オーバーレイ用ラップを省略（補間中の無駄なコピーを減らす） */
      const lengthMeshScale = gradeParams.scale;
      if (Number.isFinite(lengthMeshScale) && Math.abs(lengthMeshScale - 1) > 1e-5) {
        const applied = applyGradeLengthVerticalScaleToMeshPaths(
          customPathDs,
          customPoints,
          gradeParams.lengthTopY,
          gradeParams.scale
        );
        customPathDs = applied.customPathDs;
        customPoints = applied.customPoints;
        const sleeveNotEntered = !Number.isFinite(sizeForGrade.sleeve) || sizeForGrade.sleeve <= 0;
        let xPivot: number | undefined;
        if (sleeveNotEntered) {
          const h = applyGradeLengthHorizontalScaleToMeshPaths(
            customPathDs,
            customPoints,
            gradeParams.midShoulderX,
            gradeParams.scale
          );
          customPathDs = h.customPathDs;
          customPoints = h.customPoints;
          xPivot = gradeParams.midShoulderX;
        }
        canvasYGradeScale = {
          lengthTopY: gradeParams.lengthTopY,
          scale: gradeParams.scale,
          ...(xPivot != null && Number.isFinite(xPivot) ? { midShoulderX: xPivot } : {}),
        };
        designToGarmentCanvasForOverlay = wrapDesignToGarmentCanvasWithYScale(
          designToGarmentCanvas,
          gradeParams.lengthTopY,
          gradeParams.scale,
          xPivot
        );
        outBeforeWarp = null;
      }
    } else {
      lengthMeshSkipReason = gradeParams.reason;
    }
  }

  return {
    customPathDs,
    customPoints,
    designToGarmentCanvasForOverlay,
    canvasYGradeScale,
    lengthGeomBeforeLengthMeshDebug,
    customPointsBeforeFabricWarpOut: outBeforeWarp,
    lengthMeshSkipReason,
    ...(appliedTargetLengthPx != null ? { appliedTargetLengthPx } : {}),
  };
}

export type GenericTopSleevePipelineResult = {
  customPathDs: string[];
  customPoints: [number, number][];
  sleeveGeomBeforeSleeveFixDebug?: { px: number; cm: number };
  sleeveGeomBeforeSleeveFixDebugRight?: { px: number; cm: number };
  sleevePxPerCmForMeasure?: number;
  sleevePipelineGeom: { px: number; cm: number } | null;
  sleevePipelineGeomMirror: { px: number; cm: number } | null;
  /** プライマリ袖: 措定区間の弧長（三平方の辺の和）、スケール前後 */
  sleeveMeasureDefinitionDebug?: {
    gLo: number;
    gHi: number;
    chainGlobal?: number[];
    pxPerCm: number;
    beforeSleeveFix: { arcPx: number; arcCm: number };
    afterPipeline: { arcPx: number; arcCm: number };
    inputSleeveCm: number;
  };
};

/**
 * 汎用トップ: ワープ・着丈メッシュ後に袖を入力へ寄せ、オーバーレイ用の幾何・px/cm を算出。
 */
export function runGenericSymmetricTopSleevePipeline(input: {
  customGarmentData: CustomGarmentData;
  customPathDs: string[];
  customPoints: [number, number][];
  c: CustomGarmentData["landmarks"];
  animatingCustomSizeBlend: boolean;
  /**
   * サイズ補間中: from→to の補間 `SizeMeasure`（着丈メッシュと同じ）。未指定時は `customGarmentData.size`。
   */
  sleeveSizeForSnap?: SizeMeasure;
  /** 紫着丈時の袖 px/cm を着丈 Y メッシュの `size.length×bodyPxPerCm` と揃える */
  bodyPxPerCm?: number;
}): GenericTopSleevePipelineResult {
  const { customGarmentData, c, animatingCustomSizeBlend, sleeveSizeForSnap, bodyPxPerCm } = input;
  let customPathDs = input.customPathDs;
  let customPoints = input.customPoints;

  const dbgSleeve = isDebugFittingSleevePipelineEnabled();
  const sizeForSleeve = sleeveSizeForSnap ?? customGarmentData.size;

  let sleeveGeomBeforeSleeveFixDebug: { px: number; cm: number } | undefined;
  let sleeveGeomBeforeSleeveFixDebugRight: { px: number; cm: number } | undefined;

  let sleevePxPerCmUsedForScale: number | undefined;
  let sleeveVertexLockForMeasure:
    | {
        primary?: SleeveVertexLockForPipelineMeasure;
        mirror?: SleeveVertexLockForPipelineMeasure;
      }
    | undefined;
  let sleevePipelineGeomReportedFromFix:
    | { primary?: { px: number; cm: number }; mirror?: { px: number; cm: number } }
    | undefined;
  let sleeveMeasureDefinitionDebug: GenericTopSleevePipelineResult["sleeveMeasureDefinitionDebug"];

  if (
    customGarmentData.presetId === "genericSymmetricTop" &&
    customGarmentData.genericSymmetricTop != null
  ) {
    const gtSymTop = customGarmentData.genericSymmetricTop;
    const pxPerCmDenom = resolveGenericSleevePxPerCmForMeasure(
      customPathDs,
      c,
      sizeForSleeve,
      gtSymTop,
      bodyPxPerCm
    );
    const rangePrimary = resolvePrimarySleeveGRangeAndChain(customPathDs, c, gtSymTop);
    let beforeSleeveFixArc: { arcPx: number; arcCm: number } | undefined;
    if (rangePrimary != null) {
      const arcPx0 = sleeveVerticalPxFromGlobalVertices(
        customPathDs,
        rangePrimary.gLo,
        rangePrimary.gHi,
        rangePrimary.chain,
        customPoints
      );
      beforeSleeveFixArc = {
        arcPx: arcPx0,
        arcCm: arcPx0 / pxPerCmDenom,
      };
    }
    /** 袖スナップ前の canvas 頂点（applyGenericSleeveScaleAfterLengthMesh の pre-measure と同じ座標・定義） */
    const beforeSleeve = measureGenericTopSleeveCmFromPath(
      customPathDs,
      c,
      sizeForSleeve,
      gtSymTop,
      undefined,
      customPoints,
      bodyPxPerCm
    );
    if (beforeSleeve != null) {
      sleeveGeomBeforeSleeveFixDebug = { px: beforeSleeve.px, cm: beforeSleeve.cm };
    }
    const mS = gtSymTop.sleeveMirrorMeasureVertexStart;
    const mE = gtSymTop.sleeveMirrorMeasureVertexEnd;
    if (
      mS != null &&
      mE != null &&
      Number.isFinite(mS) &&
      Number.isFinite(mE) &&
      mS !== mE
    ) {
      const effMir0 = resolveEffectiveMirrorSleeveGradingGeometry(customPathDs, c, gtSymTop);
      const mirrorChain0 =
        effMir0?.globalChainForMeasure ?? gtSymTop.sleeveMirrorMeasureVertexChain;
      const beforeMirror = measureGenericTopSleeveCmFromPath(
        customPathDs,
        c,
        sizeForSleeve,
        gtSymTop,
        {
          start: mS,
          end: mE,
          chain: mirrorChain0,
        },
        customPoints,
        bodyPxPerCm
      );
      if (beforeMirror != null) {
        sleeveGeomBeforeSleeveFixDebugRight = { px: beforeMirror.px, cm: beforeMirror.cm };
      }
    }
    const sleeveFix = applyGenericSleeveScaleAfterLengthMesh(
      customPathDs,
      customPoints,
      c,
      sizeForSleeve,
      gtSymTop,
      bodyPxPerCm,
      /** 補間中も最低 2 回: 下袖スナップ後の残差で 1 回だと入力袖丈から数 cm 残ることがある */
      animatingCustomSizeBlend ? { maxSleeveCorrectionIters: 2 } : undefined
    );
    customPathDs = sleeveFix.pathDs;
    customPoints = sleeveFix.customPoints;
    sleevePxPerCmUsedForScale = sleeveFix.sleevePxPerCmUsedForScale;
    sleeveVertexLockForMeasure = sleeveFix.sleeveVertexLockForMeasure;
    sleevePipelineGeomReportedFromFix = sleeveFix.sleevePipelineGeomReported;

    if (beforeSleeveFixArc != null) {
      const pxPerCmFinal = sleevePxPerCmUsedForScale ?? pxPerCmDenom;
      const rangeAfter =
        sleeveVertexLockForMeasure?.primary != null
          ? {
              gLo: sleeveVertexLockForMeasure.primary.start,
              gHi: sleeveVertexLockForMeasure.primary.end,
              chain: sleeveVertexLockForMeasure.primary.chain,
            }
          : resolvePrimarySleeveGRangeAndChain(customPathDs, c, gtSymTop);
      if (rangeAfter != null) {
        const arcPx1 = sleeveVerticalPxFromGlobalVertices(
          customPathDs,
          rangeAfter.gLo,
          rangeAfter.gHi,
          rangeAfter.chain,
          customPoints
        );
        sleeveMeasureDefinitionDebug = {
          gLo: rangeAfter.gLo,
          gHi: rangeAfter.gHi,
          chainGlobal: rangeAfter.chain,
          pxPerCm: pxPerCmFinal,
          beforeSleeveFix: beforeSleeveFixArc,
          afterPipeline: {
            arcPx: arcPx1,
            arcCm: arcPx1 / pxPerCmFinal,
          },
          inputSleeveCm: sizeForSleeve.sleeve,
        };
      }
    }
  }

  const sleevePxPerCmForMeasure =
    customGarmentData.presetId === "genericSymmetricTop" && customGarmentData.genericSymmetricTop != null
      ? sleevePxPerCmUsedForScale ??
        resolveGenericSleevePxPerCmForMeasure(
          customPathDs,
          c,
          sizeForSleeve,
          customGarmentData.genericSymmetricTop,
          bodyPxPerCm
        )
      : undefined;

  const gtForSleeveGeom = customGarmentData.genericSymmetricTop;
  const primaryLock = sleeveVertexLockForMeasure?.primary;
  const sleevePipelineGeom =
    customGarmentData.presetId === "genericSymmetricTop" && gtForSleeveGeom != null
      ? sleevePipelineGeomReportedFromFix?.primary ??
        measureGenericTopSleeveCmFromPath(
          customPathDs,
          c,
          sizeForSleeve,
          gtForSleeveGeom,
          primaryLock != null
            ? { start: primaryLock.start, end: primaryLock.end, chain: primaryLock.chain }
            : undefined,
          customPoints,
          bodyPxPerCm,
          sleevePxPerCmUsedForScale
        )
      : null;

  const sleevePipelineGeomMirror =
    customGarmentData.presetId === "genericSymmetricTop" && gtForSleeveGeom != null
      ? (() => {
          const ms = gtForSleeveGeom.sleeveMirrorMeasureVertexStart;
          const me = gtForSleeveGeom.sleeveMirrorMeasureVertexEnd;
          if (
            ms == null ||
            me == null ||
            !Number.isFinite(ms) ||
            !Number.isFinite(me) ||
            ms === me
          ) {
            return null;
          }
          const fromFix = sleevePipelineGeomReportedFromFix?.mirror;
          if (fromFix != null) return fromFix;
          const mirrorLock = sleeveVertexLockForMeasure?.mirror;
          const effMir = resolveEffectiveMirrorSleeveGradingGeometry(customPathDs, c, gtForSleeveGeom);
          const mirrorChainFallback =
            effMir?.globalChainForMeasure ?? gtForSleeveGeom.sleeveMirrorMeasureVertexChain;
          return measureGenericTopSleeveCmFromPath(
            customPathDs,
            c,
            sizeForSleeve,
            gtForSleeveGeom,
            mirrorLock != null
              ? { start: mirrorLock.start, end: mirrorLock.end, chain: mirrorLock.chain }
              : {
                  start: ms,
                  end: me,
                  chain: mirrorChainFallback,
                },
            customPoints,
            bodyPxPerCm,
            sleevePxPerCmUsedForScale
          );
        })()
      : null;

  if (dbgSleeve && customGarmentData.presetId === "genericSymmetricTop" && customGarmentData.genericSymmetricTop) {
    const slIn = sizeForSleeve.sleeve;
    console.info("[FITTING_SLEEVE_PIPELINE] pipeline_out", {
      inputSleeveCm: slIn,
      beforeSleeveFixCm: sleeveGeomBeforeSleeveFixDebug?.cm ?? null,
      afterPipelinePrimaryGeomCm: sleevePipelineGeom?.cm ?? null,
      afterPipelinePrimaryGeomPx: sleevePipelineGeom?.px ?? null,
      sleevePxPerCmForMeasure: sleevePxPerCmForMeasure ?? null,
      deltaGeomMinusInput:
        sleevePipelineGeom != null && Number.isFinite(slIn)
          ? sleevePipelineGeom.cm - slIn
          : null,
      mirrorGeomCm: sleevePipelineGeomMirror?.cm ?? null,
      sleeveMeasureDefinitionDebug: sleeveMeasureDefinitionDebug ?? null,
    });
    // #region agent log
    fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c35241" },
      body: JSON.stringify({
        sessionId: "c35241",
        hypothesisId: "H_pipeline_length_output",
        location: "fittingCanvasComputeGarmentCustomSymmetricTop.ts:pipeline_out",
        message: "pipeline_out_primary_mirror",
        data: {
          inputSleeveCm: slIn,
          beforeSleeveFixCm: sleeveGeomBeforeSleeveFixDebug?.cm ?? null,
          afterPipelinePrimaryGeomCm: sleevePipelineGeom?.cm ?? null,
          afterPipelinePrimaryGeomPx: sleevePipelineGeom?.px ?? null,
          mirrorGeomCm: sleevePipelineGeomMirror?.cm ?? null,
          deltaGeomMinusInput:
            sleevePipelineGeom != null && Number.isFinite(slIn)
              ? sleevePipelineGeom.cm - slIn
              : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }

  if (
    (isDebugFittingMeasureEnabled() || dbgSleeve) &&
    sleeveMeasureDefinitionDebug != null
  ) {
    console.info("[FITTING_SLEEVE_PIPELINE] primary_sleeve_interval_arc", {
      措定区間: {
        gLo: sleeveMeasureDefinitionDebug.gLo,
        gHi: sleeveMeasureDefinitionDebug.gHi,
        chainGlobal: sleeveMeasureDefinitionDebug.chainGlobal ?? null,
      },
      pxPerCm: sleeveMeasureDefinitionDebug.pxPerCm,
      袖スケール前_弧長: {
        cm: sleeveMeasureDefinitionDebug.beforeSleeveFix.arcCm,
        px: sleeveMeasureDefinitionDebug.beforeSleeveFix.arcPx,
      },
      袖スケール後_弧長: {
        cm: sleeveMeasureDefinitionDebug.afterPipeline.arcCm,
        px: sleeveMeasureDefinitionDebug.afterPipeline.arcPx,
      },
      入力袖丈cm: sleeveMeasureDefinitionDebug.inputSleeveCm,
    });
  }

  return {
    customPathDs,
    customPoints,
    sleeveGeomBeforeSleeveFixDebug,
    sleeveGeomBeforeSleeveFixDebugRight,
    sleevePxPerCmForMeasure,
    sleevePipelineGeom,
    sleevePipelineGeomMirror,
    ...(sleeveMeasureDefinitionDebug != null ? { sleeveMeasureDefinitionDebug } : {}),
  };
}
