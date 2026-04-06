# FIT&LOOK 3D試着ウィジェット - ECサイト統合ガイド

## 🎯 概要

FIT&LOOK 3D試着ウィジェットをECサイトに統合する方法です。商品ページに**数行のスニペット**を埋め込むだけで、**右下に自動的に固定ボタン**が表示され、クリックすると3D試着モーダルが開きます。

## ✨ 特徴

- **自動配置**: 右下に64px × 64pxの丸いボタンが自動表示
- **商品ID自動取得**: URLパス（`/product/g115253154287`）から自動的に商品IDを取得
- **API URL自動取得**: `widget.js`の読み込み元から自動的にAPI URLを取得
- **超シンプル**: Public Keyだけ設定すればOK

## 📋 必要な情報

統合前に、以下をFIT&LOOK コンソールから取得してください：

1. **Public Key**: 設定ページで確認（例: `pub_live_030b64caa84e2995672163c125d600bd`）
2. **Widget URL**: 
   - 本番環境: `https://Atelier-rho-red.vercel.app/widget.js`
   - 開発環境: `http://localhost:3000/widget.js`（FIT&LOOK コンソールアプリのURL）

## 🚀 実装方法（超シンプル）

### Next.js App Router - 最小実装

```tsx
// app/product/[id]/page.tsx
import Script from 'next/script';

export default function ProductPage() {
  const widgetUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/widget.js'
    : 'https://Atelier-rho-red.vercel.app/widget.js';
  const publicKey = process.env.NEXT_PUBLIC_Atelier_PUBLIC_KEY || 'pub_live_030b64caa84e2995672163c125d600bd';
  
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__AtelierWidgetConfig = { publicKey: '${publicKey}' };`,
        }}
      />
      <Script src={widgetUrl} strategy="afterInteractive" />
    </>
  );
}
```

**たったこれだけ！** 
- 商品ID: URLパス（`/product/[id]`）から自動取得
- API URL: `widget.js`の読み込み元から自動取得
- 設定が必要なのは**Public Keyだけ**です

### Next.js - headに埋め込む場合

```tsx
// app/product/[id]/page.tsx
import Script from 'next/script';
import { Metadata } from 'next';

export default function ProductPage() {
  const widgetUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/widget.js'
    : 'https://Atelier-rho-red.vercel.app/widget.js';
  
  return (
    <>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__AtelierWidgetConfig = { publicKey: 'pub_live_030b64caa84e2995672163c125d600bd' };`,
          }}
        />
      </head>
      <Script src={widgetUrl} strategy="afterInteractive" />
    </>
  );
}
```

### React（通常のReactアプリ）

```tsx
// ProductPage.tsx
import { useEffect } from 'react';

export default function ProductPage() {
  useEffect(() => {
    // グローバル設定
    (window as any).__AtelierWidgetConfig = {
      publicKey: 'pub_live_030b64caa84e2995672163c125d600bd'
    };
    
    // スクリプトを読み込む
    const script = document.createElement('script');
    script.src = 'https://Atelier-rho-red.vercel.app/widget.js';
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  return <div>商品ページ</div>;
}
```

### 通常のHTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>商品ページ</title>
  <script>
    window.__AtelierWidgetConfig = { publicKey: 'pub_live_030b64caa84e2995672163c125d600bd' };
  </script>
  <script defer src="https://Atelier-rho-red.vercel.app/widget.js"></script>
</head>
<body>
  <h1>商品名</h1>
</body>
</html>
```

**たった2行！** `<head>`に埋め込むだけです。

### 実際の使用例（Next.js）

```tsx
// app/product/[id]/page.tsx
import Script from 'next/script';

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const widgetUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/widget.js'
    : 'https://Atelier-rho-red.vercel.app/widget.js';
  const publicKey = process.env.NEXT_PUBLIC_Atelier_PUBLIC_KEY || 'pub_live_030b64caa84e2995672163c125d600bd';

  return (
    <>
      {/* この2行だけ！ */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__AtelierWidgetConfig = { publicKey: '${publicKey}' };`,
        }}
      />
      <Script src={widgetUrl} strategy="afterInteractive" />
      
      {/* 商品ページのコンテンツ */}
      <div>商品ページの内容...</div>
    </>
  );
}
```

**注意**: `apiUrl`や`productId`は設定不要です。自動取得されます。

### 環境変数を使用する場合（オプション）

環境変数を使いたい場合：

```tsx
// app/product/[id]/page.tsx
import Script from 'next/script';

export default function ProductPage() {
  const widgetUrl = process.env.NEXT_PUBLIC_Atelier_WIDGET_URL || 'https://Atelier-rho-red.vercel.app/widget.js';
  const publicKey = process.env.NEXT_PUBLIC_Atelier_PUBLIC_KEY || 'pub_live_030b64caa84e2995672163c125d600bd';
  
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__AtelierWidgetConfig = { publicKey: '${publicKey}' };`,
        }}
      />
      <Script src={widgetUrl} strategy="afterInteractive" />
    </>
  );
}
```

`.env.local`:
```env
NEXT_PUBLIC_Atelier_WIDGET_URL=https://Atelier-rho-red.vercel.app/widget.js
NEXT_PUBLIC_Atelier_PUBLIC_KEY=pub_live_030b64caa84e2995672163c125d600bd
```

**注意**: `apiUrl`と`productId`は自動取得されるため、設定不要です。

## 🔍 自動取得される情報

ウィジェットは以下の情報を自動取得します：

### 商品IDの自動取得順序

1. **URLパス**: `/product/g115253154287` → `g115253154287` を取得（最も一般的）
2. **グローバル設定**: `window.__AtelierWidgetConfig.productId`（明示的に設定した場合）
3. **メタタグ**: `<meta property="product:id" content="g115253154287">`
4. **データ属性**: `<div data-product-id="g115253154287">`

### API URLの自動取得

- `widget.js`のスクリプトタグの`src`から自動取得
- 例: `https://Atelier-rho-red.vercel.app/widget.js` → `https://Atelier-rho-red.vercel.app`

## 🎨 UIの動作

- **固定ボタン**: 画面右下に64px × 64pxの丸いボタンが表示
- **ボタンテキスト**: "3D"
- **ホバー効果**: マウスオーバーで黒背景に白文字に変化
- **モーダル**: クリックで3D試着モーダルが開く

## ⚠️ 重要な注意事項

### 1. Widget URLの設定

**重要**: `widget.js`は**FIT&LOOK コンソールアプリ**から読み込む必要があります。ECサイト自身のURLから読み込まないでください。

- ✅ 正しい: `https://Atelier-rho-red.vercel.app/widget.js`
- ❌ 間違い: `https://your-ec-site.com/widget.js`

### 2. CORS設定

ECサイトのドメインをFIT&LOOK コンソールの設定ページで許可ドメインに追加してください。

- 開発環境: `localhost:3001`（ECサイトのポート）
- 本番環境: `your-ec-site.com`

### 3. Public Keyの管理

Public Keyは機密情報ではありませんが、本番環境では環境変数で管理することを推奨します。

### 4. 商品IDの形式

商品IDはURLパスから自動取得されます。URLが `/product/g115253154287` の形式であれば、自動的に `g115253154287` が商品IDとして使用されます。

異なるURL形式の場合は、明示的に設定してください：

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `window.__AtelierWidgetConfig = { 
      publicKey: 'pub_live_030b64caa84e2995672163c125d600bd',
      productId: '${params.id}'  // 明示的に設定
    };`,
  }}
/>
```

## 🐛 トラブルシューティング

### ボタンが表示されない

1. **ブラウザのコンソールを確認**: エラーメッセージを確認
2. **Widget URLが正しいか確認**: FIT&LOOK コンソールアプリのURLから読み込んでいるか
3. **Public Keyが正しいか確認**: 設定ページで確認

### "この商品の3D試着は現在利用できません" と表示される

1. **許可ドメインを確認**: ECサイトのドメインが許可されているか
2. **商品IDが正しいか確認**: FIT&LOOK コンソールで商品が登録されているか
3. **Public Keyが有効か確認**: 設定ページで有効化されているか

### CORSエラーが発生する

ECサイトのドメインをFIT&LOOK コンソールの設定ページで許可ドメインに追加してください。

## ⚠️ Next.js 15の注意事項

Next.js 15では、`searchParams`がPromiseになりました。以下のエラーが出る場合は修正が必要です：

```
Error: Route "/" used `searchParams.q`. `searchParams` is a Promise and must be unwrapped with `await` or `React.use()` before accessing its properties.
```

### 修正方法

```tsx
// ❌ 間違い（Next.js 14以前）
export default function Home({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || '';
  // ...
}

// ✅ 正しい（Next.js 15）
export default async function Home({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string }> 
}) {
  const params = await searchParams;
  const query = params.q || '';
  // ...
}
```

または、`React.use()`を使用する場合：

```tsx
import { use } from 'react';

export default function Home({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string }> 
}) {
  const params = use(searchParams);
  const query = params.q || '';
  // ...
}
```

## 📞 サポート

問題が解決しない場合は、FIT&LOOK コンソールの設定ページで以下を確認してください：

- Public Keyが有効化されているか
- 許可ドメインにECサイトのドメインが追加されているか
- 商品が正しく登録されているか

## 📝 チェックリスト

実装前に以下を確認してください：

- [ ] Public Keyを取得
- [ ] Widget URLを確認（本番/開発環境）
- [ ] 許可ドメインにECサイトのドメインを追加
- [ ] 商品がFIT&LOOK コンソールに登録されている
- [ ] 商品IDが正しく設定されている（または自動取得される）
- [ ] Next.js 15を使用している場合、`searchParams`を`await`で展開している