import { BODY_CX } from "./constants";
import type { BodyZones } from "./types";

function smoothstep01(t: number): number {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
}

const UNDERARM_JUNCTION_DY_PER_XSCALE = 38;
const UNDERARM_JUNCTION_Y_HALF = 88;
const UNDERARM_JUNCTION_LATERAL = 140;

/**
 * テンプレ／ボディ座標 (x,y) で、脇付近を体重に応じ +Y（下）方向へずらす量。
 * 体輪郭・服の sleeveOnly の両方で共有。
 */
export function underarmJunctionSlideY(
  templateX: number,
  templateY: number,
  xScale: number,
  z: BodyZones
): number {
  const dy0 = UNDERARM_JUNCTION_DY_PER_XSCALE * (xScale - 1);
  if (Math.abs(dy0) < 1e-9) return 0;
  const yMid = z.armpit;
  const half = UNDERARM_JUNCTION_Y_HALF;
  if (templateY < yMid - half || templateY > yMid + half) return 0;
  const ty = 1 - Math.abs(templateY - yMid) / half;
  const wy = smoothstep01(ty);
  const lateralL = templateX < BODY_CX - UNDERARM_JUNCTION_LATERAL;
  const lateralR = templateX > BODY_CX + UNDERARM_JUNCTION_LATERAL;
  if (!lateralL && !lateralR) return 0;
  return dy0 * wy;
}

export function applyUnderarmJunctionSlideToWarpedArms(
  outlineL: [number, number][],
  outlineR: [number, number][],
  warpedL: [number, number][],
  warpedR: [number, number][],
  xScale: number,
  z: BodyZones
): void {
  for (let i = 0; i < warpedL.length; i++) {
    const dy = underarmJunctionSlideY(outlineL[i]![0], outlineL[i]![1], xScale, z);
    const p = warpedL[i]!;
    warpedL[i] = [p[0], p[1] + dy];
  }
  for (let i = 0; i < warpedR.length; i++) {
    const dy = underarmJunctionSlideY(outlineR[i]![0], outlineR[i]![1], xScale, z);
    const p = warpedR[i]!;
    warpedR[i] = [p[0], p[1] + dy];
  }
}
