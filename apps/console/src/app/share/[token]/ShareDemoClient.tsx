"use client";

import Script from "next/script";

type Props = {
  publicKey: string;
  externalProductId: string;
  productName: string;
  widgetJsPath: string;
  /** ウィジェット API のオリジン（サーバで決定） */
  apiBaseUrl: string;
};

export function ShareDemoClient({
  publicKey,
  externalProductId,
  productName,
  widgetJsPath,
  apiBaseUrl,
}: Props) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col">
      {apiBaseUrl ? (
        <div data-fitlook-api-url={apiBaseUrl} hidden aria-hidden />
      ) : null}

      <h1 className="sr-only">{productName}</h1>

      <div className="relative min-h-0 flex-1 w-full">
        <div
          className="absolute inset-0 z-10"
          data-fitlook-public-key={publicKey}
          data-fitlook-external-product-id={externalProductId}
          data-fitlook-event-source="preview_link"
          data-fitlook-placement="inline"
          data-fitlook-overlay="true"
          data-fitlook-phone-frame="false"
          data-fitlook-desktop-panel="true"
          data-fitlook-auto-open="true"
          aria-hidden
        />
      </div>

      <Script src={widgetJsPath} strategy="afterInteractive" />
    </div>
  );
}
