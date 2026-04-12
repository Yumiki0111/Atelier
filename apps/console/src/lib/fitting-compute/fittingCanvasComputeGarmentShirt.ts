import { bodyHeight, getBodyParams } from "@/app/(main)/development/fitting/lib/bodyUtils";
import { REF_WEIGHT_KG, SH, SIZES } from "@/app/(main)/development/fitting/lib/constants";
import { buildTopPlacement } from "@/app/(main)/development/fitting/lib/garmentBase";
import { SHIRT_LEFT, SHIRT_RIGHT } from "@/app/(main)/development/fitting/lib/pathData";
import { shirtLandmarks } from "@/app/(main)/development/fitting/lib/shirtConfig";
import { buildShirtPath, buildShirtPathFromSizeMeasure } from "@/app/(main)/development/fitting/lib/shirtUtils";
import type { MeasureOverlayData, ShirtSize, ShoulderDebug, SizeMeasure } from "@/app/(main)/development/fitting/lib/types";
import { getAllPathPoints } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { outerCollarPoints, shoulderContourFromPath } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { smoothStep } from "./fittingCanvasRigArmDebug";

export function computeShirtGarmentBranch(input: {
  height: number;
  weight: number;
  shirtSize: ShirtSize;
  fromSize: ShirtSize | null;
  toSize: ShirtSize | null;
  animProgress: number;
  bodyShoulderContour: [number, number][];
}): {
  shirtPathD: string;
  shoulderDebug: ShoulderDebug;
  garmentOverlay: MeasureOverlayData["garment"];
} {
  const { height, weight, shirtSize, fromSize, toSize, animProgress, bodyShoulderContour } = input;
  const lm = shirtLandmarks;
  const shirtRaw = shoulderContourFromPath([SHIRT_LEFT, SHIRT_RIGHT], 85, 115, false);
  const shirtOuter = outerCollarPoints(shirtRaw, lm.shoulderLx, lm.shoulderRx);
  const shoulderSeamY =
    shirtOuter.length > 0
      ? Math.max(lm.shoulderY, Math.max(...shirtOuter.map((p) => p[1])))
      : lm.shoulderY;
  const shirtLandmarksForPlace = { ...lm, shoulderY: shoulderSeamY };
  const size = SIZES[toSize || shirtSize] ?? SIZES["48"];
  const placement = buildTopPlacement(height, weight, size, shirtLandmarksForPlace);
  let shirtPathD: string;
  if (fromSize && toSize && animProgress < 1) {
    /** path 文字列の数値を `interpolatePath` すると輪郭の幾何にならず一瞬縮む。cm 値を補間してから place する。 */
    const t = smoothStep(animProgress);
    const sFrom = SIZES[fromSize] ?? SIZES["48"];
    const sTo = SIZES[toSize] ?? SIZES["48"];
    const sizeLerp: SizeMeasure = {
      shoulder: sFrom.shoulder + (sTo.shoulder - sFrom.shoulder) * t,
      chest: sFrom.chest + (sTo.chest - sFrom.chest) * t,
      length: sFrom.length + (sTo.length - sFrom.length) * t,
      sleeve: sFrom.sleeve + (sTo.sleeve - sFrom.sleeve) * t,
    };
    shirtPathD = buildShirtPathFromSizeMeasure(sizeLerp, height, weight, { shoulderY: shoulderSeamY });
  } else {
    shirtPathD = buildShirtPath(toSize || shirtSize, height, weight, { shoulderY: shoulderSeamY });
  }
  const shirtContour = [placement.place(lm.shoulderLx, shoulderSeamY), placement.place(lm.shoulderRx, shoulderSeamY)];
  const shirtAllOutline = getAllPathPoints([SHIRT_LEFT, SHIRT_RIGHT]);
  const shirtPoints =
    fromSize && toSize && animProgress < 1
      ? (() => {
          const placementFrom = buildTopPlacement(
            height,
            weight,
            SIZES[fromSize] ?? size,
            shirtLandmarksForPlace
          );
          const placementTo = buildTopPlacement(
            height,
            weight,
            SIZES[toSize] ?? size,
            shirtLandmarksForPlace
          );
          const t = smoothStep(animProgress);
          return shirtAllOutline.map(([x, y]) => {
            const [x0, y0] = placementFrom.place(x, y);
            const [x1, y1] = placementTo.place(x, y);
            return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] as [number, number];
          });
        })()
      : shirtAllOutline.map(([x, y]) => placement.place(x, y));
  const shirtCenterX = (lm.shoulderLx + lm.shoulderRx) / 2;
  const shirtShoulderBandY1 = shoulderSeamY + 28;
  const shirtShoulderBand = shirtAllOutline.filter((p) => p[1] >= shoulderSeamY && p[1] <= shirtShoulderBandY1);
  const shirtVisualLx =
    shirtShoulderBand.length > 0 ? Math.min(...shirtShoulderBand.map((p) => p[0])) : lm.shoulderLx;
  const shirtVisualRx =
    shirtShoulderBand.length > 0 ? Math.max(...shirtShoulderBand.map((p) => p[0])) : lm.shoulderRx;
  const shirtLeftHalfAtShoulder = shirtShoulderBand.filter((p) => p[0] < shirtCenterX);
  const shirtSleeveSeamL =
    shirtLeftHalfAtShoulder.length > 0
      ? shirtLeftHalfAtShoulder.reduce((a, b) => (a[0] > b[0] ? a : b))
      : ([shirtVisualLx, shoulderSeamY] as [number, number]);
  const shirtLeftSleeve = shirtAllOutline.filter((p) => p[0] < shirtCenterX && p[1] > shoulderSeamY);
  const shirtSleeveEnd =
    shirtLeftSleeve.length > 0
      ? shirtLeftSleeve.reduce((a, b) => (a[1] > b[1] ? a : b))
      : ([SH.tip_lx, SH.tip_y] as [number, number]);
  const { yScale: yScaleShirtMeasure } = getBodyParams(height, REF_WEIGHT_KG);
  const bodyPxPerCmShirt = bodyHeight(yScaleShirtMeasure) / height;
  const shirtSl = placement.place(shirtVisualLx, shoulderSeamY);
  const shirtSr = placement.place(shirtVisualRx, shoulderSeamY);
  const shirtHem = placement.place(lm.hemCx, lm.hemY);
  const shirtSleeveA = placement.place(shirtSleeveSeamL[0], shirtSleeveSeamL[1]);
  const shirtSleeveB = placement.place(shirtSleeveEnd[0], shirtSleeveEnd[1]);
  const shirtShoulderY = (shirtSl[1] + shirtSr[1]) / 2;
  const shirtLenPx = Math.abs(shirtHem[1] - shirtShoulderY);
  const shirtSlvPx = Math.abs(shirtSleeveB[1] - shirtSleeveA[1]);
  const garmentOverlay: MeasureOverlayData["garment"] = {
    shoulderLeft: shirtSl,
    shoulderRight: shirtSr,
    hemCenter: shirtHem,
    size,
    sizeLabel: `シャツ ${shirtSize}`,
    chestLeft: placement.place(SH.bod_lx, SH.bod_y),
    chestRight: placement.place(SH.bod_rx, SH.bod_y),
    sleeveStart: shirtSleeveA,
    sleeveEnd: shirtSleeveB,
    lengthGeomDebug: { px: Math.round(shirtLenPx), cm: shirtLenPx / bodyPxPerCmShirt },
    sleeveGeomDebug: { px: Math.round(shirtSlvPx), cm: shirtSlvPx / bodyPxPerCmShirt },
  };
  const shoulderDebug: ShoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: shirtContour,
    garmentShoulderPoints: shirtPoints,
    garmentType: "shirt",
  };
  return { shirtPathD, shoulderDebug, garmentOverlay };
}
