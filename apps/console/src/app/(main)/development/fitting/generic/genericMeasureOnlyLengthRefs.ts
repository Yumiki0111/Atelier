import type { CustomGarmentData, CustomLandmarks, SizeMeasure } from "../lib/types";
import { pointAtGlobalVertexIndex } from "../lib/pathUtils";
import { resolveGenericGradingBodyLengthCmReference } from "./resolveGenericScalableSpec";
import { hasDistinctVertexPair } from "./genericMeasureOnlyShared";

/** 着丈紫の端点。縦 |ΔY|>1px のときのみ有効（オーバーレイ・袖 px/cm と同じ判定）。 */
export function genericTopLengthPurpleEndpoints(
  pathDs: string[],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): { gLo: number; gHi: number } | null {
  if (!hasDistinctVertexPair(gt.lengthMeasureVertexStart, gt.lengthMeasureVertexEnd)) return null;
  const a = Math.trunc(gt.lengthMeasureVertexStart!);
  const b = Math.trunc(gt.lengthMeasureVertexEnd!);
  const gLo = Math.min(a, b);
  const gHi = Math.max(a, b);
  const pa = pointAtGlobalVertexIndex(pathDs, gLo);
  const pb = pointAtGlobalVertexIndex(pathDs, gHi);
  if (!pa || !pb || Math.abs(pb[1] - pa[1]) <= 1) return null;
  return { gLo, gHi };
}

/** 袖の px/cm 分母。紫着丈があるときは `size.length×bodyPxPerCm`（着丈 Y メッシュ目標と同じ縦 px）を優先し、紫の実測 |ΔY| との混在を避ける。 */
export function resolveGarmentLengthPxForSleeveMeasure(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  bodyPxPerCm?: number | null
): number {
  const defaultGarmentLengthPx = Math.max(lm.garmentLengthOverride ?? lm.hemY - lm.shoulderY, 1);
  const purple = genericTopLengthPurpleEndpoints(pathDs, gt);
  const hasLengthPurple = purple != null;

  if (
    hasLengthPurple &&
    bodyPxPerCm != null &&
    Number.isFinite(bodyPxPerCm) &&
    bodyPxPerCm > 0 &&
    Number.isFinite(size.length) &&
    size.length > 0
  ) {
    return size.length * bodyPxPerCm;
  }
  if (purple) {
    const pa = pointAtGlobalVertexIndex(pathDs, purple.gLo);
    const pb = pointAtGlobalVertexIndex(pathDs, purple.gHi);
    if (pa && pb) {
      const dy = Math.abs(pb[1] - pa[1]);
      if (dy > 1) return dy;
    }
  }
  return defaultGarmentLengthPx;
}

export function bodyLengthCmForGenericSleeveCal(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): number {
  const hasPurpleLength = genericTopLengthPurpleEndpoints(pathDs, gt) != null;
  const hasValidLengthInput = Number.isFinite(size.length) && size.length > 0;
  // 紫だけ確定・着丈 cm 未入力のとき `size.length` は 0 または未設定になり得る。分母 0 で px/cm が破綻し袖が折れるため、
  // その場合は gradingBaseline / 紫 px→cm / 裾推定などへフォールバックする。
  if (hasPurpleLength && hasValidLengthInput) {
    return size.length;
  }
  return resolveGenericGradingBodyLengthCmReference(pathDs, lm, gt, size);
}
