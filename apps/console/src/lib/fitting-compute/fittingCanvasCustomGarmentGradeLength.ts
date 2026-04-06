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
