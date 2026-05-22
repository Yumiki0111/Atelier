"use client";

import {
  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { GarmentFlatCmFitSnapSvg } from "@/app/(main)/development/fitting/garmentFlatCmGrading/GarmentFlatCmFitSnapSvg";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";

/** @deprecated 実装は `GarmentFlatCmFitSnapSvg`。互換のため残す。 */
export function GarmentFlatCmGradingEditorMirrorPreview({
  snap,
  fitSvgStage,
  garmentStrokeFallback,
  garmentDefaultStrokeWidth,
  canvasSurfaceColor,
  previewBodyStroke = GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
}: {
  snap: FittingCanvasSnapshot;
  fitSvgStage: number;
  garmentStrokeFallback: string;
  garmentDefaultStrokeWidth: number;
  canvasSurfaceColor: string;
  previewBodyStroke?: string;
}) {
  return (
    <GarmentFlatCmFitSnapSvg
      layout="embedded"
      fitSnap={snap}
      fitSvgStage={fitSvgStage}
      canvasSurfaceColor={canvasSurfaceColor}
      previewBodyStroke={previewBodyStroke}
      garmentStrokeFallback={garmentStrokeFallback}
      defaultStrokeWidth={garmentDefaultStrokeWidth}
      showModelBody
      showGarment
    />
  );
}
