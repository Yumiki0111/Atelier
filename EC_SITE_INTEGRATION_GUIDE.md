# FIT&LOOK 3D試着ウィジェット - ECサイト統合ガイド

## 概要

FIT&LOOK の試着ウィジェットを EC サイトに埋め込む手順です。ホストページに **`widget.js` を読み込み**、**公開キーと外部商品 ID を付けた要素**を置くと、右下にランチャーが表示され、タップで試着モーダル（コンソール側の `/embed/widget-fit` を iframe で読み込み）が開きます。

## 必須であること

ウィジェットは **`document` 内のホスト要素**（`data-fitlook-public-key` またはレガシーの `data-atelier-public-key` など）を探して初期化します。**`window.__AtelierWidgetConfig` のようなグローバル設定は読みません**（現在の `packages/widget` 実装）。

各ホスト要素に最低限必要なのは次です。

1. **Public Key** — `data-fitlook-public-key="pub_live_..."`（レガシー: `data-atelier-public-key`）
2. **外部商品 ID** — `data-fitlook-external-product-id="..."`（レガシー: `data-atelier-external-product-id`）  
   FIT&LOOK コンソールで商品に紐づけた **外部 SKU / 任意 ID** と一致させます。URL パスやメタタグからの自動推測は行いません。

API のベース URL は通常、`widget.js` の `<script src>` のオリジンから決まります。EC とコンソールのオリジンが異なる場合は **`data-fitlook-api-url`**（レガシー: `data-atelier-api-url`）でコンソールのオリジンを明示してください。

## 必要な情報（コンソール側）

1. **Public Key**（設定ページなど）
2. **Widget の URL**  
   - 本番例: `https://Atelier-rho-red.vercel.app/widget.js`（デプロイ先が変われば置き換え）
   - ローカル: `http://localhost:3000/widget.js`

## 実装例

### Next.js App Router（推奨）

`params` は現行の Next.js（コンソールは 16.x）では **`Promise`** のため `await` します。

```tsx
// app/product/[id]/page.tsx
import Script from "next/script";

const widgetUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/widget.js"
    : "https://Atelier-rho-red.vercel.app/widget.js";

const publicKey =
  process.env.NEXT_PUBLIC_FITLOOK_PUBLIC_KEY ?? "pub_live_030b64caa84e2995672163c125d600bd";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <div
        data-fitlook-public-key={publicKey}
        data-fitlook-external-product-id={id}
      />
      <Script src={widgetUrl} strategy="afterInteractive" />
    </>
  );
}
```

別ポートで EC を動かし API だけコンソール（例: `localhost:3000`）へ向ける場合:

```tsx
<div
  data-fitlook-public-key={publicKey}
  data-fitlook-external-product-id={id}
  data-fitlook-api-url="http://localhost:3000"
/>
```

### React（CRA / Vite 等）

```tsx
import { useEffect } from "react";

export function ProductWidgetHost({
  publicKey,
  externalProductId,
  widgetJsUrl,
}: {
  publicKey: string;
  externalProductId: string;
  widgetJsUrl: string;
}) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = widgetJsUrl;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [widgetJsUrl]);

  return (
    <div
      data-fitlook-public-key={publicKey}
      data-fitlook-external-product-id={externalProductId}
    />
  );
}
```

### プレーン HTML

```html
<script async src="https://Atelier-rho-red.vercel.app/widget.js"></script>

<div
  data-fitlook-public-key="pub_live_030b64caa84e2995672163c125d600bd"
  data-fitlook-external-product-id="g115253154287">
</div>
```

ローカル検証では `LOCAL_TESTING.md` も参照してください。

### 環境変数の例（オプション）

EC 側の `.env.local` など:

```env
NEXT_PUBLIC_FITLOOK_WIDGET_URL=https://Atelier-rho-red.vercel.app/widget.js
NEXT_PUBLIC_FITLOOK_PUBLIC_KEY=pub_live_030b64caa84e2995672163c125d600bd
```

過去のドキュメントで使っていた `NEXT_PUBLIC_Atelier_*` は、プロジェクト側の名前として問題ありませんが、ウィジェット本体はそれらを自動では読みません（ページコードで変数を属性に渡してください）。

## API URL が決まる順序（`packages/widget/src/widget-utils.ts`）

1. ビルド注入の `process.env.API_BASE_URL`（通常の CDN 埋め込みでは未設定）
2. `data-fitlook-api-url` / `data-atelier-api-url`
3. `document.querySelector('script[src*="widget.js"]')` の絶対 URL のオリジン
4. 相対パスで読み込んだ場合などのフォールバック（ページの `location.origin`）

## UI のざっくりした動作

- 既定では固定ランチャー（デザインはコンソールのウィジェット設定に依存）
- クリックでモーダルを開き、試着 UI は **`/embed/widget-fit?publicKey=...&externalProductId=...`** を iframe で表示

詳細な属性（インライン配置・オーバーレイ・デスクトップパネルなど）は `packages/widget/src/embed-data.ts` / `widget-api.ts` のコメントを参照してください。

## 注意事項

### Widget URL

`widget.js` は **FIT&LOOK コンソールアプリが配信する URL** から読み込んでください。

- 正しい例: `https://（コンソールのドメイン）/widget.js`
- 誤り: EC サイト自身のオリジンだけに置いただけで、コンソールと無関係なパスから読むこと（API と設定が一致しません）

### 許可ドメインと CORS

EC のオリジンをコンソールのウィジェット設定の **許可ドメイン** に含めてください。開発では EC のポート（例: `localhost:3001`）も必要なら追加します。詳細は `apps/console/src/app/api/public/widget-config/route.ts` 周りとコンソール UI を確認してください。

### Public Key

公開前提のキーですが、運用上は環境変数や設定で差し替え可能にしておくと安全です。

### 外部商品 ID

コンソールに登録した商品の **external product id** と一致させないと、`widget-config` が該当商品を返せません。ルートパラメータをそのまま渡すだけでは足りず、コンソール側の ID と合わせる必要があります。

## トラブルシューティング

### ボタンが出ない

- コンソールに `[FIT&LOOK Widget]` のログが出ているか確認
- `data-fitlook-public-key` と `data-fitlook-external-product-id` が **同一要素**にあるか確認
- `widget.js` のネットワークエラーがないか確認

### 「商品 ID が設定されていません」などのアラート

- `data-fitlook-external-product-id`（またはレガシー `data-atelier-external-product-id`）が欠けていませんか。

### CORS

許可ドメインと API のオリジン（`data-fitlook-api-url`）が実際のページと一致しているか確認してください。

## Next.js App Router: `searchParams` が Promise の場合

ページコンポーネントでクエリを読むとき、フレームワークから **`searchParams` が Promise** と型されることがあります。エラーになる場合は `await searchParams` または `React.use()` で展開してください（公式ドキュメントに沿ってください）。

## チェックリスト

- [ ] Public Key を取得した
- [ ] `widget.js` の URL（本番 / 開発）を決めた
- [ ] 許可ドメインに EC のオリジンを入れた
- [ ] コンソールに商品を登録し、**external product id** をページ側の属性と一致させた
- [ ] コンソールと EC が別オリジンのとき `data-fitlook-api-url` を付けた
