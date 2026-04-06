import { getPathPoints } from "@/app/(main)/development/fitting/lib/pathUtils";

/** path 群のバウンディングボックスの水平中心（頂点平均より左右対称に近い） */
export function bboxCenterXFromPathDs(pathDs: string[]): number | null {
  const pts = pathDs.flatMap((d) => getPathPoints(d));
  if (pts.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  return (minX + maxX) / 2;
}

export function bboxCenterXFromPoints(pts: [number, number][]): number | null {
  if (pts.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  return (minX + maxX) / 2;
}
