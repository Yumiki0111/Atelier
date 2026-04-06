import { getPathPoints } from "./extractPoints";

export function cumulativePathPointOffsets(pathDs: string[]): number[] {
  const off: number[] = [0];
  let acc = 0;
  for (const d of pathDs) {
    acc += getPathPoints(d).length;
    off.push(acc);
  }
  return off;
}

export function totalPathVertices(pathDs: string[]): number {
  const off = cumulativePathPointOffsets(pathDs);
  return off[off.length - 1] ?? 0;
}

/** 連結 # が属する path インデックス（0 起算）。範囲外は null */
export function pathIndexForGlobalVertex(pathDs: string[], globalIndex: number): number | null {
  const gi = Math.trunc(globalIndex);
  const off = cumulativePathPointOffsets(pathDs);
  const total = off[off.length - 1] ?? 0;
  if (gi < 0 || gi >= total || pathDs.length === 0) return null;
  for (let i = 0; i < pathDs.length; i++) {
    const o0 = off[i]!;
    const o1 = off[i + 1]!;
    if (gi >= o0 && gi < o1) return i;
  }
  return null;
}

/** 連結頂点インデックス（全 path の頂点を出現順に結合、0 起算）に対応する座標。範囲外は null */
export function pointAtGlobalVertexIndex(pathDs: string[], globalIndex: number): [number, number] | null {
  const gi = Math.trunc(globalIndex);
  const off = cumulativePathPointOffsets(pathDs);
  const total = off[off.length - 1] ?? 0;
  if (gi < 0 || gi >= total || pathDs.length === 0) return null;
  for (let i = 0; i < pathDs.length; i++) {
    const o0 = off[i]!;
    const o1 = off[i + 1]!;
    if (gi >= o0 && gi < o1) {
      const pts = getPathPoints(pathDs[i]!);
      const p = pts[gi - o0];
      return p ?? null;
    }
  }
  return null;
}

/** pathDs[pathIdx] の頂点が連結列で占める [開始, 終了]（包含）。点が無ければ null */
export function globalVertexBoundsForPath(pathDs: string[], pathIdx: number): [number, number] | null {
  const off = cumulativePathPointOffsets(pathDs);
  if (pathIdx < 0 || pathIdx >= pathDs.length) return null;
  const start = off[pathIdx]!;
  const end = off[pathIdx + 1]! - 1;
  if (end < start) return null;
  return [start, end];
}

/**
 * 連結頂点インデックスの包含範囲に含まれる座標を、出現順に列挙。
 */
export function collectPtsGlobalVertexRange(pathDs: string[], g0: number, g1: number): [number, number][] {
  const off = cumulativePathPointOffsets(pathDs);
  const total = off[off.length - 1] ?? 0;
  if (total === 0) return [];
  let a = Math.trunc(g0);
  let b = Math.trunc(g1);
  if (a > b) [a, b] = [b, a];
  if (a < 0 || b >= total) return [];
  const out: [number, number][] = [];
  for (let g = a; g <= b; g++) {
    for (let i = 0; i < pathDs.length; i++) {
      const o0 = off[i]!;
      const o1 = off[i + 1]!;
      if (g >= o0 && g < o1) {
        const local = g - o0;
        const pts = getPathPoints(pathDs[i]!);
        const p = pts[local];
        if (p) out.push(p);
        break;
      }
    }
  }
  return out;
}

/**
 * 連結頂点範囲が触れる path インデックスの包含範囲（胴体/袖の path 集合判定用）。
 */
export function vertexRangeToCoveringPathRange(pathDs: string[], g0: number, g1: number): { from: number; to: number } | null {
  const off = cumulativePathPointOffsets(pathDs);
  const total = off[off.length - 1] ?? 0;
  if (total === 0 || pathDs.length === 0) return null;
  let a = Math.trunc(g0);
  let b = Math.trunc(g1);
  if (a > b) [a, b] = [b, a];
  if (a < 0 || b >= total) return null;
  let fromP = -1;
  let toP = -1;
  for (let g of [a, b]) {
    for (let i = 0; i < pathDs.length; i++) {
      const o0 = off[i]!;
      const o1 = off[i + 1]!;
      if (g >= o0 && g < o1) {
        if (fromP < 0) fromP = i;
        toP = i;
        break;
      }
    }
  }
  if (fromP < 0 || toP < 0) return null;
  if (fromP > toP) [fromP, toP] = [toP, fromP];
  return { from: fromP, to: toP };
}
