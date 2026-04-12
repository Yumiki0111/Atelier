"use client";

import { useCallback } from "react";
import { WidgetStyleProductPreview } from "@/features/preview/WidgetStyleProductPreview";
import type { PublicEmbedWidgetFitProps } from "@/lib/widget/getPublicEmbedWidgetFitProps";

type EmbedWidgetFitClientProps = PublicEmbedWidgetFitProps & {
  /** 親ウィジェットの `data-fitlook-add-to-cart-url` をクエリで引き渡し */
  addToCartUrl?: string;
};

export function EmbedWidgetFitClient(props: EmbedWidgetFitClientProps) {
  const { addToCartUrl = "", ...data } = props;
  const onClose = useCallback(() => {
    try {
      window.parent.postMessage({ type: "fitlook-embed-close" }, "*");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <WidgetStyleProductPreview
        productId={data.productId}
        productCategory={data.productCategory}
        externalProductId={data.externalProductId}
        addToCartUrlTemplate={addToCartUrl}
        productName={data.productName}
        thumbnailUrl={data.thumbnailUrl}
        priceDisplay={data.priceDisplay}
        sizeKeys={data.sizeKeys}
        initialSize={data.initialSize}
        garmentFitAvailable={data.garmentFitAvailable}
        customGarmentData={data.customGarmentData}
        onClose={onClose}
        interfaceBackgroundColor={data.interfaceBackgroundColor}
        canvasBackgroundColor={data.canvasBackgroundColor}
        ctaCartLabel={data.ctaCartLabel}
        ctaTryOnLabel={data.ctaTryOnLabel}
        ctaAccentColor={data.ctaAccentColor}
        embedPublicWidget
      />
    </div>
  );
}
