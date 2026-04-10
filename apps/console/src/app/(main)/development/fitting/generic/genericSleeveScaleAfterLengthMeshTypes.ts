import type { CustomGarmentData } from "../lib/types";
import type { EffectiveSleeveGradingGeometry } from "./resolveEffectiveSleeveGradingGeometry";

/** cm 誤差がこれ以下なら残差ループを打ち切る */
export const SLEEVE_SCALE_CM_EPS = 0.05;

/** 残差ループ既定回数（1辺伸縮の繰り返し） */
export const MAX_SLEEVE_CORRECTION_ITERS_DEFAULT = 10;
export const MAX_SLEEVE_CORRECTION_ITERS_CAP = 24;

export type GenericSleeveScaleSidePlan = {
  label: "primary" | "mirror";
  eff: EffectiveSleeveGradingGeometry;
  gtForLower: NonNullable<CustomGarmentData["genericSymmetricTop"]>;
  chainFallback: number[] | undefined;
};

export type GenericSleeveScaleAppliedSide = {
  label: "primary" | "mirror";
  gLo: number;
  gHi: number;
  pxChain: number[] | undefined;
  anchorIdx: number;
  lengthStartIdx: number;
  lengthEndIdx: number;
  spIdx: number;
  gtForLower: NonNullable<CustomGarmentData["genericSymmetricTop"]>;
  /** 調整する隣接1辺 (i0,i1)。袖丈は常にこの1辺のみ直線上で伸縮する */
  firstEdgeLocal?: { i0: number; i1: number };
  /** true: チェーン全体の弧長目標を first-edge 二分で合わせる。false: 端点のみの1辺ユークリッド目標 */
  firstEdgeChainArc?: boolean;
};

export function resolveMaxSleeveCorrectionIters(
  opts: { maxSleeveCorrectionIters?: number } | undefined
): number {
  if (opts?.maxSleeveCorrectionIters != null) {
    return Math.min(
      MAX_SLEEVE_CORRECTION_ITERS_CAP,
      Math.max(1, Math.floor(opts.maxSleeveCorrectionIters))
    );
  }
  return MAX_SLEEVE_CORRECTION_ITERS_DEFAULT;
}
