import { interpolateAddToCartUrlTemplate, resolveAddToCartNavigationHref } from "@Atelier/shared";
import type { WidgetParams } from "./widget-api";

export function widgetEventMeta(params: WidgetParams): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = {};
  if (params.placement) meta.placement = params.placement;
  if (params.eventSource) meta.eventSource = params.eventSource;
  return Object.keys(meta).length ? meta : undefined;
}

export function tryNavigateAddToCart(params: WidgetParams, size: string, colorId: string): boolean {
  const template = params.addToCartUrlTemplate?.trim();
  if (!template) return false;
  const productId = String(params.externalProductId || params.productId || "");
  const interpolated = interpolateAddToCartUrlTemplate(template, {
    productId,
    size,
    colorId,
  });
  const href = resolveAddToCartNavigationHref(
    interpolated,
    typeof window !== "undefined" ? window.location.origin : null,
  );
  if (!href) return false;
  try {
    window.location.assign(href);
    return true;
  } catch {
    return false;
  }
}
