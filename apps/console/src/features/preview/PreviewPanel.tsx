"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product, ProductSize } from "@Atelier/shared";
import { formatPriceYenForDisplay } from "@Atelier/shared";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAssets } from "../products/useAssets";
import { useProduct } from "../products/useProducts";
import { PhoneFrame } from "./PhoneFrame";
import { WidgetStyleProductPreview } from "./WidgetStyleProductPreview";
import { isGarmentSpecRenderable } from "../../lib/widget-fit/applyWidgetSizeToGarment";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { parseStoredGarmentSpec } from "@/lib/widget-fit/parseStoredGarmentSpec";
import { resolveWidgetFitInitialSize } from "@/lib/widget-fit/widgetFitFlatCmSize";
import { getPreviewSizeKeys } from "./previewProductSizeKeys";

async function fetchWidgetDesignForPreview(): Promise<{
  interfaceBackgroundColor?: string;
  canvasBackgroundColor?: string;
  ctaCartLabel?: string;
  ctaTryOnLabel?: string;
  ctaAccentColor?: string;
} | null> {
  const r = await authenticatedFetch("/api/widget-design");
  if (!r.ok) return null;
  return r.json();
}

interface PreviewPanelProps {
  selectedProduct?: Product;
  selectedSize?: ProductSize;
}

export function PreviewPanel({ selectedProduct, selectedSize }: PreviewPanelProps) {
  const { shopId } = useAuth();
  const { clearProductSelection } = useProductSelection();
  const { data: liveProduct } = useProduct(selectedProduct?.id ?? "");
  const previewProduct = liveProduct ?? selectedProduct;
  const { data: assets = [] } = useAssets(previewProduct?.id);
  const { data: widgetUi } = useQuery({
    queryKey: ["widget-design", shopId],
    queryFn: fetchWidgetDesignForPreview,
    enabled: !!shopId,
  });

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  const sizeKeys = useMemo(
    () => (previewProduct ? getPreviewSizeKeys(previewProduct, assets) : []),
    [previewProduct, assets]
  );

  const garmentFitAvailable =
    previewProduct != null && isGarmentSpecRenderable(previewProduct.garmentSpec);

  const customGarmentForPreview = useMemo(() => {
    if (!garmentFitAvailable || !previewProduct) return null;
    return parseStoredGarmentSpec(previewProduct.garmentSpec);
  }, [garmentFitAvailable, previewProduct]);

  const initialSize = useMemo((): ProductSize => {
    const preferred = selectedSize ?? undefined;
    return resolveWidgetFitInitialSize(
      preferred,
      customGarmentForPreview,
      sizeKeys
    ) as ProductSize;
  }, [selectedSize, customGarmentForPreview, sizeKeys]);

  if (!previewProduct) {
    return (
      <div className="flex h-screen w-[400px] flex-col items-center justify-center bg-white text-sm text-gray-500">
        商品を選択してください
      </div>
    );
  }

  return (
    <div className="flex h-screen w-[400px] overflow-hidden bg-white">
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-white">
        <div
          className="rounded-[2.75rem] shadow-[0_12px_48px_rgba(0,0,0,0.1)]"
          style={{
            width: "310.5px",
            height: "672px",
            flexShrink: 0,
          }}
        >
          <PhoneFrame
            previewContainerRef={previewContainerRef}
            borderRef={borderRef}
            screenContentBackgroundColor={
              widgetUi?.interfaceBackgroundColor ?? widgetUi?.canvasBackgroundColor
            }
          >
            <div
              ref={previewContainerRef}
              className="absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col overflow-hidden"
              style={{
                paddingTop: "5.2%",
                boxSizing: "border-box",
              }}
            >
              <WidgetStyleProductPreview
                key={`${previewProduct.id}-${previewProduct.updatedAt ?? ""}`}
                productId={previewProduct.id}
                productCategory={previewProduct.category ?? null}
                productName={previewProduct.name}
                thumbnailUrl={previewProduct.thumbnailUrl}
                priceDisplay={formatPriceYenForDisplay(previewProduct.priceYen)}
                sizeKeys={sizeKeys}
                initialSize={initialSize}
                garmentFitAvailable={garmentFitAvailable}
                customGarmentData={customGarmentForPreview}
                onClose={clearProductSelection}
                interfaceBackgroundColor={widgetUi?.interfaceBackgroundColor}
                canvasBackgroundColor={widgetUi?.canvasBackgroundColor}
                ctaCartLabel={widgetUi?.ctaCartLabel}
                ctaTryOnLabel={widgetUi?.ctaTryOnLabel}
                ctaAccentColor={widgetUi?.ctaAccentColor}
              />
            </div>
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}
