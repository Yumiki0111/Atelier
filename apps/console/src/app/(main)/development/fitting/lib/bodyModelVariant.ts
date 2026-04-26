import { BPATHS as BPATHS_MODEL_DEFAULT } from "./modelData";
import { BPATHS_RIG_LINES as BPATHS_RIG_LINES_DEFAULT } from "./modelRigData";
import {
  BPATHS_VERIFICATION_BODY,
  BPATHS_VERIFICATION_RIG_LINES,
  VERIFICATION_BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE,
  VERIFICATION_BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES,
  VERIFICATION_BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE,
} from "./modelDataVerification";
import {
  BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE,
  BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES,
  BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE,
} from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import { REF_HEIGHT_CM } from "./constants";

export type BodyModelVariant = "default" | "lineArtVerification";

/** 胴くびれ帯・参照弦の連結 #（プロット・体重ワープで共有） */
export type BodyIndentWaistGlobalIndices = {
  left: readonly [number, number];
  right: readonly [number, number];
  referenceChord: readonly [number, number];
};

export function getBodyIndentWaistGlobalIndices(variant: BodyModelVariant | undefined): BodyIndentWaistGlobalIndices {
  if (variant === "lineArtVerification") {
    return {
      left: VERIFICATION_BODY_INDENT_WAIST_LEFT_GLOBAL_RANGE,
      right: VERIFICATION_BODY_INDENT_WAIST_RIGHT_GLOBAL_RANGE,
      referenceChord: VERIFICATION_BODY_INDENT_WAIST_REFERENCE_CHORD_GLOBAL_INDICES,
    };
  }
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

/**
 * リグ path1/2 の身長連動「鉛直寄り」に渡す身長（cm）。
 * 線画検証は SVG 腕角を保つため常に基準身長（追加回転なし）。既定ボディは実身長。
 */
export function getRigArmTiltHeightCm(variant: BodyModelVariant | undefined, heightCm: number): number {
  return variant === "lineArtVerification" ? REF_HEIGHT_CM : heightCm;
}

export function getBodyTemplatePaths(variant: BodyModelVariant | undefined): string[] {
  return variant === "lineArtVerification" ? BPATHS_VERIFICATION_BODY : BPATHS_MODEL_DEFAULT;
}

export function getBodyRigLinePathsTemplate(variant: BodyModelVariant | undefined): string[] {
  return variant === "lineArtVerification" ? BPATHS_VERIFICATION_RIG_LINES : BPATHS_RIG_LINES_DEFAULT;
}
