import { useEffect, useMemo, useRef, useState } from "react";
import { sendWidgetAnalyticsEvent } from "@/lib/widget/sendWidgetAnalyticsEvent";

export function useWidgetStyleProductEmbedAnalytics(options: {
  embedPublicWidget: boolean;
  embedSplashSuspended: boolean;
  embedShopId?: string;
  productId: string;
  garmentFitAvailable: boolean;
  embedEventSource?: string;
}) {
  const {
    embedPublicWidget,
    embedSplashSuspended,
    embedShopId,
    productId,
    garmentFitAvailable,
    embedEventSource,
  } = options;

  const embedAnalyticsMeta = useMemo(() => {
    const m: Record<string, unknown> = { placement: "embed" };
    if (embedEventSource) m.eventSource = embedEventSource;
    return m;
  }, [embedEventSource]);

  const [embedSplashFallback, setEmbedSplashFallback] = useState(false);
  useEffect(() => {
    if (!embedPublicWidget || !embedSplashSuspended) {
      setEmbedSplashFallback(false);
      return;
    }
    const t = window.setTimeout(() => setEmbedSplashFallback(true), 6500);
    return () => window.clearTimeout(t);
  }, [embedPublicWidget, embedSplashSuspended]);

  const widgetOpenLoggedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!embedPublicWidget || !embedShopId || !productId || !garmentFitAvailable) return;
    if (embedSplashSuspended && !embedSplashFallback) return;
    const key = `${embedShopId}:${productId}`;
    if (widgetOpenLoggedKeyRef.current === key) return;
    widgetOpenLoggedKeyRef.current = key;
    void sendWidgetAnalyticsEvent({
      shopId: embedShopId,
      productId,
      type: "widget_open",
      meta: embedAnalyticsMeta,
    });
  }, [
    embedPublicWidget,
    embedShopId,
    productId,
    garmentFitAvailable,
    embedSplashSuspended,
    embedSplashFallback,
    embedAnalyticsMeta,
  ]);

  return { embedAnalyticsMeta, embedSplashFallback };
}
