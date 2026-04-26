import { pointAtGlobalVertexIndex } from "@/app/(main)/development/fitting/lib/pathUtils";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";

/** Length (cm) of the waist-indent reference chord (e.g. #218–#431 or verification #362–#148). */
export function bodyIndentReferenceChordLengthCm(
  snap: FittingCanvasSnapshot,
  bodyPxPerCm: number
): number | null {
  const [ia, ib] = snap.indentWaistReferenceChordGlobalIndices;
  const pa = snap.bodyOutlinePoints[ia];
  const pb = snap.bodyOutlinePoints[ib];
  if (!pa || !pb) return null;
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const px = Math.hypot(dx, dy);
  if (!Number.isFinite(px) || px < 1 || !Number.isFinite(bodyPxPerCm) || bodyPxPerCm <= 0) return null;
  return px / bodyPxPerCm;
}

/** Distance (cm) between body plot points 腕山L and 腕山R. */
export function bodyArmPeakSpanCm(snap: FittingCanvasSnapshot, bodyPxPerCm: number): number | null {
  if (!Number.isFinite(bodyPxPerCm) || bodyPxPerCm <= 0) return null;
  const l = snap.bodyPlotPoints.find((p) => p.label === "腕山L");
  const r = snap.bodyPlotPoints.find((p) => p.label === "腕山R");
  if (!l?.point || !r?.point) return null;
  const dx = r.point[0] - l.point[0];
  const dy = r.point[1] - l.point[1];
  const px = Math.hypot(dx, dy);
  if (!Number.isFinite(px) || px < 1) return null;
  return px / bodyPxPerCm;
}

/** Euclidean length (cm) between two garment global vertices on warped `customPathDs`. */
export function garmentFitCompareSpanCm(
  customPathDs: string[],
  pair: [number, number],
  bodyPxPerCm: number
): number | null {
  if (!Number.isFinite(bodyPxPerCm) || bodyPxPerCm <= 0 || customPathDs.length === 0) return null;
  const [ia, ib] = pair;
  const pa = pointAtGlobalVertexIndex(customPathDs, ia);
  const pb = pointAtGlobalVertexIndex(customPathDs, ib);
  if (!pa || !pb) return null;
  const px = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  if (!Number.isFinite(px) || px < 0.5) return null;
  return px / bodyPxPerCm;
}
