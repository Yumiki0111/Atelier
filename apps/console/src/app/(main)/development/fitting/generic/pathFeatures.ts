import { getPathPoints } from "../lib/pathUtils";

export interface PathBBoxFeatures {
  pathIndex: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export function pathBBoxFeatures(pathDs: string[], pathIndex: number): PathBBoxFeatures | null {
  const d = pathDs[pathIndex];
  if (!d) return null;
  const pts = getPathPoints(d);
  if (pts.length === 0) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    pathIndex,
    minX,
    maxX,
    minY,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function allPathFeatures(pathDs: string[]): PathBBoxFeatures[] {
  const out: PathBBoxFeatures[] = [];
  for (let i = 0; i < pathDs.length; i++) {
    const f = pathBBoxFeatures(pathDs, i);
    if (f) out.push(f);
  }
  return out;
}

/** path 上で (tx,ty) に最も近い点 */
export function nearestPointOnPath(pathD: string, tx: number, ty: number): [number, number] | null {
  const pts = getPathPoints(pathD);
  if (pts.length === 0) return null;
  let best = pts[0];
  let bestD = Infinity;
  for (const p of pts) {
    const dd = (p[0] - tx) ** 2 + (p[1] - ty) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = p;
    }
  }
  return best;
}
