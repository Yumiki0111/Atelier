import type { CustomGarmentData } from "../lib/types";
import { getPathPoints, pointAtGlobalVertexIndex } from "../lib/pathUtils";

/** 着丈連結 # の |ΔY|（design px）。measure-only は baseline 着丈比の胴スケール後（袖は scaleSleevePathToSpec 後） */
export function genericLengthMeasureVerticalSpanPx(
  pathDs: string[],
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>
): number | null {
  const la = gt.lengthMeasureVertexStart;
  const lb = gt.lengthMeasureVertexEnd;
  if (la == null || lb == null || !Number.isFinite(la) || !Number.isFinite(lb) || la === lb) {
    return null;
  }
  const gLo = Math.min(Math.trunc(la), Math.trunc(lb));
  const gHi = Math.max(Math.trunc(la), Math.trunc(lb));
  const pa = pointAtGlobalVertexIndex(pathDs, gLo);
  const pb = pointAtGlobalVertexIndex(pathDs, gHi);
  if (!pa || !pb) return null;
  const dy = Math.abs(pb[1] - pa[1]);
  return dy > 1 ? dy : null;
}

/** プレースメントのみ: 入力 path の連結頂点を placeFn でボディ座標へ */
export function vertexPlotsPlaceOnly(
  pathDs: string[],
  placeFn: (x: number, y: number) => [number, number]
): [number, number][] {
  return pathDs.flatMap((d) => getPathPoints(d).map(([x, y]) => placeFn(x, y)));
}
