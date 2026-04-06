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
import { collectSleevePathIndicesForGrading } from "@/app/(main)/development/fitting/generic/resolveEffectiveSleeveGradingGeometry";
import {
  applyGradeLengthVerticalScaleToMeshPaths,
  computeGradeLengthVerticalScaleParams,
  wrapDesignToGarmentCanvasWithYScale,
} from "./fittingCanvasCustomGarmentGradeLength";
import { isDebugFittingSleevePipelineEnabled } from "./fittingCanvasDebugFlags";

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
  canvasYGradeScale: { lengthTopY: number; scale: number } | null;
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
  let canvasYGradeScale: { lengthTopY: number; scale: number } | null = null;
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
      let excludePathIndices: Set<number> | undefined;
      if (
        customGarmentData.presetId === "genericSymmetricTop" &&
        customGarmentData.genericSymmetricTop != null
      ) {
        const ex = collectSleevePathIndicesForGrading(
          customPathDs,
          c as CustomLandmarks,
          customGarmentData.genericSymmetricTop
        );
        if (ex.size > 0) excludePathIndices = ex;
      }
      /** 縦スケールが実質 1 なら path 再構築・オーバーレイ用ラップを省略（補間中の無駄なコピーを減らす） */
      const lengthMeshScale = gradeParams.scale;
      if (Number.isFinite(lengthMeshScale) && Math.abs(lengthMeshScale - 1) > 1e-5) {
        const applied = applyGradeLengthVerticalScaleToMeshPaths(
          customPathDs,
          customPoints,
          gradeParams.lengthTopY,
          gradeParams.scale,
          excludePathIndices != null ? { excludePathIndices } : undefined
        );
        customPathDs = applied.customPathDs;
        customPoints = applied.customPoints;
        canvasYGradeScale = { lengthTopY: gradeParams.lengthTopY, scale: gradeParams.scale };
        designToGarmentCanvasForOverlay = wrapDesignToGarmentCanvasWithYScale(
          designToGarmentCanvas,
          gradeParams.lengthTopY,
          gradeParams.scale
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

  if (
    customGarmentData.presetId === "genericSymmetricTop" &&
    customGarmentData.genericSymmetricTop != null
  ) {
    const gtSymTop = customGarmentData.genericSymmetricTop;
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
      const beforeMirror = measureGenericTopSleeveCmFromPath(
        customPathDs,
        c,
        sizeForSleeve,
        gtSymTop,
        {
          start: mS,
          end: mE,
          chain: gtSymTop.sleeveMirrorMeasureVertexChain,
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
      animatingCustomSizeBlend ? { maxSleeveCorrectionIters: 1 } : undefined
    );
    customPathDs = sleeveFix.pathDs;
    customPoints = sleeveFix.customPoints;
  }

  const sleevePxPerCmForMeasure =
    customGarmentData.presetId === "genericSymmetricTop" && customGarmentData.genericSymmetricTop != null
      ? resolveGenericSleevePxPerCmForMeasure(
          customPathDs,
          c,
          sizeForSleeve,
          customGarmentData.genericSymmetricTop,
          bodyPxPerCm
        )
      : undefined;

  const gtForSleeveGeom = customGarmentData.genericSymmetricTop;
  const sleevePipelineGeom =
    customGarmentData.presetId === "genericSymmetricTop" && gtForSleeveGeom != null
      ? measureGenericTopSleeveCmFromPath(
          customPathDs,
          c,
          sizeForSleeve,
          gtForSleeveGeom,
          undefined,
          customPoints,
          bodyPxPerCm
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
          return measureGenericTopSleeveCmFromPath(
            customPathDs,
            c,
            sizeForSleeve,
            gtForSleeveGeom,
            {
              start: ms,
              end: me,
              chain: gtForSleeveGeom.sleeveMirrorMeasureVertexChain,
            },
            customPoints,
            bodyPxPerCm
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
  };
}
