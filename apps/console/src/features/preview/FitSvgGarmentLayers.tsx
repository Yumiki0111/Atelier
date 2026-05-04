"use client";

import type { CSSProperties } from "react";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import { GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH } from "@/app/(main)/development/fitting/gradingV4/gradingV4Constants";
import type { FitSvgPayload } from "./widget-style-product-preview-fit-svg-types";
import { GARMENT_FILL } from "./widget-style-product-preview-fit-constants";

function mergedStrokesForFitSvg(fit: FitSvgPayload): (string | undefined)[] {
  const b = fit.garmentPathsBehindBody;
  const hasBehind = b != null && b.length > 0;
  if (hasBehind) {
    return [...(fit.garmentBehindBodyPathStrokes ?? []), ...(fit.garmentPathStrokes ?? [])];
  }
  return fit.garmentPathStrokes ?? [];
}

export function FitSvgBehindGarmentLayer({
  fitData,
  garmentStrokeFallback,
  opacityStyle,
}: {
  fitData: FitSvgPayload;
  garmentStrokeFallback: string;
  opacityStyle: CSSProperties;
}) {
  const behind = fitData.garmentPathsBehindBody;
  if (behind == null || behind.length === 0) return null;
  const isGrading = fitData.presetId === "gradingV4";
  const defaultStrokeWidth = 1;
  const mergedStrokes = mergedStrokesForFitSvg(fitData);

  return (
    <g fill={GARMENT_FILL} style={opacityStyle}>
      {behind.map((d, li) => {
        const i = li;
        if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
        const paint = resolveCustomSvgPathRenderablePaint({
          garmentStrokeFallback,
          pathStroke: fitData.garmentBehindBodyPathStrokes?.[li],
          pathFill: fitData.garmentBehindBodyPathFills?.[li],
          pathStrokeWidth: fitData.garmentBehindBodyPathStrokeWidths?.[li],
          defaultStrokeWidth,
          allPathStrokes: mergedStrokes,
          pathIndex: i,
          preserveFillOnlyPaths: isGrading,
          ...(isGrading
            ? {
                minStrokeWidth: GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH,
                gradingBehindHealFillOnlyAsStroke: true,
              }
            : {}),
        });
        if (paint.omit === true) return null;
        return (
          <path
            key={`svg-gb-${i}`}
            d={d}
            fill={paint.fill}
            stroke={paint.stroke}
            strokeWidth={paint.strokeWidth}
            strokeDasharray={fitData.garmentBehindBodyPathStrokeDasharrays?.[li] ?? undefined}
          />
        );
      })}
    </g>
  );
}

export function FitSvgFrontGarmentLayer({
  fitData,
  garmentStrokeFallback,
  opacityStyle,
}: {
  fitData: FitSvgPayload;
  garmentStrokeFallback: string;
  opacityStyle: CSSProperties;
}) {
  const isGrading = fitData.presetId === "gradingV4";
  const defaultStrokeWidth = 1;
  const behind = fitData.garmentPathsBehindBody;
  const behindLen = behind?.length ?? 0;
  const mergedStrokes = mergedStrokesForFitSvg(fitData);

  return (
    <g fill={GARMENT_FILL} style={opacityStyle}>
      {fitData.garmentPaths.map((d, li) => {
        const i = behindLen + li;
        if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
        const paint = resolveCustomSvgPathRenderablePaint({
          garmentStrokeFallback,
          pathStroke: fitData.garmentPathStrokes?.[li],
          pathFill: fitData.garmentPathFills?.[li],
          pathStrokeWidth: fitData.garmentPathStrokeWidths?.[li],
          defaultStrokeWidth,
          allPathStrokes: mergedStrokes,
          pathIndex: i,
          preserveFillOnlyPaths: isGrading,
          ...(isGrading ? { minStrokeWidth: GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH } : {}),
        });
        if (paint.omit === true) return null;
        return (
          <path
            key={`svg-gf-${i}`}
            d={d}
            fill={paint.fill}
            stroke={paint.stroke}
            strokeWidth={paint.strokeWidth}
            strokeDasharray={fitData.garmentPathStrokeDasharrays?.[li] ?? undefined}
          />
        );
      })}
    </g>
  );
}
