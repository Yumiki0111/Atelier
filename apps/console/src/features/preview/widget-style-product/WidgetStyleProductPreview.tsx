"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";
import { buildPreviewChromeTheme } from "@/lib/previewChromeTheme";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { savePreviewFit } from "@/lib/previewFitStorage";
import { sendWidgetAnalyticsEvent } from "@/lib/widget/sendWidgetAnalyticsEvent";
import {
  PreviewAccentCtaButton,
  PreviewBackRow,
  PreviewBodyChangeButton,
  PreviewBodySilhouette,
  PreviewChromeScaleProvider,
  PreviewChromeThemeProvider,
  PreviewColorSwatchRow,
  PreviewProductRow,
  PreviewSizeCarousel,
  PREVIEW_ACCENT,
  PREVIEW_SURFACE_BG,
  PreviewViewerShell,
} from "../WidgetPreviewChrome";
import { PreviewFittingCanvasSvg } from "../PreviewFittingCanvasSvg";
import { colorFilterForHex } from "./product-preview-color";
import { DEFAULT_FIT_BODY_VAL } from "./fit-constants";
import { WidgetStyleProductPreviewServerFitViewer } from "./fit-svg-server-viewer";
import { WidgetStyleProductBodyAdjustOverlay } from "./components/WidgetStyleProductBodyAdjustOverlay";
import { useWidgetStyleProductEmbedAnalytics } from "./hooks/use-widget-style-product-embed-analytics";
import { useWidgetStyleProductFitParams } from "./hooks/use-widget-style-product-fit-params";
import { useWidgetStyleProductFitSvgQueries } from "./hooks/use-widget-style-product-fit-svg";
import { useWidgetStyleProductEaseReveal } from "./hooks/use-widget-style-product-ease-reveal";
import { useWidgetStyleProductSizeAndCart } from "./hooks/use-widget-style-product-size-cart";
import { PreviewGarmentBodyViewToggle } from "./components/PreviewGarmentBodyViewToggle";
import { useGarmentPreviewBodyViewCrossfade } from "./hooks/use-garment-preview-body-view-crossfade";
import type { WidgetStyleProductPreviewProps } from "./widget-style-product-types";

/** プレビューではフィット勧め・図解を一旦抑止し、前後ビュー切替を優先する */
const PREVIEW_WIDGET_SUPPRESS_FIT_EASE_UI = true;

export type { WidgetStyleProductPreviewProps } from "./widget-style-product-types";

/**
 * ウィジェット風の商品プレビュー（試着／サーバー fit-svg／シルエット＋サムネ）。
 * 状態は `hooks/`、試着 SVG は `fit-svg-*`、体型調整オーバーレイは `components/`。
 */
export function WidgetStyleProductPreview(props: WidgetStyleProductPreviewProps) {
  const {
    productId,
    productCategory = null,
    externalProductId,
    addToCartUrlTemplate,
    productName,
    thumbnailUrl,
    priceDisplay = "—",
    sizeKeys: sizeKeysProp,
    initialSize,
    garmentFitAvailable,
    customGarmentData = null,
    onClose,
    interfaceBackgroundColor,
    canvasBackgroundColor,
    ctaCartLabel,
    ctaTryOnLabel,
    ctaAccentColor,
    bodyAdjustEnabled = true,
    sizeCarouselEnabled = true,
    garmentPathsInViewer = true,
    embedPublicWidget = false,
    embedSplashSuspended = false,
    shopId: embedShopId,
    eventSource: embedEventSource,
  } = props;

  const { embedAnalyticsMeta } = useWidgetStyleProductEmbedAnalytics({
    embedPublicWidget,
    embedSplashSuspended,
    embedShopId,
    productId,
    garmentFitAvailable,
    embedEventSource,
  });

  const interfaceBg = interfaceBackgroundColor ?? PREVIEW_SURFACE_BG;
  const canvasBg = canvasBackgroundColor ?? PREVIEW_SURFACE_BG;
  const chromeForStrokes = useMemo(
    () => buildPreviewChromeTheme(interfaceBg, canvasBg),
    [interfaceBg, canvasBg]
  );
  const cartLabel = ctaCartLabel ?? "カートに追加";
  const tryOnLabel = ctaTryOnLabel ?? "この体型で試着する";
  const accent = ctaAccentColor ?? PREVIEW_ACCENT;

  const embedReferrerOrigin = useMemo(() => {
    if (!embedPublicWidget || typeof document === "undefined") return null;
    try {
      if (document.referrer) return new URL(document.referrer).origin;
    } catch {
      return null;
    }
    return null;
  }, [embedPublicWidget]);

  const { isLoading: authLoadingFromAuth, isAuthenticated: isAuthenticatedFromAuth } = useAuth();
  const authLoading = embedPublicWidget ? false : authLoadingFromAuth;
  const isAuthenticated = embedPublicWidget ? false : isAuthenticatedFromAuth;

  const {
    fitHeightCm,
    fitBodyVal,
    setFitHeightCm,
    setFitBodyVal,
  } = useWidgetStyleProductFitParams({
    embedPublicWidget,
    authLoading,
    isAuthenticated,
  });

  const [bodyDraftHeight, setBodyDraftHeight] = useState(170);
  const [bodyDraftVal, setBodyDraftVal] = useState(DEFAULT_FIT_BODY_VAL);
  const [bodySheetOpen, setBodySheetOpen] = useState(false);
  const [fitEaseRevealNonce, setFitEaseRevealNonce] = useState(0);
  const [previewBodyView, setPreviewBodyView] = useState<GarmentPreviewBodyView>("front");
  const { canvasFadeStyle, onTogglePress } = useGarmentPreviewBodyViewCrossfade(
    previewBodyView,
    setPreviewBodyView,
    productId,
  );

  useEffect(() => {
    setPreviewBodyView("front");
  }, [productId]);

  const {
    swatches,
    selectedColorId,
    setSelectedColorId,
    selectedHex,
    sizeKeys,
    currentSize,
    windowStart,
    handleSelectSizeForAnalytics,
    handleAddToCartClick,
  } = useWidgetStyleProductSizeAndCart({
    sizeKeysProp,
    initialSize,
    customGarmentData,
    embedPublicWidget,
    embedShopId,
    productId,
    externalProductId,
    addToCartUrlTemplate,
    embedReferrerOrigin,
    embedAnalyticsMeta,
  });

  const {
    fitData,
    fitLoading,
    fitError,
    draftFitData,
    draftFitLoading,
    draftFitError,
    setDraftFitData,
    setDraftFitError,
  } = useWidgetStyleProductFitSvgQueries({
    customGarmentData,
    garmentFitAvailable,
    productId,
    currentSize,
    fitHeightCm,
    fitBodyVal,
    authLoading,
    isAuthenticated,
    bodySheetOpen,
    bodyDraftHeight,
    bodyDraftVal,
    previewBodyView,
    disableFitEase: PREVIEW_WIDGET_SUPPRESS_FIT_EASE_UI,
  });

  const {
    fitSvgStageEmbed,
    showEmbedEaseOverlay,
    showEmbedEaseText,
    showDraftEaseText,
  } = useWidgetStyleProductEaseReveal({
    garmentPathsInViewer,
    fitData,
    productId,
    fitEaseRevealNonce,
    embedPublicWidget,
    embedSplashSuspended,
    bodySheetOpen,
    customGarmentData,
    draftFitData,
  });

  useEffect(() => {
    if (!bodyAdjustEnabled) setBodySheetOpen(false);
  }, [bodyAdjustEnabled]);

  const openBodyAdjustSheet = useCallback(() => {
    setBodyDraftHeight(fitHeightCm);
    setBodyDraftVal(fitBodyVal);
    if (!customGarmentData && garmentFitAvailable) {
      setDraftFitData(fitData);
      setDraftFitError(null);
    }
    setBodySheetOpen(true);
  }, [fitHeightCm, fitBodyVal, fitData, customGarmentData, garmentFitAvailable, setDraftFitData, setDraftFitError]);

  const handleApplyBody = useCallback(() => {
    void (async () => {
      if (embedPublicWidget && embedShopId) {
        void sendWidgetAnalyticsEvent({
          shopId: embedShopId,
          productId,
          type: "height_change",
          meta: {
            heightCm: bodyDraftHeight,
            bodyVal: bodyDraftVal,
            ...embedAnalyticsMeta,
          },
        });
      }
      setFitHeightCm(bodyDraftHeight);
      setFitBodyVal(bodyDraftVal);
      savePreviewFit({ heightCm: bodyDraftHeight, bodyVal: bodyDraftVal });
      if (isAuthenticated && !embedPublicWidget) {
        try {
          await authenticatedFetch("/api/auth/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              preview_fit_height_cm: bodyDraftHeight,
              preview_fit_body_val: bodyDraftVal,
            }),
          });
        } catch {
          /* ignore */
        }
      }
      setBodySheetOpen(false);
      setFitEaseRevealNonce((n) => n + 1);
    })();
  }, [
    embedPublicWidget,
    embedShopId,
    productId,
    bodyDraftHeight,
    bodyDraftVal,
    embedAnalyticsMeta,
    setFitHeightCm,
    setFitBodyVal,
    isAuthenticated,
  ]);

  return (
    <PreviewChromeScaleProvider value={embedPublicWidget ? "embed" : "default"}>
      <PreviewChromeThemeProvider
        interfaceBackgroundColor={interfaceBg}
        canvasBackgroundColor={canvasBg}
      >
        <div
          className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: canvasBg,
          }}
        >
          <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
            <PreviewBackRow onClick={onClose} />
            <PreviewProductRow
              productName={productName}
              priceDisplay={priceDisplay}
              thumbnailUrl={thumbnailUrl}
              rightSlot={
                bodyAdjustEnabled ? (
                  <PreviewBodyChangeButton onClick={openBodyAdjustSheet} />
                ) : undefined
              }
            />
            {!garmentFitAvailable ? (
              <PreviewColorSwatchRow
                swatches={swatches}
                selectedId={selectedColorId}
                onSelect={setSelectedColorId}
                accentColor={accent}
              />
            ) : null}
          </div>

          <PreviewViewerShell backgroundColor={canvasBg} clipContent>
            {garmentFitAvailable ? (
              <>
                {customGarmentData ? (
                  <div
                    className={cn(
                      "flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center overflow-hidden",
                      embedPublicWidget ? "pb-px pt-0" : "pb-2 pt-px",
                    )}
                  >
                    <div
                      className="flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden"
                      style={canvasFadeStyle}
                    >
                      <PreviewFittingCanvasSvg
                        fitHeightCm={fitHeightCm}
                        fitBodyVal={fitBodyVal}
                        currentSize={currentSize}
                        customGarmentData={customGarmentData}
                        orderedSizeKeys={sizeKeys}
                        fitChestBandCategory={productCategory}
                        bodyOnly={!garmentPathsInViewer}
                        fitEaseRevealNonce={fitEaseRevealNonce}
                        embedSplashSuspended={embedPublicWidget && embedSplashSuspended}
                        embeddedWidgetUi
                        garmentPreviewView={previewBodyView}
                        showFitEaseUi={!PREVIEW_WIDGET_SUPPRESS_FIT_EASE_UI}
                      />
                    </div>
                    <PreviewGarmentBodyViewToggle
                      value={previewBodyView}
                      onToggle={onTogglePress}
                      accentColor={accent}
                    />
                  </div>
                ) : authLoading || fitLoading ? (
                  <div
                    className="px-6 text-center text-[14px]"
                    style={{ color: chromeForStrokes.canvas.mutedFg }}
                  >
                    読み込み中…
                  </div>
                ) : fitError || !fitData ? (
                  <div className="max-w-[280px] px-4 text-center text-[13px] leading-snug text-red-700">
                    {fitError ?? "試着表示を読み込めませんでした"}
                  </div>
                ) : (
                  <WidgetStyleProductPreviewServerFitViewer
                    fitData={fitData}
                    canvasBg={canvasBg}
                    chromeBodyStroke={chromeForStrokes.canvas.bodyStroke}
                    chromeGarmentStroke={chromeForStrokes.canvas.garmentStroke}
                    garmentPathsInViewer={garmentPathsInViewer}
                    fitSvgStageEmbed={fitSvgStageEmbed}
                    showEmbedEaseOverlay={showEmbedEaseOverlay}
                    showEmbedEaseText={showEmbedEaseText}
                    embedPublicWidget={embedPublicWidget}
                    showFitEaseUi={!PREVIEW_WIDGET_SUPPRESS_FIT_EASE_UI}
                    canvasFadeStyle={canvasFadeStyle}
                    footerSlot={
                      <PreviewGarmentBodyViewToggle
                        value={previewBodyView}
                        onToggle={onTogglePress}
                        accentColor={accent}
                      />
                    }
                  />
                )}
              </>
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <PreviewBodySilhouette
                    className="max-h-[min(85%,320px)] w-full"
                    stroke={chromeForStrokes.canvas.bodyStroke}
                  />
                </div>
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="relative z-[1] max-h-[62%] max-w-[58%] object-contain"
                    style={{ filter: colorFilterForHex(selectedHex) }}
                  />
                ) : null}
              </>
            )}
          </PreviewViewerShell>

          <div className="relative z-10 flex shrink-0 flex-col" style={{ backgroundColor: interfaceBg }}>
            {sizeCarouselEnabled ? (
              <PreviewSizeCarousel
                sizeKeys={sizeKeys}
                currentSize={currentSize}
                windowStart={windowStart}
                onSelectSize={handleSelectSizeForAnalytics}
                accentColor={accent}
              />
            ) : null}
            <PreviewAccentCtaButton
              variant="cart"
              label={cartLabel}
              accentColor={accent}
              onClick={addToCartUrlTemplate?.trim() ? handleAddToCartClick : undefined}
            />
          </div>

          {bodyAdjustEnabled && bodySheetOpen ? (
            <WidgetStyleProductBodyAdjustOverlay
              canvasBg={canvasBg}
              interfaceBg={interfaceBg}
              productName={productName}
              priceDisplay={priceDisplay}
              thumbnailUrl={thumbnailUrl}
              garmentFitAvailable={garmentFitAvailable}
              swatches={swatches}
              selectedColorId={selectedColorId}
              onSelectColorId={setSelectedColorId}
              accent={accent}
              onCloseSheet={() => setBodySheetOpen(false)}
              chrome={chromeForStrokes}
              customGarmentData={customGarmentData}
              productCategory={productCategory}
              sizeKeys={sizeKeys}
              currentSize={currentSize}
              fitEaseRevealNonce={fitEaseRevealNonce}
              authLoading={authLoading}
              bodyDraftHeight={bodyDraftHeight}
              bodyDraftVal={bodyDraftVal}
              onBodyDraftHeight={setBodyDraftHeight}
              onBodyDraftVal={setBodyDraftVal}
              tryOnLabel={tryOnLabel}
              draftFitData={draftFitData}
              draftFitLoading={draftFitLoading}
              draftFitError={draftFitError}
              fitSvgStageEmbed={fitSvgStageEmbed}
              showDraftEaseText={showDraftEaseText}
              fitErrorMain={fitError}
              onApplyBody={handleApplyBody}
              previewBodyView={previewBodyView}
              onPreviewBodyViewToggle={onTogglePress}
              bodyViewCanvasFadeStyle={canvasFadeStyle}
              suppressFitEaseUi={PREVIEW_WIDGET_SUPPRESS_FIT_EASE_UI}
              fitEaseAccentColor={accent}
            />
          ) : null}
        </div>
      </PreviewChromeThemeProvider>
    </PreviewChromeScaleProvider>
  );
}
