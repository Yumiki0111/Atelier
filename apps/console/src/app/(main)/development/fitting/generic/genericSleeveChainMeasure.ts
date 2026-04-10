import type { CustomGarmentData, CustomLandmarks, SizeMeasure } from "../lib/types";
import { pointAtGlobalVertexIndex } from "../lib/pathUtils";
import { polylineArcLengthPx } from "@/lib/fitting-compute/fittingCanvasPolylineMeasure";
import { resolveEffectiveSleeveGradingGeometry } from "./resolveEffectiveSleeveGradingGeometry";
import {
  bodyLengthCmForGenericSleeveCal,
  resolveGarmentLengthPxForSleeveMeasure,
} from "./genericMeasureOnlyLengthRefs";
import { hasDistinctVertexPair } from "./genericMeasureOnlyShared";

export type GenericSleeveMeasureVertexOverride = {
  start: number;
  end: number;
  chain?: number[];
};

/** 袖スケールが実際に使ったグローバル頂点範囲（オーバーレイ幾何と一致させる） */
export type SleeveVertexLockForPipelineMeasure = {
  start: number;
  end: number;
  chain: number[] | undefined;
};

/**
 * 袖採寸の **px**（チェーンあり: 各セグメントを三平方で √(Δx²+Δy²) として弧長に合算、
 * 端点2点のみ: その2点間のユークリッド距離）。名前は歴史的経緯で Vertical のまま。
 */
export function sleeveVerticalPxFromGlobalVertices(
  pathDs: string[],
  start: number,
  end: number,
  chain?: number[],
  customPoints?: [number, number][]
): number {
  const getPt = (gi: number): [number, number] | null => {
    const g = Math.trunc(gi);
    if (customPoints && g >= 0 && g < customPoints.length) {
      const p = customPoints[g];
      if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) return [p[0], p[1]];
    }
    return pointAtGlobalVertexIndex(pathDs, g);
  };
  if (chain && chain.length >= 2) {
    const pts = chain.map((g) => getPt(g)).filter((p): p is [number, number] => p != null);
    if (pts.length >= 2) return polylineArcLengthPx(pts);
  }
  const a = getPt(start);
  const b = getPt(end);
  if (!a || !b) return 0;
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function resolveGenericSleevePxPerCmForMeasure(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  bodyPxPerCm?: number | null
): number {
  const bodyLengthCmForSleeveCal = bodyLengthCmForGenericSleeveCal(pathDs, lm, size, gt);
  const garmentLengthPxForSleeve = resolveGarmentLengthPxForSleeveMeasure(
    pathDs,
    lm,
    size,
    gt,
    bodyPxPerCm
  );
  const pxPerCm = garmentLengthPxForSleeve / Math.max(bodyLengthCmForSleeveCal, 1e-6);
  return Number.isFinite(pxPerCm) && pxPerCm > 0 ? pxPerCm : 1;
}

/**
 * @param sleevePxPerCmUsedForScale `applyGenericSleeveScaleAfterLengthMesh` がスケール収束に使った px/cm。
 *   省略時は最終 path から `resolveGenericSleevePxPerCmForMeasure` を再計算。袖変形後に分母だけ変わると
 *   幾何 cm が入力袖丈からずれるため、パイプライン後の表示では指定を推奨。
 */
export function measureGenericTopSleeveCmFromPath(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  vertexOverride?: GenericSleeveMeasureVertexOverride,
  customPoints?: [number, number][],
  bodyPxPerCm?: number | null,
  sleevePxPerCmUsedForScale?: number | null
): { px: number; cm: number } | null {
  const s = vertexOverride?.start ?? gt.sleeveMeasureVertexStart;
  const e = vertexOverride?.end ?? gt.sleeveMeasureVertexEnd;
  if (!hasDistinctVertexPair(s, e)) return null;
  let gLo = Math.min(Math.trunc(s!), Math.trunc(e!));
  let gHi = Math.max(Math.trunc(s!), Math.trunc(e!));
  /**
   * vertexOverride ありで chain 未指定: 補正ループと同じく **端点 gLo/gHi の2点間距離（三平方）**。
   * `?? gt.sleeveMeasureVertexChain` するとチェーン弧長の cm になり、収束目標と別物になる。
   */
  let chain: number[] | undefined;
  if (vertexOverride != null) {
    chain = vertexOverride.chain;
  } else {
    chain = gt.sleeveMeasureVertexChain;
    const eff = resolveEffectiveSleeveGradingGeometry(pathDs, lm, gt);
    if (eff) {
      gLo = eff.gLo;
      gHi = eff.gHi;
      chain = eff.globalChainForArcTarget ?? eff.globalChainForMeasure ?? chain;
    }
  }
  const px = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, chain, customPoints);
  if (!(px > 0)) return null;
  const pxPerCm =
    sleevePxPerCmUsedForScale != null &&
    Number.isFinite(sleevePxPerCmUsedForScale) &&
    sleevePxPerCmUsedForScale > 0
      ? sleevePxPerCmUsedForScale
      : resolveGenericSleevePxPerCmForMeasure(pathDs, lm, size, gt, bodyPxPerCm);
  return { px, cm: px / pxPerCm };
}

export function measureOriginalSleeveCmFromDesignPaths(
  pathDs: string[],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  lm: CustomLandmarks,
  size: SizeMeasure,
  vertexOverride?: GenericSleeveMeasureVertexOverride,
  bodyPxPerCm?: number | null
): { px: number; cm: number } | null {
  const s = vertexOverride?.start ?? gt.sleeveMeasureVertexStart;
  const e = vertexOverride?.end ?? gt.sleeveMeasureVertexEnd;
  if (!hasDistinctVertexPair(s, e)) return null;
  let gLo = Math.min(Math.trunc(s!), Math.trunc(e!));
  let gHi = Math.max(Math.trunc(s!), Math.trunc(e!));
  let chain = vertexOverride?.chain ?? gt.sleeveMeasureVertexChain;
  if (!vertexOverride) {
    const eff = resolveEffectiveSleeveGradingGeometry(pathDs, lm, gt);
    if (eff) {
      gLo = eff.gLo;
      gHi = eff.gHi;
      chain = eff.globalChainForArcTarget ?? eff.globalChainForMeasure ?? chain;
    }
  }
  const px = sleeveVerticalPxFromGlobalVertices(pathDs, gLo, gHi, chain);
  if (!(px > 0)) return null;
  const pxPerCm = resolveGenericSleevePxPerCmForMeasure(pathDs, lm, size, gt, bodyPxPerCm);
  return { px, cm: px / pxPerCm };
}
