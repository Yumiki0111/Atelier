import { inferLandmarksFromRigPaths } from "../lib/customLandmarkResolve";
import {
  splitGarmentPathsFromSvgParsed,
  getLandmarksFromPaths,
  parseSvgPathsDetailed,
  expandSvgParsedPathsBySubpaths,
} from "../lib/customGarmentUtils";
import { getGenericSymmetricTopPreset } from "../generic/getGenericSymmetricTopPreset";
import { GENERIC_EMPTY_SIZE } from "../generic/genericDevDefaults";
import type { CustomGarmentData, GarmentType } from "../lib/types";

/**
 * 汎用トップ用: SVG テキストを解析し `genericSymmetricTop` プリセットとして親へ渡す。
 * 採寸は自動推定しない（`GENERIC_EMPTY_SIZE`）。パネルで手入力する。
 */
export function applyGenericSymmetricTopFromSvgText(
  text: string,
  ctx: {
    onGarmentChange: (g: GarmentType) => void;
    onCustomGarmentApply: (d: CustomGarmentData) => void;
    setUploadError: (msg: string | null) => void;
  }
): void {
  const { onGarmentChange, onCustomGarmentApply, setUploadError } = ctx;
  const rawPaths = parseSvgPathsDetailed(text);
  const parsed = expandSvgParsedPathsBySubpaths(rawPaths);
  const { garmentPaths, rigPaths } = splitGarmentPathsFromSvgParsed(parsed);
  if (process.env.NODE_ENV === "development") {
    console.log("[fitting][svg-upload] subpath expand", {
      pathTags: rawPaths.length,
      afterExpand: parsed.length,
      extraSubpaths: parsed.length - rawPaths.length,
      garmentPaths: garmentPaths.length,
      rigPaths: rigPaths.length,
    });
  }
  const garmentPathDs = garmentPaths.map((p) => p.d);
  const pathStrokeDasharrays = garmentPaths.map((p) => p.strokeDasharray);
  const pathStrokeWidths = garmentPaths.map((p) => p.strokeWidth);
  const pathStrokes = garmentPaths.map((p) => p.stroke);
  const rigPathDs = rigPaths.map((p) => p.d);
  if (garmentPathDs.length === 0) {
    setUploadError(`SVG 解析失敗: path がありません（raw: ${parsed.length}）`);
    return;
  }
  setUploadError(null);
  const autoLm = getLandmarksFromPaths(garmentPathDs);
  const rigLm = rigPathDs.length >= 6 ? inferLandmarksFromRigPaths(rigPathDs) : null;
  const base = getGenericSymmetricTopPreset();
  const rigShoulderY = rigLm?.shoulderY ?? null;
  const effectiveHemY =
    autoLm?.hemY != null && rigShoulderY != null && autoLm.hemY > (rigLm?.hemY ?? 0)
      ? autoLm.hemY
      : (rigLm?.hemY ?? null);

  const mergedLandmarks =
    rigLm != null ? { ...rigLm, hemY: effectiveHemY ?? rigLm.hemY } : (autoLm ?? base.landmarks);

  onGarmentChange("custom");
  onCustomGarmentApply({
    ...base,
    pathDs: garmentPathDs,
    pathStrokeDasharrays,
    pathStrokeWidths,
    pathStrokes,
    debugRigPathDs: rigPathDs,
    landmarks: mergedLandmarks,
    size: { ...GENERIC_EMPTY_SIZE },
    presetId: "genericSymmetricTop",
    genericSymmetricTop: {
      ...base.genericSymmetricTop,
      applied: false,
      sizePresets: [],
    },
  });
}
