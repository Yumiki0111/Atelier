/**
 * 袖丈グレード後の脇合わせ: **胴頂点は動かさず**、下袖区間では**付け根（ジャンクション）側は据え置き・袖口側へ Δ を線形に乗せて伸ばす**（剛体平行移動はフォールバックのみ）。
 */

import type { CustomGarmentData, CustomLandmarks } from "../lib/types";
import { pickSleeveLowerJunctionLocalIndex } from "../lib/scalableGarmentArmLogic";
import {
  cumulativePathPointOffsets,
  pathIndexForGlobalVertex,
  pointAtGlobalVertexIndex,
  tPathWithPointIndex,
} from "../lib/pathUtils";
import { isDebugFittingSleeveWeldEnabled } from "@/lib/fitting-compute/fittingCanvasDebugFlags";

export type LowerSleeveSeamPolySource = "lower_sleeve_segment" | "full_sleeve_path_fallback";

export type LowerSleeveSnapTargetSource = "auto_nearest_body" | null;

export type LowerSleeveSeamRunStats = {
  polyPointCount: number;
  polySource: LowerSleeveSeamPolySource;
  /** 下袖区間で変形した袖 path 上の頂点数（袖口ブレンドで実際に動いた点） */
  sleeveVerticesTranslated: number;
  snapTargetBodyGlobal: number | null;
  snapTargetSource: LowerSleeveSnapTargetSource;
  /** 自動推定時の探索半径 px（胴縦スパン由来） */
  autoSnapMaxPx: number | null;
  translation: { dx: number; dy: number } | null;
  skipReason: string | null;
};

function closestPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): [number, number] {
  const ax = a[0],
    ay = a[1],
    bx = b[0],
    by = b[1];
  const px = p[0],
    py = p[1];
  const abx = bx - ax,
    aby = by - ay;
  const apx = px - ax,
    apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-12) return [ax, ay];
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return [ax + t * abx, ay + t * aby];
}

function closestPointOnOpenPolyline(p: [number, number], poly: [number, number][]): [number, number] {
  if (poly.length === 0) return p;
  if (poly.length === 1) return [poly[0]![0], poly[0]![1]];
  let bestD = Infinity;
  let best: [number, number] = [poly[0]![0], poly[0]![1]];
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i]!;
    const b = poly[i + 1]!;
    const q = closestPointOnSegment(p, a, b);
    const dx = p[0] - q[0],
      dy = p[1] - q[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

function collectLowerSleevePolylinePoints(
  pathDs: string[],
  sleevePathIdx: number,
  lowGlo: number,
  lowGhi: number
): [number, number][] {
  const off = cumulativePathPointOffsets(pathDs);
  const o0 = off[sleevePathIdx]!;
  const o1 = off[sleevePathIdx + 1]!;
  const pts: [number, number][] = [];
  for (let g = lowGlo; g <= lowGhi; g++) {
    if (g < o0 || g >= o1) continue;
    const p = pointAtGlobalVertexIndex(pathDs, g);
    if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) pts.push([p[0], p[1]]);
  }
  return pts;
}

function distSqPointToOpenPolyline(p: [number, number], poly: [number, number][]): number {
  const q = closestPointOnOpenPolyline(p, poly);
  const dx = p[0] - q[0],
    dy = p[1] - q[1];
  return dx * dx + dy * dy;
}

/** 下袖フォールバック（袖 path 全体）用の剛体平行移動 */
function translateSleeveLowerGlobalsRigidSnap(
  pathD: string,
  pathGlobalVertexOffset: number,
  lowerGlobalLo: number,
  lowerGlobalHi: number,
  dx: number,
  dy: number
): string {
  if ((dx === 0 && dy === 0) || !Number.isFinite(dx) || !Number.isFinite(dy)) return pathD;
  const rgLo = Math.min(lowerGlobalLo, lowerGlobalHi);
  const rgHi = Math.max(lowerGlobalLo, lowerGlobalHi);
  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    const g = pathGlobalVertexOffset + pointIndex;
    if (g < rgLo || g > rgHi) return [x, y];
    return [x + dx, y + dy];
  });
}

/**
 * 付け根（ジャンクションに近い端）w=0、袖口 w=1。path のローカル頂点 index 用。
 */
function cuffStretchBlendWeight(
  pointIndex: number,
  rgLoGlobal: number,
  rgHiGlobal: number,
  pathGlobalVertexOffset: number,
  junctionLocal: number | null,
  lengthIdxLo: number,
  lengthIdxHi: number
): number {
  const off = pathGlobalVertexOffset;
  const a = rgLoGlobal - off;
  const b = rgHiGlobal - off;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return 1;

  let rootLocal: number;
  let cuffLocal: number;
  if (junctionLocal != null && Number.isFinite(junctionLocal)) {
    const dA = Math.abs(a - junctionLocal);
    const dB = Math.abs(b - junctionLocal);
    if (dA <= dB) {
      rootLocal = a;
      cuffLocal = b;
    } else {
      rootLocal = b;
      cuffLocal = a;
    }
  } else {
    const midMeas = (lengthIdxLo + lengthIdxHi) / 2;
    const dA = Math.abs(a - midMeas);
    const dB = Math.abs(b - midMeas);
    cuffLocal = dA >= dB ? a : b;
    rootLocal = cuffLocal === a ? b : a;
  }

  const span = cuffLocal - rootLocal;
  const spanAbs = Math.abs(span);
  if (spanAbs < 1e-9) return 1;
  const u = (pointIndex - rootLocal) / span;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(u) ? u : 1));
  // Linear blend can produce visible bend steps near segment boundaries.
  // Use smoothstep so the displacement slope eases in/out.
  return clamped * clamped * (3 - 2 * clamped);
}

function applyLowerSleeveSnapStretchFromCuff(
  pathD: string,
  pathGlobalVertexOffset: number,
  lowerGlobalLo: number,
  lowerGlobalHi: number,
  junctionLocal: number | null,
  lengthIdxLo: number,
  lengthIdxHi: number,
  dx: number,
  dy: number
): string {
  if ((dx === 0 && dy === 0) || !Number.isFinite(dx) || !Number.isFinite(dy)) return pathD;
  const off = pathGlobalVertexOffset;
  const rgLo = Math.min(lowerGlobalLo, lowerGlobalHi);
  const rgHi = Math.max(lowerGlobalLo, lowerGlobalHi);
  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    const g = off + pointIndex;
    if (g < rgLo || g > rgHi) return [x, y];
    const w = cuffStretchBlendWeight(
      pointIndex,
      rgLo,
      rgHi,
      off,
      junctionLocal,
      lengthIdxLo,
      lengthIdxHi
    );
    return [x + dx * w, y + dy * w];
  });
}

function collectFullSleevePolyline(pathDs: string[], sleevePathIdx: number): [number, number][] {
  const off = cumulativePathPointOffsets(pathDs);
  const o0 = off[sleevePathIdx]!;
  const o1 = off[sleevePathIdx + 1]!;
  const pts: [number, number][] = [];
  for (let g = o0; g < o1; g++) {
    const p = pointAtGlobalVertexIndex(pathDs, g);
    if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) pts.push([p[0], p[1]]);
  }
  return pts;
}

/** 合わせ先未設定時: 下袖折れ線に最も近い胴頂点（距離上限あり）。 */
function inferAutoSnapBodyGlobal(
  pathDs: string[],
  sleevePathIdx: number,
  poly: [number, number][],
  lm: CustomLandmarks
): { g: number; maxPx: number } | null {
  const span = Math.max(1, Math.abs(lm.hemY - lm.shoulderY));
  const maxPx = Math.min(200, Math.max(64, Math.round(span * 0.1)));
  const maxSq = maxPx * maxPx;
  const off = cumulativePathPointOffsets(pathDs);
  const total = off[off.length - 1] ?? 0;
  let bestG: number | null = null;
  let bestD = Infinity;
  for (let g = 0; g < total; g++) {
    const pi = pathIndexForGlobalVertex(pathDs, g);
    if (pi == null || pi === sleevePathIdx) continue;
    const p = pointAtGlobalVertexIndex(pathDs, g);
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const dSq = distSqPointToOpenPolyline(p, poly);
    if (dSq < bestD) {
      bestD = dSq;
      bestG = g;
    }
  }
  if (bestG == null || bestD > maxSq) return null;
  return { g: bestG, maxPx };
}

function emptyStats(reason: string, partial?: Partial<LowerSleeveSeamRunStats>): LowerSleeveSeamRunStats {
  return {
    polyPointCount: 0,
    polySource: "lower_sleeve_segment",
    sleeveVerticesTranslated: 0,
    snapTargetBodyGlobal: null,
    snapTargetSource: null,
    autoSnapMaxPx: null,
    translation: null,
    skipReason: reason,
    ...partial,
  };
}

/**
 * 下袖折れ線上の最近点へ、下袖区間の袖頂点をまとめて平行移動（胴は固定）。
 */
export function runLowerSleeveBodySnap(
  pathDs: string[],
  lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  sleevePathIdx: number,
  lowGlo: number | undefined,
  lowGhi: number | undefined,
  lengthIdxLo: number,
  lengthIdxHi: number,
  opts?: { silent?: boolean }
): LowerSleeveSeamRunStats {
  const silent = opts?.silent === true;
  const dbg = isDebugFittingSleeveWeldEnabled() && !silent;

  let poly: [number, number][];
  let polySource: LowerSleeveSeamPolySource;
  if (
    lowGlo != null &&
    lowGhi != null &&
    lowGlo <= lowGhi &&
    collectLowerSleevePolylinePoints(pathDs, sleevePathIdx, lowGlo, lowGhi).length > 0
  ) {
    poly = collectLowerSleevePolylinePoints(pathDs, sleevePathIdx, lowGlo, lowGhi);
    polySource = "lower_sleeve_segment";
  } else {
    poly = collectFullSleevePolyline(pathDs, sleevePathIdx);
    polySource = "full_sleeve_path_fallback";
  }

  if (poly.length < 1) {
    return emptyStats("下袖／袖 path の折れ線が空");
  }

  let bodyG: number | null = null;
  let snapTargetSource: LowerSleeveSnapTargetSource = null;
  let autoSnapMaxPx: number | null = null;
  /** 袖 path 全体への自動スナップは避ける。下袖区間があるときだけ「最近傍胴」を推定する */
  const allowAutoSnap = polySource === "lower_sleeve_segment";
  if (allowAutoSnap) {
    const inf = inferAutoSnapBodyGlobal(pathDs, sleevePathIdx, poly, lm);
    if (inf != null) {
      bodyG = inf.g;
      snapTargetSource = "auto_nearest_body";
      autoSnapMaxPx = inf.maxPx;
    }
  }

  if (bodyG == null) {
    const reason = allowAutoSnap
      ? "自動脇寄せ: 下袖に十分近い胴 # が無い（距離上限超え等）"
      : "下袖区間が未設定のため自動脇寄せは行いません（旧連結指定も本処理では使用しません）。全袖を動かす誤スナップを防ぐため";
    return emptyStats(reason, { polyPointCount: poly.length, polySource });
  }

  const B = pointAtGlobalVertexIndex(pathDs, bodyG);
  if (!B || !Number.isFinite(B[0]) || !Number.isFinite(B[1])) {
    return emptyStats("合わせ先頂点の座標が無効", { polyPointCount: poly.length, polySource });
  }

  const Q = closestPointOnOpenPolyline(B, poly);
  const dx = B[0] - Q[0];
  const dy = B[1] - Q[1];
  if (dx * dx + dy * dy < 1e-12) {
    return {
      polyPointCount: poly.length,
      polySource,
      sleeveVerticesTranslated: 0,
      snapTargetBodyGlobal: bodyG,
      snapTargetSource,
      autoSnapMaxPx,
      translation: { dx: 0, dy: 0 },
      skipReason: "既に一致",
    };
  }

  const off = cumulativePathPointOffsets(pathDs)[sleevePathIdx]!;
  const lo = lowGlo != null && lowGhi != null ? Math.min(lowGlo, lowGhi) : off;
  const hi = lowGlo != null && lowGhi != null ? Math.max(lowGlo, lowGhi) : off + poly.length - 1;

  const d0 = pathDs[sleevePathIdx]!;
  const junctionLocal =
    lowGlo != null && lowGhi != null
      ? pickSleeveLowerJunctionLocalIndex(off, lengthIdxLo, lengthIdxHi, Math.min(lowGlo, lowGhi), Math.max(lowGlo, lowGhi))
      : null;

  if (polySource === "lower_sleeve_segment") {
    pathDs[sleevePathIdx] = applyLowerSleeveSnapStretchFromCuff(
      d0,
      off,
      lo,
      hi,
      junctionLocal,
      lengthIdxLo,
      lengthIdxHi,
      dx,
      dy
    );
  } else {
    pathDs[sleevePathIdx] = translateSleeveLowerGlobalsRigidSnap(d0, off, lo, hi, dx, dy);
  }

  const o1 = cumulativePathPointOffsets(pathDs)[sleevePathIdx + 1]!;
  const epsSq = 1e-8 * (dx * dx + dy * dy + 1);
  let count = 0;
  for (let g = lo; g <= hi; g++) {
    if (g < off || g >= o1) continue;
    const li = g - off;
    const w =
      polySource === "lower_sleeve_segment"
        ? cuffStretchBlendWeight(li, lo, hi, off, junctionLocal, lengthIdxLo, lengthIdxHi)
        : 1;
    if (w * w * (dx * dx + dy * dy) > epsSq) count++;
  }

  const stats: LowerSleeveSeamRunStats = {
    polyPointCount: poly.length,
    polySource,
    sleeveVerticesTranslated: count,
    snapTargetBodyGlobal: bodyG,
    snapTargetSource,
    autoSnapMaxPx,
    translation: { dx, dy },
    skipReason: null,
  };

  if (dbg) {
    console.info("[FITTING_LOWER_SLEEVE_SNAP]", stats);
  }

  return stats;
}

function snapshotGlobalVertexXY(pathDs: string[]): [number, number][] {
  const off = cumulativePathPointOffsets(pathDs);
  const total = off[off.length - 1] ?? 0;
  const out: [number, number][] = [];
  for (let g = 0; g < total; g++) {
    const p = pointAtGlobalVertexIndex(pathDs, g);
    out.push(
      p && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? [p[0], p[1]] : [Number.NaN, Number.NaN]
    );
  }
  return out;
}

function computeMovedGlobalVertexIndices(
  before: [number, number][],
  after: [number, number][]
): number[] {
  const epsSq = 1e-6;
  const moved: number[] = [];
  const n = Math.min(before.length, after.length);
  for (let g = 0; g < n; g++) {
    const a = before[g]!;
    const b = after[g]!;
    if (!Number.isFinite(a[0]) || !Number.isFinite(b[0])) continue;
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    if (dx * dx + dy * dy > epsSq) moved.push(g);
  }
  return moved;
}

export type LowerSleeveSeamPathPreview = {
  stats: LowerSleeveSeamRunStats;
  movedGlobalVertexIndices: number[];
};

export function previewLowerSleeveSeamOnPathSnapshot(
  pathDsIn: string[],
  lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  sleevePathIdx: number,
  lowGlo: number | undefined,
  lowGhi: number | undefined,
  lengthIdxLo: number,
  lengthIdxHi: number
): LowerSleeveSeamPathPreview {
  const pathDs = pathDsIn.map((d) => d);
  const before = snapshotGlobalVertexXY(pathDs);
  const stats = runLowerSleeveBodySnap(pathDs, lm, gt, sleevePathIdx, lowGlo, lowGhi, lengthIdxLo, lengthIdxHi, {
    silent: true,
  });
  const after = snapshotGlobalVertexXY(pathDs);
  const movedGlobalVertexIndices = computeMovedGlobalVertexIndices(before, after);
  return { stats, movedGlobalVertexIndices };
}
