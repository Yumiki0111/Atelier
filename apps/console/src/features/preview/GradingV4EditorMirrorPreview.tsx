"use client";

import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import {
  GRADING_V4_GRID_BODY_SILHOUETTE_STROKE,
  GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
  gradingV4GridBodyPathEndsClosed,
  gradingV4UsesLayeredGridBodySilhouette,
} from "@/app/(main)/development/fitting/gradingV4/gradingV4Constants";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasCompute";
import { GARMENT_FILL } from "@/features/preview/widget-style-product-preview-fit-constants";

/**
 * Grading v4 ウィジェット試着：`PreviewFittingCanvasSvg` の `snap`（格子ボディ試着計算済み）をそのまま描画する。
 */
export function GradingV4EditorMirrorPreview({
  snap,
  fitSvgStage,
  garmentStrokeFallback,
  garmentDefaultStrokeWidth,
  canvasSurfaceColor,
  previewBodyStroke = GRADING_V4_GRID_BODY_SILHOUETTE_STROKE,
}: {
  snap: FittingCanvasSnapshot;
  fitSvgStage: number;
  garmentStrokeFallback: string;
  garmentDefaultStrokeWidth: number;
  canvasSurfaceColor: string;
  previewBodyStroke?: string;
}) {
  const vbH = snap.viewBoxHeight;
  const gradingBehindN = snap.gradingV4BehindBodyPathCount;
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
          {gradingBehindN > 0 ? (
            <g
              fill={GARMENT_FILL}
              style={{
                opacity: stageOp,
                transition: "opacity 0.42s ease-out",
              }}
            >
              {snap.customPathDs.slice(0, gradingBehindN).map((d, j) => {
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
                  gradingBehindHealFillOnlyAsStroke: true,
                  minStrokeWidth: GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
                });
                if (paint.omit === true) return null;
                return (
                  <path
                    key={`g-back-${i}`}
                    d={d}
                    fill={paint.fill}
                    stroke={paint.stroke}
                    strokeWidth={paint.strokeWidth}
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
            {gradingV4UsesLayeredGridBodySilhouette(snap.bodyPaths.length) ? (
              <>
                <g fill={canvasSurfaceColor} stroke="none">
                  {snap.bodyPaths.map((d, i) => (
                    <path
                      key={`bf-${i}`}
                      d={d}
                      fill={gradingV4GridBodyPathEndsClosed(d) ? canvasSurfaceColor : "none"}
                    />
                  ))}
                </g>
                <g fill="none" stroke={previewBodyStroke} strokeWidth={4} pointerEvents="none">
                  {snap.bodyPaths[0] ? <path key="bo" d={snap.bodyPaths[0]} /> : null}
                  {snap.bodyPaths.map((d, i) =>
                    i > 0 && !gradingV4GridBodyPathEndsClosed(d) ? (
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
            {(gradingBehindN > 0 ? snap.customPathDs.slice(gradingBehindN) : snap.customPathDs).map((d, ji) => {
              const i = gradingBehindN > 0 ? ji + gradingBehindN : ji;
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
                minStrokeWidth: GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
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

