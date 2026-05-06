import type { CustomGarmentData, GarmentRearViewSpec } from "@/app/(main)/development/fitting/lib/types";
import {
  GARMENT_FLAT_CM_PRESET_ID,
  isGarmentFlatCmPresetId,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";

export type GarmentPreviewBodyView = "front" | "back";

/**
 * プレビュー／fit-svg: 前面は `bodyModelVariant: gridSvgBody`、背面は `gridSvgBodyBack`。
 * `rearViewGarment` が無い場合は背面でも前面アートをそのまま着せ、ボディだけ背面シルエットに切り替える。
 */
export function resolveGarmentDataForPreviewView(
  data: CustomGarmentData,
  view: GarmentPreviewBodyView
): CustomGarmentData {
  if (view === "front") return data;

  const { rearViewGarment: rear, ...base } = data;
  if (rear != null && isGarmentFlatCmPresetId(data.presetId)) {
    return mergeRearViewGarmentIntoBase(base, rear);
  }

  return { ...base, bodyModelVariant: "gridSvgBodyBack" };
}

function mergeRearViewGarmentIntoBase(
  base: Omit<CustomGarmentData, "rearViewGarment">,
  rear: GarmentRearViewSpec
): CustomGarmentData {
  const rearDefinesBehind = "behindBody" in rear;
  return {
    ...base,
    ...rear,
    presetId: GARMENT_FLAT_CM_PRESET_ID,
    bodyModelVariant: "gridSvgBodyBack",
    size: base.size,
    ...(!rearDefinesBehind ? { behindBody: undefined } : {}),
  };
}
