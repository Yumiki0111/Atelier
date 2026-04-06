import type { CustomGarmentData, CustomLandmarks } from "../lib/types";
import { translateSleeveLowerFollowElbowMove } from "../lib/scalableGarmentArmLogic";
import { getPathPoints } from "../lib/pathUtils";
import { runLowerSleeveBodySnap } from "./genericMeasureOnlyLowerSleeveSnap";
import { resolveLowerSleeveGlobalsOntoSleevePath, tryLowerSleeveFollowArgs } from "./genericMeasureOnlySleeveFollowArgs";
import { globalToLocal } from "./genericMeasureOnlyShared";

export type ApplySleeveScaleThenLowerFollowOpts = {
  /** true のとき脇スナップを省略（スケール＋エルボ追従のみ）。パイプライン終端で {@link runLowerSleeveSnapAfterSleeveScale} を1回だけ呼ぶ。 */
  skipLowerSnap?: boolean;
};

/**
 * 上袖スケール後の下袖脇スナップ。`applySleeveScaleThenLowerFollow` と同じ条件で呼び出す。
 */
export function runLowerSleeveSnapAfterSleeveScale(
  pathDs: string[],
  lm: CustomLandmarks,
  sleevePathIdx: number,
  lengthStartIdx: number,
  lengthEndIdx: number,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  gtForLower?: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): void {
  const gtl = gtForLower ?? gt;
  const weldLower = resolveLowerSleeveGlobalsOntoSleevePath(pathDs, lm, sleevePathIdx, gtl);
  const lengthIdxLo = Math.min(lengthStartIdx, lengthEndIdx);
  const lengthIdxHi = Math.max(lengthStartIdx, lengthEndIdx);
  const args = tryLowerSleeveFollowArgs(pathDs, lm, sleevePathIdx, lengthStartIdx, lengthEndIdx, gtl);
  if (!args) {
    runLowerSleeveBodySnap(
      pathDs,
      lm,
      gtl,
      sleevePathIdx,
      weldLower?.lowGlo,
      weldLower?.lowGhi,
      lengthIdxLo,
      lengthIdxHi
    );
    return;
  }
  const { lowGlo, lowGhi, lengthIdxLo: liLo, lengthIdxHi: liHi } = args;
  runLowerSleeveBodySnap(pathDs, lm, gtl, sleevePathIdx, lowGlo, lowGhi, liLo, liHi);
}

export function applySleeveScaleThenLowerFollow(
  pathDs: string[],
  lm: CustomLandmarks,
  sleevePathIdx: number,
  lengthStartIdx: number,
  lengthEndIdx: number,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  scaleOnce: (pathD: string) => string,
  /** 下袖区間・スナップ用。省略時は `gt`（ミラー袖は `lowerSleeveMirrorVertex*` をここへ写したオブジェクトを渡す） */
  gtForLower?: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  opts?: ApplySleeveScaleThenLowerFollowOpts
): void {
  const gtl = gtForLower ?? gt;
  const d0 = pathDs[sleevePathIdx]!;
  const weldLower = resolveLowerSleeveGlobalsOntoSleevePath(pathDs, lm, sleevePathIdx, gtl);
  const lengthIdxLo = Math.min(lengthStartIdx, lengthEndIdx);
  const lengthIdxHi = Math.max(lengthStartIdx, lengthEndIdx);
  const args = tryLowerSleeveFollowArgs(pathDs, lm, sleevePathIdx, lengthStartIdx, lengthEndIdx, gtl);
  if (!args) {
    pathDs[sleevePathIdx] = scaleOnce(d0);
    if (!opts?.skipLowerSnap) {
      runLowerSleeveBodySnap(
        pathDs,
        lm,
        gtl,
        sleevePathIdx,
        weldLower?.lowGlo,
        weldLower?.lowGhi,
        lengthIdxLo,
        lengthIdxHi
      );
    }
    return;
  }
  const { off, lengthIdxLo: liLo, lengthIdxHi: liHi, lowGlo, lowGhi, junction } = args;
  const pts0 = getPathPoints(d0);
  if (junction < 0 || junction >= pts0.length) {
    pathDs[sleevePathIdx] = scaleOnce(d0);
    if (!opts?.skipLowerSnap) {
      runLowerSleeveBodySnap(pathDs, lm, gtl, sleevePathIdx, lowGlo, lowGhi, liLo, liHi);
    }
    return;
  }
  const eb: [number, number] = [pts0[junction]![0], pts0[junction]![1]];
  const scaled = scaleOnce(d0);
  const pts1 = getPathPoints(scaled);
  if (junction < 0 || junction >= pts1.length) {
    pathDs[sleevePathIdx] = scaled;
    if (!opts?.skipLowerSnap) {
      runLowerSleeveBodySnap(pathDs, lm, gtl, sleevePathIdx, lowGlo, lowGhi, liLo, liHi);
    }
    return;
  }
  const ea: [number, number] = [pts1[junction]![0], pts1[junction]![1]];
  pathDs[sleevePathIdx] = translateSleeveLowerFollowElbowMove(
    scaled,
    off,
    liLo,
    liHi,
    lowGlo,
    lowGhi,
    eb,
    ea
  );
  if (!opts?.skipLowerSnap) {
    runLowerSleeveBodySnap(pathDs, lm, gtl, sleevePathIdx, lowGlo, lowGhi, liLo, liHi);
  }
}

export function buildSleeveMeasureLocalChainFromGt(
  pathDs: string[],
  sleevePathIdx: number,
  chain: number[] | undefined
): number[] | undefined {
  if (!chain || chain.length < 2) return undefined;
  const locals: number[] = [];
  for (const g of chain) {
    const li = globalToLocal(pathDs, sleevePathIdx, Math.trunc(g));
    if (li == null) return undefined;
    locals.push(li);
  }
  return locals;
}
