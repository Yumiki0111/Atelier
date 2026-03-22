/**
 * 左右対称の長袖トップス向けトポロジー。
 * 本番 UI は連結頂点インデックス範囲。path 範囲への変換は vertexRangeToCoveringPathRange。infer は開発用 selfCheck 向け。
 */

import type { CustomLandmarks } from "../types";
import type { InferredSymmetricTopTopology, LineIndexRange, TopologyInferenceResult } from "./types";
import { allPathFeatures, nearestPointOnPath } from "./pathFeatures";
import { normalizeLineRange } from "./lineRangeUtils";
import {
  collectPtsGlobalVertexRange,
  totalPathVertices,
  vertexRangeToCoveringPathRange,
} from "../pathUtils";

/** 手入力・推定ともに使う 4 役割の範囲 */
export interface SymmetricTopTopologyIndices {
  seamOuterLeft: LineIndexRange;
  seamOuterRight: LineIndexRange;
  sleeveInnerLeft: LineIndexRange;
  sleeveInnerRight: LineIndexRange;
}

/** 汎用フィット UI: 4 役割をすべて「全 path 連結順の頂点インデックス」で指定 */
export interface SymmetricTopGlobalVertexRanges {
  seamOuterLeft: [number, number];
  seamOuterRight: [number, number];
  sleeveInnerLeft: [number, number];
  sleeveInnerRight: [number, number];
}

function normalizeGlobalVertexTuple(t: [number, number]): [number, number] {
  let a = Math.trunc(t[0]);
  let b = Math.trunc(t[1]);
  return a <= b ? [a, b] : [b, a];
}

function validateGlobalVertexTuple(
  total: number,
  t: [number, number],
  label: string,
  warnings: string[]
): [number, number] | null {
  const [lo, hi] = normalizeGlobalVertexTuple(t);
  if (total <= 0 || lo < 0 || hi >= total) {
    warnings.push(`${label}: 連結頂点が無効です（0〜${Math.max(0, total - 1)} の範囲で指定）`);
    return null;
  }
  return [lo, hi];
}

function nearestPointOnGlobalVertexTuple(
  pathDs: string[],
  t: [number, number],
  tx: number,
  ty: number
): [number, number] | null {
  const [lo, hi] = normalizeGlobalVertexTuple(t);
  const pts = collectPtsGlobalVertexRange(pathDs, lo, hi);
  if (pts.length === 0) return null;
  let best = pts[0]!;
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

function singleLineRange(i: number): LineIndexRange {
  const n = Math.trunc(i);
  return { from: n, to: n };
}

function nearestPointOnLineRange(
  pathDs: string[],
  r: LineIndexRange,
  tx: number,
  ty: number
): [number, number] | null {
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let i = r.from; i <= r.to; i++) {
    const d = pathDs[i];
    if (!d) continue;
    const p = nearestPointOnPath(d, tx, ty);
    if (!p) continue;
    const dd = (p[0] - tx) ** 2 + (p[1] - ty) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = p;
    }
  }
  return best;
}

function pickLongSidePaths(
  features: ReturnType<typeof allPathFeatures>,
  midX: number,
  side: "left" | "right",
  shoulderY: number,
  garmentHeight: number,
  minSpanRatio: number
): number[] {
  const long: number[] = [];
  const minV = minSpanRatio * Math.max(garmentHeight, 120);
  const minYFloor = shoulderY - 160;
  for (const f of features) {
    const onSide = side === "left" ? f.cx < midX : f.cx > midX;
    if (!onSide) continue;
    if (f.minY < minYFloor) continue;
    if (f.height >= minV) long.push(f.pathIndex);
  }
  return long;
}

/**
 * 開発用 selfCheck のみ。本番では使わない。
 */
export function inferSymmetricTopTopology(pathDs: string[], lm: CustomLandmarks): TopologyInferenceResult {
  const warnings: string[] = [];
  const midX = (lm.shoulderLx + lm.shoulderRx) / 2;
  const garmentHeight = Math.max(1, lm.hemY - lm.shoulderY);
  const features = allPathFeatures(pathDs);

  const ratios = [0.28, 0.22, 0.18, 0.14, 0.1];
  let longL: number[] = [];
  let longR: number[] = [];
  let usedRatio: number | null = null;

  for (const r of ratios) {
    longL = pickLongSidePaths(features, midX, "left", lm.shoulderY, garmentHeight, r);
    longR = pickLongSidePaths(features, midX, "right", lm.shoulderY, garmentHeight, r);
    if (longL.length >= 2 && longR.length >= 2) {
      usedRatio = r;
      break;
    }
  }

  if (usedRatio == null) {
    warnings.push(`長い path の閾値を大きく緩めても不足しました（左:${longL.length} 右:${longR.length}）`);
  } else if (usedRatio !== ratios[0]) {
    warnings.push(`袖候補 path の閾値を調整しました（ratio=${usedRatio.toFixed(2)}）`);
  }

  if (longL.length < 2 || longR.length < 2) {
    return { ok: false, topology: null, warnings };
  }

  const featMap = new Map(features.map((f) => [f.pathIndex, f]));

  const outerL = longL.reduce((a, b) => (featMap.get(a)!.cx <= featMap.get(b)!.cx ? a : b));
  const innerL = longL.reduce((a, b) => (featMap.get(a)!.cx >= featMap.get(b)!.cx ? a : b));
  const outerR = longR.reduce((a, b) => (featMap.get(a)!.cx >= featMap.get(b)!.cx ? a : b));
  const innerR = longR.reduce((a, b) => (featMap.get(a)!.cx <= featMap.get(b)!.cx ? a : b));

  if (outerL === innerL || outerR === innerR) {
    warnings.push("左または右で外腕と内袖の分離に失敗しました");
    return { ok: false, topology: null, warnings };
  }

  const il = singleLineRange(innerL);
  const ir = singleLineRange(innerR);
  const attachL = nearestPointOnLineRange(pathDs, il, lm.shoulderLx, lm.shoulderY + 40);
  const attachR = nearestPointOnLineRange(pathDs, ir, lm.shoulderRx, lm.shoulderY + 40);
  if (!attachL || !attachR) {
    warnings.push("袖付け接合点（attach）の推定に失敗しました");
    return { ok: false, topology: null, warnings };
  }

  const topology: InferredSymmetricTopTopology = {
    seamOuterLeft: singleLineRange(outerL),
    seamOuterRight: singleLineRange(outerR),
    sleeveInnerLeft: il,
    sleeveInnerRight: ir,
    attachLeftSvg: attachL,
    attachRightSvg: attachR,
  };

  return { ok: true, topology, warnings };
}

function validateRange(pathDs: string[], r: LineIndexRange, label: string, warnings: string[]): LineIndexRange | null {
  const n = pathDs.length;
  const norm = normalizeLineRange(r.from, r.to);
  if (n === 0 || norm.from < 0 || norm.to >= n) {
    warnings.push(`${label}: 輪郭線インデックス範囲が無効です（0〜${Math.max(0, n - 1)}）`);
    return null;
  }
  for (let i = norm.from; i <= norm.to; i++) {
    if (!pathDs[i]) {
      warnings.push(`${label}: インデックス ${i} に path がありません`);
      return null;
    }
  }
  return norm;
}

/**
 * 手入力の 4 範囲から topology を組み立てる。attach は内袖範囲へ肩座標を最寄点投影。
 */
export function buildSymmetricTopTopologyFromIndices(
  pathDs: string[],
  lm: CustomLandmarks,
  indices: SymmetricTopTopologyIndices
): TopologyInferenceResult {
  const warnings: string[] = [];

  const soL = validateRange(pathDs, indices.seamOuterLeft, "左・外腕線", warnings);
  const soR = validateRange(pathDs, indices.seamOuterRight, "右・外腕線", warnings);
  const siL = validateRange(pathDs, indices.sleeveInnerLeft, "左・脇〜袖付け", warnings);
  const siR = validateRange(pathDs, indices.sleeveInnerRight, "右・脇〜袖付け", warnings);
  if (!soL || !soR || !siL || !siR) {
    return { ok: false, topology: null, warnings };
  }

  const attachL = nearestPointOnLineRange(pathDs, siL, lm.shoulderLx, lm.shoulderY + 40);
  const attachR = nearestPointOnLineRange(pathDs, siR, lm.shoulderRx, lm.shoulderY + 40);
  if (!attachL || !attachR) {
    warnings.push("袖付け接合点（attach）の投影に失敗しました");
    return { ok: false, topology: null, warnings };
  }

  const topology: InferredSymmetricTopTopology = {
    seamOuterLeft: soL,
    seamOuterRight: soR,
    sleeveInnerLeft: siL,
    sleeveInnerRight: siR,
    attachLeftSvg: attachL,
    attachRightSvg: attachR,
  };

  return { ok: true, topology, warnings };
}

/**
 * 手入力の 4 つの「連結頂点」範囲からトポロジーを組み立てる。
 * attach は内袖の頂点区間へ肩座標を最寄り頂点で近似。
 */
export function buildSymmetricTopTopologyFromGlobalVertices(
  pathDs: string[],
  lm: CustomLandmarks,
  verts: SymmetricTopGlobalVertexRanges
): TopologyInferenceResult {
  const warnings: string[] = [];
  const total = totalPathVertices(pathDs);

  const voL = validateGlobalVertexTuple(total, verts.seamOuterLeft, "左・外腕線", warnings);
  const voR = validateGlobalVertexTuple(total, verts.seamOuterRight, "右・外腕線", warnings);
  const viL = validateGlobalVertexTuple(total, verts.sleeveInnerLeft, "左・脇〜袖付け", warnings);
  const viR = validateGlobalVertexTuple(total, verts.sleeveInnerRight, "右・脇〜袖付け", warnings);
  if (!voL || !voR || !viL || !viR) {
    return { ok: false, topology: null, warnings };
  }

  const soL = vertexRangeToCoveringPathRange(pathDs, voL[0], voL[1]);
  const soR = vertexRangeToCoveringPathRange(pathDs, voR[0], voR[1]);
  const siL = vertexRangeToCoveringPathRange(pathDs, viL[0], viL[1]);
  const siR = vertexRangeToCoveringPathRange(pathDs, viR[0], viR[1]);
  if (!soL || !soR || !siL || !siR) {
    warnings.push("連結頂点範囲から path 範囲への変換に失敗しました");
    return { ok: false, topology: null, warnings };
  }

  const soLN = validateRange(pathDs, soL, "左・外腕線(path)", warnings);
  const soRN = validateRange(pathDs, soR, "右・外腕線(path)", warnings);
  const siLN = validateRange(pathDs, siL, "左・脇〜袖付け(path)", warnings);
  const siRN = validateRange(pathDs, siR, "右・脇〜袖付け(path)", warnings);
  if (!soLN || !soRN || !siLN || !siRN) {
    return { ok: false, topology: null, warnings };
  }

  const attachL = nearestPointOnGlobalVertexTuple(pathDs, viL, lm.shoulderLx, lm.shoulderY + 40);
  const attachR = nearestPointOnGlobalVertexTuple(pathDs, viR, lm.shoulderRx, lm.shoulderY + 40);
  if (!attachL || !attachR) {
    warnings.push("袖付け接合点（attach）の投影に失敗しました");
    return { ok: false, topology: null, warnings };
  }

  const topology: InferredSymmetricTopTopology = {
    seamOuterLeft: soLN,
    seamOuterRight: soRN,
    sleeveInnerLeft: siLN,
    sleeveInnerRight: siRN,
    attachLeftSvg: attachL,
    attachRightSvg: attachR,
    seamOuterLeftVertices: voL,
    seamOuterRightVertices: voR,
    sleeveInnerLeftVertices: viL,
    sleeveInnerRightVertices: viR,
  };

  return { ok: true, topology, warnings };
}
