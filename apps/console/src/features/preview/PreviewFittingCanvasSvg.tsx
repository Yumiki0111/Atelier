"use client";

import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";
import { resolveCustomSvgPathRenderablePaint } from "@/app/(main)/development/fitting/customGarment/resolveCustomSvgPathRenderablePaint";
import { cn } from "@/lib/utils";
import { GARMENT_FILL } from "./widget-style-product/fit-constants";
import { PreviewFitEaseFootnote, PreviewFitEaseSummary } from "./widget-style-product/fit-ease-ui";
import { GarmentFlatCmGradingEditorMirrorPreview } from "./fitting-canvas/GarmentFlatCmGradingEditorMirrorPreview";
import { WidgetFitEaseDiagramSvg } from "./fitting-canvas/WidgetFitEaseDiagramSvg";
import { usePreviewFittingCanvasSvg } from "./fitting-canvas/usePreviewFittingCanvasSvg";
import {
  garmentFlatCmOmitGridBodySilhouetteStroke,
  garmentFlatCmGridBodyFillLayerPaint,
  garmentFlatCmPreviewBodySilhouetteStrokeWidth,
  garmentFlatCmPreviewGarmentMinStrokeWidth,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";

export function PreviewFittingCanvasSvg({
  fitHeightCm,
  fitBodyVal,
  currentSize,
  customGarmentData,
  orderedSizeKeys = [],
  fitChestBandCategory = null,
  bodyOnly = false,
  fitEaseRevealNonce = 0,
  embedSplashSuspended = false,
  embeddedWidgetUi = false,
  garmentPreviewView = "front",
  showFitEaseUi = true,
}: {
  fitHeightCm: number;
  fitBodyVal: number;
  currentSize: string;
  customGarmentData: CustomGarmentData;
  /** 小→大。未指定は `sizePresets` 順 */
  orderedSizeKeys?: string[];
  /** `products.category` 相当。未指定はジャケット基準のしきい値 */
  fitChestBandCategory?: string | null;
  /** 体型調整シートなど：体型ラインのみ（服パスを描かない） */
  bodyOnly?: boolean;
  /** 増やすたびに図解・胸バンド文言の段階表示をやり直す（体型適用など） */
  fitEaseRevealNonce?: number;
  /** 親ウィジェットのスプラッシュ中は図解・脚注の段階表示を保留 */
  embedSplashSuspended?: boolean;
  /**
   * フォン枠プレビュー（埋め込み iframe とコンソールのウィジェットデザインプレビュー共通）向け:
   * SVG ブロックに縦上限（max-h 88%/94%）を付け、はみ出しを防ぐ。
   */
  embeddedWidgetUi?: boolean;
  garmentPreviewView?: GarmentPreviewBodyView;
  showFitEaseUi?: boolean;
}) {
  const {
    snap,
    isGarmentFlatCm,
    canvasSurfaceBackground,
    previewBodyStroke,
    previewGarmentStrokeFallback,
    previewGarmentDefaultStrokeWidth,
    sizedTarget,
    fitEaseSummary,
    fitEaseDiagram,
    behindBodyGarmentPathCount,
    viewBoxH,
    easeDiagramRenderable,
    fitSvgStage,
    showEaseOverlay,
    showEaseText,
    shouldSuppressGarmentPathRender,
    garmentFlatCmGridBodyLayeredOutlinePathAfterFirst,
    garmentFlatCmUsesLayeredGridBodySilhouette,
  } = usePreviewFittingCanvasSvg({
    fitHeightCm,
    fitBodyVal,
    currentSize,
    customGarmentData,
    orderedSizeKeys,
    fitChestBandCategory,
    bodyOnly,
    fitEaseRevealNonce,
    embedSplashSuspended,
    garmentPreviewView,
    showFitEaseUi,
  });

  const previewBodyStrokeWidth = garmentFlatCmPreviewBodySilhouetteStrokeWidth(viewBoxH);
  const previewGarmentMinStrokeWidth = isGarmentFlatCm
    ? garmentFlatCmPreviewGarmentMinStrokeWidth(viewBoxH)
    : undefined;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-center justify-center gap-1",
        embeddedWidgetUi ? "overflow-hidden" : "overflow-visible",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 items-center justify-center",
          embeddedWidgetUi
            ? "min-h-0 w-full min-w-0 max-w-full max-h-[88%] overflow-hidden sm:max-h-[94%]"
            : "overflow-visible",
        )}
      >
        {isGarmentFlatCm && !bodyOnly ? (
          <div
            className={cn(
              "relative isolate flex h-full min-h-0 w-full max-w-full flex-col items-center",
              embeddedWidgetUi ? "overflow-hidden" : "overflow-visible",
            )}
          >
            <GarmentFlatCmGradingEditorMirrorPreview
              canvasSurfaceColor={canvasSurfaceBackground}
              fitSvgStage={fitSvgStage}
              garmentDefaultStrokeWidth={previewGarmentDefaultStrokeWidth}
              garmentStrokeFallback={previewGarmentStrokeFallback}
              previewBodyStroke={previewBodyStroke}
              snap={snap}
            />
            {easeDiagramRenderable && isGarmentFlatCm && fitEaseDiagram != null ? (
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[40] size-full overflow-visible"
                viewBox={`${snap.viewBoxMinX} 0 ${snap.viewBoxWidth} ${viewBoxH}`}
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g style={{ opacity: showEaseOverlay ? 1 : 0, transition: "opacity 0.35s ease-out" }}>
                  <WidgetFitEaseDiagramSvg diagram={fitEaseDiagram} />
                </g>
              </svg>
            ) : null}
          </div>
        ) : (
          <svg
            viewBox={`${snap.viewBoxMinX} 0 ${snap.viewBoxWidth} ${viewBoxH}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-auto max-h-full w-auto min-h-0 max-w-full overflow-visible box-border"
            style={{ aspectRatio: `${snap.viewBoxWidth} / ${viewBoxH}` }}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            {!bodyOnly && behindBodyGarmentPathCount > 0 ? (
              <g fill={GARMENT_FILL} style={{ opacity: fitSvgStage >= 1 ? 1 : 0, transition: "opacity 0.42s ease-out" }}>
                {snap.customPathDs.slice(0, behindBodyGarmentPathCount).map((d, j) => {
                  if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                  const paint = resolveCustomSvgPathRenderablePaint({
                    garmentStrokeFallback: previewGarmentStrokeFallback,
                    pathStroke: snap.customPathStrokes[j],
                    pathFill: snap.customPathFills[j],
                    pathStrokeWidth: snap.customPathStrokeWidths[j],
                    defaultStrokeWidth: previewGarmentDefaultStrokeWidth,
                    allPathStrokes: snap.customPathStrokes,
                    pathIndex: j,
                    preserveFillOnlyPaths: isGarmentFlatCm,
                    ...(previewGarmentMinStrokeWidth != null
                      ? { minStrokeWidth: previewGarmentMinStrokeWidth }
                      : {}),
                  });
                  if (paint.omit === true) return null;
                  return (
                    <path
                      key={`g-back-${j}`}
                      d={d}
                      fill={paint.fill}
                      stroke={paint.stroke}
                      strokeWidth={paint.strokeWidth}
                      strokeDasharray={snap.customPathStrokeDasharrays[j] ?? undefined}
                    />
                  );
                })}
              </g>
            ) : null}
            <g style={{ opacity: fitSvgStage >= 1 ? 1 : 0, transition: "opacity 0.42s ease-out" }}>
              {isGarmentFlatCm && garmentFlatCmUsesLayeredGridBodySilhouette(snap.bodyPaths.length) ? (
                <>
                  <g fill={canvasSurfaceBackground} stroke="none">
                    {snap.bodyPaths.map((d, i) => (
                      <path
                        key={`bf-${i}`}
                        d={d}
                        fill={garmentFlatCmGridBodyFillLayerPaint(d, i, snap.bodyPaths.length, canvasSurfaceBackground)}
                      />
                    ))}
                  </g>
                  <g
                    fill="none"
                    stroke={previewBodyStroke}
                    strokeWidth={previewBodyStrokeWidth}
                    pointerEvents="none"
                  >
                    {snap.bodyPaths[0] &&
                    !garmentFlatCmOmitGridBodySilhouetteStroke(0, snap.bodyModelVariant) ? (
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
                <g
                  fill={canvasSurfaceBackground}
                  stroke={previewBodyStroke}
                  strokeWidth={previewBodyStrokeWidth}
                >
                  {snap.bodyPaths.map((d, i) => (
                    <path key={`b-${i}`} d={d} />
                  ))}
                </g>
              )}
            </g>
            {!bodyOnly ? (
              <g fill={GARMENT_FILL} style={{ opacity: fitSvgStage >= 1 ? 1 : 0, transition: "opacity 0.42s ease-out" }}>
                {(behindBodyGarmentPathCount > 0 ? snap.customPathDs.slice(behindBodyGarmentPathCount) : snap.customPathDs).map((d, ji) => {
                  const i = behindBodyGarmentPathCount > 0 ? ji + behindBodyGarmentPathCount : ji;
                  if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) return null;
                  const paint = resolveCustomSvgPathRenderablePaint({
                    garmentStrokeFallback: previewGarmentStrokeFallback,
                    pathStroke: snap.customPathStrokes[i],
                    pathFill: snap.customPathFills[i],
                    pathStrokeWidth: snap.customPathStrokeWidths[i],
                    defaultStrokeWidth: previewGarmentDefaultStrokeWidth,
                    allPathStrokes: snap.customPathStrokes,
                    pathIndex: i,
                    preserveFillOnlyPaths: isGarmentFlatCm,
                    ...(previewGarmentMinStrokeWidth != null
                      ? { minStrokeWidth: previewGarmentMinStrokeWidth }
                      : {}),
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
            ) : null}
            {!bodyOnly && easeDiagramRenderable ? (
              <g style={{ opacity: showEaseOverlay ? 1 : 0, transition: "opacity 0.35s ease-out" }}>
                <WidgetFitEaseDiagramSvg diagram={fitEaseDiagram} />
              </g>
            ) : null}
          </svg>
        )}
      </div>
      {!bodyOnly && easeDiagramRenderable ? (
        <div style={{ opacity: showEaseText ? 1 : 0, transition: "opacity 0.35s ease-out" }}>
          <PreviewFitEaseFootnote summary={fitEaseSummary} />
        </div>
      ) : !bodyOnly && !easeDiagramRenderable && !isGarmentFlatCm ? (
        <div style={{ opacity: showEaseText ? 1 : 0, transition: "opacity 0.35s ease-out" }}>
          <PreviewFitEaseSummary summary={fitEaseSummary} />
        </div>
      ) : null}
    </div>
  );
}
