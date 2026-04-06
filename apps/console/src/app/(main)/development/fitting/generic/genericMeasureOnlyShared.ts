import type { CustomGarmentData } from "../lib/types";
import { cumulativePathPointOffsets, vertexRangeToCoveringPathRange } from "../lib/pathUtils";

export function hasDistinctVertexPair(a: unknown, b: unknown): boolean {
  return (
    typeof a === "number" &&
    typeof b === "number" &&
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a !== b
  );
}

export function globalToLocal(pathDs: string[], pathIdx: number, g: number): number | null {
  const off = cumulativePathPointOffsets(pathDs);
  const o0 = off[pathIdx]!;
  const o1 = off[pathIdx + 1]!;
  const gi = Math.trunc(g);
  if (gi < o0 || gi >= o1) return null;
  return gi - o0;
}

/** ミラー袖 path 用: `lowerSleeveMirrorVertex*` がその path 上なら下袖区間として解釈する gt */
export function gtWithMirrorLowerIfApplicable(
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  pathDs: string[],
  sleevePathIdx: number
): NonNullable<CustomGarmentData["genericSymmetricTop"]> {
  if (!hasDistinctVertexPair(gt.lowerSleeveMirrorVertexStart, gt.lowerSleeveMirrorVertexEnd)) {
    return gt;
  }
  const a = Math.trunc(gt.lowerSleeveMirrorVertexStart!);
  const b = Math.trunc(gt.lowerSleeveMirrorVertexEnd!);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const cover = vertexRangeToCoveringPathRange(pathDs, lo, hi);
  if (!cover || cover.from !== cover.to || cover.from !== sleevePathIdx) {
    return gt;
  }
  return { ...gt, lowerSleeveVertexStart: lo, lowerSleeveVertexEnd: hi };
}
