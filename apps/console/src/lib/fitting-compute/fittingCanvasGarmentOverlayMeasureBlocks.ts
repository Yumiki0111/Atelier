/** ヒューリスティックによる採寸ブロック組み立て（`assembleCustomGarmentOverlayAndShoulderDebug` 向け）。 */
import { polylineArcLengthPx } from "./fittingCanvasPolylineMeasure";

export type LengthOverlayPurpleState = {
  shoulderYForLength: number;
  hemCenter: [number, number];
  lengthMeasuredCm: number;
};

/** 着丈: ランドマーク肩〜裾ヒューリスティック（Grading v4 等） */
export function computeLengthOverlayBaseline(input: {
  bodyPxPerCm: number;
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  visualShoulderLx: number;
  shoulderSeamY: number;
  refHemCx: number;
  refHemY: number;
}): LengthOverlayPurpleState {
  const {
    bodyPxPerCm,
    designToGarmentCanvas,
    visualShoulderLx,
    shoulderSeamY,
    refHemCx,
    refHemY,
  } = input;

  const shoulderYForLength = designToGarmentCanvas(visualShoulderLx, shoulderSeamY)[1];
  const hemCenter: [number, number] = designToGarmentCanvas(refHemCx, refHemY);
  const lengthPxVert = Math.abs(hemCenter[1] - shoulderYForLength);
  const lengthMeasuredCm = lengthPxVert / bodyPxPerCm;

  return {
    shoulderYForLength,
    hemCenter,
    lengthMeasuredCm,
  };
}

export type PrimarySleeveOverlayDraft = {
  sleeveStart: [number, number] | undefined;
  sleeveEnd: [number, number] | undefined;
  sleevePathPoints: [number, number][] | undefined;
  sleevePathLengthDebug: { px: number; cm: number } | undefined;
};

/**
 * 袖: デザイン側の袖付け根〜最下点のヒューリスティックから赤線と弧長換算。
 */
export function computePrimarySleeveOverlayHeuristicDraft(input: {
  sleevePxPerCmForOverlay: number;
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  sleeveSeamL: [number, number];
  sleeveEndPt: [number, number] | null;
}): PrimarySleeveOverlayDraft {
  const { sleevePxPerCmForOverlay, designToGarmentCanvas, sleeveSeamL, sleeveEndPt } = input;

  const sleeveStart = designToGarmentCanvas(sleeveSeamL[0], sleeveSeamL[1]);
  const sleeveEnd = sleeveEndPt ? designToGarmentCanvas(sleeveEndPt[0], sleeveEndPt[1]) : undefined;

  let sleevePathLengthDebug: { px: number; cm: number } | undefined;
  let sleevePathPoints: [number, number][] | undefined;

  if (sleeveEnd != null) {
    const deltaBodyPx = polylineArcLengthPx([sleeveStart, sleeveEnd]);
    sleevePathLengthDebug = {
      px: Math.round(deltaBodyPx),
      cm: deltaBodyPx / sleevePxPerCmForOverlay,
    };
    sleevePathPoints = [sleeveStart, sleeveEnd];
  }

  return {
    sleeveStart,
    sleeveEnd,
    sleevePathPoints,
    sleevePathLengthDebug,
  };
}
