"use client";

import type { CSSProperties, ReactNode } from "react";
import { PreviewFitEaseSummary } from "./fit-ease-ui";
import type { FitSvgPayload } from "./fit-svg-types";
import {
  bodySheetPreviewHeightScale,
  uniformPreviewViewBoxHeightFromHeightCm,
} from "./fit-svg-viewbox";
import { WidgetPreviewFitSvgBodyPaths } from "./fit-svg-body-paths";

export type WidgetStyleProductPreviewBodySheetServerSvgProps = {
  draftFitData: FitSvgPayload;
  canvasBg: string;
  bodyStroke: string;
  bodyDraftHeight: number;
  fitSvgStageEmbed: number;
  showDraftEaseText: boolean;
  showFitEaseUi?: boolean;
  footerSlot?: ReactNode;
  canvasFadeStyle?: CSSProperties;
};

export function WidgetStyleProductPreviewBodySheetServerSvg({
  draftFitData,
  canvasBg,
  bodyStroke,
  bodyDraftHeight,
  fitSvgStageEmbed,
  showDraftEaseText,
  showFitEaseUi = true,
  footerSlot,
  canvasFadeStyle,
}: WidgetStyleProductPreviewBodySheetServerSvgProps) {
  const vbH = uniformPreviewViewBoxHeightFromHeightCm(bodyDraftHeight);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden py-0.5">
      <div
        className="flex min-h-0 w-full max-w-full max-h-[88%] flex-1 items-center justify-center overflow-hidden sm:max-h-[94%]"
        style={{
          transform: `scale(${bodySheetPreviewHeightScale(bodyDraftHeight)})`,
          transformOrigin: "center center",
          ...canvasFadeStyle,
        }}
      >
        <svg
          viewBox={`${draftFitData.viewBoxMinX ?? 0} 0 ${draftFitData.viewBoxWidth} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto max-h-full w-auto min-h-0 min-w-0 max-w-full overflow-visible"
          style={{
            aspectRatio: `${draftFitData.viewBoxWidth} / ${vbH}`,
          }}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <g
            style={{
              opacity: fitSvgStageEmbed >= 1 ? 1 : 0,
              transition: "opacity 0.42s ease-out",
            }}
          >
            <WidgetPreviewFitSvgBodyPaths
              bodyPaths={draftFitData.bodyPaths}
              canvasBg={canvasBg}
              bodyStrokeSimple={bodyStroke}
              presetId={draftFitData.presetId}
              bodyModelVariant={draftFitData.bodyModelVariant}
              ids={{
                fillRowKeyPrefix: "bdf",
                outlineClosedKey: "bod-o",
                outlineOpenKeyPrefix: "bds",
                simpleRowKeyPrefix: "bod",
              }}
            />
          </g>
        </svg>
      </div>
      {!showFitEaseUi && footerSlot != null ? (
        <div className="shrink-0">{footerSlot}</div>
      ) : showFitEaseUi ? (
        <div
          style={{
            opacity: showDraftEaseText ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        >
          <PreviewFitEaseSummary summary={draftFitData.fitEaseSummary} />
        </div>
      ) : null}
    </div>
  );
}
