"use client";

import type { CSSProperties, ReactNode } from "react";
import { isGarmentFlatCmPresetId } from "@Atelier/shared";
import { cn } from "@/lib/utils";
import {
  GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE,
  GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { WidgetFitEaseDiagramSvg } from "@/features/preview/fitting-canvas/WidgetFitEaseDiagramSvg";
import { FitSvgBehindGarmentLayer, FitSvgFrontGarmentLayer } from "../fitting-canvas/FitSvgGarmentLayers";
import {
  PreviewFitEaseFootnote,
  PreviewFitEaseSummary,
} from "./fit-ease-ui";
import type { FitSvgPayload } from "./fit-svg-types";
import { WidgetPreviewFitSvgBodyPaths } from "./fit-svg-body-paths";

export type WidgetStyleProductPreviewServerFitViewerProps = {
  fitData: FitSvgPayload;
  canvasBg: string;
  chromeBodyStroke: string;
  chromeGarmentStroke: string;
  garmentPathsInViewer: boolean;
  fitSvgStageEmbed: number;
  showEmbedEaseOverlay: boolean;
  showEmbedEaseText: boolean;
  embedPublicWidget: boolean;
  /** false のときサイズ勧め・フィット図解の UI は出さず、`footerSlot` を下段に置ける */
  showFitEaseUi?: boolean;
  footerSlot?: ReactNode;
  /** 前後ビュー切替時の SVG 領域フェード（トグルは `footerSlot` 側でフェードしない） */
  canvasFadeStyle?: CSSProperties;
};

export function WidgetStyleProductPreviewServerFitViewer({
  fitData,
  canvasBg,
  chromeBodyStroke,
  chromeGarmentStroke,
  garmentPathsInViewer,
  fitSvgStageEmbed,
  showEmbedEaseOverlay,
  showEmbedEaseText,
  embedPublicWidget,
  showFitEaseUi = true,
  footerSlot,
  canvasFadeStyle,
}: WidgetStyleProductPreviewServerFitViewerProps) {
  const garmentStrokeFallback = isGarmentFlatCmPresetId(fitData.presetId)
    ? GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK
    : chromeGarmentStroke;

  const bodyStrokeSimple = isGarmentFlatCmPresetId(fitData.presetId)
    ? GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE
    : chromeBodyStroke;

  const opacityStage = {
    opacity: fitSvgStageEmbed >= 1 ? 1 : 0,
    transition: "opacity 0.42s ease-out",
  };

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col items-center justify-center",
        embedPublicWidget
          ? "h-full flex-1 gap-0 overflow-hidden pb-px pt-0"
          : "h-full flex-1 gap-1 overflow-hidden py-0.5",
      )}
    >
      <div
        className="flex min-h-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden"
        style={canvasFadeStyle}
      >
        <svg
          viewBox={`${fitData.viewBoxMinX ?? 0} 0 ${fitData.viewBoxWidth} ${fitData.viewBoxHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto max-h-[88%] min-h-0 min-w-0 w-auto max-w-full overflow-visible sm:max-h-[94%] box-border"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          {garmentPathsInViewer ? (
            <FitSvgBehindGarmentLayer
              fitData={fitData}
              garmentStrokeFallback={garmentStrokeFallback}
              opacityStyle={opacityStage}
              canvasSurfaceBg={canvasBg}
              bodySilhouetteStroke={bodyStrokeSimple}
            />
          ) : null}
          <g style={opacityStage}>
            <WidgetPreviewFitSvgBodyPaths
              bodyPaths={fitData.bodyPaths}
              canvasBg={canvasBg}
              bodyStrokeSimple={bodyStrokeSimple}
              presetId={fitData.presetId}
              bodyModelVariant={fitData.bodyModelVariant}
              ids={{
                fillRowKeyPrefix: "bf",
                outlineClosedKey: "bo",
                outlineOpenKeyPrefix: "bs",
                simpleRowKeyPrefix: "b",
              }}
            />
          </g>
          {garmentPathsInViewer ? (
            <FitSvgFrontGarmentLayer
              fitData={fitData}
              garmentStrokeFallback={garmentStrokeFallback}
              opacityStyle={opacityStage}
            />
          ) : null}
          {showFitEaseUi &&
          garmentPathsInViewer &&
          (fitData.fitEaseDiagram?.ops?.length ?? 0) > 0 ? (
            <g
              style={{
                opacity: showEmbedEaseOverlay ? 1 : 0,
                transition: "opacity 0.35s ease-out",
              }}
            >
              <WidgetFitEaseDiagramSvg diagram={fitData.fitEaseDiagram} />
            </g>
          ) : null}
        </svg>
      </div>
      {!showFitEaseUi && footerSlot != null ? (
        <div className="shrink-0">{footerSlot}</div>
      ) : showFitEaseUi && garmentPathsInViewer && (fitData.fitEaseDiagram?.ops?.length ?? 0) > 0 ? (
        <div
          className="shrink-0"
          style={{
            opacity: showEmbedEaseText ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        >
          <PreviewFitEaseFootnote summary={fitData.fitEaseSummary} />
        </div>
      ) : showFitEaseUi && garmentPathsInViewer ? (
        <div
          className="shrink-0"
          style={{
            opacity: showEmbedEaseText ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        >
          <PreviewFitEaseSummary summary={fitData.fitEaseSummary} />
        </div>
      ) : null}
    </div>
  );
}
