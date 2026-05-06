"use client";

import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import { GRID_RIG_OVERLAY_OMIT_INDICES } from "@/app/(main)/development/fitting/lib/rig/gridSvgRigData";
import {
  GARMENT_FILL,
} from "@/features/preview/widget-style-product/fit-constants";
import {
  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
  GARMENT_FLAT_CM_PREVIEW_BG,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK,
  garmentFlatCmGridBodyFillLayerPaint,
  garmentFlatCmGridBodyLayeredOutlinePathAfterFirst,
  garmentFlatCmPaintBehindStrokeMatchGridBody,
  garmentFlatCmOmitGridBodySilhouetteStroke,
  garmentFlatCmUsesLayeredGridBodySilhouette,
} from "./garmentFlatCmGradingConstants";

export type GarmentFlatCmGradingFittingFitSnapSvgProps = {
  fitSnap: FittingCanvasSnapshot;
  showModelRig: boolean;
  garmentStrokeFallback?: string;
  defaultStrokeWidth?: number;
};

export function GarmentFlatCmGradingFittingFitSnapSvg({
  fitSnap,
  showModelRig,
  garmentStrokeFallback = GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK,
  defaultStrokeWidth = GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH,
}: GarmentFlatCmGradingFittingFitSnapSvgProps) {
  const behindBodyGarmentPathCount = fitSnap.behindBodyPathCount;
  const behindBackStrokeMatchBody =
    fitSnap.bodyModelVariant === "gridSvgBodyBack" && behindBodyGarmentPathCount > 0;
  const omitGridRigLegPlaceholders =
    fitSnap.bodyModelVariant === "gridSvgBody" || fitSnap.bodyModelVariant === "gridSvgBodyBack";

  return (
    <svg
      aria-hidden
      className="pointer-events-none block h-auto w-auto max-h-[min(72vh,620px)] max-w-full min-h-0 min-w-0 overflow-visible"
      style={{ aspectRatio: `${fitSnap.viewBoxWidth} / ${fitSnap.viewBoxHeight}` }}
      viewBox={`${fitSnap.viewBoxMinX} 0 ${fitSnap.viewBoxWidth} ${fitSnap.viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x={fitSnap.viewBoxMinX}
        y={0}
        width={fitSnap.viewBoxWidth}
        height={fitSnap.viewBoxHeight}
        fill={GARMENT_FLAT_CM_PREVIEW_BG}
      />
      {behindBodyGarmentPathCount > 0 ? (
        <g fill={behindBackStrokeMatchBody ? GARMENT_FLAT_CM_PREVIEW_BG : GARMENT_FILL}>
          {fitSnap.customPathDs.slice(0, behindBodyGarmentPathCount).map((d, j) => {
            const i = j;
            if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
            const paint = resolveCustomSvgPathRenderablePaint({
              garmentStrokeFallback,
              pathStroke: fitSnap.customPathStrokes[i],
              pathFill: fitSnap.customPathFills[i],
              pathStrokeWidth: fitSnap.customPathStrokeWidths[i],
              defaultStrokeWidth,
              allPathStrokes: fitSnap.customPathStrokes,
              pathIndex: i,
              preserveFillOnlyPaths: true,
              flatCmBehindHealFillOnlyAsStroke: true,
              minStrokeWidth: GARMENT_FLAT_CM_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
            });
            if (paint.omit === true) return null;
            const disp = behindBackStrokeMatchBody
              ? garmentFlatCmPaintBehindStrokeMatchGridBody(
                  paint,
                  GARMENT_FLAT_CM_PREVIEW_BG,
                  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE
                )
              : paint;
            return (
              <path
                key={`g-back-${i}`}
                d={d}
                fill={disp.fill}
                stroke={disp.stroke}
                strokeWidth={disp.strokeWidth}
                strokeDasharray={fitSnap.customPathStrokeDasharrays[i] ?? undefined}
              />
            );
          })}
        </g>
      ) : null}
      <g>
        {garmentFlatCmUsesLayeredGridBodySilhouette(fitSnap.bodyPaths.length) ? (
          <>
            <g fill={GARMENT_FLAT_CM_PREVIEW_BG} stroke="none">
              {fitSnap.bodyPaths.map((d, i) => (
                <path
                  key={`bf-${i}`}
                  d={d}
                  fill={garmentFlatCmGridBodyFillLayerPaint(
                    d,
                    i,
                    fitSnap.bodyPaths.length,
                    GARMENT_FLAT_CM_PREVIEW_BG
                  )}
                />
              ))}
            </g>
            <g
              fill="none"
              stroke={GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE}
              strokeWidth={4}
              pointerEvents="none"
            >
              {fitSnap.bodyPaths[0] &&
              !garmentFlatCmOmitGridBodySilhouetteStroke(0, fitSnap.bodyModelVariant) ? (
                <path key="bo" d={fitSnap.bodyPaths[0]} />
              ) : null}
              {fitSnap.bodyPaths.map((d, i) =>
                garmentFlatCmGridBodyLayeredOutlinePathAfterFirst(d, i, fitSnap.bodyPaths.length, fitSnap.bodyModelVariant) ? (
                  <path key={`bs-${i}`} d={d} />
                ) : null
              )}
            </g>
          </>
        ) : (
          <g fill={GARMENT_FLAT_CM_PREVIEW_BG} stroke={GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE} strokeWidth={4}>
            {fitSnap.bodyPaths.map((d, i) => (
              <path key={`b-${i}`} d={d} />
            ))}
          </g>
        )}
      </g>
      <g fill={GARMENT_FILL}>
        {(behindBodyGarmentPathCount > 0 ? fitSnap.customPathDs.slice(behindBodyGarmentPathCount) : fitSnap.customPathDs).map(
          (d, ji) => {
            const i = behindBodyGarmentPathCount > 0 ? ji + behindBodyGarmentPathCount : ji;
            if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
            const paint = resolveCustomSvgPathRenderablePaint({
              garmentStrokeFallback,
              pathStroke: fitSnap.customPathStrokes[i],
              pathFill: fitSnap.customPathFills[i],
              pathStrokeWidth: fitSnap.customPathStrokeWidths[i],
              defaultStrokeWidth,
              allPathStrokes: fitSnap.customPathStrokes,
              pathIndex: i,
              preserveFillOnlyPaths: true,
              minStrokeWidth: GARMENT_FLAT_CM_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
            });
            if (paint.omit === true) return null;
            return (
              <path
                key={`g-${i}`}
                d={d}
                fill={paint.fill}
                stroke={paint.stroke}
                strokeWidth={paint.strokeWidth}
                strokeDasharray={fitSnap.customPathStrokeDasharrays[i] ?? undefined}
              />
            );
          }
        )}
      </g>
      {showModelRig
        ? fitSnap.rigLineWarpedRigViewPaths.map((d, ri) => {
            if (omitGridRigLegPlaceholders && GRID_RIG_OVERLAY_OMIT_INDICES.has(ri)) return null;
            return (
              <path
                key={`rig-${ri}`}
                d={d}
                fill="none"
                stroke="rgba(220,38,38,0.9)"
                strokeWidth={2.5}
              />
            );
          })
        : null}
    </svg>
  );
}
