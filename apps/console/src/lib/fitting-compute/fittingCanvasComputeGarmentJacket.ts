import { bodyHeight, getBodyParams } from "@/app/(main)/development/fitting/lib/bodyUtils";
import { JACKET_SIZES, JK, REF_WEIGHT_KG } from "@/app/(main)/development/fitting/lib/constants";
import type { JacketSize, MeasureOverlayData, ShoulderDebug } from "@/app/(main)/development/fitting/lib/types";
import { getPathPoints } from "@/app/(main)/development/fitting/lib/pathUtils";
import { buildJacketPath } from "@/app/(main)/development/fitting/lib/garment/jacketUtils";

export function computeJacketGarmentBranch(input: {
  height: number;
  weight: number;
  jacketSize: JacketSize;
  bodyShoulderContour: [number, number][];
}): {
  jacketFill: string;
  jacketDetail: string;
  shoulderDebug: ShoulderDebug;
  garmentOverlay: MeasureOverlayData["garment"];
} {
  const { height, weight, jacketSize, bodyShoulderContour } = input;
  const { fill, detail, place } = buildJacketPath(jacketSize, height, weight);
  const size = JACKET_SIZES[jacketSize] ?? JACKET_SIZES["4"];
  const jacketOutlinePts = getPathPoints(fill);
  const { yScale: yScaleJacketMeasure } = getBodyParams(height, REF_WEIGHT_KG);
  const bodyPxPerCmJacket = bodyHeight(yScaleJacketMeasure) / height;
  const jkSl = place(JK.sh_lx, JK.sh_y);
  const jkSr = place(JK.sh_rx, JK.sh_y);
  const jkHem = place(JK.cx, JK.hem_y);
  const jkSleeveStart = place(JK.sh_lx, JK.sh_y);
  const jkSleeveEnd = place(JK.tip_lx, JK.tip_y);
  const jkShoulderY = (jkSl[1] + jkSr[1]) / 2;
  const jkLenPx = Math.abs(jkHem[1] - jkShoulderY);
  const jkSlvPx = Math.abs(jkSleeveEnd[1] - jkSleeveStart[1]);
  const garmentOverlay: MeasureOverlayData["garment"] = {
    shoulderLeft: jkSl,
    shoulderRight: jkSr,
    hemCenter: jkHem,
    size,
    sizeLabel: `ジャケット サイズ ${jacketSize}`,
    chestLeft: place(JK.pit_lx, JK.pit_y),
    chestRight: place(JK.pit_rx, JK.pit_y),
    sleeveStart: jkSleeveStart,
    sleeveEnd: jkSleeveEnd,
    lengthGeomDebug: { px: Math.round(jkLenPx), cm: jkLenPx / bodyPxPerCmJacket },
    sleeveGeomDebug: { px: Math.round(jkSlvPx), cm: jkSlvPx / bodyPxPerCmJacket },
  };
  const shoulderDebug: ShoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: [place(JK.sh_lx, JK.sh_y), place(JK.sh_rx, JK.sh_y)],
    garmentShoulderPoints: jacketOutlinePts,
    garmentType: "jacket",
  };
  return { jacketFill: fill, jacketDetail: detail, shoulderDebug, garmentOverlay };
}
