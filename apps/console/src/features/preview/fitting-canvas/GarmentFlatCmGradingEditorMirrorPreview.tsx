"use client";

import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import {
  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
  garmentFlatCmGridBodyFillLayerPaint,
  garmentFlatCmGridBodyLayeredOutlinePathAfterFirst,
  garmentFlatCmPaintBehindStrokeMatchGridBody,
  garmentFlatCmOmitGridBodySilhouetteStroke,
  garmentFlatCmUsesLayeredGridBodySilhouette,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasCompute";
import { GARMENT_FILL } from "@/features/preview/widget-style-product/fit-constants";

/**
 * 平置き cm ウィジェット試着：`PreviewFittingCanvasSvg` の `snap`（格子ボディ試着計算済み）をそのまま描画する。
 */
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
  const vbH = snap.viewBoxHeight;
  const behindBodyGarmentPathCount = snap.behindBodyPathCount;
  const behindBackStrokeMatchBody =
    snap.bodyModelVariant === "gridSvgBodyBack" && behindBodyGarmentPathCount > 0;
  const stageOp = fitSvgStage >= 1 ? 1 : 0;

  return (
    <div className="flex h-full min-h-0 w-full max-w-full items-center justify-center overflow-hidden">
      {/* 低身長で横扁 viewBox 時は width:100% 先決だと cap 後に左右が欠けるため w-auto + 両 max で contain */}
      <svg
        aria-hidden
        className="pointer-events-none block h-auto w-auto max-h-full max-w-full min-h-0 min-w-0 overflow-visible"
        style={{ aspectRatio: `${snap.viewBoxWidth} / ${vbH}` }}
        viewBox={`${snap.viewBoxMinX} 0 ${snap.viewBoxWidth} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
          <rect x={snap.viewBoxMinX} y={0} width={snap.viewBoxWidth} height={vbH} fill={canvasSurfaceColor} />
          {behindBodyGarmentPathCount > 0 ? (
            <g
              fill={behindBackStrokeMatchBody ? canvasSurfaceColor : GARMENT_FILL}
              style={{
                opacity: stageOp,
                transition: "opacity 0.42s ease-out",
              }}
            >
              {snap.customPathDs.slice(0, behindBodyGarmentPathCount).map((d, j) => {
                const i = j;
                if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                const paint = resolveCustomSvgPathRenderablePaint({
                  garmentStrokeFallback,
                  pathStroke: snap.customPathStrokes[i],
                  pathFill: snap.customPathFills[i],
                  pathStrokeWidth: snap.customPathStrokeWidths[i],
                  defaultStrokeWidth: garmentDefaultStrokeWidth,
                  allPathStrokes: snap.customPathStrokes,
                  pathIndex: i,
                  preserveFillOnlyPaths: true,
                  flatCmBehindHealFillOnlyAsStroke: true,
                  minStrokeWidth: GARMENT_FLAT_CM_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
                });
                if (paint.omit === true) return null;
                const disp = behindBackStrokeMatchBody
                  ? garmentFlatCmPaintBehindStrokeMatchGridBody(paint, canvasSurfaceColor, previewBodyStroke)
                  : paint;
                return (
                  <path
                    key={`g-back-${i}`}
                    d={d}
                    fill={disp.fill}
                    stroke={disp.stroke}
                    strokeWidth={disp.strokeWidth}
                    strokeDasharray={snap.customPathStrokeDasharrays[i] ?? undefined}
                  />
                );
              })}
            </g>
          ) : null}
          <g
            style={{
              opacity: stageOp,
              transition: "opacity 0.42s ease-out",
            }}
          >
            {garmentFlatCmUsesLayeredGridBodySilhouette(snap.bodyPaths.length) ? (
              <>
                <g fill={canvasSurfaceColor} stroke="none">
                  {snap.bodyPaths.map((d, i) => (
                    <path
                      key={`bf-${i}`}
                      d={d}
                      fill={garmentFlatCmGridBodyFillLayerPaint(
                        d,
                        i,
                        snap.bodyPaths.length,
                        canvasSurfaceColor
                      )}
                    />
                  ))}
                </g>
                <g fill="none" stroke={previewBodyStroke} strokeWidth={4} pointerEvents="none">
                  {snap.bodyPaths[0] && !garmentFlatCmOmitGridBodySilhouetteStroke(0, snap.bodyModelVariant) ? (
                    <path key="bo" d={snap.bodyPaths[0]} />
                  ) : null}
                  {snap.bodyPaths.map((d, i) =>
                    garmentFlatCmGridBodyLayeredOutlinePathAfterFirst(d, i, snap.bodyPaths.length, snap.bodyModelVariant) ? (
                      <path key={`bs-${i}`} d={d} />
                    ) : null
                  )}
                </g>
              </>
            ) : (
              <g fill={canvasSurfaceColor} stroke={previewBodyStroke} strokeWidth={4}>
                {snap.bodyPaths.map((d, i) => (
                  <path key={`b-${i}`} d={d} />
                ))}
              </g>
            )}
          </g>
          <g
            fill={GARMENT_FILL}
            style={{
              opacity: stageOp,
              transition: "opacity 0.42s ease-out",
            }}
          >
            {(behindBodyGarmentPathCount > 0 ? snap.customPathDs.slice(behindBodyGarmentPathCount) : snap.customPathDs).map((d, ji) => {
              const i = behindBodyGarmentPathCount > 0 ? ji + behindBodyGarmentPathCount : ji;
              if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
              const paint = resolveCustomSvgPathRenderablePaint({
                garmentStrokeFallback,
                pathStroke: snap.customPathStrokes[i],
                pathFill: snap.customPathFills[i],
                pathStrokeWidth: snap.customPathStrokeWidths[i],
                defaultStrokeWidth: garmentDefaultStrokeWidth,
                allPathStrokes: snap.customPathStrokes,
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
                  strokeDasharray={snap.customPathStrokeDasharrays[i] ?? undefined}
                />
              );
            })}
          </g>
      </svg>
    </div>
  );
}

