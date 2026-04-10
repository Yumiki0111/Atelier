/**
 * 汎用トップ（measure-only）: sleeveOnly は使わない。
 * - 着丈: `gradingBaselineLengthCm` を分母に `scaleBodyToSpec`。**袖 path も含め全 path** を同一ルールで縦スケールし、
 *   胴–袖の二重頂点が着丈だけでズレないようにする（袖丈 cm は後段パイプラインに一本化）。
 *   紫の px→cm は分母に使わない。ベースライン未設定フレームは s=1 相当でスキップ。
 *   紫があるとき、非リグでは `buildTopPlacement` の `garmentLengthOverride`＝グレード後の紫 |ΔY| でプレース。
 *   リグロック時は `scaleModelViewToBodyTemplate` のみ。
 * - 袖丈 cm: **ここでは専用の弧長補正はしない**。`applyGenericSleeveScaleAfterLengthMesh` に一本化。
 *
 * 実装は `genericMeasureOnly*.ts` / `genericSleeveMeasurePublic.ts` 等に分割。
 */

import type { CustomGarmentData, CustomLandmarks, ScalableGarmentSpec, SizeMeasure } from "../lib/types";
import { scaleBodyToSpec } from "../lib/scalableGarmentArmLogic";
import { snapVerticalConstructionPathsToLayoutCenterX } from "./resolveEffectiveSleeveGradingGeometry";
import { hasDistinctVertexPair } from "./genericMeasureOnlyShared";

/**
 * @param pathDsIn 元の design path（非破壊でコピーして処理）
 * @param lm buildCustomTransformedPaths と同じ effective landmarks（裾補正後）
 */
export function applyGenericMeasureOnlyGrading(
  pathDsIn: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): string[] {
  const pathDs = [...pathDsIn];
  const n = pathDs.length;
  if (n === 0) return pathDs;

  const lengthGradingRefCm =
    gt.gradingBaselineLengthCm != null &&
    Number.isFinite(gt.gradingBaselineLengthCm) &&
    gt.gradingBaselineLengthCm > 0
      ? gt.gradingBaselineLengthCm
      : null;

  if (
    lengthGradingRefCm != null &&
    Number.isFinite(size.length) &&
    size.length > 0
  ) {
    const bodyPathIndices = Array.from({ length: n }, (_, i) => i);
    const bodySpec: ScalableGarmentSpec = {
      designShoulderY: lm.shoulderY,
      designHemY: lm.hemY,
      bodyLengthCm: lengthGradingRefCm,
      bodyPathIndices,
      sleeve: { anchorIdx: 0, lengthStartIdx: 0, lengthEndIdx: 1, cuffIdx: 1 },
      defaultSleeveCm: size.sleeve,
      sleeveMeasureIndices: [0, 0],
    };
    for (let i = 0; i < n; i++) {
      pathDs[i] = scaleBodyToSpec(pathDs[i]!, i, bodySpec, size.length, lm.shoulderY);
    }
  }

  snapVerticalConstructionPathsToLayoutCenterX(pathDs, lm);
  return pathDs;
}

export function genericMeasureOnlyGradingActive(
  gt: CustomGarmentData["genericSymmetricTop"] | undefined
): boolean {
  if (!gt) return false;
  const len = hasDistinctVertexPair(gt.lengthMeasureVertexStart, gt.lengthMeasureVertexEnd);
  const slv = hasDistinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd);
  const slvM = hasDistinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd);
  return len || slv || slvM;
}

/** 互換用: キャンバス後段で袖スナップ実行候補になりうるか（プライマリ/ミラーどちらかの採寸頂点が有効） */
export function genericSymmetricTopCanvasSleeveSnapEligible(
  gt: CustomGarmentData["genericSymmetricTop"] | undefined
): boolean {
  if (!gt) return false;
  return (
    hasDistinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd) ||
    hasDistinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd)
  );
}

export type { GenericSleeveMeasureVertexOverride } from "./genericSleeveMeasurePublic";
export {
  applyGenericSleeveScaleAfterLengthMesh,
  GenericSleevePipelineInvariantError,
  measureGenericTopSleeveCmFromPath,
  measureOriginalSleeveCmFromDesignPaths,
  resolveGenericSleevePxPerCmForMeasure,
  sleeveVerticalPxFromGlobalVertices,
} from "./genericSleeveMeasurePublic";
