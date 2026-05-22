"use client";

import { useIsClient } from "@/lib/react/useIsClient";
import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import { GRID_RIG_OVERLAY_OMIT_INDICES } from "@/app/(main)/development/fitting/lib/rig/gridSvgRigData";
import { GARMENT_FILL } from "@/features/preview/widget-style-product/fit-constants";
import {
  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
  GARMENT_FLAT_CM_PREVIEW_BG,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK,
  garmentFlatCmGridBodyFillLayerPaint,
  garmentFlatCmGridBodyLayeredOutlinePathAfterFirst,
  garmentFlatCmOmitGridBodySilhouetteStroke,
  garmentFlatCmPaintBehindStrokeMatchGridBody,
  garmentFlatCmPreviewBodySilhouetteStrokeWidth,
  garmentFlatCmPreviewGarmentMinStrokeWidth,
  garmentFlatCmUsesLayeredGridBodySilhouette,
} from "./garmentFlatCmGradingConstants";

const MODEL_RIG_STROKE = "rgba(220,38,38,0.9)";
const GARMENT_RIG_STROKE = "rgba(37,99,235,0.9)";

export type GarmentFlatCmFitSnapSvgProps = {
  fitSnap: FittingCanvasSnapshot;
  canvasSurfaceColor?: string;
  previewBodyStroke?: string;
  garmentStrokeFallback?: string;
  defaultStrokeWidth?: number;
  /** 開発: 固定 max-height。埋め込み: 親にフィット */
  layout?: "development" | "embedded";
  showModelBody?: boolean;
  showGarment?: boolean;
  showModelRig?: boolean;
  showGarmentRig?: boolean;
  /** 埋め込みプレビューの段階フェード（0–3） */
  fitSvgStage?: number;
};

/**
 * 平置き cm 試着 SVG の単一描画実装（開発キャンバス・商品プレビュー・ウィジェット共通）。
 */
export function GarmentFlatCmFitSnapSvg({
  fitSnap,
  canvasSurfaceColor = GARMENT_FLAT_CM_PREVIEW_BG,
  previewBodyStroke = GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
  garmentStrokeFallback = GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK,
  defaultStrokeWidth = GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH,
  layout = "development",
  showModelBody = true,
  showGarment = true,
  showModelRig = false,
  showGarmentRig = false,
  fitSvgStage = 1,
}: GarmentFlatCmFitSnapSvgProps) {
  /** 平置き cm の path はクライアント試着計算のみ。SSR と初回クライアントで一致させるため path はマウント後のみ描画。 */
  const isClient = useIsClient();
  const vbH = fitSnap.viewBoxHeight;
  const bodyStrokeWidth = garmentFlatCmPreviewBodySilhouetteStrokeWidth(vbH);
  const garmentMinStrokeWidth = garmentFlatCmPreviewGarmentMinStrokeWidth(vbH);
  const behindBodyGarmentPathCount = fitSnap.behindBodyPathCount;
  const behindBackStrokeMatchBody =
    fitSnap.bodyModelVariant === "gridSvgBodyBack" && behindBodyGarmentPathCount > 0;
  const omitGridRigLegPlaceholders =
    fitSnap.bodyModelVariant === "gridSvgBody" || fitSnap.bodyModelVariant === "gridSvgBodyBack";
  const stageOp = fitSvgStage >= 1 ? 1 : 0;
  const layerStyle =
    layout === "embedded"
      ? { opacity: stageOp, transition: "opacity 0.42s ease-out" as const }
      : undefined;

  const modelRigPaths =
    fitSnap.rigLineWarpedRigViewPaths.length > 0
      ? fitSnap.rigLineWarpedRigViewPaths
      : fitSnap.rigLineWarpedPaths;

  const svg = (
    <svg
      aria-hidden
      className={
        layout === "embedded"
          ? "pointer-events-none block h-auto w-auto max-h-full max-w-full min-h-0 min-w-0 overflow-visible"
          : "pointer-events-none block h-auto w-auto max-h-[min(72vh,620px)] max-w-full min-h-0 min-w-0 overflow-visible"
      }
      style={{ aspectRatio: `${fitSnap.viewBoxWidth} / ${vbH}` }}
      viewBox={`${fitSnap.viewBoxMinX} 0 ${fitSnap.viewBoxWidth} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x={fitSnap.viewBoxMinX}
        y={0}
        width={fitSnap.viewBoxWidth}
        height={vbH}
        fill={canvasSurfaceColor}
      />
      {isClient && showGarment && behindBodyGarmentPathCount > 0 ? (
        <g
          fill={behindBackStrokeMatchBody ? canvasSurfaceColor : GARMENT_FILL}
          style={layerStyle}
        >
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
              minStrokeWidth: garmentMinStrokeWidth,
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
                strokeDasharray={fitSnap.customPathStrokeDasharrays[i] ?? undefined}
              />
            );
          })}
        </g>
      ) : null}
      {isClient && showModelBody ? (
        <g style={layerStyle}>
          {garmentFlatCmUsesLayeredGridBodySilhouette(fitSnap.bodyPaths.length) ? (
            <>
              <g fill={canvasSurfaceColor} stroke="none">
                {fitSnap.bodyPaths.map((d, i) => (
                  <path
                    key={`bf-${i}`}
                    d={d}
                    fill={garmentFlatCmGridBodyFillLayerPaint(
                      d,
                      i,
                      fitSnap.bodyPaths.length,
                      canvasSurfaceColor
                    )}
                  />
                ))}
              </g>
              <g
                fill="none"
                stroke={previewBodyStroke}
                strokeWidth={bodyStrokeWidth}
                pointerEvents="none"
              >
                {fitSnap.bodyPaths[0] &&
                !garmentFlatCmOmitGridBodySilhouetteStroke(0, fitSnap.bodyModelVariant) ? (
                  <path key="bo" d={fitSnap.bodyPaths[0]} />
                ) : null}
                {fitSnap.bodyPaths.map((d, i) =>
                  garmentFlatCmGridBodyLayeredOutlinePathAfterFirst(
                    d,
                    i,
                    fitSnap.bodyPaths.length,
                    fitSnap.bodyModelVariant
                  ) ? (
                    <path key={`bs-${i}`} d={d} />
                  ) : null
                )}
              </g>
            </>
          ) : (
            <g fill={canvasSurfaceColor} stroke={previewBodyStroke} strokeWidth={bodyStrokeWidth}>
              {fitSnap.bodyPaths.map((d, i) => (
                <path key={`b-${i}`} d={d} />
              ))}
            </g>
          )}
        </g>
      ) : null}
      {isClient && showGarment ? (
        <g fill={GARMENT_FILL} style={layerStyle}>
          {(behindBodyGarmentPathCount > 0
            ? fitSnap.customPathDs.slice(behindBodyGarmentPathCount)
            : fitSnap.customPathDs
          ).map((d, ji) => {
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
              minStrokeWidth: garmentMinStrokeWidth,
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
          })}
        </g>
      ) : null}
      {isClient && showModelRig
        ? modelRigPaths.map((d, ri) => {
            if (omitGridRigLegPlaceholders && GRID_RIG_OVERLAY_OMIT_INDICES.has(ri)) {
              return null;
            }
            return (
              <path
                key={`model-rig-${ri}`}
                d={d}
                fill="none"
                stroke={MODEL_RIG_STROKE}
                strokeWidth={1.5}
              />
            );
          })
        : null}
      {isClient && showGarmentRig
        ? fitSnap.customRigPathDs.map((d, ri) => (
            <path
              key={`garment-rig-${ri}`}
              d={d}
              fill="none"
              stroke={GARMENT_RIG_STROKE}
              strokeWidth={1.5}
            />
          ))
        : null}
    </svg>
  );

  if (layout === "embedded") {
    return (
      <div className="flex h-full min-h-0 w-full max-w-full items-center justify-center overflow-hidden">
        {svg}
      </div>
    );
  }
  return svg;
}
