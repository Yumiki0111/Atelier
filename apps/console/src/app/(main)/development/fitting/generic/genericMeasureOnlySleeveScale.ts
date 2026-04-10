import type { CustomGarmentData, CustomLandmarks } from "../lib/types";
import { isDebugFittingSleeveWeldEnabled } from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import { resolveLowerSleeveBodySeamLocal } from "../lib/scalableGarmentArmLogic";
import {
  applyLocalVertexUpdatesToPathD,
  assertLowerSleeveChainInvariantsDev,
  buildSolveRequestFromPaths,
  resolveLowerSleeveChainLocals,
  relaxOpenChainInteriorsTowardChordWhereBent2D,
  smoothOpenChainInteriorsLaplacian2D,
  solveLowerSleeveInteriorFromRest,
} from "./sleeveLower";
import {
  cumulativePathPointOffsets,
  getPathPoints,
  pathIndexForGlobalVertex,
  tPathWithPointIndex,
} from "../lib/pathUtils";
import { resolveLowerSleeveGlobalsOntoSleevePath, tryLowerSleeveFollowArgs } from "./genericMeasureOnlySleeveFollowArgs";
import { globalToLocal } from "./genericMeasureOnlyShared";

/** SVG は path ごとに同じ角を二重化することが多い。袖だけ変形すると胴 path が元座標のまま残り ~1px 段差になる。 */
const COINCIDENT_SEAM_WELD_TOL_PX = 2.15;

function weldOffSleeveVerticesCoincidentBefore(
  pathDs: string[],
  sleevePathIdx: number,
  before: [number, number],
  after: [number, number]
): number {
  const tol2 = COINCIDENT_SEAM_WELD_TOL_PX * COINCIDENT_SEAM_WELD_TOL_PX;
  const bx = before[0]!;
  const by = before[1]!;
  const ax = after[0]!;
  const ay = after[1]!;
  if (!Number.isFinite(bx) || !Number.isFinite(by) || !Number.isFinite(ax) || !Number.isFinite(ay)) return 0;
  let n = 0;
  for (let pi = 0; pi < pathDs.length; pi++) {
    if (pi === sleevePathIdx) continue;
    const d = pathDs[pi];
    if (!d) continue;
    const pts = getPathPoints(d);
    let hit = false;
    for (let li = 0; li < pts.length; li++) {
      const p = pts[li]!;
      const dx = p[0]! - bx;
      const dy = p[1]! - by;
      if (dx * dx + dy * dy <= tol2) hit = true;
    }
    if (!hit) continue;
    pathDs[pi] = tPathWithPointIndex(d, (li, x, y) => {
      const p = pts[li]!;
      const dx = p[0]! - bx;
      const dy = p[1]! - by;
      if (dx * dx + dy * dy <= tol2) {
        n += 1;
        return [ax, ay];
      }
      return [x, y];
    });
  }
  return n;
}

/** 採寸帯＋袖口隣接点を下袖ソルバ／フェアリングで動かさないための凍結集合。 */
function buildLowerSleeveFollowFrozenLocals(
  lengthIdxLo: number,
  lengthIdxHi: number,
  ptsLen: number,
  i0: number,
  i1: number,
  fixLocal: number,
  junction: number
): Set<number> {
  const frozen = new Set<number>();
  for (let li = lengthIdxLo; li <= lengthIdxHi; li++) {
    frozen.add(li);
  }
  if (Math.abs(i0 - i1) === 1) {
    const cuffLocal = 2 * i1 - i0;
    if (
      cuffLocal >= 0 &&
      cuffLocal < ptsLen &&
      cuffLocal !== fixLocal &&
      cuffLocal !== junction
    ) {
      frozen.add(cuffLocal);
    }
  }
  return frozen;
}

function weldLowerSleeveLinkedGlobals(
  pathDs: string[],
  sleevePathIdx: number,
  linked: number[] | undefined,
  pAfter: [number, number]
): void {
  if (!linked?.length) return;
  const off = cumulativePathPointOffsets(pathDs);
  const ax = pAfter[0]!;
  const ay = pAfter[1]!;
  for (const g of linked) {
    const gi = Math.trunc(g);
    if (!Number.isFinite(gi)) continue;
    const pIdx = pathIndexForGlobalVertex(pathDs, gi);
    if (pIdx == null || pIdx === sleevePathIdx) continue;
    const o0 = off[pIdx]!;
    const li = gi - o0;
    const d = pathDs[pIdx]!;
    pathDs[pIdx] = tPathWithPointIndex(d, (pointIndex, x, y) =>
      pointIndex === li ? [ax, ay] : [x, y]
    );
  }
}

/**
 * first-edge 伸縮で i1（袖口側）だけが動くと、袖口の反対端が固定のままになり
 * 「上袖（i0→i1）と袖口（i1→隣）」の角がデザインからずれる。
 * i0,i1 が path 上で隣なら、もう一方の隣接頂点 cuffLocal=2*i1-i0 を、
 * スケール前と同じ相対角・同じ袖口辺長で置き直す。
 * `skipLocal` が袖口隣接頂点と一致する場合は何もしない（胴–袖固定点を上書きしない）。
 */
function applyCuffPartnerPreserveAngleToPath(
  pathDBeforeStretch: string,
  pathDAfterStretch: string,
  i0: number,
  i1: number,
  skipLocal: number | null
): string {
  const before = getPathPoints(pathDBeforeStretch);
  const after = getPathPoints(pathDAfterStretch);
  if (before.length !== after.length || before.length === 0) return pathDAfterStretch;
  if (i0 < 0 || i1 < 0 || i0 >= before.length || i1 >= before.length || i0 === i1) {
    return pathDAfterStretch;
  }
  if (Math.abs(i0 - i1) !== 1) return pathDAfterStretch;

  const cuffLocal = 2 * i1 - i0;
  if (skipLocal != null && cuffLocal === skipLocal) return pathDAfterStretch;
  if (cuffLocal < 0 || cuffLocal >= before.length || cuffLocal === i0 || cuffLocal === i1) {
    return pathDAfterStretch;
  }

  const p0b = before[i0]!;
  const p1b = before[i1]!;
  const pcb = before[cuffLocal]!;
  const p0a = after[i0]!;
  const p1a = after[i1]!;

  const ux0 = p1b[0]! - p0b[0]!;
  const uy0 = p1b[1]! - p0b[1]!;
  const lenUp0 = Math.hypot(ux0, uy0);
  if (lenUp0 < 1e-12) return pathDAfterStretch;

  const cx0 = pcb[0]! - p1b[0]!;
  const cy0 = pcb[1]! - p1b[1]!;
  const lenCuff = Math.hypot(cx0, cy0);
  if (lenCuff < 1e-12) return pathDAfterStretch;

  const angUp0 = Math.atan2(uy0, ux0);
  const angCuff0 = Math.atan2(cy0, cx0);
  const delta = angCuff0 - angUp0;

  const uxN = p1a[0]! - p0a[0]!;
  const uyN = p1a[1]! - p0a[1]!;
  const lenUpN = Math.hypot(uxN, uyN);
  if (lenUpN < 1e-12) return pathDAfterStretch;

  const angUpN = Math.atan2(uyN, uxN);
  const angCuffN = angUpN + delta;
  const nx = p1a[0]! + lenCuff * Math.cos(angCuffN);
  const ny = p1a[1]! + lenCuff * Math.sin(angCuffN);

  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return pathDAfterStretch;

  return tPathWithPointIndex(pathDAfterStretch, (pointIndex, x, y) =>
    pointIndex === cuffLocal ? [nx, ny] : [x, y]
  );
}

/**
 * 袖丈パイプラインの **後半**（胴–袖 seam sync・胴折れ線への胴接点 snap）が path を書き換えたあとに呼ぶ。
 * 静止弦ソルバは走らせず、現在座標に対してだけラプラシアン＋弦寄せをかけ、折れの再発を抑える。
 */
export function applyLowerSleeveInteriorFairingOnly(
  pathDs: string[],
  lm: CustomLandmarks,
  sleevePathIdx: number,
  lengthStartIdx: number,
  lengthEndIdx: number,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  firstEdge: { i0: number; i1: number } | null | undefined,
  opts?: { sideLabel?: "primary" | "mirror" }
): void {
  const gtl = gt;
  const fe = firstEdge;
  const i0 = fe?.i0;
  const i1 = fe?.i1;
  if (i0 == null || i1 == null || i0 < 0 || i1 < 0) return;

  const args = tryLowerSleeveFollowArgs(pathDs, lm, sleevePathIdx, lengthStartIdx, lengthEndIdx, gtl);
  if (!args) return;

  const { off, lowGlo, lowGhi, junction } = args;
  const lengthIdxLo = Math.min(lengthStartIdx, lengthEndIdx);
  const lengthIdxHi = Math.max(lengthStartIdx, lengthEndIdx);
  const la = Math.min(lowGlo, lowGhi) - off;
  const lb = Math.max(lowGlo, lowGhi) - off;
  const liHi = Math.max(lengthStartIdx, lengthEndIdx);
  const lowerOnHigher = junction === liHi;

  let bodySnapLocal: number | null = null;
  const gSnap = gtl.lowerSleeveSnapToBodyGlobalVertex;
  if (gSnap != null && Number.isFinite(gSnap)) {
    const liSnap = globalToLocal(pathDs, sleevePathIdx, Math.trunc(gSnap));
    if (liSnap != null && liSnap >= la && liSnap <= lb) {
      bodySnapLocal = liSnap;
    }
  }

  const fixLocal = resolveLowerSleeveBodySeamLocal(junction, la, lb, lowerOnHigher, bodySnapLocal);
  if (fixLocal == null) return;

  const dCur = pathDs[sleevePathIdx]!;
  const ptsBefore = getPathPoints(dCur);
  if (i0 >= ptsBefore.length || i1 >= ptsBefore.length) return;

  const useMirrorSeam = opts?.sideLabel === "mirror";
  const chainPre = resolveLowerSleeveChainLocals(
    pathDs,
    sleevePathIdx,
    gtl,
    fixLocal,
    junction,
    la,
    lb,
    ptsBefore.length,
    useMirrorSeam
  );
  if (chainPre == null || chainPre.length < 3) return;

  const frozen = buildLowerSleeveFollowFrozenLocals(
    lengthIdxLo,
    lengthIdxHi,
    ptsBefore.length,
    i0,
    i1,
    fixLocal,
    junction
  );

  const getXY = (li: number): [number, number] => {
    const p = ptsBefore[li]!;
    return [p[0]!, p[1]!];
  };

  const smoothed = smoothOpenChainInteriorsLaplacian2D(chainPre, getXY, frozen, {
    iterations: 12,
    lambda: 0.48,
  });
  const updates = new Map<number, [number, number]>(smoothed);
  const posAfterSmooth = (li: number): [number, number] => {
    const u = updates.get(li);
    if (u != null) return [u[0]!, u[1]!];
    return getXY(li);
  };
  const chordRelaxed = relaxOpenChainInteriorsTowardChordWhereBent2D(chainPre, posAfterSmooth, frozen, {
    iterations: 5,
    blend: 0.48,
    cosStraightMin: 0.992,
  });
  for (const [li, p] of chordRelaxed) {
    updates.set(li, p);
  }
  if (updates.size === 0) return;

  const outD = applyLocalVertexUpdatesToPathD(dCur, updates);
  assertLowerSleeveChainInvariantsDev(outD, chainPre, "lower_fairing_post_pipeline");
  pathDs[sleevePathIdx] = outD;

  const ptsFinal = getPathPoints(pathDs[sleevePathIdx]!);
  const pBody: [number, number] = [ptsFinal[fixLocal]![0]!, ptsFinal[fixLocal]![1]!];
  weldLowerSleeveLinkedGlobals(pathDs, sleevePathIdx, gtl.lowerSleeveFollowLinkedGlobalVertices, pBody);

  const pb = ptsBefore[fixLocal]!;
  weldOffSleeveVerticesCoincidentBefore(pathDs, sleevePathIdx, [pb[0]!, pb[1]!], pBody);

  const pj0 = ptsBefore[junction]!;
  const pj1 = ptsFinal[junction]!;
  weldOffSleeveVerticesCoincidentBefore(pathDs, sleevePathIdx, [pj0[0]!, pj0[1]!], [pj1[0]!, pj1[1]!]);

  const pi0b = ptsBefore[i0]!;
  const pi0a = ptsFinal[i0]!;
  weldOffSleeveVerticesCoincidentBefore(pathDs, sleevePathIdx, [pi0b[0]!, pi0b[1]!], [pi0a[0]!, pi0a[1]!]);
}

/**
 * `scaleOnce` で上袖の first-edge を伸縮したあと、下袖だけ追従させる。
 *
 * 優先順位:
 * 1. 上袖: `scaleOnce` による採寸チェーン弧長一致（ここでは変更しない）
 * 2. 袖口: i0–i1 のみ伸びると反対端が固定で角が崩れるため、隣接頂点を相対角・辺長維持で追従
 * 3. body 接点・junction 固定のまま、下袖内点を静止弦フレームで等方スケールし、ラプラシアン＋急曲がり弦寄せで折れを抑える
 */
export function applySleeveScaleThenLowerFollow(
  pathDs: string[],
  lm: CustomLandmarks,
  sleevePathIdx: number,
  lengthStartIdx: number,
  lengthEndIdx: number,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  scaleOnce: (pathD: string) => string,
  gtForLower?: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  firstEdge?: { i0: number; i1: number } | null,
  opts?: { sideLabel?: "primary" | "mirror" }
): void {
  const gtl = gtForLower ?? gt;
  const d0 = pathDs[sleevePathIdx]!;
  const args = tryLowerSleeveFollowArgs(pathDs, lm, sleevePathIdx, lengthStartIdx, lengthEndIdx, gtl);
  const lengthIdxLo = Math.min(lengthStartIdx, lengthEndIdx);
  const lengthIdxHi = Math.max(lengthStartIdx, lengthEndIdx);

  if (isDebugFittingSleeveWeldEnabled()) {
    if (!args) {
      const res = resolveLowerSleeveGlobalsOntoSleevePath(pathDs, lm, sleevePathIdx, gtl);
      console.info("[FITTING_LOWER_SLEEVE_FOLLOW]", {
        lowerInteriorSolve: false,
        reason: res == null
          ? "lower_range_unresolved_or_not_on_sleeve_path"
          : "measure_and_lower_overlap_junction_ambiguous",
        lengthIdxLo,
        lengthIdxHi,
        lowerGlobalRange: res != null ? { lowGlo: res.lowGlo, lowGhi: res.lowGhi } : null,
      });
    } else {
      console.info("[FITTING_LOWER_SLEEVE_FOLLOW]", {
        lowerInteriorSolve: true,
        junctionLocal: args.junction,
        lowerGlobalRange: { lowGlo: args.lowGlo, lowGhi: args.lowGhi },
        firstEdge: firstEdge ?? null,
      });
    }
  }

  if (!args) {
    pathDs[sleevePathIdx] = scaleOnce(d0);
    return;
  }

  const { off, lengthIdxHi: liHi, lowGlo, lowGhi, junction } = args;
  const lowerOnHigher = junction === liHi;
  const pts0 = getPathPoints(d0);

  const fe = firstEdge;
  const i0 = fe?.i0;
  const i1 = fe?.i1;
  if (
    i0 == null || i1 == null ||
    i0 < 0 || i1 < 0 ||
    i0 >= pts0.length || i1 >= pts0.length ||
    i0 === i1
  ) {
    pathDs[sleevePathIdx] = scaleOnce(d0);
    return;
  }

  const la = Math.min(lowGlo, lowGhi) - off;
  const lb = Math.max(lowGlo, lowGhi) - off;

  let bodySnapLocal: number | null = null;
  const gSnap = gtl.lowerSleeveSnapToBodyGlobalVertex;
  if (gSnap != null && Number.isFinite(gSnap)) {
    const liSnap = globalToLocal(pathDs, sleevePathIdx, Math.trunc(gSnap));
    if (liSnap != null && liSnap >= la && liSnap <= lb) {
      bodySnapLocal = liSnap;
    }
  }

  const fixLocal = resolveLowerSleeveBodySeamLocal(junction, la, lb, lowerOnHigher, bodySnapLocal);

  // スケール実行 → 袖口の反対端を同相対角で追従（上袖–袖口角をデザインに近づける）
  const scaledRaw = scaleOnce(d0);
  const scaled = applyCuffPartnerPreserveAngleToPath(d0, scaledRaw, i0, i1, fixLocal);
  const pts1 = getPathPoints(scaled);
  if (i0 >= pts1.length || i1 >= pts1.length) {
    pathDs[sleevePathIdx] = scaled;
    return;
  }

  const useMirrorSeam = opts?.sideLabel === "mirror";
  const chainPre =
    fixLocal != null
      ? resolveLowerSleeveChainLocals(
          pathDs,
          sleevePathIdx,
          gtl,
          fixLocal,
          junction,
          la,
          lb,
          pts1.length,
          useMirrorSeam
        )
      : null;

  const canApplyLowerFollow =
    fixLocal != null && chainPre != null && chainPre.length >= 3;

  if (canApplyLowerFollow && chainPre != null && fixLocal != null) {
    const frozen = buildLowerSleeveFollowFrozenLocals(
      lengthIdxLo,
      lengthIdxHi,
      pts1.length,
      i0,
      i1,
      fixLocal,
      junction
    );
    const req = buildSolveRequestFromPaths({
      chainLocal: chainPre,
      ptsRest: pts0 as [number, number][],
      ptsAfterUpper: pts1 as [number, number][],
      bodyLocal: fixLocal,
      junctionLocal: junction,
      frozen,
    });
    let { updates } = solveLowerSleeveInteriorFromRest(req);
    const posAfterSolve = (li: number): [number, number] => {
      const u = updates.get(li);
      if (u != null) return [u[0]!, u[1]!];
      const p = pts1[li]!;
      return [p[0]!, p[1]!];
    };
    const smoothed = smoothOpenChainInteriorsLaplacian2D(chainPre, posAfterSolve, frozen, {
      iterations: 10,
      lambda: 0.45,
    });
    for (const [li, p] of smoothed) {
      updates.set(li, p);
    }
    const posAfterSmooth = (li: number): [number, number] => {
      const u = updates.get(li);
      if (u != null) return [u[0]!, u[1]!];
      const p = pts1[li]!;
      return [p[0]!, p[1]!];
    };
    const chordRelaxed = relaxOpenChainInteriorsTowardChordWhereBent2D(chainPre, posAfterSmooth, frozen, {
      iterations: 4,
      blend: 0.45,
      cosStraightMin: 0.992,
    });
    for (const [li, p] of chordRelaxed) {
      updates.set(li, p);
    }
    const outD = applyLocalVertexUpdatesToPathD(scaled, updates);
    assertLowerSleeveChainInvariantsDev(outD, chainPre, "lower_follow_after_solve");
    pathDs[sleevePathIdx] = outD;
  } else {
    pathDs[sleevePathIdx] = scaled;
  }

  // 胴 path との頂点 weld（重複頂点の段差解消）。胴アウトライン snap は `applyGenericSleeveScaleAfterLengthMesh` 末尾で 1 回。
  if (fixLocal != null) {
    const ptsFinal = getPathPoints(pathDs[sleevePathIdx]!);
    const pBody: [number, number] = [ptsFinal[fixLocal]![0]!, ptsFinal[fixLocal]![1]!];
    weldLowerSleeveLinkedGlobals(pathDs, sleevePathIdx, gtl.lowerSleeveFollowLinkedGlobalVertices, pBody);

    const pb = pts0[fixLocal]!;
    weldOffSleeveVerticesCoincidentBefore(pathDs, sleevePathIdx, [pb[0]!, pb[1]!], pBody);

    const pj0 = pts0[junction]!;
    const pj1 = ptsFinal[junction]!;
    weldOffSleeveVerticesCoincidentBefore(pathDs, sleevePathIdx, [pj0[0]!, pj0[1]!], [pj1[0]!, pj1[1]!]);

    const pi0b = pts0[i0]!;
    const pi0a = ptsFinal[i0]!;
    weldOffSleeveVerticesCoincidentBefore(pathDs, sleevePathIdx, [pi0b[0]!, pi0b[1]!], [pi0a[0]!, pi0a[1]!]);
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
