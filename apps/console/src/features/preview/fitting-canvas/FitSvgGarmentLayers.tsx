"use client";

import type { CSSProperties } from "react";
import { isGarmentFlatCmPresetId } from "@Atelier/shared";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import {
  GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH,
  garmentFlatCmPreviewGarmentMinStrokeWidth,
  garmentFlatCmPaintBehindStrokeMatchGridBody,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import type { FitSvgPayload } from "../widget-style-product/fit-svg-types";
import { GARMENT_FILL } from "../widget-style-product/fit-constants";

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
  canvasSurfaceBg,
  bodySilhouetteStroke,
}: {
  fitData: FitSvgPayload;
  garmentStrokeFallback: string;
  opacityStyle: CSSProperties;
  /** 背面 back-stroke をボディ下地に揃えるとき（平置き cm・`gridSvgBodyBack`） */
  canvasSurfaceBg?: string;
  bodySilhouetteStroke?: string;
}) {
  const behind = fitData.garmentPathsBehindBody;
  if (behind == null || behind.length === 0) return null;
  const isGarmentFlatCm = isGarmentFlatCmPresetId(fitData.presetId);
  const defaultStrokeWidth = isGarmentFlatCm ? GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH : 1;
  const minGarmentStrokeWidth = isGarmentFlatCm
    ? garmentFlatCmPreviewGarmentMinStrokeWidth(fitData.viewBoxHeight)
    : undefined;
  const mergedStrokes = mergedStrokesForFitSvg(fitData);
  const behindPaintMatchBody =
    isGarmentFlatCm &&
    fitData.bodyModelVariant === "gridSvgBodyBack" &&
    canvasSurfaceBg != null &&
    bodySilhouetteStroke != null;

  return (
    <g fill={behindPaintMatchBody ? canvasSurfaceBg : GARMENT_FILL} style={opacityStyle}>
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
          preserveFillOnlyPaths: isGarmentFlatCm,
          ...(isGarmentFlatCm && minGarmentStrokeWidth != null
            ? {
                minStrokeWidth: minGarmentStrokeWidth,
                flatCmBehindHealFillOnlyAsStroke: true,
              }
            : {}),
        });
        if (paint.omit === true) return null;
        const display = behindPaintMatchBody
          ? garmentFlatCmPaintBehindStrokeMatchGridBody(paint, canvasSurfaceBg!, bodySilhouetteStroke!)
          : paint;
        return (
          <path
            key={`svg-gb-${i}`}
            d={d}
            fill={display.fill}
            stroke={display.stroke}
            strokeWidth={display.strokeWidth}
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
  const isGarmentFlatCm = isGarmentFlatCmPresetId(fitData.presetId);
  const defaultStrokeWidth = isGarmentFlatCm ? GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH : 1;
  const minGarmentStrokeWidth = isGarmentFlatCm
    ? garmentFlatCmPreviewGarmentMinStrokeWidth(fitData.viewBoxHeight)
    : undefined;
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
          preserveFillOnlyPaths: isGarmentFlatCm,
          ...(isGarmentFlatCm && minGarmentStrokeWidth != null
            ? { minStrokeWidth: minGarmentStrokeWidth }
            : {}),
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
