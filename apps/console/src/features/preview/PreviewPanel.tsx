"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product, ProductSize } from "@atelier/shared";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAssets } from "../products/useAssets";
import { PhoneFrame } from "./PhoneFrame";
import { WidgetStyleProductPreview } from "./WidgetStyleProductPreview";
import { isGarmentSpecRenderable } from "../../lib/widget-fit/applyWidgetSizeToGarment";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
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
  const { togglePreview } = useProductSelection();
  const { data: assets = [] } = useAssets(selectedProduct?.id);
  const { data: widgetUi } = useQuery({
    queryKey: ["widget-design", shopId],
    queryFn: fetchWidgetDesignForPreview,
    enabled: !!shopId,
  });

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  const sizeKeys = useMemo(
    () => (selectedProduct ? getPreviewSizeKeys(selectedProduct, assets) : []),
    [selectedProduct, assets]
  );

  const garmentFitAvailable =
    selectedProduct != null && isGarmentSpecRenderable(selectedProduct.garmentSpec);

  const initialSize = (selectedSize ?? "M") as ProductSize;

  if (!selectedProduct) {
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
          style={{
            width: "310.5px",
            height: "672px",
            flexShrink: 0,
          }}
        >
          <PhoneFrame
            previewContainerRef={previewContainerRef}
            selectedAsset={null}
            borderRef={borderRef}
            screenContentBackgroundColor={widgetUi?.interfaceBackgroundColor}
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
                productId={selectedProduct.id}
                productName={selectedProduct.name}
                thumbnailUrl={selectedProduct.thumbnailUrl}
                priceDisplay="—"
                sizeKeys={sizeKeys}
                initialSize={initialSize}
                garmentFitAvailable={garmentFitAvailable}
                customGarmentData={
                  garmentFitAvailable ? (selectedProduct.garmentSpec as CustomGarmentData) : null
                }
                onClose={togglePreview}
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
