"use client";

import { useMemo } from "react";
import {
  computeFlatCmGarmentFitSnapshot,
  type ComputeFlatCmGarmentFitSnapshotParams,
} from "@/lib/widget-fit/garmentFlatCmFitPipeline";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";

export type UseFlatCmGarmentFitSnapshotParams = ComputeFlatCmGarmentFitSnapshotParams;

/** 平置き cm 試着スナップショット（開発・プレビュー共通の React フック） */
export function useFlatCmGarmentFitSnapshot(
  params: UseFlatCmGarmentFitSnapshotParams
): FittingCanvasSnapshot {
  const {
    customGarmentData,
    height,
    weight,
    bodyView,
    animProgress,
    fromCustomGarmentData,
    toCustomGarmentData,
    shirtSize,
    jacketSize,
  } = params;

  return useMemo(
    () =>
      computeFlatCmGarmentFitSnapshot({
        customGarmentData,
        height,
        weight,
        bodyView,
        animProgress,
        fromCustomGarmentData,
        toCustomGarmentData,
        shirtSize,
        jacketSize,
      }),
    [
      customGarmentData,
      height,
      weight,
      bodyView,
      animProgress,
      fromCustomGarmentData,
      toCustomGarmentData,
      shirtSize,
      jacketSize,
    ]
  );
}
