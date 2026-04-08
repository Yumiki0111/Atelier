"use client";

import { useCallback } from "react";
import { WidgetStyleProductPreview } from "@/features/preview/WidgetStyleProductPreview";
import type { PublicEmbedWidgetFitProps } from "@/lib/widget/getPublicEmbedWidgetFitProps";

export function EmbedWidgetFitClient(props: PublicEmbedWidgetFitProps) {
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
        productId={props.productId}
        productName={props.productName}
        thumbnailUrl={props.thumbnailUrl}
        priceDisplay={props.priceDisplay}
        sizeKeys={props.sizeKeys}
        initialSize={props.initialSize}
        garmentFitAvailable={props.garmentFitAvailable}
        customGarmentData={props.customGarmentData}
        onClose={onClose}
        interfaceBackgroundColor={props.interfaceBackgroundColor}
        canvasBackgroundColor={props.canvasBackgroundColor}
        ctaCartLabel={props.ctaCartLabel}
        ctaTryOnLabel={props.ctaTryOnLabel}
        ctaAccentColor={props.ctaAccentColor}
        embedPublicWidget
      />
    </div>
  );
}
