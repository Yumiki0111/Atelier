/**
 * `ScalableGarmentSpec` 向けの着丈・袖丈スケールと sleeveOnly 用の設定（コート専用ではない）。
 * 回転量は computeSleeveRotations で算出し、sleeveOnlyTransform で外腕にブレンド（袖付けは weight=0）。
 */

import type { ScalableGarmentSpec } from "./types";
import { polylineVerticalAbsDySumPx } from "@/lib/fitting-compute/fittingCanvasPolylineMeasure";
import { tPath, tPathWithPointIndex, getPathPoints, collectPtsGlobalVertexRange } from "./pathUtils";

/** 連続する複数輪郭線の点列（順に結合） */
function collectPathPointsInLineRange(pathDs: string[], start: number, end?: number): [number, number][] {
  const e = end ?? start;
  const lo = Math.min(start, e);
  const hi = Math.max(start, e);
  const out: [number, number][] = [];
  for (let i = lo; i <= hi; i++) {
    const d = pathDs[i];
    if (d) out.push(...getPathPoints(d));
  }
  return out;
}

export interface ArmLogicConfig {
  /** 袖パス（輪郭線インデックス開始）。着丈・袖丈スケールの対象（外腕の肩帯回転とは別 path） */
  sleevePathLeft: number;
  /** 左袖の終了インデックス（包含）。省略時は sleevePathLeft のみ */
  sleevePathLeftEnd?: number;
  sleevePathRight: number;
  sleevePathRightEnd?: number;
  /** 外腕シーム開始インデックス */
  seamPathLeft: number;
  seamPathLeftEnd?: number;
  seamPathRight: number;
  seamPathRightEnd?: number;
  attachLSvg: [number, number];
  attachRSvg: [number, number];
  scalableSpec: ScalableGarmentSpec;
  seamBlendMaxDist: number;
  skinningMaxDist: number;
  /** true なら外腕シームの flatten＋胴と分離したスケール経路。回転は袖付けで重み 0 */
  sleeveOnly?: boolean;
  /** 指定時、左外腕シームの点列は連結頂点この範囲に限定（path 範囲より優先） */
  seamOuterLeftVertices?: [number, number];
  seamOuterRightVertices?: [number, number];
}

/** 前中心付近・裾帯のみ。着丈グレーディング前に design Y をサイド裾レベルまで揃える */
const GRADING_HEM_ALIGN_STRIP_HALF_FALLBACK = 18;
const GRADING_HEM_ALIGN_BAND_FRAC = 0.18;

/**
 * `bodyPathIndices` の裾帯で、前中心以外（サイド）の最深 Y を取る。
 * `designHemY` だけでは前中心が浅いまま残るため、ここをターゲットにする。
 */
export function computeGradingHemAlignTargetY(
  pathDs: string[],
  spec: ScalableGarmentSpec,
  _shoulderY: number
): number {
  const ox = spec.gradingHemAlignOriginX;
  if (ox == null || !Number.isFinite(ox)) return spec.designHemY;

  const pts: [number, number][] = [];
  for (const idx of spec.bodyPathIndices) {
    const d = pathDs[idx];
    if (d) pts.push(...getPathPoints(d));
  }
  if (pts.length < 2) return spec.designHemY;

  const ys = pts.map((p) => p[1]);
  const xs = pts.map((p) => p[0]);
  const yMax = Math.max(...ys);
  const yMin = Math.min(...ys);
  const spanY = Math.max(yMax - yMin, 1);
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1);
  const bandTop = yMax - spanY * 0.22;
  const hemBand = pts.filter((p) => p[1] >= bandTop);
  if (hemBand.length === 0) return Math.max(spec.designHemY, yMax);

  const lateralDist = Math.max(28, spanX * 0.045);
  const sideOnly = hemBand.filter((p) => Math.abs(p[0] - ox) > lateralDist);
  const sideMaxY =
    sideOnly.length > 0 ? Math.max(...sideOnly.map((p) => p[1])) : Math.max(...hemBand.map((p) => p[1]));
  return Math.max(spec.designHemY, sideMaxY);
}

function designYAfterHemGradingAlign(
  gx: number,
  gy: number,
  spec: ScalableGarmentSpec,
  shoulderY: number
): number {
  const ox = spec.gradingHemAlignOriginX;
  if (ox == null || !Number.isFinite(ox)) return gy;
  const stripHalf = Math.max(3, spec.gradingHemAlignStripHalf ?? GRADING_HEM_ALIGN_STRIP_HALF_FALLBACK);
  if (Math.abs(gx - ox) > stripHalf) return gy;
  const targetY = spec.gradingHemAlignTargetY ?? spec.designHemY;
  const depth = Math.max(targetY - shoulderY, 1);
  const hemBandTop = targetY - depth * GRADING_HEM_ALIGN_BAND_FRAC;
  if (gy < hemBandTop) return gy;
  return Math.max(gy, targetY);
}

/** 着丈を採寸どおりにスケール。肩Y固定、それより下をY方向にスケール（裾揃えは任意で先に design Y を補正） */
export function scaleBodyToSpec(
  pathD: string,
  pathIdx: number,
  spec: ScalableGarmentSpec,
  specLengthCm: number,
  shoulderY: number
): string {
  const s = specLengthCm / spec.bodyLengthCm;
  if (!spec.bodyPathIndices.includes(pathIdx)) return pathD;
  return tPath(pathD, (gx, gy) => {
    let gyDesign = gy;
    if (gyDesign > shoulderY) {
      gyDesign = designYAfterHemGradingAlign(gx, gyDesign, spec, shoulderY);
    }
    if (gyDesign <= shoulderY) return [gx, gyDesign];
    const newY = shoulderY + (gyDesign - shoulderY) * s;
    return [gx, newY];
  });
}

/** `pts` 上で i0〜i1（包含端点）に沿った縦 |Δy| の合算（着丈・オーバーレイの袖丈表示と同じ定義） */
function polylineVerticalAbsDySumPxBetween(
  pts: [number, number][],
  i0: number,
  i1: number
): number {
  const lo = Math.min(i0, i1);
  const hi = Math.max(i0, i1);
  if (lo < 0 || hi >= pts.length || lo >= hi) return 0;
  return polylineVerticalAbsDySumPx(pts.slice(lo, hi + 1));
}

/** 袖パスを採寸スケールに合わせて変換（基準袖丈は lengthStart〜lengthEnd 間の縦 |Δy| 合算。採寸オーバーレイと一致） */
export function scaleSleevePathToSpec(
  pathD: string,
  spec: ScalableGarmentSpec,
  specSleeveCm: number,
  garmentLengthPx: number
): string {
  const pts = getPathPoints(pathD);
  const { sleeve } = spec;
  /** path 上の向きで end<start になり得る。変形区間は index 順に min〜max（採寸の polylineBetween は既に min/max）。 */
  const lengthIdxLo = Math.min(sleeve.lengthStartIdx, sleeve.lengthEndIdx);
  const lengthIdxHi = Math.max(sleeve.lengthStartIdx, sleeve.lengthEndIdx);
  const minLen = Math.max(lengthIdxHi, sleeve.innerAnchorIdx ?? 0) + 1;
  if (pts.length < minLen) return pathD;

  const anchor = pts[sleeve.anchorIdx];
  const bodyLenCm = Math.max(spec.bodyLengthCm, 1e-6);
  const pxPerCm = garmentLengthPx / bodyLenCm;
  const chain = sleeve.measureLocalChain;
  let lenPx: number;
  if (chain && chain.length >= 2) {
    const chainPts = chain
      .map((i) => pts[i])
      .filter((p): p is [number, number] => p != null && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    lenPx =
      chainPts.length >= 2
        ? polylineVerticalAbsDySumPx(chainPts)
        : polylineVerticalAbsDySumPxBetween(pts, sleeve.lengthStartIdx, sleeve.lengthEndIdx);
  } else {
    lenPx = polylineVerticalAbsDySumPxBetween(pts, sleeve.lengthStartIdx, sleeve.lengthEndIdx);
  }
  const measuredCm = lenPx / pxPerCm;
  if (measuredCm <= 0) return pathD;
  const s = specSleeveCm / measuredCm;

  const scaleInner = sleeve.innerScaleFn?.(specSleeveCm) ?? 1;
  const innerAnchor = sleeve.innerAnchorIdx != null ? pts[sleeve.innerAnchorIdx!] : null;
  const applyExclusiveEnd = sleeve.lengthApplyEndExclusive ?? lengthIdxHi + 1;

  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    if (pointIndex < lengthIdxLo) return [x, y];
    if (sleeve.innerIndices && innerAnchor != null && pointIndex >= sleeve.innerIndices[0] && pointIndex <= sleeve.innerIndices[1]) {
      return [
        innerAnchor[0] + (x - innerAnchor[0]) * scaleInner,
        innerAnchor[1] + (y - innerAnchor[1]) * scaleInner,
      ];
    }
    if (pointIndex >= lengthIdxLo && pointIndex < applyExclusiveEnd) {
      return [anchor[0] + (x - anchor[0]) * s, anchor[1] + (y - anchor[1]) * s];
    }
    return [x, y];
  });
}

/**
 * 上袖採寸区間 [lengthIdxLo, lengthIdxHi] と下袖 global 範囲から、エルボ側の接続頂点のローカル index を決める。
 * 下袖が採寸終端以降（境界頂点を共有する場合も含む）なら `lengthIdxHi`、
 * 採寸始端以前（境界共有含む）なら `lengthIdxLo`。両区間が内部で重なるなら null。
 *
 * 旧実装は厳密な不等号（`>`/`<`）だったため、下袖レンジが採寸終端（または始端）に
 * ちょうど接触するだけのとき null を返していた。これによりエルボ追従がスキップされ、
 * 一様 Y スケール後にジャンクションだけが動いて下袖が元の位置に残る段差・めり込みを引き起こしていた。
 * `>=`/`<=` に修正することで境界共有を「重なりなし」と正しく判定する。
 */
export function pickSleeveLowerJunctionLocalIndex(
  pathGlobalVertexOffset: number,
  lengthIdxLo: number,
  lengthIdxHi: number,
  lowerGlobalLo: number,
  lowerGlobalHi: number
): number | null {
  const gLo = Math.min(lowerGlobalLo, lowerGlobalHi);
  const gHi = Math.max(lowerGlobalLo, lowerGlobalHi);
  let lowerLocalMin = Infinity;
  let lowerLocalMax = -Infinity;
  for (let g = gLo; g <= gHi; g++) {
    const li = g - pathGlobalVertexOffset;
    if (li < 0) continue;
    if (li < lowerLocalMin) lowerLocalMin = li;
    if (li > lowerLocalMax) lowerLocalMax = li;
  }
  if (!Number.isFinite(lowerLocalMin) || lowerLocalMax < 0) return null;
  // 下袖が採寸終端以降（境界頂点を共有する場合も含む）
  if (lowerLocalMin >= lengthIdxHi) return lengthIdxHi;
  // 下袖が採寸始端以前（境界頂点を共有する場合も含む）
  if (lowerLocalMax <= lengthIdxLo) return lengthIdxLo;
  return null;
}

/**
 * 下袖の「胴側」端点（袖口ではない方）。`lowerSleeveSnapToBodyGlobalVertex` がレンジ内なら優先、
 * さもなければ junction から見て反対端（下袖が採寸終端より index が大きいときは `lb`、小さいときは `la`）。
 */
export function resolveLowerSleeveBodySeamLocal(
  junctionLocal: number,
  la: number,
  lb: number,
  lowerOnHigherPathIndices: boolean,
  bodyLocalOverride: number | null
): number | null {
  if (la > lb || !Number.isFinite(la) || !Number.isFinite(lb)) return null;
  if (
    bodyLocalOverride != null &&
    Number.isFinite(bodyLocalOverride) &&
    bodyLocalOverride >= la &&
    bodyLocalOverride <= lb
  ) {
    return Math.trunc(bodyLocalOverride);
  }
  return lowerOnHigherPathIndices ? lb : la;
}

/**
 * ジャンクションから下袖区間へ入った最初の頂点（歴史的用途・他モジュール向け）。
 * 下袖内点の幾何は `generic/sleeveLower` が {@link resolveLowerSleeveBodySeamLocal} および
 * {@link buildLowerSleeveChainBodyToJunction} と併用する。
 */
export function resolveLowerSleeveBodyAnchorLocal(
  junctionLocal: number,
  lowerGlobalLo: number,
  lowerGlobalHi: number,
  pathGlobalVertexOffset: number,
  lowerOnHigherPathIndices: boolean,
  pathPointCount: number
): number | null {
  const rgLo = Math.min(lowerGlobalLo, lowerGlobalHi);
  const rgHi = Math.max(lowerGlobalLo, lowerGlobalHi);
  const off = pathGlobalVertexOffset;
  const la = rgLo - off;
  const lb = rgHi - off;
  if (!Number.isFinite(la) || !Number.isFinite(lb) || la > lb) return null;
  if (la < 0 || lb >= pathPointCount) return null;

  if (lowerOnHigherPathIndices) {
    let best: number | null = null;
    for (let li = la; li <= lb; li++) {
      if (li <= junctionLocal) continue;
      if (best === null || li < best) best = li;
    }
    return best;
  }
  let best: number | null = null;
  for (let li = la; li <= lb; li++) {
    if (li >= junctionLocal) continue;
    if (best === null || li > best) best = li;
  }
  return best;
}

/**
 * 胴端〜ジャンクションの path 上連続 index 列（両端含む）。
 * ジャンクションは採寸終端と共有され **下袖レンジ [la,lb] 外**（例 Hi=24, 下袖 25–30）になり得る。
 * 歩道上の各 index は「下袖レンジ内」または「ジャンクションのみ」なら通過可。
 */
export function buildLowerSleeveChainBodyToJunction(
  bodyLocal: number,
  junctionLocal: number,
  la: number,
  lb: number,
  pathPointCount: number
): number[] | null {
  if (bodyLocal < la || bodyLocal > lb) return null;
  if (bodyLocal === junctionLocal) return null;
  const step = bodyLocal < junctionLocal ? 1 : -1;
  const out: number[] = [];
  for (let li = bodyLocal; ; li += step) {
    if (li < 0 || li >= pathPointCount) return null;
    const inBand = li >= la && li <= lb;
    const isJunc = li === junctionLocal;
    if (!inBand && !isJunc) return null;
    out.push(li);
    if (li === junctionLocal) break;
  }
  return out;
}

/**
 * 上袖の anchor スケールで接続点が動いた分だけ、下袖頂点（採寸区間外かつ指定 global 範囲）を平行移動する。
 */
export function translateSleeveLowerFollowElbowMove(
  pathD: string,
  pathGlobalVertexOffset: number,
  lengthIdxLo: number,
  lengthIdxHi: number,
  lowerGlobalLo: number,
  lowerGlobalHi: number,
  elbowBefore: [number, number],
  elbowAfter: [number, number]
): string {
  const dx = elbowAfter[0] - elbowBefore[0];
  const dy = elbowAfter[1] - elbowBefore[1];
  if ((dx === 0 && dy === 0) || !Number.isFinite(dx) || !Number.isFinite(dy)) return pathD;
  const rgLo = Math.min(lowerGlobalLo, lowerGlobalHi);
  const rgHi = Math.max(lowerGlobalLo, lowerGlobalHi);
  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    const g = pathGlobalVertexOffset + pointIndex;
    if (g < rgLo || g > rgHi) return [x, y];
    if (pointIndex >= lengthIdxLo && pointIndex <= lengthIdxHi) return [x, y];
    return [x + dx, y + dy];
  });
}

/**
 * 袖パス上の連続2頂点 i0（固定）と i1（移動）のみ変形。
 * i1 を i0→i1 の直線上に移動し、**最初の1辺のユークリッド長**が targetSegLenPx になる（他の頂点は変更しない）。
 */
export function applySleeveFirstEdgeEuclideanStretchToPath(
  pathD: string,
  i0: number,
  i1: number,
  targetSegLenPx: number
): string {
  const pts = getPathPoints(pathD);
  if (i0 < 0 || i1 < 0 || i0 >= pts.length || i1 >= pts.length || i0 === i1) return pathD;
  const p0 = pts[i0]!;
  const p1 = pts[i1]!;
  const u = [p1[0] - p0[0], p1[1] - p0[1]];
  const len = Math.hypot(u[0], u[1]);
  if (len < 1e-9) return pathD;
  const ux = u[0] / len;
  const uy = u[1] / len;
  const t = Math.max(targetSegLenPx, 0);
  const p1New: [number, number] = [p0[0] + t * ux, p0[1] + t * uy];
  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    if (pointIndex === i1) return p1New;
    return [x, y];
  });
}

/**
 * 袖パス上の連続2頂点 i0（上袖口側・固定）と i1（その次）だけを変形する。
 * i1 を i0→i1 の直線上に移動し、縦スパン |Δy| が targetVertPx に一致する（他の頂点は変更しない）。
 * @deprecated 袖丈の幾何は弧長（三平方）に統一したため、通常は {@link applySleeveFirstEdgeEuclideanStretchToPath} またはチェーン弧長ソルバを使う。
 */
export function applySleeveFirstEdgeVerticalStretchToPath(
  pathD: string,
  i0: number,
  i1: number,
  targetVertPxAbs: number
): string {
  const pts = getPathPoints(pathD);
  if (i0 < 0 || i1 < 0 || i0 >= pts.length || i1 >= pts.length || i0 === i1) return pathD;
  const p0 = pts[i0]!;
  const p1 = pts[i1]!;
  const u = [p1[0] - p0[0], p1[1] - p0[1]];
  const len = Math.hypot(u[0], u[1]);
  if (len < 1e-9) return pathD;
  const ux = u[0] / len;
  const uy = u[1] / len;
  if (Math.abs(uy) < 1e-12) return pathD;
  const sign = Math.sign(uy) || 1;
  const t = (sign * Math.max(targetVertPxAbs, 0)) / uy;
  const p1New: [number, number] = [p0[0] + t * ux, p0[1] + t * uy];
  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    if (pointIndex === i1) return p1New;
    return [x, y];
  });
}

/** 決め打ちの一様スケール s を袖の length 区間に適用（`scaleSleevePathToSpec` と同じ変形）。
 * 汎用トップの格子探索・フォールバックに使う。内袖ありのときは `specSleeveCmForInner` を渡す。
 */
export function applySleeveUniformYScaleFromAnchor(
  pathD: string,
  sleeve: ScalableGarmentSpec["sleeve"],
  s: number,
  specSleeveCmForInner = 0
): string {
  const pts = getPathPoints(pathD);
  const lengthIdxLo = Math.min(sleeve.lengthStartIdx, sleeve.lengthEndIdx);
  const lengthIdxHi = Math.max(sleeve.lengthStartIdx, sleeve.lengthEndIdx);
  const minLen = Math.max(lengthIdxHi, sleeve.innerAnchorIdx ?? 0) + 1;
  if (pts.length < minLen) return pathD;

  const anchor = pts[sleeve.anchorIdx];
  const scaleInner = sleeve.innerScaleFn?.(specSleeveCmForInner) ?? 1;
  const innerAnchor = sleeve.innerAnchorIdx != null ? pts[sleeve.innerAnchorIdx!] : null;
  const applyExclusiveEnd = sleeve.lengthApplyEndExclusive ?? lengthIdxHi + 1;

  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    if (pointIndex < lengthIdxLo) return [x, y];
    if (sleeve.innerIndices && innerAnchor != null && pointIndex >= sleeve.innerIndices[0] && pointIndex <= sleeve.innerIndices[1]) {
      return [
        innerAnchor[0] + (x - innerAnchor[0]) * scaleInner,
        innerAnchor[1] + (y - innerAnchor[1]) * scaleInner,
      ];
    }
    if (pointIndex >= lengthIdxLo && pointIndex < applyExclusiveEnd) {
      return [anchor[0] + (x - anchor[0]) * s, anchor[1] + (y - anchor[1]) * s];
    }
    return [x, y];
  });
}

export function rotateAround(
  pt: [number, number],
  pivot: [number, number],
  theta: number
): [number, number] {
  const dx = pt[0] - pivot[0];
  const dy = pt[1] - pivot[1];
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
}

/** 袖を腕の角度に合わせた回転量（sleeveOnlyTransform で外腕にブレンド） */
export function computeSleeveRotations(
  pathDs: string[],
  config: ArmLogicConfig,
  specSleeveCm: number,
  garmentLengthPx: number,
  place: (x: number, y: number) => [number, number],
  leftShoulder: [number, number],
  rightShoulder: [number, number],
  leftArmPts: [number, number][],
  rightArmPts: [number, number][]
): { sleeveRotationL: number; sleeveRotationR: number } {
  let sleeveRotationL = 0;
  let sleeveRotationR = 0;

  if (config.sleeveOnly) {
    const { seamPathLeft, seamPathLeftEnd, seamPathRight, seamPathRightEnd } = config;
    const leftSeamPts =
      config.seamOuterLeftVertices != null
        ? collectPtsGlobalVertexRange(
            pathDs,
            config.seamOuterLeftVertices[0],
            config.seamOuterLeftVertices[1]
          )
        : collectPathPointsInLineRange(pathDs, seamPathLeft, seamPathLeftEnd);
    const rightSeamPts =
      config.seamOuterRightVertices != null
        ? collectPtsGlobalVertexRange(
            pathDs,
            config.seamOuterRightVertices[0],
            config.seamOuterRightVertices[1]
          )
        : collectPathPointsInLineRange(pathDs, seamPathRight, seamPathRightEnd);
    if (leftSeamPts.length === 0 || rightSeamPts.length === 0) {
      return { sleeveRotationL: 0, sleeveRotationR: 0 };
    }

    let leftSeamWristSvg = leftSeamPts[0];
    let minPlacedX = Infinity;
    for (const pt of leftSeamPts) {
      const px = place(pt[0], pt[1])[0];
      if (px < minPlacedX) {
        minPlacedX = px;
        leftSeamWristSvg = pt;
      }
    }
    const placedSeamCuffL = place(leftSeamWristSvg[0], leftSeamWristSvg[1]);
    const sleeveAngleL = Math.atan2(
      placedSeamCuffL[1] - leftShoulder[1],
      placedSeamCuffL[0] - leftShoulder[0]
    );

    let targetArmL = leftArmPts[leftArmPts.length - 1];
    let bestYDistL = Infinity;
    for (const pt of leftArmPts) {
      const dist = Math.abs(pt[1] - placedSeamCuffL[1]);
      if (dist < bestYDistL) {
        bestYDistL = dist;
        targetArmL = pt;
      }
    }
    const armAngleL = Math.atan2(targetArmL[1] - leftShoulder[1], targetArmL[0] - leftShoulder[0]);
    sleeveRotationL = armAngleL - sleeveAngleL;

    let rightSeamWristSvg = rightSeamPts[0];
    let maxPlacedX = -Infinity;
    for (const pt of rightSeamPts) {
      const px = place(pt[0], pt[1])[0];
      if (px > maxPlacedX) {
        maxPlacedX = px;
        rightSeamWristSvg = pt;
      }
    }
    const placedSeamCuffR = place(rightSeamWristSvg[0], rightSeamWristSvg[1]);
    const sleeveAngleR = Math.atan2(
      placedSeamCuffR[1] - rightShoulder[1],
      placedSeamCuffR[0] - rightShoulder[0]
    );

    let targetArmR = rightArmPts[rightArmPts.length - 1];
    let bestYDistR = Infinity;
    for (const pt of rightArmPts) {
      const dist = Math.abs(pt[1] - placedSeamCuffR[1]);
      if (dist < bestYDistR) {
        bestYDistR = dist;
        targetArmR = pt;
      }
    }
    const armAngleR = Math.atan2(targetArmR[1] - rightShoulder[1], targetArmR[0] - rightShoulder[0]);
    sleeveRotationR = armAngleR - sleeveAngleR;

    return { sleeveRotationL, sleeveRotationR };
  }

  return { sleeveRotationL: 0, sleeveRotationR: 0 };
}
