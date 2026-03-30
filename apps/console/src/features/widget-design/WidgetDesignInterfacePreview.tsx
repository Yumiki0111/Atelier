"use client";

import { useMemo, useRef } from "react";
import type { Product, ProductSize } from "@atelier/shared";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { PhoneFrame } from "@/features/preview/PhoneFrame";
import { WidgetStyleProductPreview } from "@/features/preview/WidgetStyleProductPreview";
import { getPreviewSizeKeys } from "@/features/preview/previewProductSizeKeys";
import {
  PreviewAccentCtaButton,
  PreviewBackRow,
  PreviewProductRow,
  PreviewViewerShell,
} from "@/features/preview/WidgetPreviewChrome";

const SAMPLE_NAME = "サンプル商品";
const SAMPLE_PRICE = "¥ —";

/**
 * インターフェース設定の右カラム（見た目のみ）。
 * 表示文言は常にサンプル。体型ラインの計算に試着可能な商品が1件あればその spec を内部利用する（服パス・サイズ行は出さない）。
 */
export function WidgetDesignInterfacePreview({
  interfaceBackgroundColor,
  canvasBackgroundColor,
  ctaCartLabel,
  ctaTryOnLabel,
  ctaAccentColor,
  sampleProduct,
  sampleAssets,
}: {
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
    <div className="flex w-full flex-col gap-6 xl:w-[min(100%,340px)]">
      <div
        className="mx-auto flex justify-center"
        style={{ width: "310.5px", height: "672px", flexShrink: 0 }}
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
              <div
                className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  backgroundColor: interfaceBackgroundColor,
                }}
              >
                <PreviewBackRow onClick={noop} />
                <PreviewProductRow
                  productName={SAMPLE_NAME}
                  priceDisplay={SAMPLE_PRICE}
                  thumbnailUrl={null}
                />
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
            )}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
