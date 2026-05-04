/**
 * 袖丈: SVG の赤い計測パス（MEASURE_SLEEVE_L/R_VERTS）に沿った一様ストレイン。
 * 各稜線が同じ伸び率 (1+ε) になるよう、根元頂点を固定して累積変形する。
 */

import { MEASURE_SLEEVE_L_VERTS, MEASURE_SLEEVE_R_VERTS } from "./gradingV4Constants";

export type GradingV4SleeveSide = "L" | "R";

/** 互換 export（= 赤線パス） */
export const SLEEVE_L_SPINE = MEASURE_SLEEVE_L_VERTS;
export const SLEEVE_R_SPINE = MEASURE_SLEEVE_R_VERTS;

function polylineTotalLength(verts: ReadonlyArray<readonly [number, number]>): number {
  let s = 0;
  for (let i = 0; i < verts.length - 1; i++) {
    const dx = verts[i + 1][0] - verts[i][0];
    const dy = verts[i + 1][1] - verts[i][1];
    s += Math.hypot(dx, dy);
  }
  return s;
}

/** 左袖計測線の弧長（px）— 袖丈 cm→px 換算・ε の分母 */
export const REF_SLEEVE_ARC_PX = polylineTotalLength(MEASURE_SLEEVE_L_VERTS);

function closestOnPolyline(
  px: number,
  py: number,
  verts: ReadonlyArray<readonly [number, number]>
): { k: number; a: number; qx: number; qy: number } {
  let bestD = Infinity;
  let bestK = 0;
  let bestA = 0;
  let bestQx = px;
  let bestQy = py;
  for (let k = 0; k < verts.length - 1; k++) {
    const ax = verts[k][0];
    const ay = verts[k][1];
    const bx = verts[k + 1][0];
    const by = verts[k + 1][1];
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const ab2 = abx * abx + aby * aby;
    let t = ab2 > 0 ? (apx * abx + apy * aby) / ab2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * abx;
    const qy = ay + t * aby;
    const d = Math.hypot(px - qx, py - qy);
    if (d < bestD) {
      bestD = d;
      bestK = k;
      bestA = t;
      bestQx = qx;
      bestQy = qy;
    }
  }
  return { k: bestK, a: bestA, qx: bestQx, qy: bestQy };
}

function strainedPolyline(
  verts: ReadonlyArray<readonly [number, number]>,
  epsilon: number
): [number, number][] {
  const out: [number, number][] = [[verts[0][0], verts[0][1]]];
  for (let i = 0; i < verts.length - 1; i++) {
    const dx = verts[i + 1][0] - verts[i][0];
    const dy = verts[i + 1][1] - verts[i][1];
    const lx = out[out.length - 1][0];
    const ly = out[out.length - 1][1];
    out.push([lx + (1 + epsilon) * dx, ly + (1 + epsilon) * dy]);
  }
  return out;
}

let strainedCacheD = Number.NaN;
let strainedCacheL: [number, number][] | null = null;
let strainedCacheR: [number, number][] | null = null;

function strainedVertsForDelta(dSleeveLengthPx: number): {
  vertsL: ReadonlyArray<readonly [number, number]>;
  vertsR: ReadonlyArray<readonly [number, number]>;
  vpL: [number, number][];
  vpR: [number, number][];
} {
  const l0 = REF_SLEEVE_ARC_PX;
  if (Math.abs(dSleeveLengthPx - strainedCacheD) < 1e-9 && strainedCacheL && strainedCacheR) {
    return {
      vertsL: MEASURE_SLEEVE_L_VERTS,
      vertsR: MEASURE_SLEEVE_R_VERTS,
      vpL: strainedCacheL,
      vpR: strainedCacheR,
    };
  }
  const epsilon = l0 > 1e-6 ? dSleeveLengthPx / l0 : 0;
  strainedCacheD = dSleeveLengthPx;
  strainedCacheL = strainedPolyline(MEASURE_SLEEVE_L_VERTS, epsilon);
  strainedCacheR = strainedPolyline(MEASURE_SLEEVE_R_VERTS, epsilon);
  return {
    vertsL: MEASURE_SLEEVE_L_VERTS,
    vertsR: MEASURE_SLEEVE_R_VERTS,
    vpL: strainedCacheL,
    vpR: strainedCacheR,
  };
}

/**
 * 近傍計測ポリライン上の点と同じ並進で、描画点をオフセットする。
 * dSleeveLengthPx: 赤線パス全体に加えたい弧長の増分（px）。ε = 増分 / REF_SLEEVE_ARC_PX。
 */
export function sleeveLengthStrainOffset(
  px: number,
  py: number,
  dSleeveLengthPx: number,
  side: GradingV4SleeveSide
): [number, number] {
  if (Math.abs(dSleeveLengthPx) < 1e-9) return [0, 0];
  const { vertsL, vertsR, vpL, vpR } = strainedVertsForDelta(dSleeveLengthPx);
  const verts = side === "L" ? vertsL : vertsR;
  const vp = side === "L" ? vpL : vpR;
  const { k, a, qx, qy } = closestOnPolyline(px, py, verts);
  const qxs = vp[k][0] + a * (vp[k + 1][0] - vp[k][0]);
  const qys = vp[k][1] + a * (vp[k + 1][1] - vp[k][1]);
  return [qxs - qx, qys - qy];
}
