"use client";

import { useMemo, useRef } from "react";
import type { Product, ProductSize } from "@Atelier/shared";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { PhoneFrame } from "@/features/preview/PhoneFrame";
import { WidgetStyleProductPreview } from "@/features/preview/WidgetStyleProductPreview";
import { getPreviewSizeKeys } from "@/features/preview/previewProductSizeKeys";
import {
  PreviewAccentCtaButton,
  PreviewBackRow,
  PreviewChromeThemeProvider,
  PreviewProductRow,
  PreviewViewerShell,
} from "@/features/preview/WidgetPreviewChrome";
import { WidgetLauncherPreviewMock } from "@/features/widget-design/WidgetLauncherPreviewMock";

const SAMPLE_NAME = "サンプル商品";
const SAMPLE_PRICE = "¥ —";

/** Phone mockup chrome height (width matches `max-w-[310.5px]`). */
const PREVIEW_FRAME_H = 672;

/**
 * Widget design preview column (appearance only).
 * Copy is always sample text. Uses one fittable product spec internally when available.
 */
export function WidgetDesignInterfacePreview({
  launcherPlacement,
  buttonShape,
  buttonColor,
  buttonText,
  interfaceBackgroundColor,
  canvasBackgroundColor,
  ctaCartLabel,
  ctaTryOnLabel,
  ctaAccentColor,
  sampleProduct,
  sampleAssets,
}: {
  launcherPlacement: "floating" | "inline";
  buttonShape: "circle" | "pill";
  buttonColor: string;
  buttonText: string;
  interfaceBackgroundColor: string;
  canvasBackgroundColor: string;
  ctaCartLabel: string;
  ctaTryOnLabel: string;
  ctaAccentColor: string;
  sampleProduct: Product | null;
  sampleAssets: { size: string }[];
}) {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  const canShowFit = sampleProduct != null && isGarmentSpecRenderable(sampleProduct.garmentSpec);

  const sizeKeys = useMemo(
    () => (sampleProduct ? getPreviewSizeKeys(sampleProduct, sampleAssets) : ["M"]),
    [sampleProduct, sampleAssets]
  );

  const initialSize = useMemo((): ProductSize => {
    if (sizeKeys.includes("M")) return "M";
    const first = sizeKeys[0];
    return (first ?? "M") as ProductSize;
  }, [sizeKeys]);

  const noop = () => {};

  return (
    <div className="mx-auto w-full max-w-[310.5px]">
      <div className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-background pb-2.5 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            プレビュー（上・店頭／下・試着画面）
          </span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary/80" aria-hidden />
        </div>
        <div className="flex flex-col items-stretch gap-4 pb-3 pt-3 sm:pb-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              店頭のみ（スニペット）
            </p>
            <WidgetLauncherPreviewMock
              placement={launcherPlacement}
              shape={buttonShape}
              color={buttonColor}
              label={buttonText}
            />
          </div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            試着ウィジェット内（起動後の画面）
          </p>
          <div
            className="flex w-full shrink-0 justify-center"
            style={{ height: PREVIEW_FRAME_H }}
          >
            <PhoneFrame
              previewContainerRef={previewContainerRef}
              borderRef={borderRef}
              selectedAsset={null}
              screenContentBackgroundColor={interfaceBackgroundColor}
            >
              <div
                ref={previewContainerRef}
                className="absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col overflow-hidden"
                style={{
                  paddingTop: "5.2%",
                  boxSizing: "border-box",
                }}
              >
                {canShowFit && sampleProduct ? (
                  <WidgetStyleProductPreview
                    productId={sampleProduct.id}
                    productCategory={sampleProduct.category ?? null}
                    productName={SAMPLE_NAME}
                    thumbnailUrl={null}
                    priceDisplay={SAMPLE_PRICE}
                    sizeKeys={sizeKeys.length > 0 ? sizeKeys : ["M"]}
                    initialSize={initialSize}
                    garmentFitAvailable
                    customGarmentData={sampleProduct.garmentSpec as CustomGarmentData}
                    onClose={noop}
                    interfaceBackgroundColor={interfaceBackgroundColor}
                    canvasBackgroundColor={canvasBackgroundColor}
                    ctaCartLabel={ctaCartLabel}
                    ctaTryOnLabel={ctaTryOnLabel}
                    ctaAccentColor={ctaAccentColor}
                    bodyAdjustEnabled={false}
                    sizeCarouselEnabled={false}
                    garmentPathsInViewer={false}
                  />
                ) : (
                  <PreviewChromeThemeProvider
                    interfaceBackgroundColor={interfaceBackgroundColor}
                    canvasBackgroundColor={canvasBackgroundColor}
                  >
                    <div
                      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
                      style={{
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        backgroundColor: canvasBackgroundColor,
                      }}
                    >
                      <div
                        className="flex shrink-0 flex-col"
                        style={{ backgroundColor: interfaceBackgroundColor }}
                      >
                        <PreviewBackRow onClick={noop} />
                        <PreviewProductRow
                          productName={SAMPLE_NAME}
                          priceDisplay={SAMPLE_PRICE}
                          thumbnailUrl={null}
                        />
                      </div>
                      <PreviewViewerShell backgroundColor={canvasBackgroundColor}>
                        <div className="h-full min-h-0 w-full flex-1" aria-hidden />
                      </PreviewViewerShell>
                      <PreviewAccentCtaButton
                        variant="cart"
                        label={ctaCartLabel}
                        accentColor={ctaAccentColor}
                        onClick={noop}
                      />
                    </div>
                  </PreviewChromeThemeProvider>
                )}
              </div>
            </PhoneFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
