import type { CustomGarmentData, CustomLandmarks } from "../lib/types";
import { pickSleeveLowerJunctionLocalIndex } from "../lib/scalableGarmentArmLogic";
import {
  cumulativePathPointOffsets,
  getPathPoints,
  vertexRangeToCoveringPathRange,
} from "../lib/pathUtils";
import {
  isLikelyVerticalSymmetryGuidePath,
  isNearlyVerticalThinPath,
} from "./resolveEffectiveSleeveGradingGeometry";
import { hasDistinctVertexPair } from "./genericMeasureOnlyShared";

/**
 * 下袖区間がセンターガイド path 上だけのとき、実袖 path の末尾 2 頂点（袖口寄り）へ寄せる。
 * これが無いと実袖とガイドの path index がズレて下袖追従・下袖ポリライン溶接が効かない。
 */
export function resolveLowerSleeveGlobalsOntoSleevePath(
  pathDs: string[],
  lm: CustomLandmarks,
  sleevePathIdx: number,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): { lowGlo: number; lowGhi: number } | null {
  if (!hasDistinctVertexPair(gt.lowerSleeveVertexStart, gt.lowerSleeveVertexEnd)) return null;
  const la = Math.trunc(gt.lowerSleeveVertexStart!);
  const lb = Math.trunc(gt.lowerSleeveVertexEnd!);
  const rawLo = Math.min(la, lb);
  const rawHi = Math.max(la, lb);
  const cover = vertexRangeToCoveringPathRange(pathDs, rawLo, rawHi);
  if (!cover || cover.from !== cover.to) return null;
  if (cover.from === sleevePathIdx) {
    return { lowGlo: rawLo, lowGhi: rawHi };
  }
  const lowPathD = pathDs[cover.from]!;
  if (!isLikelyVerticalSymmetryGuidePath(lowPathD, lm, pathDs) && !isNearlyVerticalThinPath(lowPathD)) {
    return null;
  }
  const offArr = cumulativePathPointOffsets(pathDs);
  const o0 = offArr[sleevePathIdx]!;
  const o1 = offArr[sleevePathIdx + 1]!;
  if (o1 - o0 < 2) return null;
  return { lowGlo: o1 - 2, lowGhi: o1 - 1 };
}

/** 下袖追従: 採寸と同じ path・有効な接続 index のときだけ非 null */
export function tryLowerSleeveFollowArgs(
  pathDs: string[],
  lm: CustomLandmarks,
  sleevePathIdx: number,
  lengthStartIdx: number,
  lengthEndIdx: number,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): {
  off: number;
  lengthIdxLo: number;
  lengthIdxHi: number;
  lowGlo: number;
  lowGhi: number;
  junction: number;
} | null {
  const resolved = resolveLowerSleeveGlobalsOntoSleevePath(pathDs, lm, sleevePathIdx, gt);
  if (!resolved) return null;
  const { lowGlo, lowGhi } = resolved;
  const lengthIdxLo = Math.min(lengthStartIdx, lengthEndIdx);
  const lengthIdxHi = Math.max(lengthStartIdx, lengthEndIdx);
  const off = cumulativePathPointOffsets(pathDs)[sleevePathIdx]!;
  const junction = pickSleeveLowerJunctionLocalIndex(off, lengthIdxLo, lengthIdxHi, lowGlo, lowGhi);
  if (junction == null) return null;
  return { off, lengthIdxLo, lengthIdxHi, lowGlo, lowGhi, junction };
}

/**
 * 溶接の junction lock 用グローバル頂点 #。`preferredLocal` が有効ならそれ（下袖追従の接点）、無効なら採寸帯のカフ側端 `lengthIdxHi` をクランプして使う。
 */
export function resolveSeamJunctionGlobalForSleeveWeld(
  pathDs: string[],
  sleevePathIdx: number,
  lengthStartIdx: number,
  lengthEndIdx: number,
  preferredLocalJunction: number | null
): number | null {
  const d = pathDs[sleevePathIdx];
  if (!d) return null;
  const pts = getPathPoints(d);
  const n = pts.length;
  if (n < 1) return null;
  const offArr = cumulativePathPointOffsets(pathDs);
  const off = offArr[sleevePathIdx];
  if (off == null) return null;
  const lengthIdxHi = Math.max(lengthStartIdx, lengthEndIdx);
  let j =
    preferredLocalJunction != null &&
    Number.isFinite(preferredLocalJunction) &&
    preferredLocalJunction >= 0 &&
    preferredLocalJunction < n
      ? Math.trunc(preferredLocalJunction)
      : lengthIdxHi;
  j = Math.max(0, Math.min(n - 1, j));
  return off + j;
}
