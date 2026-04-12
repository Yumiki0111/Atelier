"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WidgetStyleProductPreview } from "@/features/preview/WidgetStyleProductPreview";
import {
  FITLOOK_EMBED_SPLASH_HANDOFF_DELAY_MS,
  FITLOOK_SPLASH_FINISHED_MESSAGE,
} from "@/lib/widget/fitlookEmbedMessages";
import type { PublicEmbedWidgetFitProps } from "@/lib/widget/getPublicEmbedWidgetFitProps";

type EmbedWidgetFitClientProps = PublicEmbedWidgetFitProps & {
  /** 親ウィジェットの `data-fitlook-add-to-cart-url` をクエリで引き渡し */
  addToCartUrl?: string;
  /** 親のロゴスプラッシュが終わるまで図解・脚注の段階表示を保留 */
  deferStagedReveal?: boolean;
};

export function EmbedWidgetFitClient(props: EmbedWidgetFitClientProps) {
  const { addToCartUrl = "", deferStagedReveal = false, ...data } = props;
  const [splashDone, setSplashDone] = useState(!deferStagedReveal);
  const handoffStartedRef = useRef(false);

  useEffect(() => {
    if (!deferStagedReveal) return;
    let handoffTimer: number | undefined;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== FITLOOK_SPLASH_FINISHED_MESSAGE) return;
      if (handoffStartedRef.current) return;
      handoffStartedRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          handoffTimer = window.setTimeout(() => {
            setSplashDone(true);
          }, FITLOOK_EMBED_SPLASH_HANDOFF_DELAY_MS);
        });
      });
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("message", onMsg);
      if (handoffTimer !== undefined) window.clearTimeout(handoffTimer);
    };
  }, [deferStagedReveal]);

  const embedSplashSuspended = deferStagedReveal && !splashDone;

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
        embedSplashSuspended={embedSplashSuspended}
      />
    </div>
  );
}
