import type { CustomGarmentData, CustomLandmarks, GenericVertexPlotHighlight } from "@/app/(main)/development/fitting/lib/types";
import {
  applyGenericSleeveScaleAfterLengthMesh,
  measureGenericTopSleeveCmFromPath,
  measureOriginalSleeveCmFromDesignPaths,
  resolveGenericSleevePxPerCmForMeasure,
} from "@/app/(main)/development/fitting/generic/applyGenericMeasureOnlyGrading";
import {
  applyGradeLengthVerticalScaleToMeshPaths,
  computeGradeLengthVerticalScaleParams,
  wrapDesignToGarmentCanvasWithYScale,
} from "./fittingCanvasCustomGarmentGradeLength";

export type GenericTopLengthMeshResult = {
  customPathDs: string[];
  customPoints: [number, number][];
  designToGarmentCanvasForOverlay: (gx: number, gy: number) => [number, number];
  canvasYGradeScale: { lengthTopY: number; scale: number } | null;
  lengthGeomBeforeLengthMeshDebug?: { px: number; cm: number };
  customPointsBeforeFabricWarpOut: [number, number][] | null;
  /** 紫着丈＋baseline 適格だがメッシュをかけなかったときの理由（デバッグ用） */
  lengthMeshSkipReason?: string;
};

/**
 * 汎用トップ: 紫着丈＋ベースラインが揃い、サイズ補間中でなければワープ後メッシュに縦スケールを適用。
 */
export function applyGenericTopLengthMeshIfEligible(input: {
  canApplyLengthMeshGrade: boolean;
  animatingCustomSizeBlend: boolean;
  customGarmentData: CustomGarmentData;
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
  let lengthGeomBeforeLengthMeshDebug: { px: number; cm: number } | undefined;
  let outBeforeWarp: [number, number][] | null = customPointsBeforeFabricWarp;
  let lengthMeshSkipReason: string | undefined;

  if (canApplyLengthMeshGrade && animatingCustomSizeBlend) {
    lengthMeshSkipReason = "animatingCustomSizeBlend";
  }

  if (canApplyLengthMeshGrade && !animatingCustomSizeBlend) {
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
      size: customGarmentData.size,
      genericVertexPlotHighlight,
    });
    if (gradeParams.ok) {
      const prePx = gradeParams.preScaleSpanPx;
      lengthGeomBeforeLengthMeshDebug = {
        px: Math.round(prePx),
        cm: prePx / bodyPxPerCm,
      };
      const applied = applyGradeLengthVerticalScaleToMeshPaths(
        customPathDs,
        customPoints,
        gradeParams.lengthTopY,
        gradeParams.scale
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
}): GenericTopSleevePipelineResult {
  const { customGarmentData, c, animatingCustomSizeBlend } = input;
  let customPathDs = input.customPathDs;
  let customPoints = input.customPoints;

  let sleeveGeomBeforeSleeveFixDebug: { px: number; cm: number } | undefined;
  let sleeveGeomBeforeSleeveFixDebugRight: { px: number; cm: number } | undefined;

  if (
    customGarmentData.presetId === "genericSymmetricTop" &&
    customGarmentData.genericSymmetricTop != null &&
    !animatingCustomSizeBlend
  ) {
    const gtSymTop = customGarmentData.genericSymmetricTop;
    const originalSleeve = measureOriginalSleeveCmFromDesignPaths(customGarmentData.pathDs, gtSymTop);
    if (originalSleeve != null) {
      sleeveGeomBeforeSleeveFixDebug = { px: originalSleeve.px, cm: originalSleeve.cm };
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
      const originalMirror = measureOriginalSleeveCmFromDesignPaths(customGarmentData.pathDs, gtSymTop, {
        start: mS,
        end: mE,
        chain: gtSymTop.sleeveMirrorMeasureVertexChain,
      });
      if (originalMirror != null) {
        sleeveGeomBeforeSleeveFixDebugRight = { px: originalMirror.px, cm: originalMirror.cm };
      }
    }
    const sleeveFix = applyGenericSleeveScaleAfterLengthMesh(
      customPathDs,
      customPoints,
      c,
      customGarmentData.size,
      gtSymTop
    );
    customPathDs = sleeveFix.pathDs;
    customPoints = sleeveFix.customPoints;
  }

  const sleevePxPerCmForMeasure =
    customGarmentData.presetId === "genericSymmetricTop" && customGarmentData.genericSymmetricTop != null
      ? resolveGenericSleevePxPerCmForMeasure(
          customPathDs,
          c,
          customGarmentData.size,
          customGarmentData.genericSymmetricTop
        )
      : undefined;

  const gtForSleeveGeom = customGarmentData.genericSymmetricTop;
  const sleevePipelineGeom =
    customGarmentData.presetId === "genericSymmetricTop" && gtForSleeveGeom != null
      ? measureGenericTopSleeveCmFromPath(
          customPathDs,
          c,
          customGarmentData.size,
          gtForSleeveGeom,
          undefined,
          customPoints
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
            customGarmentData.size,
            gtForSleeveGeom,
            {
              start: ms,
              end: me,
              chain: gtForSleeveGeom.sleeveMirrorMeasureVertexChain,
            },
            customPoints
          );
        })()
      : null;

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
