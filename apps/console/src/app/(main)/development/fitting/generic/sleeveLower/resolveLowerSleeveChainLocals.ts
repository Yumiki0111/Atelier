import type { CustomGarmentData } from "../../lib/types";
import { buildLowerSleeveChainBodyToJunction } from "../../lib/scalableGarmentArmLogic";
import { globalToLocal } from "../genericMeasureOnlyShared";

/**
 * `lowerSleeveSeamVertexChain`（任意）が有効ならそれをローカル index に変換して返す。
 * 無ければ `buildLowerSleeveChainBodyToJunction` で推論する。
 */
export function resolveLowerSleeveChainLocals(
  pathDs: string[],
  sleevePathIdx: number,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  bodyLocal: number,
  junctionLocal: number,
  la: number,
  lb: number,
  pathPointCount: number,
  useMirrorSeamChain: boolean
): number[] | null {
  const explicit = useMirrorSeamChain
    ? gt.lowerSleeveMirrorSeamVertexChain
    : gt.lowerSleeveSeamVertexChain;
  if (explicit != null && explicit.length >= 2) {
    const locals: number[] = [];
    for (const g of explicit) {
      const gi = Math.trunc(g);
      if (!Number.isFinite(gi)) return null;
      const li = globalToLocal(pathDs, sleevePathIdx, gi);
      if (li == null) return null;
      locals.push(li);
    }
    if (locals[0] !== bodyLocal || locals[locals.length - 1] !== junctionLocal) {
      return null;
    }
    for (let i = 0; i < locals.length - 1; i++) {
      if (Math.abs(locals[i + 1]! - locals[i]!) !== 1) return null;
    }
    return locals;
  }
  return buildLowerSleeveChainBodyToJunction(bodyLocal, junctionLocal, la, lb, pathPointCount);
}
