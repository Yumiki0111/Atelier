import type { CustomGarmentData, CustomLandmarks } from "../lib/types";
import { buildTopPlacement } from "../lib/garmentBase";
import { REF_HEIGHT_CM } from "../lib/constants";
import { getBodyParams } from "../body";
import { bodyHeight } from "../lib/bodyUtils";
import { applyGenericMeasureOnlyGrading, genericMeasureOnlyGradingActive } from "../generic";
import { tPath } from "../lib/pathUtils";
import { genericLengthMeasureVerticalSpanPx, vertexPlotsPlaceOnly } from "./buildCustomTransformedPathsPlaceUtils";
import { toTopLandmarks } from "./scalableSpec";

export type GradedGenericTopPathsInput = {
  data: CustomGarmentData;
  lm: CustomLandmarks;
  h: number;
  w: number;
  shoulderOriginYForPlace: number | undefined;
  placementLockToModelRig: boolean;
  place: (x: number, y: number) => [number, number];
};

/**
 * 汎用トップかつ measure-only グレードが有効なとき、胴 path をグレードして place する。
 * 該当しないときは null。
 */
export function buildGradedBodyPathsAndVertexPlotsForGenericTop(
  input: GradedGenericTopPathsInput
): { bodyPaths: string[]; vertexPlotsBodySpace: [number, number][] } | null {
  const { data, lm, h, w, shoulderOriginYForPlace, placementLockToModelRig, place } = input;
  const gtForGeneric = data.presetId === "genericSymmetricTop" ? data.genericSymmetricTop : undefined;

  if (!(data.presetId === "genericSymmetricTop" && genericMeasureOnlyGradingActive(gtForGeneric))) {
    return null;
  }

  const { yScale: yScaleCal } = getBodyParams(REF_HEIGHT_CM, w, null);
  const bodyPxPerCmForSleeve = bodyHeight(yScaleCal) / REF_HEIGHT_CM;
  const graded = applyGenericMeasureOnlyGrading(data.pathDs, lm, data.size, gtForGeneric!, {
    bodyPxPerCmForSleeve,
  });
  const purpleDyDesign =
    !placementLockToModelRig ? genericLengthMeasureVerticalSpanPx(graded, gtForGeneric!) : null;
  const chosenPlace =
    purpleDyDesign != null
      ? buildTopPlacement(
          h,
          w,
          data.size,
          toTopLandmarks({ ...lm, garmentLengthOverride: purpleDyDesign }),
          shoulderOriginYForPlace,
          null,
          REF_HEIGHT_CM
        ).place
      : place;

  return {
    bodyPaths: graded.map((d) => tPath(d, chosenPlace)),
    vertexPlotsBodySpace: vertexPlotsPlaceOnly(graded, chosenPlace),
  };
}
