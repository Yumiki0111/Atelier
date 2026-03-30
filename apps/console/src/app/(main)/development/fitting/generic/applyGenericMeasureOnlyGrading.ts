/**
 * 汎用トップ（measure-only）: sleeveOnly は使わない。
 * - 着丈（胴）: `gradingBaselineLengthCm`（自動シード）を分母にだけ使い `scaleBodyToSpec`。
 *   紫の px→cm は分母に使わない（縮み過ぎ防止）。ベースライン未設定フレームは s=1 相当でスキップ。
 *   紫があるときは buildTopPlacement の garmentLengthOverride＝グレード後の紫 |ΔY| で実測と入力を揃える。
 * - 袖丈: 袖 path のみ scaleSleevePathToSpec（連結 # があるとき）。
 */

import type { CustomGarmentData, CustomLandmarks, ScalableGarmentSpec, SizeMeasure } from "../lib/types";
import { scaleBodyToSpec, scaleSleevePathToSpec } from "../lib/scalableGarmentArmLogic";
import {
  cumulativePathPointOffsets,
  getPathPoints,
  pointAtGlobalVertexIndex,
  vertexRangeToCoveringPathRange,
} from "../lib/pathUtils";
import { resolveGenericGradingBodyLengthCmReference } from "./resolveGenericScalableSpec";
import { polylineVerticalAbsDySumPx } from "@/lib/fitting-compute/fittingCanvasPolylineMeasure";

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

export type GenericSleeveMeasureVertexOverride = {
  start: number;
  end: number;
  chain?: number[];
};

function sleeveVerticalPxFromGlobalVertices(
  pathDs: string[],
  start: number,
  end: number,
  chain?: number[],
  customPoints?: [number, number][]
): number {
  const getPt = (gi: number): [number, number] | null => {
    const g = Math.trunc(gi);
    if (customPoints && g >= 0 && g < customPoints.length) {
      const p = customPoints[g];
      if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) return [p[0], p[1]];
    }
    return pointAtGlobalVertexIndex(pathDs, g);
  };
  if (chain && chain.length >= 2) {
    const pts = chain.map((g) => getPt(g)).filter((p): p is [number, number] => p != null);
    if (pts.length >= 2) return polylineVerticalAbsDySumPx(pts);
  }
  const a = getPt(start);
  const b = getPt(end);
  if (!a || !b) return 0;
  return Math.abs(b[1] - a[1]);
}

export function resolveGenericSleevePxPerCmForMeasure(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): number {
  const hasLengthPurple = hasDistinctVertexPair(gt.lengthMeasureVertexStart, gt.lengthMeasureVertexEnd);
  const bodyLengthCmForSleeveCal = hasLengthPurple
    ? size.length
    : resolveGenericGradingBodyLengthCmReference(pathDs, lm, gt, size);
  let garmentLengthPxForSleeve = Math.max(lm.garmentLengthOverride ?? lm.hemY - lm.shoulderY, 1);
  if (hasLengthPurple) {
    const pa = pointAtGlobalVertexIndex(pathDs, Math.trunc(gt.lengthMeasureVertexStart!));
    const pb = pointAtGlobalVertexIndex(pathDs, Math.trunc(gt.lengthMeasureVertexEnd!));
    if (pa && pb) {
      const dy = Math.abs(pb[1] - pa[1]);
      if (dy > 1) garmentLengthPxForSleeve = dy;
    }
  }
  const pxPerCm = garmentLengthPxForSleeve / Math.max(bodyLengthCmForSleeveCal, 1e-6);
  return Number.isFinite(pxPerCm) && pxPerCm > 0 ? pxPerCm : 1;
}

export function measureGenericTopSleeveCmFromPath(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  vertexOverride?: GenericSleeveMeasureVertexOverride,
  customPoints?: [number, number][]
): { px: number; cm: number } | null {
  const s = vertexOverride?.start ?? gt.sleeveMeasureVertexStart;
  const e = vertexOverride?.end ?? gt.sleeveMeasureVertexEnd;
  const chain = vertexOverride?.chain ?? gt.sleeveMeasureVertexChain;
  if (!hasDistinctVertexPair(s, e)) return null;
  const gLo = Math.min(Math.trunc(s!), Math.trunc(e!));
  const gHi = Math.max(Math.trunc(s!), Math.trunc(e!));
  const px = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, chain, customPoints);
  if (!(px > 0)) return null;
  const pxPerCm = resolveGenericSleevePxPerCmForMeasure(pathDs, lm, size, gt);
  return { px, cm: px / pxPerCm };
}

export function measureOriginalSleeveCmFromDesignPaths(
  pathDs: string[],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  vertexOverride?: GenericSleeveMeasureVertexOverride
): { px: number; cm: number } | null {
  const s = vertexOverride?.start ?? gt.sleeveMeasureVertexStart;
  const e = vertexOverride?.end ?? gt.sleeveMeasureVertexEnd;
  const chain = vertexOverride?.chain ?? gt.sleeveMeasureVertexChain;
  if (!hasDistinctVertexPair(s, e)) return null;
  const gLo = Math.min(Math.trunc(s!), Math.trunc(e!));
  const gHi = Math.max(Math.trunc(s!), Math.trunc(e!));
  const px = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, chain);
  if (!(px > 0)) return null;
  const baselineSleeve = gt.gradingBaselineSleeveCm;
  const cm =
    baselineSleeve != null && Number.isFinite(baselineSleeve) && baselineSleeve > 0
      ? baselineSleeve
      : px;
  return { px, cm };
}

/** 旧ロジック互換: 後段の袖頂点スナップは行わず、そのまま返す。 */
export function applyGenericSleeveScaleAfterLengthMesh(
  pathDsIn: string[],
  customPointsIn: [number, number][],
  _lm: CustomLandmarks,
  _size: SizeMeasure,
  _gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): { pathDs: string[]; customPoints: [number, number][] } {
  return {
    pathDs: [...pathDsIn],
    customPoints: customPointsIn.map((p) => [p[0], p[1]] as [number, number]),
  };
}
