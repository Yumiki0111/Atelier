"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBPATHS_RIG_LINES } from "../lib/pathData";
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
  const [rigLinePaths, setRigLinePaths] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBPATHS_RIG_LINES()
      .then((linePaths) => {
        if (cancelled) return;
        setRigLinePaths(linePaths);
      })
      .catch(() => {
        if (cancelled) return;
        setRigLinePaths(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
