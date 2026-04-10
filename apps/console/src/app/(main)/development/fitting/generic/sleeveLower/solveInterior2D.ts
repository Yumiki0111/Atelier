import type { LowerSleeveSolveRequest, LowerSleeveSolveResult } from "./types";

const EPS = 1e-12;

/**
 * 胴端 B・ジャンクション J の静止弦上に、各内点のオフセット (s, o) を乗せた座標を、
 * 新しい端点 B'・J' の弦上に **等方スケール**（|J'-B'| / |J-B|）で写す。
 *
 * 単一の全体内 perpScale ではなく頂点ごとの (s, o) を保つため、袖口付近の横方向成分が一括で潰れにくい。
 * `frozen` に含まれる index は更新しない。
 */
export function solveLowerSleeveInteriorFromRest(req: LowerSleeveSolveRequest): LowerSleeveSolveResult {
  const { chainLocal, ptsRest, ptsAfterUpper, bodyLocal, junctionLocal, frozen } = req;
  const updates = new Map<number, [number, number]>();
  if (chainLocal.length < 3) {
    return { updates };
  }

  const Bo = ptsRest[bodyLocal]!;
  const Jo = ptsRest[junctionLocal]!;
  const Ba = ptsAfterUpper[bodyLocal]!;
  const Ja = ptsAfterUpper[junctionLocal]!;

  const dx0 = Jo[0]! - Bo[0]!;
  const dy0 = Jo[1]! - Bo[1]!;
  const L0 = Math.hypot(dx0, dy0);
  const dx1 = Ja[0]! - Ba[0]!;
  const dy1 = Ja[1]! - Ba[1]!;
  const L1 = Math.hypot(dx1, dy1);
  if (L0 < EPS || L1 < EPS) {
    return { updates };
  }

  const ux0 = dx0 / L0;
  const uy0 = dy0 / L0;
  const vx0 = -uy0;
  const vy0 = ux0;

  const ux1 = dx1 / L1;
  const uy1 = dy1 / L1;
  const vx1 = -uy1;
  const vy1 = ux1;

  const scale = L1 / L0;

  for (let k = 1; k < chainLocal.length - 1; k++) {
    const li = chainLocal[k]!;
    if (frozen?.has(li) === true) continue;

    const p = ptsRest[li]!;
    const wx = p[0]! - Bo[0]!;
    const wy = p[1]! - Bo[1]!;
    const s = wx * ux0 + wy * uy0;
    const o = wx * vx0 + wy * vy0;

    const nx = Ba[0]! + s * scale * ux1 + o * scale * vx1;
    const ny = Ba[1]! + s * scale * uy1 + o * scale * vy1;
    if (Number.isFinite(nx) && Number.isFinite(ny)) {
      updates.set(li, [nx, ny]);
    }
  }

  return { updates };
}
