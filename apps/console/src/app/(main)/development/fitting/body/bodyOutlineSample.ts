import { BODY_CX, BZ, BODY_LEFT_OUTLINE, BODY_ARM_OUTLINE_L } from "../lib/constants";

export function getBodyOutlineHalfW(bodyY: number, yScale: number): number {
  const baseY = bodyY <= BZ.head_bot ? bodyY : BZ.head_bot + (bodyY - BZ.head_bot) / yScale;
  const tbl = BODY_LEFT_OUTLINE;
  if (baseY <= tbl[0][0]) return tbl[0][1];
  if (baseY >= tbl[tbl.length - 1][0]) return tbl[tbl.length - 1][1];
  for (let i = 0; i < tbl.length - 1; i++) {
    if (baseY >= tbl[i][0] && baseY <= tbl[i + 1][0]) {
      const t = (baseY - tbl[i][0]) / (tbl[i + 1][0] - tbl[i][0]);
      return tbl[i][1] + (tbl[i + 1][1] - tbl[i][1]) * t;
    }
  }
  return tbl[tbl.length - 1][1];
}

export function armOutlineX(bodyY: number): number {
  const tbl = BODY_ARM_OUTLINE_L;
  if (bodyY <= tbl[0][1]) return tbl[0][0];
  if (bodyY >= tbl[tbl.length - 1][1]) return tbl[tbl.length - 1][0];
  for (let i = 0; i < tbl.length - 1; i++) {
    if (bodyY >= tbl[i][1] && bodyY <= tbl[i + 1][1]) {
      const t = (bodyY - tbl[i][1]) / (tbl[i + 1][1] - tbl[i][1]);
      return tbl[i][0] + (tbl[i + 1][0] - tbl[i][0]) * t;
    }
  }
  return tbl[tbl.length - 1][0];
}
