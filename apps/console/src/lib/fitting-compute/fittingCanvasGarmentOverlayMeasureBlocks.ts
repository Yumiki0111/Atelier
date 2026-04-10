import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { resolveEffectiveSleeveGradingGeometry } from "@/app/(main)/development/fitting/generic/resolveEffectiveSleeveGradingGeometry";
import { polylineArcLengthPx } from "./fittingCanvasPolylineMeasure";

/** ミラー袖の赤線頂点列と端点（採寸チェーン or 頂点範囲） */
export function resolveMirrorSleeveCanvasPoints(
  customPoints: [number, number][],
  gtSym: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): {
  sleevePathPointsRight: [number, number][] | undefined;
  sleeveStartRight: [number, number] | undefined;
  sleeveEndRight: [number, number] | undefined;
} {
  let sleevePathPointsRight: [number, number][] | undefined;
  let sleeveStartRight: [number, number] | undefined;
  let sleeveEndRight: [number, number] | undefined;
  const gtMirrorChain = gtSym.sleeveMirrorMeasureVertexChain;
  const mirrorVertexPairOk =
    gtSym.sleeveMirrorMeasureVertexStart != null &&
    gtSym.sleeveMirrorMeasureVertexEnd != null &&
    Number.isFinite(gtSym.sleeveMirrorMeasureVertexStart) &&
    Number.isFinite(gtSym.sleeveMirrorMeasureVertexEnd) &&
    gtSym.sleeveMirrorMeasureVertexStart !== gtSym.sleeveMirrorMeasureVertexEnd;

  if (gtMirrorChain != null && gtMirrorChain.length >= 2) {
    const pathPtsRight = gtMirrorChain
      .map((i) => customPoints[i])
      .filter((p): p is [number, number] => p != null);
    if (pathPtsRight.length >= 2) {
      sleevePathPointsRight = pathPtsRight;
      sleeveStartRight = pathPtsRight[0]!;
      sleeveEndRight = pathPtsRight[pathPtsRight.length - 1]!;
    }
  } else if (mirrorVertexPairOk) {
    const a = Math.trunc(gtSym.sleeveMirrorMeasureVertexStart!);
    const b = Math.trunc(gtSym.sleeveMirrorMeasureVertexEnd!);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const pathPtsRight: [number, number][] = [];
    for (let i = lo; i <= hi; i++) {
      const w = customPoints[i];
      if (w) pathPtsRight.push(w);
    }
    if (pathPtsRight.length >= 2) {
      sleevePathPointsRight = pathPtsRight;
      sleeveStartRight = customPoints[lo] ?? pathPtsRight[0];
      sleeveEndRight = customPoints[hi] ?? pathPtsRight[pathPtsRight.length - 1]!;
    }
  }
  return { sleevePathPointsRight, sleeveStartRight, sleeveEndRight };
}

export type LengthOverlayPurpleState = {
  shoulderYForLength: number;
  hemCenter: [number, number];
  lengthMeasuredCm: number;
  lengthMeasurePlotRange: [number, number] | undefined;
  lengthPathLengthDebug: { px: number; cm: number } | undefined;
  lengthMeasureTop: [number, number] | undefined;
  /**
   * プロットの着丈ハイライト区間が保存済み `lengthMeasureVertexStart/End` と異なる。
   * オーバーレイの紫線・幾何 cm は確定 gt 基準のため、ハイライトと一致しないことがある。
   */
  lengthMeasureIsEditPreview: boolean;
};

function lengthVertexPairsEqual(a0: number, a1: number, b0: number, b1: number): boolean {
  const loA = Math.min(Math.trunc(a0), Math.trunc(a1));
  const hiA = Math.max(Math.trunc(a0), Math.trunc(a1));
  const loB = Math.min(Math.trunc(b0), Math.trunc(b1));
  const hiB = Math.max(Math.trunc(b0), Math.trunc(b1));
  return loA === loB && hiA === hiB;
}

/**
 * 紫着丈連結またはハイライトで着丈オーバーレイ用の縦スパンを決定。
 */
export function computeLengthOverlayFromPurpleOrHighlight(input: {
  ptsForPurpleLength: [number, number][];
  bodyPxPerCm: number;
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  visualShoulderLx: number;
  shoulderSeamY: number;
  refHemCx: number;
  refHemY: number;
  gtLen: CustomGarmentData["genericSymmetricTop"];
  hlLen: [number, number] | undefined | null;
}): LengthOverlayPurpleState {
  const {
    ptsForPurpleLength,
    bodyPxPerCm,
    designToGarmentCanvas,
    visualShoulderLx,
    shoulderSeamY,
    refHemCx,
    refHemY,
    gtLen,
    hlLen,
  } = input;

  const shoulderYForLength = designToGarmentCanvas(visualShoulderLx, shoulderSeamY)[1];
  let hemCenter: [number, number] = designToGarmentCanvas(refHemCx, refHemY);
  let lengthMeasuredCm = (hemCenter[1] - shoulderYForLength) / bodyPxPerCm;
  let lengthMeasurePlotRange: [number, number] | undefined;
  let lengthPathLengthDebug: { px: number; cm: number } | undefined;
  let lengthMeasureTop: [number, number] | undefined;

  const lmLenA = gtLen?.lengthMeasureVertexStart;
  const lmLenB = gtLen?.lengthMeasureVertexEnd;

  const tryLengthFromGlobalRange = (a: number, b: number): boolean => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return false;
    const lo = Math.min(Math.trunc(a), Math.trunc(b));
    const hi = Math.max(Math.trunc(a), Math.trunc(b));
    const pa = ptsForPurpleLength[lo];
    const pb = ptsForPurpleLength[hi];
    if (!pa || !pb) return false;
    const topW = pa[1] <= pb[1] ? pa : pb;
    const hemW = pa[1] >= pb[1] ? pa : pb;
    hemCenter = [hemW[0], hemW[1]];
    lengthMeasureTop = [topW[0], topW[1]];
    const deltaPx = Math.abs(hemW[1] - topW[1]);
    lengthMeasuredCm = deltaPx / bodyPxPerCm;
    lengthMeasurePlotRange = [lo, hi];
    lengthPathLengthDebug = {
      px: Math.round(deltaPx),
      cm: deltaPx / bodyPxPerCm,
    };
    return true;
  };

  if (
    lmLenA != null &&
    lmLenB != null &&
    Number.isFinite(lmLenA) &&
    Number.isFinite(lmLenB) &&
    lmLenA !== lmLenB
  ) {
    tryLengthFromGlobalRange(lmLenA, lmLenB);
  } else if (
    hlLen &&
    Number.isFinite(hlLen[0]) &&
    Number.isFinite(hlLen[1]) &&
    hlLen[0] !== hlLen[1]
  ) {
    tryLengthFromGlobalRange(hlLen[0], hlLen[1]);
  }

  let lengthMeasureIsEditPreview = false;
  if (
    lmLenA != null &&
    lmLenB != null &&
    Number.isFinite(lmLenA) &&
    Number.isFinite(lmLenB) &&
    lmLenA !== lmLenB &&
    hlLen &&
    Number.isFinite(hlLen[0]) &&
    Number.isFinite(hlLen[1]) &&
    hlLen[0] !== hlLen[1] &&
    !lengthVertexPairsEqual(lmLenA, lmLenB, hlLen[0], hlLen[1])
  ) {
    lengthMeasureIsEditPreview = true;
  }

  return {
    shoulderYForLength,
    hemCenter,
    lengthMeasuredCm,
    lengthMeasurePlotRange,
    lengthPathLengthDebug,
    lengthMeasureTop,
    lengthMeasureIsEditPreview,
  };
}

function vertexChainsEqual(a: number[] | null | undefined, b: number[] | null | undefined): boolean {
  if (a == null || b == null || a.length < 2 || b.length < 2) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export type PrimarySleeveOverlayDraft = {
  sleeveStart: [number, number] | undefined;
  sleeveEnd: [number, number] | undefined;
  sleevePathPoints: [number, number][] | undefined;
  sleevePathLengthDebug: { px: number; cm: number } | undefined;
  sleeveIndicesForOverlay: [number, number] | null;
  sleeveVertexChainVisual: number[] | null;
  /**
   * 赤線が編集ハイライトの連結で、確定保存の `sleeveMeasureVertexChain` と一致しない。
   * 幾何 cm（sleevePipelineGeom）は gt 基準のため、線と数値が一致しないことがある。
   */
  sleeveMeasureRedLineIsEditPreview: boolean;
};

/**
 * プライマリ袖: gt / hl / scalableSpec からチェーンと縦 |Δy| デバッグを組み立て。
 */
export function computePrimarySleeveOverlayDraft(input: {
  customPoints: [number, number][];
  customGarmentData: CustomGarmentData;
  sleevePxPerCmForOverlay: number;
  genericVertexPlotHighlight: import("@/app/(main)/development/fitting/lib/types").GenericVertexPlotHighlight | null;
  scalableSpecSleeveIndices: [number, number] | undefined | null;
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  sleeveSeamL: [number, number];
  sleeveEndPt: [number, number] | null;
}): PrimarySleeveOverlayDraft {
  const {
    customPoints,
    customGarmentData,
    sleevePxPerCmForOverlay,
    genericVertexPlotHighlight,
    scalableSpecSleeveIndices,
    designToGarmentCanvas,
    sleeveSeamL,
    sleeveEndPt,
  } = input;

  const gtSym = customGarmentData.genericSymmetricTop;
  const gtHasSleeveMeasure =
    gtSym?.sleeveMeasureVertexStart != null &&
    gtSym?.sleeveMeasureVertexEnd != null &&
    Number.isFinite(gtSym.sleeveMeasureVertexStart) &&
    Number.isFinite(gtSym.sleeveMeasureVertexEnd);
  const sleeveGeomEff =
    gtHasSleeveMeasure && gtSym
      ? resolveEffectiveSleeveGradingGeometry(
          customGarmentData.pathDs,
          customGarmentData.landmarks,
          gtSym
        )
      : null;
  let effSleeveFromGtOrHighlight: [number, number] | null = null;
  if (gtHasSleeveMeasure) {
    if (sleeveGeomEff) {
      effSleeveFromGtOrHighlight = [sleeveGeomEff.gLo, sleeveGeomEff.gHi];
    } else {
      const a = Math.trunc(gtSym!.sleeveMeasureVertexStart!);
      const b = Math.trunc(gtSym!.sleeveMeasureVertexEnd!);
      effSleeveFromGtOrHighlight = [Math.min(a, b), Math.max(a, b)];
    }
  } else if (
    genericVertexPlotHighlight?.sleeveMeasure &&
    Number.isFinite(genericVertexPlotHighlight.sleeveMeasure[0]) &&
    Number.isFinite(genericVertexPlotHighlight.sleeveMeasure[1])
  ) {
    const [sm0, sm1] = genericVertexPlotHighlight.sleeveMeasure;
    effSleeveFromGtOrHighlight = [Math.min(Math.trunc(sm0), Math.trunc(sm1)), Math.max(Math.trunc(sm0), Math.trunc(sm1))];
  }
  const sleeveIndicesForOverlay = effSleeveFromGtOrHighlight ?? scalableSpecSleeveIndices ?? null;

  const sleeveVertexChainHl = genericVertexPlotHighlight?.sleeveMeasureVertexChain;
  const sleeveVertexChainGt = gtSym?.sleeveMeasureVertexChain;
  const sleeveVertexChainVisual =
    sleeveVertexChainHl != null && sleeveVertexChainHl.length >= 2
      ? sleeveVertexChainHl
      : sleeveVertexChainGt != null && sleeveVertexChainGt.length >= 2
        ? sleeveVertexChainGt
        : null;
  const sleeveVertexChainForMeasure =
    sleeveGeomEff?.globalChainForMeasure && sleeveGeomEff.globalChainForMeasure.length >= 2
      ? sleeveGeomEff.globalChainForMeasure
      : sleeveVertexChainGt != null && sleeveVertexChainGt.length >= 2
        ? sleeveVertexChainGt
        : sleeveVertexChainVisual;

  const hlChainActive =
    sleeveVertexChainHl != null && sleeveVertexChainHl.length >= 2;
  const sleeveMeasureRedLineIsEditPreview =
    hlChainActive && !vertexChainsEqual(sleeveVertexChainHl, sleeveVertexChainGt);

  let sleeveStart: [number, number] | undefined;
  let sleeveEnd: [number, number] | undefined;
  let sleevePathPoints: [number, number][] | undefined;
  let sleevePathLengthDebug: { px: number; cm: number } | undefined;

  if (sleeveVertexChainVisual != null && sleeveVertexChainVisual.length >= 2) {
    const pathPtsVisual = sleeveVertexChainVisual
      .map((i) => customPoints[i])
      .filter((p): p is [number, number] => p != null);
    if (pathPtsVisual.length >= 2) {
      const startPt = pathPtsVisual[0]!;
      const endPt = pathPtsVisual[pathPtsVisual.length - 1]!;
      sleeveStart = startPt;
      sleeveEnd = endPt;
      sleevePathPoints = pathPtsVisual;
    }
  }
  if (sleeveVertexChainForMeasure != null && sleeveVertexChainForMeasure.length >= 2) {
    const pathPtsMeasure = sleeveVertexChainForMeasure
      .map((i) => customPoints[i])
      .filter((p): p is [number, number] => p != null);
    if (pathPtsMeasure.length >= 2) {
      const deltaBodyPx = polylineArcLengthPx(pathPtsMeasure);
      const measured = deltaBodyPx / sleevePxPerCmForOverlay;
      sleevePathLengthDebug = { px: Math.round(deltaBodyPx), cm: measured };
    }
  } else if (sleeveIndicesForOverlay) {
    const [startIdx, endIdx] = sleeveIndicesForOverlay;
    const startPt = customPoints[startIdx];
    const endPt = customPoints[endIdx];
    const pathPts: [number, number][] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const w = customPoints[i];
      if (w) pathPts.push(w);
    }
    if (startPt && endPt) {
      sleeveStart = startPt;
      sleeveEnd = endPt;
      if (pathPts.length >= 2) {
        sleevePathPoints = pathPts;
      }
      const deltaBodyPx =
        pathPts.length >= 2
          ? polylineArcLengthPx(pathPts)
          : Math.hypot(
              customPoints[endIdx]![0] - customPoints[startIdx]![0],
              customPoints[endIdx]![1] - customPoints[startIdx]![1]
            );
      const measured = deltaBodyPx / sleevePxPerCmForOverlay;
      sleevePathLengthDebug = { px: Math.round(deltaBodyPx), cm: measured };
    }
  } else {
    sleeveStart = designToGarmentCanvas(sleeveSeamL[0], sleeveSeamL[1]);
    sleeveEnd = sleeveEndPt ? designToGarmentCanvas(sleeveEndPt[0], sleeveEndPt[1]) : undefined;
  }

  return {
    sleeveStart,
    sleeveEnd,
    sleevePathPoints,
    sleevePathLengthDebug,
    sleeveIndicesForOverlay,
    sleeveVertexChainVisual,
    sleeveMeasureRedLineIsEditPreview,
  };
}
