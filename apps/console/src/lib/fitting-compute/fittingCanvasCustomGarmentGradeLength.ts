import type { CustomGarmentData, GenericVertexPlotHighlight, SizeMeasure } from "@/app/(main)/development/fitting/lib/types";
import type { CustomLandmarks } from "@/app/(main)/development/fitting/lib/types";
import {
  cumulativePathPointOffsets,
  getPathPoints,
  pointAtGlobalVertexIndex,
  tPath,
  tPathWithPointIndex,
} from "@/app/(main)/development/fitting/lib/pathUtils";

export type GradeLengthMeshInput = {
  customGarmentData: CustomGarmentData;
  /** ワープ後の path。`customPoints` の欠損時にグローバル頂点 index から座標を補う */
  customPathDs: string[];
  customPoints: [number, number][];
  customAllOutline: [number, number][];
  c: CustomGarmentData["landmarks"];
  rigLm: CustomLandmarks | null;
  useRigLandmarksForPlacement: boolean;
  shoulderSeamY: number;
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  bodyPxPerCm: number;
  size: SizeMeasure;
  genericVertexPlotHighlight: GenericVertexPlotHighlight | null;
};

export type GradeLengthVerticalScaleParams =
  | { ok: true; lengthTopY: number; scale: number; preScaleSpanPx: number }
  | { ok: false; reason: string };

/**
 * ファブリックワープ後のメッシュで、肩〜裾の縦スパンを size.length×bodyPxPerCm に合わせるための Y スケール。
 * 矢印（グレード着丈）を正とし、輪郭 path / 頂点にのみ適用する。
 */
export function computeGradeLengthVerticalScaleParams(
  input: GradeLengthMeshInput
): GradeLengthVerticalScaleParams {
  const {
    customGarmentData,
    customPathDs,
    customPoints,
    customAllOutline,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    shoulderSeamY,
    designToGarmentCanvas,
    bodyPxPerCm,
    size,
    genericVertexPlotHighlight,
  } = input;

  /** 汎用トップ: 呼び出し側のゲートと二重化。紫／ハイライトだけでは縦メッシュをかけない。 */
  if (customGarmentData.presetId === "genericSymmetricTop") {
    const gt = customGarmentData.genericSymmetricTop;
    const lenBaselineOk =
      gt?.gradingBaselineLengthCm != null &&
      Number.isFinite(gt.gradingBaselineLengthCm) &&
      gt.gradingBaselineLengthCm > 0;
    if (!lenBaselineOk) return { ok: false, reason: "grading_baseline_length_missing" };
  }

  const refShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const refShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const refHemY = useRigLandmarksForPlacement && rigLm ? rigLm.hemY : c.hemY;
  const refHemCx = useRigLandmarksForPlacement && rigLm ? rigLm.hemCx : c.hemCx;

  const shoulderBandY0 = shoulderSeamY;
  const shoulderBandY1 = shoulderSeamY + 28;
  const shoulderBand = customAllOutline.filter((p) => p[1] >= shoulderBandY0 && p[1] <= shoulderBandY1);
  const visualShoulderLx = shoulderBand.length > 0 ? Math.min(...shoulderBand.map((p) => p[0])) : refShoulderLx;
  const visualShoulderRx = shoulderBand.length > 0 ? Math.max(...shoulderBand.map((p) => p[0])) : refShoulderRx;

  const shoulderLeft = designToGarmentCanvas(visualShoulderLx, shoulderSeamY);
  const shoulderRight = designToGarmentCanvas(visualShoulderRx, shoulderSeamY);
  const midShoulderY = (shoulderLeft[1] + shoulderRight[1]) / 2;

  let hemRefY: number | undefined;
  let lengthMeasureTop: [number, number] | undefined;

  const gtLen = customGarmentData.genericSymmetricTop;
  const lmLenA = gtLen?.lengthMeasureVertexStart;
  const lmLenB = gtLen?.lengthMeasureVertexEnd;
  const hlLen = genericVertexPlotHighlight?.lengthMeasure;

  const tryLengthFromVertices = (a: number, b: number): boolean => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return false;
    const lo = Math.min(Math.trunc(a), Math.trunc(b));
    const hi = Math.max(Math.trunc(a), Math.trunc(b));
    const pa = customPoints[lo] ?? pointAtGlobalVertexIndex(customPathDs, lo);
    const pb = customPoints[hi] ?? pointAtGlobalVertexIndex(customPathDs, hi);
    if (pa == null || pb == null) return false;
    const topW = pa[1] <= pb[1] ? pa : pb;
    const hemW = pa[1] >= pb[1] ? pa : pb;
    hemRefY = hemW[1];
    lengthMeasureTop = [topW[0], topW[1]];
    return true;
  };

  let ok = false;
  if (
    lmLenA != null &&
    lmLenB != null &&
    Number.isFinite(lmLenA) &&
    Number.isFinite(lmLenB) &&
    lmLenA !== lmLenB
  ) {
    ok = tryLengthFromVertices(lmLenA, lmLenB);
  }
  if (
    !ok &&
    hlLen &&
    Number.isFinite(hlLen[0]) &&
    Number.isFinite(hlLen[1]) &&
    hlLen[0] !== hlLen[1]
  ) {
    ok = tryLengthFromVertices(hlLen[0], hlLen[1]);
  }
  if (!ok) {
    const hc = designToGarmentCanvas(refHemCx, refHemY);
    hemRefY = hc[1];
  }

  if (hemRefY == null || !Number.isFinite(hemRefY)) {
    return { ok: false, reason: "hem_ref_invalid" };
  }

  const lengthTopY = lengthMeasureTop ? lengthMeasureTop[1] : midShoulderY;
  const lengthPx = size.length * bodyPxPerCm;
  const span = Math.abs(hemRefY - lengthTopY);
  if (!Number.isFinite(span) || span < 1e-2) {
    return { ok: false, reason: "length_span_too_small" };
  }
  const scale = lengthPx / span;
  if (!Number.isFinite(scale) || scale < 0.12 || scale > 10) {
    return {
      ok: false,
      reason: `scale_out_of_range(${Number.isFinite(scale) ? scale.toFixed(4) : String(scale)})`,
    };
  }

  return { ok: true, lengthTopY, scale, preScaleSpanPx: span };
}

export function applyGradeLengthVerticalScaleToMeshPaths(
  customPathDs: string[],
  customPoints: [number, number][],
  lengthTopY: number,
  scale: number,
  opts?: { excludePathIndices?: Set<number> }
): { customPathDs: string[]; customPoints: [number, number][] } {
  const mapY = (y: number) => lengthTopY + (y - lengthTopY) * scale;
  const skip = opts?.excludePathIndices;
  if (skip == null || skip.size === 0) {
    return {
      customPathDs: customPathDs.map((d) => tPath(d, (x, y) => [x, mapY(y)])),
      customPoints: customPoints.map(([x, y]) => [x, mapY(y)] as [number, number]),
    };
  }
  const newPathDs = customPathDs.map((d, i) =>
    skip.has(i) ? d : tPath(d, (x, y) => [x, mapY(y)])
  );
  const newPoints = newPathDs.flatMap((d) =>
    getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
  );
  if (newPoints.length !== customPoints.length) {
    return {
      customPathDs: customPathDs.map((d) => tPath(d, (x, y) => [x, mapY(y)])),
      customPoints: customPoints.map(([x, y]) => [x, mapY(y)] as [number, number]),
    };
  }
  return { customPathDs: newPathDs, customPoints: newPoints };
}

/** 袖パイプライン後の下袖–胴近傍同期で使う胴–袖頂点ペア */
export type BodySleeveSeamPair = {
  sleevePathIdx: number;
  sleeveLocalIdx: number;
  bodyPathIdx: number;
  bodyLocalIdx: number;
};

/** 袖パイプライン後の下袖帯のみ（現状座標で最近傍胴頂点へ） */
export const POST_SLEEVE_PIPELINE_LOWER_SEAM_SYNC_TOL_PX = 6;

/**
 * 下袖の胴接点だけ、胴 path の **辺**への最近傍投影で揃える（胴頂点蔵の最近傍だと内側に寄って食い込むことがある）。
 */
export const LOWER_SLEEVE_BODY_SEAM_OUTLINE_SNAP_MAX_DIST_PX = 16;

function closestPointOnOpenPolylineSegmentsToXY(
  pts: ReturnType<typeof getPathPoints>,
  px: number,
  py: number
): { x: number; y: number; dist2: number } | null {
  if (pts.length < 2) return null;
  let best: { x: number; y: number; dist2: number } | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i]![0]!;
    const ay = pts[i]![1]!;
    const bx = pts[i + 1]![0]!;
    const by = pts[i + 1]![1]!;
    const abx = bx - ax;
    const aby = by - ay;
    const segLen2 = abx * abx + aby * aby;
    if (segLen2 < 1e-18) continue;
    const apx = px - ax;
    const apy = py - ay;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / segLen2));
    const qx = ax + t * abx;
    const qy = ay + t * aby;
    const dx = px - qx;
    const dy = py - qy;
    const d2 = dx * dx + dy * dy;
    if (best == null || d2 < best.dist2) {
      best = { x: qx, y: qy, dist2: d2 };
    }
  }
  return best;
}

/**
 * 袖 path 上の 1 頂点（胴接点）を、袖以外の全 path の折れ線に対する最近傍点へ移す（距離が maxDistPx を超えたら何もしない）。
 */
export function snapSleeveBodySeamVertexToBodyOutline(
  pathDs: readonly string[],
  sleevePathIdx: number,
  sleeveLocalIdx: number,
  sleevePathIndices: ReadonlySet<number>,
  maxDistPx: number
): string | null {
  const d = pathDs[sleevePathIdx];
  if (!d) return null;
  const pts = getPathPoints(d);
  if (sleeveLocalIdx < 0 || sleeveLocalIdx >= pts.length) return null;
  const sp = pts[sleeveLocalIdx]!;
  const sx = sp[0]!;
  const sy = sp[1]!;
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null;
  const max2 = maxDistPx * maxDistPx;
  let best: { x: number; y: number; dist2: number } | null = null;
  for (let pi = 0; pi < pathDs.length; pi++) {
    if (sleevePathIndices.has(pi)) continue;
    const bd = pathDs[pi];
    if (!bd) continue;
    const bpts = getPathPoints(bd);
    const c = closestPointOnOpenPolylineSegmentsToXY(bpts, sx, sy);
    if (c == null) continue;
    if (best == null || c.dist2 < best.dist2) best = c;
  }
  if (best == null || best.dist2 > max2 || best.dist2 < 1e-16) return null;
  return tPathWithPointIndex(d, (i, x, y) =>
    i === sleeveLocalIdx ? [best!.x, best!.y] : [x, y]
  );
}

export function lowerSleeveGlobalIndexRangesFromGt(gt: {
  lowerSleeveVertexStart?: number;
  lowerSleeveVertexEnd?: number;
  lowerSleeveMirrorVertexStart?: number;
  lowerSleeveMirrorVertexEnd?: number;
}): { lo: number; hi: number }[] {
  const out: { lo: number; hi: number }[] = [];
  const push = (a?: number | null, b?: number | null) => {
    if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return;
    const lo = Math.min(Math.trunc(a), Math.trunc(b));
    const hi = Math.max(Math.trunc(a), Math.trunc(b));
    out.push({ lo, hi });
  };
  push(gt.lowerSleeveVertexStart, gt.lowerSleeveVertexEnd);
  push(gt.lowerSleeveMirrorVertexStart, gt.lowerSleeveMirrorVertexEnd);
  return out;
}

/**
 * 袖グローバル # が `globalRanges` のいずれかに入る頂点だけ、胴の最近傍点（距離 ≤ tolPx）へ対応付ける。
 * 袖パイプライン**後**の下袖–胴の残差用（メッシュ前ペアは作らない）。
 * `allowedGlobalIndices` を渡すとその # に限定する（下袖中間を同期すると i1 Δ 並進が潰れるため、胴接点など端のみ推奨）。
 */
export function computeBodySleeveSeamPairsForSleeveVerticesInGlobalRanges(
  pathDs: string[],
  sleevePathIndices: Set<number>,
  globalRanges: readonly { lo: number; hi: number }[],
  tolPx: number,
  allowedGlobalIndices?: ReadonlySet<number> | null
): BodySleeveSeamPair[] {
  if (globalRanges.length === 0 || tolPx <= 0) return [];
  const inRange = (g: number) => globalRanges.some((r) => g >= r.lo && g <= r.hi);
  const useAllow =
    allowedGlobalIndices != null && allowedGlobalIndices.size > 0;
  const tol2 = tolPx * tolPx;
  const off = cumulativePathPointOffsets(pathDs);

  const bodyVerts: { pi: number; li: number; x: number; y: number }[] = [];
  for (let pi = 0; pi < pathDs.length; pi++) {
    if (sleevePathIndices.has(pi)) continue;
    const d = pathDs[pi];
    if (!d) continue;
    const pts = getPathPoints(d);
    for (let li = 0; li < pts.length; li++) {
      const p = pts[li]!;
      const x = p[0]!;
      const y = p[1]!;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      bodyVerts.push({ pi, li, x, y });
    }
  }

  const pairs: BodySleeveSeamPair[] = [];
  for (let pi = 0; pi < pathDs.length; pi++) {
    if (!sleevePathIndices.has(pi)) continue;
    const d = pathDs[pi];
    if (!d) continue;
    const pts = getPathPoints(d);
    const o0 = off[pi] ?? 0;
    for (let li = 0; li < pts.length; li++) {
      const g = o0 + li;
      if (!inRange(g)) continue;
      if (useAllow && !allowedGlobalIndices!.has(g)) continue;
      const p = pts[li]!;
      const sx = p[0]!;
      const sy = p[1]!;
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
      let bestPi = -1;
      let bestLi = -1;
      let bestD2 = Infinity;
      for (const b of bodyVerts) {
        const dx = sx - b.x;
        const dy = sy - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= tol2 && d2 < bestD2 - 1e-18) {
          bestD2 = d2;
          bestPi = b.pi;
          bestLi = b.li;
        }
      }
      if (bestPi >= 0) {
        pairs.push({
          sleevePathIdx: pi,
          sleeveLocalIdx: li,
          bodyPathIdx: bestPi,
          bodyLocalIdx: bestLi,
        });
      }
    }
  }
  return pairs;
}

/** ペアに従い袖 path の該当頂点を胴 path 上の座標へ上書きする */
export function applyBodySleeveSeamSyncAfterLengthMesh(pathDsIn: string[], pairs: BodySleeveSeamPair[]): string[] {
  if (pairs.length === 0) return pathDsIn;
  const pathDs = [...pathDsIn];
  const bySleeve = new Map<number, Map<number, [number, number]>>();
  for (const pr of pairs) {
    const bodyD = pathDs[pr.bodyPathIdx];
    if (!bodyD) continue;
    const bodyPts = getPathPoints(bodyD);
    const bp = bodyPts[pr.bodyLocalIdx];
    if (bp == null) continue;
    const nx = bp[0]!;
    const ny = bp[1]!;
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) continue;
    let locals = bySleeve.get(pr.sleevePathIdx);
    if (locals == null) {
      locals = new Map();
      bySleeve.set(pr.sleevePathIdx, locals);
    }
    locals.set(pr.sleeveLocalIdx, [nx, ny]);
  }
  for (const [sleevePi, locals] of bySleeve) {
    const d = pathDs[sleevePi];
    if (!d) continue;
    pathDs[sleevePi] = tPathWithPointIndex(d, (pointIndex, x, y) => {
      const np = locals.get(pointIndex);
      return np ?? [x, y];
    });
  }
  return pathDs;
}

export function wrapDesignToGarmentCanvasWithYScale(
  designToGarmentCanvas: (gx: number, gy: number) => [number, number],
  lengthTopY: number,
  scale: number
): (gx: number, gy: number) => [number, number] {
  return (gx, gy) => {
    const [x, y] = designToGarmentCanvas(gx, gy);
    return [x, lengthTopY + (y - lengthTopY) * scale];
  };
}

export function applyYScaleToCanvasPoints(
  pts: [number, number][],
  lengthTopY: number,
  scale: number
): [number, number][] {
  const mapY = (y: number) => lengthTopY + (y - lengthTopY) * scale;
  return pts.map(([x, y]) => [x, mapY(y)] as [number, number]);
}

/**
 * 紫着丈の縦スパンを `targetLengthPx`（通常 `size.length × bodyPxPerCm`）に一致させる。
 * 裾側の頂点 Y を調整し、`customPoints` を path から再生成して整合させる。
 */
export function snapPurpleLengthSpanToTargetPx(
  pathDsIn: string[],
  customPointsIn: [number, number][],
  args: {
    customGarmentData: CustomGarmentData;
    genericVertexPlotHighlight: GenericVertexPlotHighlight | null;
    targetLengthPx: number;
  }
): { customPathDs: string[]; customPoints: [number, number][] } | null {
  const { customGarmentData, genericVertexPlotHighlight, targetLengthPx } = args;
  if (!Number.isFinite(targetLengthPx) || targetLengthPx < 0.5) return null;

  const gtLen = customGarmentData.genericSymmetricTop;
  const lmLenA = gtLen?.lengthMeasureVertexStart;
  const lmLenB = gtLen?.lengthMeasureVertexEnd;
  const hlLen = genericVertexPlotHighlight?.lengthMeasure;

  let a: number | undefined;
  let b: number | undefined;
  if (
    lmLenA != null &&
    lmLenB != null &&
    Number.isFinite(lmLenA) &&
    Number.isFinite(lmLenB) &&
    lmLenA !== lmLenB
  ) {
    a = Math.trunc(lmLenA);
    b = Math.trunc(lmLenB);
  } else if (
    hlLen &&
    Number.isFinite(hlLen[0]) &&
    Number.isFinite(hlLen[1]) &&
    hlLen[0] !== hlLen[1]
  ) {
    a = Math.trunc(hlLen[0]);
    b = Math.trunc(hlLen[1]);
  }
  if (a == null || b == null) return null;

  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const pa = customPointsIn[lo] ?? pointAtGlobalVertexIndex(pathDsIn, lo);
  const pb = customPointsIn[hi] ?? pointAtGlobalVertexIndex(pathDsIn, hi);
  if (!pa || !pb) return null;

  const hemG = pa[1] >= pb[1] ? lo : hi;
  const topY = (pa[1] <= pb[1] ? pa : pb)[1];
  const hemY = (pa[1] >= pb[1] ? pa : pb)[1];
  const sign = hemY > topY ? 1 : hemY < topY ? -1 : 1;
  const hemNewY = topY + sign * targetLengthPx;

  const pathDs = [...pathDsIn];
  const off = cumulativePathPointOffsets(pathDs);
  let hemPathIdx = -1;
  let hemLocal = -1;
  for (let i = 0; i < pathDs.length; i++) {
    const o0 = off[i]!;
    const o1 = off[i + 1]!;
    if (hemG >= o0 && hemG < o1) {
      hemPathIdx = i;
      hemLocal = hemG - o0;
      break;
    }
  }
  if (hemPathIdx < 0) return null;

  pathDs[hemPathIdx] = tPathWithPointIndex(pathDs[hemPathIdx]!, (pi, x, y) => {
    if (pi === hemLocal) return [x, hemNewY];
    return [x, y];
  });

  const customPoints = pathDs.flatMap((d) =>
    getPathPoints(d).map(([x, y]) => [x, y] as [number, number])
  );
  if (customPoints.length !== customPointsIn.length) {
    return null;
  }
  return { customPathDs: pathDs, customPoints };
}
