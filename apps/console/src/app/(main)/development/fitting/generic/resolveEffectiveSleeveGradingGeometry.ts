/**
 * 汎用トップの袖 Y スケール対象 path は **採寸の始点・終点が乗る単一 path** からだけ決める（リマップなし）。
 * 溶接スキップ・中心 X スナップ用の「ガイドっぽい path」判定は別用途（幾何ヒューリスティックが残る）。
 */

import type { CustomGarmentData, CustomLandmarks } from "../lib/types";
import {
  getPathPoints,
  pathIndexForGlobalVertex,
  vertexRangeToCoveringPathRange,
} from "../lib/pathUtils";
import { hasDistinctVertexPair } from "./genericMeasureOnlyShared";

function garmentRefHeightPx(lm: CustomLandmarks): number {
  return Math.max(lm.hemY - lm.shoulderY, 1);
}

function designBBoxFromPaths(pathDs: string[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} | null {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  let any = false;
  for (const d of pathDs) {
    for (const [x, y] of getPathPoints(d)) {
      any = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!any || !Number.isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

/**
 * 2 点・ほぼ縦の超長い path をセンターガイドとみなす。
 * `pathDs` を渡すと **全 path のバウンディング中心 X** でも判定し、肩ランドマークのズレに耐える。
 */
export function isLikelyVerticalSymmetryGuidePath(
  pathD: string,
  lm: CustomLandmarks,
  pathDsForContext?: string[]
): boolean {
  const pts = getPathPoints(pathD);
  if (pts.length !== 2) return false;
  const p0 = pts[0]!;
  const p1 = pts[1]!;
  const dx = Math.abs(p1[0] - p0[0]);
  const dy = Math.abs(p1[1] - p0[1]);
  if (dy < 80) return false;
  const vertical = dx <= Math.max(4, 0.08 * dy);
  if (!vertical) return false;

  const refH = garmentRefHeightPx(lm);
  const spanOk = dy >= Math.max(120, refH * 0.2);
  if (!spanOk && dy < 260) return false;

  const mx = (p0[0] + p1[0]) / 2;
  const shoulderCX = (lm.shoulderLx + lm.shoulderRx) / 2;
  const shoulderW = Math.max(lm.shoulderRx - lm.shoulderLx, 1);
  const tolShoulder = Math.max(18, 0.1 * shoulderW);
  if (Math.abs(mx - shoulderCX) <= tolShoulder) {
    return dy >= Math.max(100, refH * 0.22);
  }

  const bb = pathDsForContext?.length ? designBBoxFromPaths(pathDsForContext) : null;
  if (bb) {
    const bw = Math.max(bb.maxX - bb.minX, 1);
    const bh = Math.max(bb.maxY - bb.minY, 1);
    const bboxCX = (bb.minX + bb.maxX) / 2;
    const tolB = Math.max(28, 0.07 * bw);
    if (Math.abs(mx - bboxCX) <= tolB && dy >= Math.max(140, bh * 0.26)) {
      return true;
    }
    if (
      dy >= Math.max(220, bh * 0.28) &&
      dx <= Math.max(3, 0.05 * dy) &&
      mx >= bb.minX + 0.2 * bw &&
      mx <= bb.maxX - 0.2 * bw
    ) {
      return true;
    }
  }

  return false;
}

/**
 * センターラインが細かく分割されても、バウンディングが「細い縦棒」なら補助線扱い。
 */
export function isNearlyVerticalThinPath(pathD: string): boolean {
  const pts = getPathPoints(pathD);
  if (pts.length < 2 || pts.length > 28) return false;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (h < 90) return false;
  return w <= Math.max(12, 0.14 * h);
}

/**
 * 前中心付近の「縦長構築線」path。頂点数が多いと isNearlyVerticalThinPath が外れるため別判定。
 */
export function isVerticalCenterSpinePath(
  pathD: string,
  lm: CustomLandmarks,
  pathDs: string[]
): boolean {
  const pts = getPathPoints(pathD);
  if (pts.length < 2 || pathDs.length === 0) return false;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  let sx = 0;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    sx += x;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (h < 80) return false;
  if (w > Math.max(24, 0.22 * h)) return false;
  const { cx, width: layoutW } = layoutCenterX(pathDs, lm);
  const tol = Math.max(20, 0.06 * layoutW);
  const meanX = sx / pts.length;
  const midX = (minX + maxX) / 2;
  if (Math.abs(meanX - cx) > tol || Math.abs(midX - cx) > tol) return false;
  return true;
}

export function isGlobalVertexOnSymmetryGuidePath(
  pathDs: string[],
  lm: CustomLandmarks,
  g: number
): boolean {
  const pi = pathIndexForGlobalVertex(pathDs, Math.trunc(g));
  if (pi == null) return false;
  const d = pathDs[pi]!;
  return (
    isLikelyVerticalSymmetryGuidePath(d, lm, pathDs) ||
    isNearlyVerticalThinPath(d) ||
    isVerticalCenterSpinePath(d, lm, pathDs)
  );
}

/**
 * 以前: 前中心付近の縦パスをレイアウト中心 X に揃えていた。
 * ヒューリスティックが構築線以外（前中心付近の縦シーム・装飾線等）も拾い、
 * 全頂点を同一 X に潰してしまうため無効化（呼び出し元は互換のため残す）。
 */
export function snapVerticalConstructionPathsToLayoutCenterX(
  _pathDs: string[],
  _lm: CustomLandmarks
): void {
  // no-op
}

/** 肩ランドマークと全体 bbox の中心が大きくずれるときは bbox 中心を前後中心とみなす */
function layoutCenterX(pathDs: string[], lm: CustomLandmarks): { cx: number; width: number } {
  const bb = designBBoxFromPaths(pathDs);
  const shoulderW = Math.max(lm.shoulderRx - lm.shoulderLx, 1);
  const shoulderCx = (lm.shoulderLx + lm.shoulderRx) / 2;
  if (!bb) return { cx: shoulderCx, width: shoulderW };
  const bw = Math.max(bb.maxX - bb.minX, 1);
  const bboxCx = (bb.minX + bb.maxX) / 2;
  if (Math.abs(bboxCx - shoulderCx) > Math.max(55, 0.045 * bw)) {
    return { cx: bboxCx, width: bw };
  }
  return { cx: shoulderCx, width: Math.max(shoulderW, bw) };
}

/** チェーン内の # を順序維持で重複除去 */
function dedupeGlobalChainPreserveOrder(chain: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of chain) {
    const g = Math.trunc(raw);
    if (!Number.isFinite(g) || g < 0 || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
  }
  return out;
}

export type EffectiveSleeveGradingGeometry = {
  sleevePathIdx: number;
  gLo: number;
  gHi: number;
  /** 袖丈ポリライン計測（弧長）。オーバーレイ・表示は主にこちら。未指定なら gLo/gHi の 2 点のみ */
  globalChainForMeasure?: number[];
  /**
   * cm 合わせ・袖丈ソルバが使う弧長チェーン。未指定時は `globalChainForMeasure` と同じ。
   */
  globalChainForArcTarget?: number[];
  /** 互換用。常に false（コードは袖 path を差し替えない） */
  remappedFromSymmetryGuide: boolean;
};

function attachArcTargetChainIfValid(
  pathDs: string[],
  base: EffectiveSleeveGradingGeometry,
  arcTargetGt: number[] | undefined
): EffectiveSleeveGradingGeometry {
  if (arcTargetGt == null || arcTargetGt.length < 2) return base;
  const deduped = dedupeGlobalChainPreserveOrder(arcTargetGt.map((g) => Math.trunc(g)));
  if (deduped.length < 2) return base;
  for (const g of deduped) {
    const pi = pathIndexForGlobalVertex(pathDs, g);
    if (pi == null || pi !== base.sleevePathIdx) return base;
  }
  return { ...base, globalChainForArcTarget: deduped };
}

/**
 * 始点〜終点の min/max が path を跨ぐが、連結チェーンの全 # が同一 path に乗るときの救済。
 * （UI では終点が次 path の先頭に吸われている等で min/max だけが跨ぐことがある）
 */
function trySleeveGradingGeometryFromChainOnSinglePath(
  pathDs: string[],
  chainGt: number[]
): EffectiveSleeveGradingGeometry | null {
  const deduped = dedupeGlobalChainPreserveOrder(chainGt.map((g) => Math.trunc(g)));
  if (deduped.length < 2) return null;
  let pathIdx: number | null = null;
  for (const g of deduped) {
    const pi = pathIndexForGlobalVertex(pathDs, g);
    if (pi == null) return null;
    if (pathIdx == null) pathIdx = pi;
    else if (pi !== pathIdx) return null;
  }
  const gLo = Math.min(...deduped);
  const gHi = Math.max(...deduped);
  const cover = vertexRangeToCoveringPathRange(pathDs, gLo, gHi);
  if (!cover || cover.from !== cover.to || cover.from !== pathIdx) return null;
  return {
    sleevePathIdx: pathIdx,
    gLo,
    gHi,
    globalChainForMeasure: deduped,
    remappedFromSymmetryGuide: false,
  };
}

/**
 * 袖 Y スケール対象は単一 path 上の区間。
 * - まず始点・終点の min/max が単一 path に収まるか見る。
 * - 収まらず **`sleeveMeasureVertexChain` が 2 点以上**あるとき、チェーンの全 # が同一 path なら **そのチェーンの min/max** で採寸区間を決める（上記救済）。
 * - チェーンが複数 path に跨ぐ場合は null。
 */
export function resolveSleeveGradingGeometryForVertexRange(
  pathDs: string[],
  vertexStart: number | undefined,
  vertexEnd: number | undefined,
  chainGt?: number[]
): EffectiveSleeveGradingGeometry | null {
  if (
    vertexStart == null ||
    vertexEnd == null ||
    !Number.isFinite(vertexStart) ||
    !Number.isFinite(vertexEnd)
  ) {
    return null;
  }
  const a = Math.trunc(vertexStart);
  const b = Math.trunc(vertexEnd);
  if (a === b) return null;
  const rawLo = Math.min(a, b);
  const rawHi = Math.max(a, b);
  const cover = vertexRangeToCoveringPathRange(pathDs, rawLo, rawHi);
  if (!cover || cover.from !== cover.to) {
    if (chainGt && chainGt.length >= 2) {
      const fromChain = trySleeveGradingGeometryFromChainOnSinglePath(pathDs, chainGt);
      if (fromChain != null) return fromChain;
    }
    return null;
  }
  const rawPathIdx = cover.from;

  let globalChainForMeasure: number[] | undefined;
  if (chainGt && chainGt.length >= 2) {
    const deduped = dedupeGlobalChainPreserveOrder(chainGt.map((g) => Math.trunc(g)));
    if (deduped.length < 2) return null;
    for (const g of deduped) {
      const pi = pathIndexForGlobalVertex(pathDs, g);
      if (pi !== rawPathIdx) return null;
    }
    globalChainForMeasure = deduped;
  }

  return {
    sleevePathIdx: rawPathIdx,
    gLo: rawLo,
    gHi: rawHi,
    globalChainForMeasure,
    remappedFromSymmetryGuide: false,
  };
}

/**
 * 袖 Y スケール対象は単一 path 上の区間（`resolveSleeveGradingGeometryForVertexRange` 参照）。
 */
export function resolveEffectiveSleeveGradingGeometry(
  pathDs: string[],
  _lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): EffectiveSleeveGradingGeometry | null {
  const base = resolveSleeveGradingGeometryForVertexRange(
    pathDs,
    gt.sleeveMeasureVertexStart,
    gt.sleeveMeasureVertexEnd,
    gt.sleeveMeasureVertexChain
  );
  if (base == null) return null;
  return attachArcTargetChainIfValid(pathDs, base, gt.sleeveMeasureArcTargetChain);
}

/** ミラー袖（`sleeveMirrorMeasureVertex*`）の単一 path 幾何。 */
export function resolveEffectiveMirrorSleeveGradingGeometry(
  pathDs: string[],
  _lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): EffectiveSleeveGradingGeometry | null {
  const base = resolveSleeveGradingGeometryForVertexRange(
    pathDs,
    gt.sleeveMirrorMeasureVertexStart,
    gt.sleeveMirrorMeasureVertexEnd,
    gt.sleeveMirrorMeasureVertexChain
  );
  if (base == null) return null;
  return attachArcTargetChainIfValid(pathDs, base, gt.sleeveMirrorMeasureArcTargetChain);
}

/**
 * 胴着丈グレード・キャンバス着丈 Y メッシュから **除外する** path index（袖採寸が乗る path）。
 * 袖に一様 Y スケールを掛けたあと袖丈で再スケールすると二重になり、縮み→収束のように見える。
 */
export function collectSleevePathIndicesForGrading(
  pathDs: string[],
  lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): Set<number> {
  const s = new Set<number>();
  if (hasDistinctVertexPair(gt.sleeveMeasureVertexStart, gt.sleeveMeasureVertexEnd)) {
    const p = resolveEffectiveSleeveGradingGeometry(pathDs, lm, gt);
    if (p) s.add(p.sleevePathIdx);
  }
  if (hasDistinctVertexPair(gt.sleeveMirrorMeasureVertexStart, gt.sleeveMirrorMeasureVertexEnd)) {
    const m = resolveEffectiveMirrorSleeveGradingGeometry(pathDs, lm, gt);
    if (m) s.add(m.sleevePathIdx);
  }
  return s;
}
