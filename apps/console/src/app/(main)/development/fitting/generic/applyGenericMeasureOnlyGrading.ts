/**
 * 汎用トップ（measure-only）: sleeveOnly は使わない。
 * - 着丈（胴）: `gradingBaselineLengthCm`（自動シード）を分母にだけ使い `scaleBodyToSpec`。
 *   紫の px→cm は分母に使わない（縮み過ぎ防止）。ベースライン未設定フレームは s=1 相当でスキップ。
 *   紫があるときは buildTopPlacement の garmentLengthOverride＝グレード後の紫 |ΔY| で実測と入力を揃える。
 * - 袖丈: 袖 path のみ scaleSleevePathToSpec（連結 # があるとき）。
 */

import type { CustomGarmentData, CustomLandmarks, ScalableGarmentSpec, SizeMeasure } from "../types";
import { scaleBodyToSpec, scaleSleevePathToSpec } from "../coatArmLogic";
import {
  cumulativePathPointOffsets,
  getPathPoints,
  pointAtGlobalVertexIndex,
  vertexRangeToCoveringPathRange,
} from "../pathUtils";
import { resolveGenericGradingBodyLengthCmReference } from "./resolveGenericScalableSpec";

function hasDistinctVertexPair(a: unknown, b: unknown): boolean {
  return (
    typeof a === "number" &&
    typeof b === "number" &&
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a !== b
  );
}

function globalToLocal(pathDs: string[], pathIdx: number, g: number): number | null {
  const off = cumulativePathPointOffsets(pathDs);
  const o0 = off[pathIdx]!;
  const o1 = off[pathIdx + 1]!;
  const gi = Math.trunc(g);
  if (gi < o0 || gi >= o1) return null;
  return gi - o0;
}

export function genericMeasureOnlyGradingActive(
  gt: CustomGarmentData["genericSymmetricTop"] | undefined
): boolean {
  if (!gt) return false;
  const len = hasDistinctVertexPair(gt.lengthMeasureVertexStart, gt.lengthMeasureVertexEnd);
  const slv = hasDistinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd);
  return len || slv;
}

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

  let sleevePathIdx: number | null = null;
  if (hasDistinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)) {
    const a = Math.trunc(gt.sleeveMeasureVertexStart!);
    const b = Math.trunc(gt.sleeveMeasureVertexEnd!);
    const gLo = Math.min(a, b);
    const gHi = Math.max(a, b);
    const cover = vertexRangeToCoveringPathRange(pathDs, gLo, gHi);
    if (cover && cover.from === cover.to) sleevePathIdx = cover.from;
  }

  let lengthMeasureGLo: number | null = null;
  let lengthMeasureGHi: number | null = null;
  if (hasDistinctVertexPair(gt.lengthMeasureVertexStart, gt.lengthMeasureVertexEnd)) {
    const a = Math.trunc(gt.lengthMeasureVertexStart!);
    const b = Math.trunc(gt.lengthMeasureVertexEnd!);
    const gLo = Math.min(a, b);
    const gHi = Math.max(a, b);
    const pa = pointAtGlobalVertexIndex(pathDs, gLo);
    const pb = pointAtGlobalVertexIndex(pathDs, gHi);
    if (pa && pb && Math.abs(pb[1] - pa[1]) > 1) {
      lengthMeasureGLo = gLo;
      lengthMeasureGHi = gHi;
    }
  }

  const hasLengthPurple = lengthMeasureGLo != null && lengthMeasureGHi != null;

  const defaultGarmentLengthPx = Math.max(lm.garmentLengthOverride ?? lm.hemY - lm.shoulderY, 1);

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
      snapCenterXToBody: false,
    };
    for (let i = 0; i < n; i++) {
      pathDs[i] = scaleBodyToSpec(pathDs[i]!, i, bodySpec, size.length, lm.shoulderY);
    }
  }

  /** 着丈紫があるときは袖の px/cm 分母を入力着丈に揃え、プレースの scaleY（紫|ΔY|）と整合させる */
  const bodyLengthCmForSleeveCal = hasLengthPurple
    ? size.length
    : resolveGenericGradingBodyLengthCmReference(pathDs, lm, gt, size);

  /** 袖の px/cm は、着丈紫と同じ design 縦スパンに揃える（肩〜裾全体だと入力着丈と二重換算でズレる） */
  let garmentLengthPxForSleeve = defaultGarmentLengthPx;
  if (hasLengthPurple) {
    const pa = pointAtGlobalVertexIndex(pathDs, lengthMeasureGLo!);
    const pb = pointAtGlobalVertexIndex(pathDs, lengthMeasureGHi!);
    if (pa && pb) {
      const dy = Math.abs(pb[1] - pa[1]);
      if (dy > 1) garmentLengthPxForSleeve = dy;
    }
  }

  if (
    sleevePathIdx != null &&
    hasDistinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)
  ) {
    const a = Math.trunc(gt.sleeveMeasureVertexStart!);
    const b = Math.trunc(gt.sleeveMeasureVertexEnd!);
    const gLo = Math.min(a, b);
    const gHi = Math.max(a, b);
    const li0 = globalToLocal(pathDs, sleevePathIdx, gLo);
    const li1 = globalToLocal(pathDs, sleevePathIdx, gHi);
    if (li0 != null && li1 != null) {
      const pts = getPathPoints(pathDs[sleevePathIdx]!);
      const pa = pts[li0]!;
      const pb = pts[li1]!;
      const topIs0 = pa[1] <= pb[1];
      const lengthStartIdx = topIs0 ? li0 : li1;
      const lengthEndIdx = topIs0 ? li1 : li0;
      const anchorIdx = lengthStartIdx;

      const sleeveSpec: ScalableGarmentSpec = {
        designShoulderY: lm.shoulderY,
        designHemY: lm.hemY,
        bodyLengthCm: bodyLengthCmForSleeveCal,
        bodyPathIndices: Array.from({ length: n }, (_, i) => i),
        sleeve: {
          anchorIdx,
          lengthStartIdx,
          lengthEndIdx,
          cuffIdx: lengthEndIdx,
        },
        defaultSleeveCm: size.sleeve,
        sleeveMeasureIndices: [gLo, gHi],
        snapCenterXToBody: false,
      };
      pathDs[sleevePathIdx] = scaleSleevePathToSpec(
        pathDs[sleevePathIdx]!,
        sleeveSpec,
        size.sleeve,
        garmentLengthPxForSleeve
      );
    }
  }

  return pathDs;
}
