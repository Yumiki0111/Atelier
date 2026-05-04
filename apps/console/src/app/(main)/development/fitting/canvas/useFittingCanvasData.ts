"use client";

import { useMemo } from "react";
import { getBodyRigLinePathsTemplate } from "../lib/bodyModelVariant";
import {
  computeFittingCanvasSnapshot,
  type UseFittingCanvasDataParams,
  type FittingCanvasSnapshot,
} from "@/lib/fitting-compute/fittingCanvasCompute";

export type { UseFittingCanvasDataParams, FittingCanvasSnapshot };

export function useFittingCanvasData({
  height,
  weight,
  garment,
  shirtSize,
  customGarmentData,
  jacketSize = "4",
  animProgress,
  fromSize,
  toSize,
  fromCustomGarmentData = null,
  toCustomGarmentData = null,
  rigBodyEnabled = false,
  bodyModelVariant,
}: UseFittingCanvasDataParams): FittingCanvasSnapshot {
  /** UI の body トグルが無いビュー（プレビュー等）は `CustomGarmentData.bodyModelVariant` にフォールバック */
  const resolvedBodyModelVariant = bodyModelVariant ?? customGarmentData?.bodyModelVariant;
  /** 非同期の `loadBPATHS_RIG_LINES()` だと初回は null → yScale とカスタム服パイプラインが1フレーム遅れ、縮み→収束のように見える。 */
  const rigLinePaths = getBodyRigLinePathsTemplate(resolvedBodyModelVariant);

  return useMemo(
    () =>
      computeFittingCanvasSnapshot({
        height,
        weight,
        garment,
        shirtSize,
        jacketSize,
        customGarmentData,
        animProgress,
        fromSize,
        toSize,
        fromCustomGarmentData,
        toCustomGarmentData,
        rigBodyEnabled,
        bodyModelVariant: resolvedBodyModelVariant,
        rigLinePaths,
      }),
    [
      height,
      weight,
      garment,
      shirtSize,
      jacketSize,
      customGarmentData,
      rigBodyEnabled,
      bodyModelVariant,
      resolvedBodyModelVariant,
      rigLinePaths,
      animProgress,
      fromSize,
      toSize,
      fromCustomGarmentData,
      toCustomGarmentData,
    ]
  );
}
