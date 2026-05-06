import { useCallback, useEffect, useMemo, useState } from "react";
import {
  interpolateAddToCartUrlTemplate,
  isGarmentFlatCmPresetId,
  resolveAddToCartNavigationHref,
  type ProductSize,
} from "@Atelier/shared";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { sendWidgetAnalyticsEvent } from "@/lib/widget/sendWidgetAnalyticsEvent";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";
import { PREVIEW_SIZE_CAROUSEL_WINDOW } from "../../WidgetPreviewChrome";
import { DEFAULT_SWATCHES } from "../constants";

export function useWidgetStyleProductSizeAndCart(options: {
  sizeKeysProp: string[];
  initialSize: ProductSize;
  customGarmentData: CustomGarmentData | null;
  embedPublicWidget: boolean;
  embedShopId?: string;
  productId: string;
  externalProductId?: string;
  addToCartUrlTemplate?: string | null;
  embedReferrerOrigin: string | null;
  embedAnalyticsMeta: Record<string, unknown>;
}) {
  const {
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
  } = options;

  const swatches = DEFAULT_SWATCHES;
  const [selectedColorId, setSelectedColorId] = useState<string>(swatches[0]?.id ?? "");

  const sizeKeys = useMemo(() => {
    if (customGarmentData != null && isGarmentFlatCmPresetId(customGarmentData.presetId)) {
      return resolveWidgetFitSizeKeysOrder(
        sizeKeysProp.length > 0 ? sizeKeysProp : [],
        customGarmentData
      );
    }
    return sizeKeysProp.length > 0 ? [...sizeKeysProp] : ["3", "4", "5"];
  }, [sizeKeysProp, customGarmentData]);

  const [currentSize, setCurrentSize] = useState<string>(() => {
    if (sizeKeys.includes(initialSize as string)) return initialSize as string;
    return sizeKeys[0] ?? "M";
  });

  useEffect(() => {
    if (sizeKeys.includes(initialSize as string)) {
      setCurrentSize(initialSize as string);
    } else if (sizeKeys[0]) {
      setCurrentSize(sizeKeys[0]);
    }
  }, [initialSize, sizeKeys]);

  const handleSelectSizeForAnalytics = useCallback(
    (sz: string) => {
      setCurrentSize((prev) => {
        if (embedPublicWidget && embedShopId && sz !== prev) {
          void sendWidgetAnalyticsEvent({
            shopId: embedShopId,
            productId,
            type: "size_change",
            meta: { size: sz, ...embedAnalyticsMeta },
          });
        }
        return sz;
      });
    },
    [embedPublicWidget, embedShopId, productId, embedAnalyticsMeta]
  );

  const handleAddToCartClick = useCallback(() => {
    const template = addToCartUrlTemplate?.trim();
    if (!template) return;
    if (embedPublicWidget && embedShopId) {
      void sendWidgetAnalyticsEvent({
        shopId: embedShopId,
        productId,
        type: "add_to_cart_click",
        meta: {
          size: currentSize,
          colorId: selectedColorId,
          ...embedAnalyticsMeta,
        },
      });
    }
    const pid = (externalProductId ?? productId) || "";
    const interpolated = interpolateAddToCartUrlTemplate(template, {
      productId: pid,
      size: currentSize,
      colorId: selectedColorId,
    });
    const baseOrigin = embedPublicWidget
      ? embedReferrerOrigin
      : typeof window !== "undefined"
        ? window.location.origin
        : null;
    const href = resolveAddToCartNavigationHref(interpolated, baseOrigin);
    if (!href || typeof window === "undefined") return;
    try {
      if (embedPublicWidget && window.top) {
        window.top.location.assign(href);
      } else {
        window.location.assign(href);
      }
    } catch {
      window.location.assign(href);
    }
  }, [
    addToCartUrlTemplate,
    embedPublicWidget,
    embedShopId,
    embedAnalyticsMeta,
    currentSize,
    selectedColorId,
    externalProductId,
    productId,
    embedReferrerOrigin,
  ]);

  const selectedHex =
    swatches.find((s) => s.id === selectedColorId)?.hex ?? swatches[0]?.hex ?? "#e8c547";

  const windowStart = useMemo(() => {
    const idx = sizeKeys.indexOf(currentSize);
    if (idx < 0) return 0;
    const w = PREVIEW_SIZE_CAROUSEL_WINDOW;
    const centerOffset = Math.floor((w - 1) / 2);
    const maxStart = Math.max(0, sizeKeys.length - w);
    let start = idx - centerOffset;
    start = Math.min(Math.max(0, start), maxStart);
    return start;
  }, [currentSize, sizeKeys]);

  return {
    swatches,
    selectedColorId,
    setSelectedColorId,
    selectedHex,
    sizeKeys,
    currentSize,
    windowStart,
    handleSelectSizeForAnalytics,
    handleAddToCartClick,
  };
}
