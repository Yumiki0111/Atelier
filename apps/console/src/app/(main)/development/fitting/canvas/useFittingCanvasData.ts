"use client";

import { useMemo } from "react";
import { BPATHS_RIG_LINES } from "../lib/modelRigData";
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
  genericVertexPlotHighlight = null,
}: UseFittingCanvasDataParams): FittingCanvasSnapshot {
  /** 非同期の `loadBPATHS_RIG_LINES()` だと初回は null → yScale とカスタム服パイプラインが1フレーム遅れ、縮み→収束のように見える。 */
  const rigLinePaths = BPATHS_RIG_LINES;

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
        genericVertexPlotHighlight,
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
      genericVertexPlotHighlight,
      rigLinePaths,
      animProgress,
      fromSize,
      toSize,
      fromCustomGarmentData,
      toCustomGarmentData,
    ]
  );
}
