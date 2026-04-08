/**
 * 推定トポロジー + ランドマーク + 採寸から ScalableGarmentSpec / ArmLogicConfig を組み立てる。
 */

import type { CustomLandmarks, ScalableGarmentSpec, SizeMeasure } from "../lib/types";
import type { ArmLogicConfig } from "../lib/scalableGarmentArmLogic";
import { getPathPoints, cumulativePathPointOffsets } from "../lib/pathUtils";
import type { GenericFitResolved, InferredSymmetricTopTopology } from "./types";

/** buildGenericScalableSpec のオプション */
export type BuildGenericScalableSpecOptions = {
  /**
   * 袖丈計測・scaleSleevePathToSpec の対象（連結頂点の [開始, 終了]）。
   * 左内袖パス（sleeveInnerLeft）の連結範囲内にクランプする。
   */
  sleeveMeasureGlobal?: [number, number];
  /**
   * グレーディングの基準となる設計時ボディ着丈(cm)。
   */
  bodyLengthCmReference?: number;
  /**
   * 着丈連結 #（グローバル頂点）。Apply 後パイプラインで `buildTopPlacement` の縦分母と袖の px/cm を紫 |ΔY| に揃える。
   */
  lengthMeasureGlobalForPlacement?: [number, number];
  /** 後方互換のため残すが、汎用トップのプレース・腕ワープには渡さない */
  rigLinePaths?: string[] | null;
};

/** 着丈スケール: 全 path を縦スケール対象にする（汎用トップ）。 */
export function buildGenericScalableSpec(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  t: InferredSymmetricTopTopology,
  options?: BuildGenericScalableSpecOptions
): ScalableGarmentSpec {
  const n = pathDs.length;
  const bodyPathIndices: number[] = Array.from({ length: n }, (_, i) => i);

  const il = t.sleeveInnerLeft;
  const innerL = pathDs[il.from];
  const innerPts = getPathPoints(innerL);
  const lastIdx = Math.max(1, innerPts.length - 1);

  const offsets = cumulativePathPointOffsets(pathDs);
  const innerG0 = offsets[il.from]!;
  const innerG1 = offsets[il.to + 1]! - 1;
  let gStart = innerG0;
  let gEnd = innerG1;
  if (t.sleeveInnerLeftVertices) {
    let va = Math.trunc(t.sleeveInnerLeftVertices[0]);
    let vb = Math.trunc(t.sleeveInnerLeftVertices[1]);
    if (va > vb) [va, vb] = [vb, va];
    gStart = Math.max(innerG0, Math.min(va, innerG1));
    gEnd = Math.max(innerG0, Math.min(vb, innerG1));
  }
  if (gEnd < gStart) {
    gStart = innerG0;
    gEnd = innerG1;
  }

  const ov = options?.sleeveMeasureGlobal;
  // 袖丈のスケール対象（design units の px/cm による y スケール）と、
  // 袖丈の計測（overlay の赤線）を同じグローバル連結頂点範囲に揃える。
  // これがズレると「袖丈入力してるのに赤線/実測が変わらない」状態になる。
  let lengthStartG = gStart;
  let lengthEndG = Math.max(gStart, gEnd);

  // デフォルト表示も同じ範囲にする
  let measureDisplayStart = lengthStartG;
  let measureDisplayEnd = lengthEndG;

  if (ov && ov.length === 2 && Number.isFinite(ov[0]) && Number.isFinite(ov[1])) {
    let a = Math.trunc(ov[0]);
    let b = Math.trunc(ov[1]);
    if (a > b) [a, b] = [b, a];
    const totalVerts = offsets[offsets.length - 1]!;
    if (b >= a && a >= 0 && b < totalVerts) {
      // scaling/測定は inner sleeve の内部にクランプして扱う
      lengthStartG = Math.max(innerG0, Math.min(a, innerG1));
      lengthEndG = Math.max(lengthStartG, Math.min(b, innerG1));
      measureDisplayStart = lengthStartG;
      measureDisplayEnd = lengthEndG;
    }
  }

  const lengthStartIdx = Math.max(1, lengthStartG - innerG0); // anchorIdx=0 の次から伸ばす
  const lengthEndIdx = Math.max(lengthStartIdx, lengthEndG - innerG0);
  const cuffIdx = lengthEndIdx;

  return {
    designShoulderY: lm.shoulderY,
    designHemY: lm.hemY,
    bodyLengthCm: options?.bodyLengthCmReference ?? size.length,
    gradingHemAlignOriginX: (lm.shoulderLx + lm.shoulderRx) / 2,
    bodyPathIndices,
    sleeve: {
      anchorIdx: 0,
      lengthStartIdx,
      lengthEndIdx,
      cuffIdx,
    },
    defaultSleeveCm: size.sleeve,
    sleeveMeasureIndices: [measureDisplayStart, Math.max(measureDisplayStart, measureDisplayEnd)] as [number, number],
    seamBlendMaxDist: 420,
  };
}

export function buildGenericArmConfig(spec: ScalableGarmentSpec, t: InferredSymmetricTopTopology): ArmLogicConfig {
  return {
    sleevePathLeft: t.sleeveInnerLeft.from,
    sleevePathLeftEnd: t.sleeveInnerLeft.to,
    sleevePathRight: t.sleeveInnerRight.from,
    sleevePathRightEnd: t.sleeveInnerRight.to,
    seamPathLeft: t.seamOuterLeft.from,
    seamPathLeftEnd: t.seamOuterLeft.to,
    seamPathRight: t.seamOuterRight.from,
    seamPathRightEnd: t.seamOuterRight.to,
    attachLSvg: t.attachLeftSvg,
    attachRSvg: t.attachRightSvg,
    scalableSpec: spec,
    seamBlendMaxDist: spec.seamBlendMaxDist ?? 420,
    skinningMaxDist: 220,
    sleeveOnly: true,
    ...(t.seamOuterLeftVertices ? { seamOuterLeftVertices: t.seamOuterLeftVertices } : {}),
    ...(t.seamOuterRightVertices ? { seamOuterRightVertices: t.seamOuterRightVertices } : {}),
  };
}

export function resolveGenericSymmetricTop(
  pathDs: string[],
  lm: CustomLandmarks,
  size: SizeMeasure,
  t: InferredSymmetricTopTopology,
  specOptions?: BuildGenericScalableSpecOptions
): GenericFitResolved {
  const scalableSpec = buildGenericScalableSpec(pathDs, lm, size, t, specOptions);
  const armConfig = buildGenericArmConfig(scalableSpec, t);
  return { scalableSpec, armConfig, topology: t };
}
