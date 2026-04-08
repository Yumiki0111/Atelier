/**
 * 汎用トップ（measure-only）: sleeveOnly は使わない。
 * - 着丈（胴）: `gradingBaselineLengthCm`（自動シード）を分母にだけ使い `scaleBodyToSpec`。
 *   紫の px→cm は分母に使わない（縮み過ぎ防止）。ベースライン未設定フレームは s=1 相当でスキップ。
 *   紫があるとき、非リグ（`placementLockToModelRig === false`）では `buildTopPlacement` の
 *   `garmentLengthOverride`＝グレード後の紫 |ΔY| でプレースし実測と入力を揃える。
 *   リグロック時はモデルと服を同じ線形写像に固定するため `scaleModelViewToBodyTemplate` のみとし、
 *   オーバーレイの「縦 px÷bodyPxPerCm」は身長スライダー換算であり入力着丈 cm と一致しないことがある。
 * - 袖丈: **ここでは変形しない**。設計座標で袖をスケールしたあと、リグワープ・着丈メッシュ後に
 *   `applyGenericSleeveScaleAfterLengthMesh` で再度スケール＋下袖スナップすると二重になり、折れ・跳ねの原因になる。
 *   袖は同関数（キャンバス袖パイプライン）に一本化する。
 *
 * 実装は `genericMeasureOnly*.ts` / `genericSleeveMeasurePublic.ts` / `genericMeasureOnlyLowerSleeveSnap.ts` に分割。
 */

import type { CustomGarmentData, CustomLandmarks, ScalableGarmentSpec, SizeMeasure } from "../lib/types";
import { scaleBodyToSpec } from "../lib/scalableGarmentArmLogic";
import {
  collectSleevePathIndicesForGrading,
  snapVerticalConstructionPathsToLayoutCenterX,
} from "./resolveEffectiveSleeveGradingGeometry";
import { hasDistinctVertexPair } from "./genericMeasureOnlyShared";

/**
 * @param pathDsIn 元の design path（非破壊でコピーして処理）
 * @param lm buildCustomTransformedPaths と同じ effective landmarks（裾補正後）
 */
export function applyGenericMeasureOnlyGrading(
  pathDsIn: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  _opts?: { bodyPxPerCmForSleeve?: number }
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
    const excludedSleevePaths = collectSleevePathIndicesForGrading(pathDs, lm, gt);
    const bodyPathIndices = Array.from({ length: n }, (_, i) => i).filter((i) => !excludedSleevePaths.has(i));
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
  measureGenericTopSleeveCmFromPath,
  measureOriginalSleeveCmFromDesignPaths,
  resolveGenericSleevePxPerCmForMeasure,
  sleeveVerticalPxFromGlobalVertices,
} from "./genericSleeveMeasurePublic";
