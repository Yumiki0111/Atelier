import { isDebugFittingMeasureEnabled } from "./fittingCanvasDebugFlags";
import {
  computeLengthOverlayBaseline,
  computePrimarySleeveOverlayHeuristicDraft,
} from "./fittingCanvasGarmentOverlayMeasureBlocks";
import type {
  CustomGarmentData,
  CustomLandmarks,
  MeasureOverlayData,
  ShoulderDebug,
} from "@/app/(main)/development/fitting/lib/types";

function applyYScaleToCanvasPoints(
  pts: [number, number][],
  lengthTopY: number,
  scale: number
): [number, number][] {
  const mapY = (y: number) => lengthTopY + (y - lengthTopY) * scale;
  return pts.map(([x, y]) => [x, mapY(y)] as [number, number]);
}

function applyXScaleToCanvasPoints(
  pts: [number, number][],
  pivotX: number,
  scale: number
): [number, number][] {
  return pts.map(([x, y]) => [pivotX + (x - pivotX) * scale, y] as [number, number]);
}

export type CustomGarmentOverlayAssemblyInput = {
  customGarmentData: CustomGarmentData;
  customPoints: [number, number][];
  customAllOutline: [number, number][];
  bodyShoulderContour: [number, number][];
  c: CustomGarmentData["landmarks"];
  rigLm: CustomLandmarks | null;
  useRigLandmarksForPlacement: boolean;
  hasGarmentRig: boolean;
  shoulderSeamY: number;
  placeDesignToTemplate: (gx: number, gy: number) => [number, number];
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  customGarmentFabricRigViewWarp: (x: number, y: number) => [number, number];
  customPointsBeforeFabricWarp?: [number, number][] | null;
  bodyPxPerCm: number;
  sleevePxPerCmForMeasure?: number;
  canvasYGradeScale?: { lengthTopY: number; scale: number; midShoulderX?: number } | null;
  animatingCustomSizeBlend?: boolean;
};

/**
 * カスタム服: path/rig 変換後の頂点列から採寸オーバーレイ・`shoulderDebug` を組み立てる（表示専用）。
 */
export function assembleCustomGarmentOverlayAndShoulderDebug(
  input: CustomGarmentOverlayAssemblyInput
): { garmentOverlay: MeasureOverlayData["garment"]; shoulderDebug: ShoulderDebug } {
  const {
    customGarmentData,
    customPoints,
    customAllOutline,
    bodyShoulderContour,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    hasGarmentRig,
    shoulderSeamY,
    placeDesignToTemplate,
    designToGarmentCanvas,
    customGarmentFabricRigViewWarp,
    bodyPxPerCm,
    sleevePxPerCmForMeasure,
    canvasYGradeScale,
    animatingCustomSizeBlend,
  } = input;

  const sleevePxPerCmForOverlay = sleevePxPerCmForMeasure ?? bodyPxPerCm;

  const refShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const refShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const refHemY = useRigLandmarksForPlacement && rigLm ? rigLm.hemY : c.hemY;
  const refHemCx = useRigLandmarksForPlacement && rigLm ? rigLm.hemCx : c.hemCx;
  const customContourBase = [
    placeDesignToTemplate(refShoulderLx, shoulderSeamY),
    placeDesignToTemplate(refShoulderRx, shoulderSeamY),
  ];
  let customContour: [number, number][] = hasGarmentRig
    ? (customContourBase.map(([x, y]) => customGarmentFabricRigViewWarp(x, y)) as [number, number][])
    : customContourBase;
  if (canvasYGradeScale) {
    const { lengthTopY, scale, midShoulderX } = canvasYGradeScale;
    customContour = applyYScaleToCanvasPoints(customContour, lengthTopY, scale);
    if (midShoulderX != null && Number.isFinite(midShoulderX)) {
      customContour = applyXScaleToCanvasPoints(customContour, midShoulderX, scale);
    }
  }
  const centerXGarment = (refShoulderLx + refShoulderRx) / 2;
  const shoulderBandY0 = shoulderSeamY;
  const shoulderBandY1 = shoulderSeamY + 28;
  const shoulderBand = customAllOutline.filter((p) => p[1] >= shoulderBandY0 && p[1] <= shoulderBandY1);
  const visualShoulderLx =
    shoulderBand.length > 0 ? Math.min(...shoulderBand.map((p) => p[0])) : refShoulderLx;
  const visualShoulderRx =
    shoulderBand.length > 0 ? Math.max(...shoulderBand.map((p) => p[0])) : refShoulderRx;
  const bandY0 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.35;
  const bandY1 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.65;
  const torsoBand = customAllOutline.filter((p) => p[1] >= bandY0 && p[1] <= bandY1);
  const chestMinX = torsoBand.length > 0 ? Math.min(...torsoBand.map((p) => p[0])) : refShoulderLx;
  const chestMaxX = torsoBand.length > 0 ? Math.max(...torsoBand.map((p) => p[0])) : refShoulderRx;
  const chestMidY = (bandY0 + bandY1) / 2;
  const leftHalfAtShoulder = shoulderBand.filter((p) => p[0] < centerXGarment);
  const sleeveSeamL =
    leftHalfAtShoulder.length > 0
      ? leftHalfAtShoulder.reduce((a, b) => (a[0] > b[0] ? a : b))
      : ([visualShoulderLx, shoulderSeamY] as [number, number]);
  const leftSleeveStrict = customAllOutline.filter((p) => p[0] < visualShoulderLx && p[1] > shoulderSeamY);
  const leftSleeve =
    leftSleeveStrict.length > 0
      ? leftSleeveStrict
      : customAllOutline.filter((p) => p[0] < centerXGarment && p[1] > shoulderSeamY);
  const sleeveEndPt = leftSleeve.length > 0 ? leftSleeve.reduce((a, b) => (a[1] > b[1] ? a : b)) : null;

  const purpleLen = computeLengthOverlayBaseline({
    bodyPxPerCm,
    designToGarmentCanvas,
    visualShoulderLx,
    shoulderSeamY,
    refHemCx,
    refHemY,
  });
  let hemCenter = purpleLen.hemCenter;
  let lengthMeasuredCm = purpleLen.lengthMeasuredCm;
  const shoulderYForLength = purpleLen.shoulderYForLength;

  const lengthPxVert = Math.abs(hemCenter[1] - shoulderYForLength);
  const lengthGeomDebug = {
    px: Math.round(lengthPxVert),
    cm: lengthPxVert / bodyPxPerCm,
  };
  lengthMeasuredCm = lengthGeomDebug.cm;

  const shoulderLeft = designToGarmentCanvas(visualShoulderLx, shoulderSeamY);
  const shoulderRight = designToGarmentCanvas(visualShoulderRx, shoulderSeamY);
  const lengthGuideHem: [number, number] = [hemCenter[0], hemCenter[1]];

  const primarySleeve = computePrimarySleeveOverlayHeuristicDraft({
    sleevePxPerCmForOverlay,
    designToGarmentCanvas,
    sleeveSeamL,
    sleeveEndPt,
  });
  let sleeveMeasuredCm = primarySleeve.sleevePathLengthDebug?.cm ?? undefined;

  const garmentOverlay: MeasureOverlayData["garment"] = {
    shoulderLeft,
    shoulderRight,
    hemCenter,
    size: customGarmentData.size,
    lengthMeasuredCm,
    lengthGuideHem,
    lengthGeomDebug,
    bodyPxPerCm,
    sizeLabel: "平置き cm",
    chestLeft: designToGarmentCanvas(chestMinX, chestMidY),
    chestRight: designToGarmentCanvas(chestMaxX, chestMidY),
    sleeveStart: primarySleeve.sleeveStart,
    sleeveEnd: primarySleeve.sleeveEnd,
    sleeveMeasuredCm,
    sleevePathPoints: primarySleeve.sleevePathPoints,
    ...(primarySleeve.sleevePathLengthDebug ? { sleeveGeomDebug: primarySleeve.sleevePathLengthDebug } : {}),
  };

  const debugFittingMeasure = isDebugFittingMeasureEnabled();
  if (debugFittingMeasure && animatingCustomSizeBlend !== true) {
    const lenIn = customGarmentData.size.length;
    const slIn = customGarmentData.size.sleeve;
    const sizeMeaningful = lenIn > 0.5 || slIn > 0.5;
    const lenDiff = lengthMeasuredCm != null ? Math.abs(lengthMeasuredCm - lenIn) : 0;
    const slDiff = sleeveMeasuredCm != null ? Math.abs(sleeveMeasuredCm - slIn) : 0;
    if (sizeMeaningful && (lenDiff > 0.2 || slDiff > 0.2)) {
      console.info("[FITTING_MEASURE] 入力値と幾何数値がずれています（採寸オーバーレイの確認用）", {
        着丈cm: { 入力値: lenIn, 幾何数値: lengthMeasuredCm ?? "—" },
        袖丈cm: { 入力値: slIn, 幾何数値: sleeveMeasuredCm ?? "—" },
        bodyPxPerCm,
        animatingCustomSizeBlend,
      });
    }
  }

  const shoulderDebug: ShoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: customContour,
    garmentShoulderPoints: customPoints,
    garmentType: "custom",
  };

  return { garmentOverlay, shoulderDebug };
}
