import type { LowerSleeveSolveRequest } from "./types";

/**
 * デザイン（スケール前）のチェーン上の各辺のユークリッド長を返す。
 * `chainLocal.length - 1` 本。
 */
export function edgeLengthsAlongChain(
  pts: ReadonlyArray<readonly [number, number]>,
  chainLocal: readonly number[]
): number[] {
  const out: number[] = [];
  for (let i = 0; i < chainLocal.length - 1; i++) {
    const a = pts[chainLocal[i]!]!;
    const b = pts[chainLocal[i + 1]!]!;
    out.push(Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!));
  }
  return out;
}

/**
 * チェーン全体の弧長（辺長の合算）。
 */
export function polylineArcLengthAlongChain(
  pts: ReadonlyArray<readonly [number, number]>,
  chainLocal: readonly number[]
): number {
  return edgeLengthsAlongChain(pts, chainLocal).reduce((s, e) => s + e, 0);
}

/**
 * {@link LowerSleeveSolveRequest} 用に、静止 path からチェーン情報を束ねる（呼び出し側で pts を渡す）。
 */
export function buildSolveRequestFromPaths(params: {
  chainLocal: readonly number[];
  ptsRest: ReadonlyArray<readonly [number, number]>;
  ptsAfterUpper: ReadonlyArray<readonly [number, number]>;
  bodyLocal: number;
  junctionLocal: number;
  frozen?: LowerSleeveSolveRequest["frozen"];
}): LowerSleeveSolveRequest {
  return {
    chainLocal: params.chainLocal,
    ptsRest: params.ptsRest,
    ptsAfterUpper: params.ptsAfterUpper,
    bodyLocal: params.bodyLocal,
    junctionLocal: params.junctionLocal,
    frozen: params.frozen ?? null,
  };
}
