import { GRID_RIG_NINE_PATH_DS_SVG } from "./rig/gridSvgRigData";
import {
  BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE,
  BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES,
  BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE,
} from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import {
  BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_TEMPLATE,
  BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_TEMPLATE,
  BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_NATIVE,
  BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_NATIVE,
} from "../garmentFlatCmGrading/garmentFlatCmGradingGridBodyTemplate.generated";

export type BodyModelVariant = "gridSvgBody" | "gridSvgBodyBack";

/** garment_spec / API。廃止した `default`・`lineArtVerification`・未知値は格子前面扱い。 */
export function parseStoredBodyModelVariant(raw: unknown): BodyModelVariant | undefined {
  if (raw === "gridSvgBody" || raw === "gridSvgBodyBack") return raw;
  return undefined;
}

/** 胴くびれ帯・参照弦の連結 #（プロット・体重ワープで共有） */
export type BodyIndentWaistGlobalIndices = {
  left: readonly [number, number];
  right: readonly [number, number];
  referenceChord: readonly [number, number];
};

export function getBodyIndentWaistGlobalIndices(_variant: BodyModelVariant | undefined): BodyIndentWaistGlobalIndices {
  return {
    left: BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE,
    right: BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE,
    referenceChord: BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES,
  };
}

/** `DEBUG_FITTING_BODY_VERTICES` 用（帯端＋参照弦） */
export function getBodyIndentWaistDebugVertexIndices(variant: BodyModelVariant | undefined): readonly number[] {
  const w = getBodyIndentWaistGlobalIndices(variant);
  return [w.left[0], w.referenceChord[0], w.left[1], w.right[0], w.referenceChord[1], w.right[1]];
}

export function getBodyTemplatePaths(
  variant: BodyModelVariant | undefined,
  opts?: { flatCmNativeSvgCoords?: boolean }
): string[] {
  if (opts?.flatCmNativeSvgCoords) {
    if (variant === "gridSvgBodyBack") return BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_NATIVE;
    return BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_NATIVE;
  }
  if (variant === "gridSvgBodyBack") return BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_TEMPLATE;
  return BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_TEMPLATE;
}

/** 格子リグ 9 本（389×viewBox SVG 座標。服 `#rig` と文字列一致可能） */
export function getBodyRigLinePathsTemplate(_variant: BodyModelVariant | undefined): string[] {
  return GRID_RIG_NINE_PATH_DS_SVG;
}
