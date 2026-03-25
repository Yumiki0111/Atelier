"use client";

import type { CustomGarmentData, GenericVertexPlotHighlight, SizeMeasure } from "../lib/types";
import type { CustomLandmarks } from "../lib/types";
import { tPath } from "../lib/pathUtils";

export type GradeLengthMeshInput = {
  customGarmentData: CustomGarmentData;
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

/**
 * ファブリックワープ後のメッシュで、肩〜裾の縦スパンを size.length×bodyPxPerCm に合わせるための Y スケール。
 * 矢印（グレード着丈）を正とし、輪郭 path / 頂点にのみ適用する。
 */
export function computeGradeLengthVerticalScaleParams(
  input: GradeLengthMeshInput
): { lengthTopY: number; scale: number } | null {
  const {
    customGarmentData,
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
    const pa = customPoints[lo];
    const pb = customPoints[hi];
    if (!pa || !pb) return false;
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

  if (hemRefY == null || !Number.isFinite(hemRefY)) return null;

  const lengthTopY = lengthMeasureTop ? lengthMeasureTop[1] : midShoulderY;
  const lengthPx = size.length * bodyPxPerCm;
  const span = hemRefY - lengthTopY;
  if (!Number.isFinite(span) || span < 1e-2) return null;
  const scale = lengthPx / span;
  if (!Number.isFinite(scale) || scale < 0.12 || scale > 10) return null;

  return { lengthTopY, scale };
}

export function applyGradeLengthVerticalScaleToMeshPaths(
  customPathDs: string[],
  customPoints: [number, number][],
  lengthTopY: number,
  scale: number
): { customPathDs: string[]; customPoints: [number, number][] } {
  const mapY = (y: number) => lengthTopY + (y - lengthTopY) * scale;
  return {
    customPathDs: customPathDs.map((d) => tPath(d, (x, y) => [x, mapY(y)])),
    customPoints: customPoints.map(([x, y]) => [x, mapY(y)] as [number, number]),
  };
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
