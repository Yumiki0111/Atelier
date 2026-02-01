# ECサイト（Next.js）での設定方法

## 1. 商品ページにウィジェットを埋め込む

### App Router（`app`ディレクトリ）の場合

```tsx
// app/products/[id]/page.tsx
export default function ProductPage({ params }: { params: { id: string } }) {
  const productId = params.id; // ECサイトの商品ID
  
  return (
    <div>
      <h1>商品名</h1>
      <p>価格: ¥9,800</p>
      
      {/* Atelierウィジェット */}
      <div
        data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
        data-atelier-external-product-id={productId}
        data-atelier-api-url="http://localhost:3000"
      />
      
      {/* ローカル開発環境の場合 */}
      <script async src="http://localhost:3000/widget.js" />
      
      {/* 本番環境の場合 */}
      {/* <script async src="https://atelier-rho-red.vercel.app/widget.js" /> */}
    </div>
  );
}
```

### Pages Router（`pages`ディレクトリ）の場合

```tsx
// pages/products/[id].tsx
import { useRouter } from 'next/router';
import Script from 'next/script';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const productId = id as string;
  
  return (
    <div>
      <h1>商品名</h1>
      <p>価格: ¥9,800</p>
      
      {/* Atelierウィジェット */}
      <div
        data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
        data-atelier-external-product-id={productId}
        data-atelier-api-url="http://localhost:3000"
      />
      
      {/* Next.jsのScriptコンポーネントを使用 */}
      <Script
        src="http://localhost:3000/widget.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
```

## 2. 推奨実装方法（App Router）

### コンポーネント化

```tsx
// components/AtelierWidget.tsx
'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface AtelierWidgetProps {
  publicKey: string;
  externalProductId: string;
  apiUrl?: string; // ローカル開発時は "http://localhost:3000"
}

export function AtelierWidget({
  publicKey,
  externalProductId,
  apiUrl,
}: AtelierWidgetProps) {
  // 本番環境のAPI URLを自動判定
  const widgetApiUrl = apiUrl || 'https://atelier-rho-red.vercel.app';
  const widgetScriptUrl = `${widgetApiUrl}/widget.js`;

  return (
    <>
      <div
        data-atelier-public-key={publicKey}
        data-atelier-external-product-id={externalProductId}
        data-atelier-api-url={widgetApiUrl}
      />
      <Script
        src={widgetScriptUrl}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Atelier Widget loaded');
        }}
        onError={(e) => {
          console.error('Failed to load Atelier Widget:', e);
        }}
      />
    </>
  );
}
```

### 使用例

```tsx
// app/products/[id]/page.tsx
import { AtelierWidget } from '@/components/AtelierWidget';

export default function ProductPage({ params }: { params: { id: string } }) {
  const productId = params.id;
  
  return (
    <div>
      <h1>商品名</h1>
      <p>価格: ¥9,800</p>
      
      <AtelierWidget
        publicKey="pub_live_030b64caa84e2995672163c125d600bd"
        externalProductId={productId}
        apiUrl={process.env.NEXT_PUBLIC_ATELIER_API_URL} // 環境変数から取得
      />
    </div>
  );
}
```

## 3. 環境変数の設定

### `.env.local`（ローカル開発環境）

```env
NEXT_PUBLIC_ATELIER_API_URL=http://localhost:3000
NEXT_PUBLIC_ATELIER_PUBLIC_KEY=pub_live_030b64caa84e2995672163c125d600bd
```

### `.env.production`（本番環境）

```env
NEXT_PUBLIC_ATELIER_API_URL=https://atelier-rho-red.vercel.app
NEXT_PUBLIC_ATELIER_PUBLIC_KEY=pub_live_030b64caa84e2995672163c125d600bd
```

## 4. 注意点

### スクリプトの読み込み順序

- **重要**: `data-atelier-*`属性を持つ`<div>`要素が、`<script>`タグより**前に**存在する必要があります
- Next.jsの`Script`コンポーネントを使用する場合は、`strategy="afterInteractive"`を指定してください

### CORS設定

- ローカル開発環境では、AtelierコンソールアプリのCORS設定でECサイトのドメイン（例: `http://localhost:3001`）が許可されている必要があります
- 本番環境では、Atelierコンソールアプリの設定画面でECサイトのドメインを「許可ドメイン」に追加してください

### デバッグ

ブラウザの開発者ツール（F12）で以下を確認してください：

1. **Networkタブ**: `widget.js`が正しく読み込まれているか（200ステータス）
2. **Consoleタブ**: 以下のログが表示されるか
   - `[Atelier Widget] DOMContentLoaded - initializing widget`
   - `[Atelier Widget] Found X widget element(s)`
   - `[Atelier Widget] Initializing widget 1/X`

## 5. トラブルシューティング

### ボタンが表示されない

- ブラウザのコンソールでエラーメッセージを確認
- `widget.js`が正しく読み込まれているか確認
- `data-atelier-public-key`と`data-atelier-external-product-id`が正しく設定されているか確認

### クリックしても反応しない

- ブラウザのコンソールで`[Atelier Widget] Button clicked!`が表示されるか確認
- `data-atelier-api-url`が正しく設定されているか確認
- APIリクエストが正しく送信されているか（Networkタブで確認）

### CORSエラー

- Atelierコンソールアプリの設定画面で、ECサイトのドメインが「許可ドメイン」に追加されているか確認
- ローカル開発環境では、`data-atelier-api-url="http://localhost:3000"`を設定
