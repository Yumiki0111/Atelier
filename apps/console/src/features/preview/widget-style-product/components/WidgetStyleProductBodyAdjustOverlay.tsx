"use client";

import type { CSSProperties } from "react";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";
import {
  PreviewAccentCtaButton,
  PreviewBackRow,
  PreviewBodySilhouette,
  PreviewColorSwatchRow,
  PreviewFitParamSliders,
  PreviewProductRow,
  PreviewViewerShell,
} from "../../WidgetPreviewChrome";
import { PreviewFittingCanvasSvg } from "../../PreviewFittingCanvasSvg";
import type { PreviewChromeTheme } from "@/lib/previewChromeTheme";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { FitSvgPayload } from "../fit-svg-types";
import { WidgetStyleProductPreviewBodySheetServerSvg } from "../fit-svg-body-sheet";
import { PreviewGarmentBodyViewToggle } from "./PreviewGarmentBodyViewToggle";

export type WidgetStyleProductBodyAdjustOverlayProps = {
  canvasBg: string;
  interfaceBg: string;
  productName: string;
  priceDisplay: string;
  thumbnailUrl?: string | null;
  garmentFitAvailable: boolean;
  swatches: { id: string; hex: string; label?: string }[];
  selectedColorId: string;
  onSelectColorId: (id: string) => void;
  accent: string;
  onCloseSheet: () => void;
  chrome: PreviewChromeTheme;
  customGarmentData: CustomGarmentData | null;
  productCategory?: string | null;
  sizeKeys: string[];
  currentSize: string;
  fitEaseRevealNonce: number;
  authLoading: boolean;
  bodyDraftHeight: number;
  bodyDraftVal: number;
  onBodyDraftHeight: (v: number) => void;
  onBodyDraftVal: (v: number) => void;
  tryOnLabel: string;
  draftFitData: FitSvgPayload | null;
  draftFitLoading: boolean;
  draftFitError: string | null;
  fitSvgStageEmbed: number;
  showDraftEaseText: boolean;
  fitErrorMain: string | null;
  onApplyBody: () => void;
  previewBodyView: GarmentPreviewBodyView;
  onPreviewBodyViewToggle: () => void;
  bodyViewCanvasFadeStyle: CSSProperties;
  suppressFitEaseUi: boolean;
  fitEaseAccentColor: string;
};

export function WidgetStyleProductBodyAdjustOverlay(props: WidgetStyleProductBodyAdjustOverlayProps) {
  const {
    canvasBg,
    interfaceBg,
    productName,
    priceDisplay,
    thumbnailUrl,
    garmentFitAvailable,
    swatches,
    selectedColorId,
    onSelectColorId,
    accent,
    onCloseSheet,
    chrome,
    customGarmentData,
    productCategory,
    sizeKeys,
    currentSize,
    fitEaseRevealNonce,
    authLoading,
    bodyDraftHeight,
    bodyDraftVal,
    onBodyDraftHeight,
    onBodyDraftVal,
    tryOnLabel,
    draftFitData,
    draftFitLoading,
    draftFitError,
    fitSvgStageEmbed,
    showDraftEaseText,
    fitErrorMain,
    onApplyBody,
    previewBodyView,
    onPreviewBodyViewToggle,
    bodyViewCanvasFadeStyle,
    suppressFitEaseUi,
    fitEaseAccentColor,
  } = props;

  return (
    <div
      className="absolute inset-0 z-50 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[34px]"
      style={{ backgroundColor: canvasBg }}
      data-fitlook-body-adjust
    >
      <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
        <PreviewBackRow onClick={onCloseSheet} />
        <PreviewProductRow
          productName={productName}
          priceDisplay={priceDisplay}
          thumbnailUrl={thumbnailUrl}
        />
        {!garmentFitAvailable ? (
          <PreviewColorSwatchRow
            swatches={swatches}
            selectedId={selectedColorId}
            onSelect={onSelectColorId}
            accentColor={accent}
          />
        ) : null}
      </div>
      <PreviewViewerShell backgroundColor={canvasBg} clipContent>
        {garmentFitAvailable ? (
          <>
            {customGarmentData ? (
              <div className="flex h-full min-h-0 w-full flex-1 justify-center" style={bodyViewCanvasFadeStyle}>
                <PreviewFittingCanvasSvg
                  fitHeightCm={bodyDraftHeight}
                  fitBodyVal={bodyDraftVal}
                  currentSize={currentSize}
                  customGarmentData={customGarmentData}
                  orderedSizeKeys={sizeKeys}
                  fitChestBandCategory={productCategory}
                  bodyOnly
                  bodySheetHeightScale
                  fitEaseRevealNonce={fitEaseRevealNonce}
                  embeddedWidgetUi
                  garmentPreviewView={previewBodyView}
                  showFitEaseUi={!suppressFitEaseUi}
                />
              </div>
            ) : authLoading ? (
              <div
                className="flex flex-1 items-center justify-center px-6 text-center text-[14px]"
                style={{ color: chrome.canvas.mutedFg }}
              >
                読み込み中…
              </div>
            ) : draftFitError && !draftFitData ? (
              <div className="max-w-[280px] flex-1 self-center px-4 text-center text-[13px] leading-snug text-red-700">
                {draftFitError}
              </div>
            ) : draftFitData ? (
              <WidgetStyleProductPreviewBodySheetServerSvg
                draftFitData={draftFitData}
                canvasBg={canvasBg}
                bodyStroke={chrome.canvas.bodyStroke}
                bodyDraftHeight={bodyDraftHeight}
                fitSvgStageEmbed={fitSvgStageEmbed}
                showDraftEaseText={showDraftEaseText}
                showFitEaseUi={!suppressFitEaseUi}
                canvasFadeStyle={bodyViewCanvasFadeStyle}
                footerSlot={
                  <PreviewGarmentBodyViewToggle
                    value={previewBodyView}
                    onToggle={onPreviewBodyViewToggle}
                    accentColor={fitEaseAccentColor}
                    compact
                  />
                }
              />
            ) : (
              <div
                className="flex flex-1 items-center justify-center text-[14px]"
                style={{ color: chrome.canvas.mutedFg }}
              >
                {draftFitLoading ? "読み込み中…" : fitErrorMain ?? "試着表示を読み込めませんでした"}
              </div>
            )}
          </>
        ) : (
          <div className="pointer-events-none flex flex-1 items-center justify-center">
            <PreviewBodySilhouette
              className="max-h-[min(85%,320px)] w-full"
              stroke={chrome.canvas.bodyStroke}
            />
          </div>
        )}
      </PreviewViewerShell>
      <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
        <PreviewFitParamSliders
          heightCm={bodyDraftHeight}
          bodyVal={bodyDraftVal}
          onHeightChange={onBodyDraftHeight}
          onBodyValChange={onBodyDraftVal}
          accentColor={accent}
        />
        <PreviewAccentCtaButton variant="tryOn" label={tryOnLabel} accentColor={accent} onClick={onApplyBody} />
      </div>
    </div>
  );
}
