"use client";

import Script from "next/script";

type Props = {
  publicKey: string;
  externalProductId: string;
  productName: string;
  thumbnailUrl?: string;
  widgetJsPath: string;
  /** ウィジェット API のオリジン（サーバで決定） */
  apiBaseUrl: string;
};

export function ShareDemoClient({
  publicKey,
  externalProductId,
  productName,
  thumbnailUrl,
  widgetJsPath,
  apiBaseUrl,
}: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col pb-10 pt-4">
      {apiBaseUrl ? (
        <div data-fitlook-api-url={apiBaseUrl} hidden aria-hidden />
      ) : null}

      <header className="mb-4 px-4">
        <h1 className="text-base font-semibold leading-snug text-stone-900">{productName}</h1>
      </header>

      <div className="relative w-full">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-stone-100 text-sm text-stone-500">
            画像未登録
          </div>
        )}
        <div
          className="absolute inset-0 z-10"
          data-fitlook-public-key={publicKey}
          data-fitlook-external-product-id={externalProductId}
          data-fitlook-placement="inline"
          data-fitlook-overlay="true"
          data-fitlook-phone-frame="false"
          aria-hidden
        />
      </div>

      <p className="mt-3 px-4 text-center text-xs text-stone-500">画像をタップして試着</p>

      <p className="mt-6 px-4 text-center text-[11px] text-stone-400">
        本ページは営業・体験用のデモです。購入・決済は貴社の EC サイトで行ってください。
      </p>

      <Script src={widgetJsPath} strategy="afterInteractive" />
    </div>
  );
}
