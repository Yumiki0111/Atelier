/**
 * genericSymmetricTop 用: 手入力の 4 連結頂点範囲から ScalableGarmentSpec を解決する。
 * 幾何推定は行わない（自動判定なし）。
 */

import type { CustomGarmentData, CustomLandmarks, ScalableGarmentSpec, SizeMeasure } from "../types";
import {
  CALIB_GARMENT_LENGTH_CM,
  CALIB_GARMENT_LENGTH_SPAN_PX,
  inferLengthCmFromLandmarks,
} from "../garmentBase";
import { pointAtGlobalVertexIndex } from "../pathUtils";
import { buildSymmetricTopTopologyFromGlobalVertices, type SymmetricTopGlobalVertexRanges } from "./inferSymmetricTop";
import { buildGenericScalableSpec, type BuildGenericScalableSpecOptions } from "./buildGenericSpec";

function isLineTuple(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  );
}

function sleeveMeasureOptionsFromGarment(gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>): BuildGenericScalableSpecOptions | undefined {
  const a = gt.sleeveMeasureVertexStart;
  const b = gt.sleeveMeasureVertexEnd;
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return { sleeveMeasureGlobal: [Math.trunc(a), Math.trunc(b)] };
}

/** 着丈（紫）など、design 座標の縦幅(px)をキャリブレーションで cm に換算。短い区間も許可。 */
export function designVerticalSpanPxToLengthCm(deltaYPx: number): number | null {
  if (!Number.isFinite(deltaYPx) || deltaYPx < 2) return null;
  const raw = (deltaYPx * CALIB_GARMENT_LENGTH_CM) / CALIB_GARMENT_LENGTH_SPAN_PX;
  if (raw < 12 || raw > 160) return null;
  return Math.round(raw * 10) / 10;
}

/**
 * `ScalableGarmentSpec.bodyLengthCm`（= scaleBodyToSpec の分母）に使う基準着丈(cm)。
 *
 * - **gradingBaselineLengthCm** … UI が採寸可能になった時点で自動シード、または Apply 互換の固定値。
 *   あるとき `s = size.length / 基準` となり、着丈入力の変更で胴が伸縮する。
 * - 未シードのフォールバック: 紫の px→cm → 肩〜裾推定 → `size.length`。
 *   （紫・推定だけを分母にすると参照が入力より大きくなり `s<1` で縮みやすいので、運用上はベースライン必須。）
 */
export function resolveGenericGradingBodyLengthCmReference(
  pathDs: string[],
  lm: CustomLandmarks,
  gt: NonNullable<CustomGarmentData["genericSymmetricTop"]>,
  size: SizeMeasure
): number {
  if (
    gt.gradingBaselineLengthCm != null &&
    Number.isFinite(gt.gradingBaselineLengthCm) &&
    gt.gradingBaselineLengthCm > 0
  ) {
    return gt.gradingBaselineLengthCm;
  }
  const la = gt.lengthMeasureVertexStart;
  const lb = gt.lengthMeasureVertexEnd;
  if (la != null && lb != null && Number.isFinite(la) && Number.isFinite(lb) && la !== lb) {
    const lo = Math.min(Math.trunc(la), Math.trunc(lb));
    const hi = Math.max(Math.trunc(la), Math.trunc(lb));
    const pa = pointAtGlobalVertexIndex(pathDs, lo);
    const pb = pointAtGlobalVertexIndex(pathDs, hi);
    if (pa && pb) {
      const fromMeasure = designVerticalSpanPxToLengthCm(Math.abs(pb[1] - pa[1]));
      if (fromMeasure != null && fromMeasure > 0) return fromMeasure;
    }
  }
  const fromLm = inferLengthCmFromLandmarks({
    shoulderY: lm.shoulderY,
    hemY: lm.hemY,
    garmentLengthOverride: lm.garmentLengthOverride,
  });
  if (fromLm != null && fromLm > 0) return fromLm;
  if (Number.isFinite(size.length) && size.length > 0) return size.length;
  return 75;
}

export function resolveGenericScalableSpec(data: CustomGarmentData): ScalableGarmentSpec | null {
  if (data.presetId !== "genericSymmetricTop") return null;

  const gt = data.genericSymmetricTop;
  const pathDs = data.pathDs;
  const lm = data.landmarks;
  const size = data.size;

  const allFour =
    isLineTuple(gt?.seamOuterLeft) &&
    isLineTuple(gt?.seamOuterRight) &&
    isLineTuple(gt?.sleeveInnerLeft) &&
    isLineTuple(gt?.sleeveInnerRight);

  if (!allFour || !gt) return null;

  const sol = gt.seamOuterLeft;
  const sor = gt.seamOuterRight;
  const sil = gt.sleeveInnerLeft;
  const sir = gt.sleeveInnerRight;
  if (!isLineTuple(sol) || !isLineTuple(sor) || !isLineTuple(sil) || !isLineTuple(sir)) return null;

  const verts: SymmetricTopGlobalVertexRanges = {
    seamOuterLeft: [sol[0], sol[1]],
    seamOuterRight: [sor[0], sor[1]],
    sleeveInnerLeft: [sil[0], sil[1]],
    sleeveInnerRight: [sir[0], sir[1]],
  };
  const r = buildSymmetricTopTopologyFromGlobalVertices(pathDs, lm, verts);
  if (!r.ok || !r.topology) return null;
  const specOpt = sleeveMeasureOptionsFromGarment(gt);
  const bodyLengthCmReference = resolveGenericGradingBodyLengthCmReference(pathDs, lm, gt, size);
  return buildGenericScalableSpec(pathDs, lm, size, r.topology, { ...(specOpt ?? {}), bodyLengthCmReference });
}
