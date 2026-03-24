import { inferLandmarksFromRigPaths } from "../lib/customLandmarkResolve";
import {
  splitGarmentPathsFromSvg,
  getLandmarksFromPaths,
  parseSvgPaths,
} from "../lib/customGarmentUtils";
import { REF_HEIGHT_CM } from "../lib/constants";
import { getGenericSymmetricTopPreset } from "../generic/getGenericSymmetricTopPreset";
import { inferLengthCmFromLandmarks } from "../lib/garmentBase";
import type { CustomGarmentData, GarmentType } from "../lib/types";

export type GenericSvgUploadPresetKey = "3" | "4" | "5";

/**
 * 汎用トップ用: SVG テキストを解析し `genericSymmetricTop` プリセットとして親へ渡す。
 */
export function applyGenericSymmetricTopFromSvgText(
  text: string,
  presetSizeKey: GenericSvgUploadPresetKey,
  ctx: {
    onGarmentChange: (g: GarmentType) => void;
    onCustomGarmentApply: (d: CustomGarmentData) => void;
    setUploadError: (msg: string | null) => void;
  }
): void {
  const { onGarmentChange, onCustomGarmentApply, setUploadError } = ctx;
  const rawPathDs = parseSvgPaths(text);
  const { garmentPathDs, rigPathDs } = splitGarmentPathsFromSvg(rawPathDs);
  if (garmentPathDs.length === 0) {
    setUploadError(`SVG 解析失敗: path がありません（raw: ${rawPathDs.length}）`);
    return;
  }
  setUploadError(null);
  const autoLm = getLandmarksFromPaths(garmentPathDs);
  const rigLm = rigPathDs.length >= 6 ? inferLandmarksFromRigPaths(rigPathDs) : null;
  const base = getGenericSymmetricTopPreset(presetSizeKey);
  const MODEL_RIG_H = 6431;
  const rigShoulderY = rigLm?.shoulderY ?? null;
  const effectiveHemY =
    autoLm?.hemY != null && rigShoulderY != null && autoLm.hemY > (rigLm?.hemY ?? 0)
      ? autoLm.hemY
      : (rigLm?.hemY ?? null);
  const effectiveLenPx =
    effectiveHemY != null && rigShoulderY != null ? effectiveHemY - rigShoulderY : null;
  const rigLenCm =
    effectiveLenPx != null && Number.isFinite(effectiveLenPx)
      ? (effectiveLenPx * REF_HEIGHT_CM) / MODEL_RIG_H
      : null;

  const mergedLandmarks =
    rigLm != null ? { ...rigLm, hemY: effectiveHemY ?? rigLm.hemY } : (autoLm ?? base.landmarks);
  const lengthFromLandmarks = inferLengthCmFromLandmarks(mergedLandmarks);
  const lengthCm =
    lengthFromLandmarks != null
      ? lengthFromLandmarks
      : rigLenCm != null && Number.isFinite(rigLenCm)
        ? rigLenCm
        : base.size.length;

  onGarmentChange("custom");
  onCustomGarmentApply({
    ...base,
    pathDs: garmentPathDs,
    debugRigPathDs: rigPathDs,
    landmarks: mergedLandmarks,
    size: {
      shoulder: base.size.shoulder,
      chest: base.size.chest,
      length: lengthCm,
      sleeve: base.size.sleeve,
    },
    presetId: "genericSymmetricTop",
    genericSymmetricTop: {
      applied: false,
      sizePresets: getGenericSymmetricTopPreset(presetSizeKey).genericSymmetricTop?.sizePresets,
      // アップロードでは 4 シームが無いが measure-only 胴グレードに baseline が要る（シード effect が four で弾かれていた）
      gradingBaselineLengthCm: lengthCm,
      gradingBaselineSleeveCm: base.size.sleeve,
    },
  });
}
