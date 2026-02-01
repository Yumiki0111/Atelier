# 別リポジトリのECサイトへの導入手順

このドキュメントでは、別のリポジトリで作成したECサイトにAtelierウィジェットを導入する手順を説明します。

## 📋 前提条件

- Atelier管理画面（console）が起動している、またはデプロイ済み
- 管理画面にログインできるアカウントがある
- ECサイトのドメインが決まっている（例: `example.com`, `localhost:3001` など）
- ECサイトの商品IDが決まっている

## 🚀 導入手順

### Step 1: Atelier管理画面で必要な情報を取得

#### 1.1 管理画面にログイン

1. Atelier管理画面にアクセス
   - 開発環境: `http://localhost:3000`
   - 本番環境: デプロイ先のURL（例: `https://atelier.vercel.app`）

2. ログインまたはアカウント作成

#### 1.2 Public Keyと許可ドメインを確認

1. **設定ページ**（`/settings`）にアクセス
2. **Widget 設定**セクションを確認
   - **Public Key**: ウィジェット埋め込み用の公開キー（例: `pub_live_030b64caa84e2995672163c125d600bd`）
   - **許可ドメイン**: ECサイトのドメインが含まれているか確認
     - 開発環境: `localhost:3001` など
     - 本番環境: `example.com` など

> **重要**: 許可ドメインにECサイトのドメインが含まれていない場合、ウィジェットは動作しません。管理者に連絡して追加してもらう必要があります。

#### 1.3 埋め込みスニペットを取得（オプション）

1. **埋め込みスニペット**ページ（`/install`）にアクセス
2. 商品を選択（任意）
   - 商品を選択すると、`data-atelier-external-product-id`が自動的に含まれます
3. スニペットをコピー

### Step 2: widget.jsのURLを確認

開発環境と本番環境でURLが異なります。

#### 開発環境の場合

```bash
# Atelierの開発サーバーを起動
cd /path/to/atelier
npm run dev:console

# widget.jsのURL
http://localhost:3000/widget.js
```

#### 本番環境の場合

**方法A: 環境変数を使用（推奨）**

```env
# .env.local または環境変数設定
NEXT_PUBLIC_WIDGET_CDN_URL=https://cdn.example.com/widget.js
```

この場合、管理画面の「埋め込みスニペット」ページで自動的にこのURLが使用されます。

**方法B: デプロイ先のドメインを使用**

環境変数を設定しない場合、デプロイ先のドメインの`/widget.js`が使用されます。

```
https://your-vercel-domain.vercel.app/widget.js
```

### Step 3: 商品の登録とIDの対応付け

#### 3.1 Atelier管理画面で商品を登録

1. **商品データベース**ページ（`/database/products`）にアクセス
2. 「商品を追加」ボタンをクリック
3. 商品情報を入力：
   - **商品名**: ECサイトの商品名
   - **外部商品ID** (`external_product_id`): **重要** - ECサイトの商品IDと一致させる
     - 例: Shopifyの場合は商品ID、独自ECの場合は商品の一意なID
   - **SKU**: 任意（商品のSKU）
   - **カテゴリ**: 任意
   - **サムネイルURL**: 任意
4. 保存

#### 3.2 3Dアセットのアップロード

1. 商品詳細ページで「アセットを追加」をクリック
2. 3Dモデル（GLBファイルまたはFBXファイル）をアップロード
   - サイズごと（S/M/L）にアップロード可能
   - 各サイズに対応するモデルファイルを用意
3. アセットのバージョン管理
   - 新しいアセットをアップロードすると、自動的に最新版が使用される
   - 複数のサイズをアップロードすると、サイズ選択時に自動的に切り替わります

### Step 4: ECサイトに埋め込みコードを追加

ECサイトの商品ページに以下のコードを追加します。

#### 4.1 基本的な埋め込みコード

```html
<!-- 商品ページのHTML -->
<div
  data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
  data-atelier-external-product-id="PRODUCT_123">
</div>
<script async src="http://localhost:3000/widget.js"></script>
```

#### 4.2 Next.jsの場合

```tsx
// app/products/[id]/page.tsx または pages/products/[id].tsx
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
      />
      <script async src="http://localhost:3000/widget.js" />
      
      <button>カートに追加</button>
    </div>
  );
}
```

#### 4.3 Reactの場合

```tsx
// ProductPage.tsx
import { useEffect } from 'react';

interface ProductPageProps {
  productId: string;
  productName: string;
  price: number;
}

export function ProductPage({ productId, productName, price }: ProductPageProps) {
  useEffect(() => {
    // ウィジェットスクリプトが既に読み込まれている場合は再読み込みしない
    if (document.querySelector('script[src*="widget.js"]')) {
      return;
    }
    
    // ウィジェットスクリプトを動的に読み込む
    const script = document.createElement('script');
    script.src = 'http://localhost:3000/widget.js'; // 開発環境
    // script.src = 'https://your-vercel-domain.vercel.app/widget.js'; // 本番環境
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // クリーンアップ（必要に応じて）
      const existingScript = document.querySelector('script[src*="widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
  
  return (
    <div className="product-page">
      <h1>{productName}</h1>
      <p className="price">¥{price.toLocaleString()}</p>
      
      {/* Atelierウィジェット */}
      <div
        data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
        data-atelier-external-product-id={productId}
      />
      
      <button className="add-to-cart">カートに追加</button>
    </div>
  );
}
```

#### 4.4 静的HTMLの場合

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>商品ページ - デニムジャケット</title>
</head>
<body>
  <header>
    <h1>ECサイト</h1>
  </header>
  
  <main>
    <div class="product-container">
      <div class="product-image">
        <img src="/images/denim-jacket.jpg" alt="デニムジャケット">
      </div>
      
      <div class="product-info">
        <h2>デニムジャケット</h2>
        <p class="price">¥9,800</p>
        
        <!-- Atelierウィジェット -->
        <div class="atelier-widget">
          <div
            data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
            data-atelier-external-product-id="denim-jacket-001">
          </div>
          <script async src="http://localhost:3000/widget.js"></script>
        </div>
        
        <button class="add-to-cart">カートに追加</button>
      </div>
    </div>
  </main>
</body>
</html>
```

#### 4.5 API URLを明示的に指定する場合（オプション）

ECサイトが別のドメインにある場合、API URLを明示的に指定できます。

```html
<div
  data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
  data-atelier-external-product-id="PRODUCT_123"
  data-atelier-api-url="http://localhost:3000">
</div>
<script async src="http://localhost:3000/widget.js"></script>
```

### Step 5: 動作確認

1. ECサイトの商品ページにアクセス
2. ブラウザのコンソールを開く（F12）
3. 以下を確認：
   - `[Atelier Widget] Found X widget element(s)` のログが表示される
   - 「3Dで試着する」ボタンが表示される
   - ボタンをクリックしてモーダルが開く
   - 3Dモデルが表示される
   - サイズ選択、身長調整が動作する
   - チャット機能が動作する

## 🔧 トラブルシューティング

### ウィジェットが表示されない

1. **ブラウザのコンソールを確認**
   - エラーメッセージを確認
   - `[Atelier Widget]` で始まるログを確認

2. **Public Keyが正しいか確認**
   - 設定ページでPublic Keyを再確認
   - スニペットの`data-atelier-public-key`と一致しているか確認

3. **許可ドメインが設定されているか確認**
   - 設定ページで許可ドメインを確認
   - ECサイトのドメインが含まれているか確認
   - 開発環境の場合は`localhost:3001`なども追加

4. **widget.jsが正しく読み込まれているか確認**
   - ブラウザの開発者ツールのNetworkタブで`widget.js`の読み込みを確認
   - ステータスコードが200であることを確認

### 3Dモデルが表示されない

1. **商品IDが一致しているか確認**
   - 管理画面の商品の`external_product_id`と、ECサイトの商品IDが一致しているか確認
   - 埋め込みコードの`data-atelier-external-product-id`が正しいか確認

2. **アセットがアップロードされているか確認**
   - 商品詳細ページでアセットを確認
   - GLBファイルまたはFBXファイルが正しくアップロードされているか確認

3. **APIのレスポンスを確認**
   - ブラウザの開発者ツールのNetworkタブで、`/api/public/widget-config`のレスポンスを確認
   - `enabled: true`が返されているか確認
   - `asset.sizes`にモデルURLが含まれているか確認

### CORSエラーが発生する

1. **許可ドメインを確認**
   - 設定ページで許可ドメインにECサイトのドメインが含まれているか確認
   - サブドメインも許可されているか確認（例: `example.com`が許可されていれば`shop.example.com`もOK）

2. **API URLを明示的に指定**
   - `data-atelier-api-url`属性でAPI URLを指定

### widget.jsが読み込めない

1. **Atelierの開発サーバーが起動しているか確認**
   ```bash
   cd /path/to/atelier
   npm run dev:console
   ```

2. **widget.jsがビルドされているか確認**
   ```bash
   cd /path/to/atelier
   npm run build:widget
   npm run copy:widget
   ```

3. **本番環境の場合、デプロイが完了しているか確認**
   - Vercelなどのデプロイ先でビルドが成功しているか確認
   - `public/widget.js`が正しくデプロイされているか確認

## 📝 実装例

### シンプルなHTMLページ

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>商品ページ - デニムジャケット</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .product-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .product-image img {
      width: 100%;
      height: auto;
    }
    .price {
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0;
    }
    .atelier-widget {
      margin: 30px 0;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    .add-to-cart {
      width: 100%;
      padding: 12px;
      background: #000;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <h1>ECサイト</h1>
  </header>
  
  <main>
    <div class="product-container">
      <div class="product-image">
        <img src="/images/denim-jacket.jpg" alt="デニムジャケット">
      </div>
      
      <div class="product-info">
        <h2>デニムジャケット</h2>
        <p class="price">¥9,800</p>
        <p>カジュアルなデニムジャケットです。</p>
        
        <!-- Atelierウィジェット -->
        <div class="atelier-widget">
          <div
            data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
            data-atelier-external-product-id="denim-jacket-001">
          </div>
          <script async src="http://localhost:3000/widget.js"></script>
        </div>
        
        <button class="add-to-cart">カートに追加</button>
      </div>
    </div>
  </main>
</body>
</html>
```

### Next.js App Routerの場合

```tsx
// app/products/[id]/page.tsx
export default async function ProductPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const productId = params.id;
  
  // 商品情報を取得（例）
  // const product = await fetchProduct(productId);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {/* 商品画像 */}
          <img 
            src="/images/product.jpg" 
            alt="商品名"
            className="w-full"
          />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold mb-4">商品名</h1>
          <p className="text-2xl font-bold mb-4">¥9,800</p>
          
          {/* Atelierウィジェット */}
          <div className="my-8 p-4 border rounded-lg">
            <div
              data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
              data-atelier-external-product-id={productId}
            />
            <script async src="http://localhost:3000/widget.js" />
          </div>
          
          <button className="w-full bg-black text-white py-3 rounded">
            カートに追加
          </button>
        </div>
      </div>
    </div>
  );
}
```

### React + TypeScriptの場合

```tsx
// components/ProductPage.tsx
import { useEffect } from 'react';

interface ProductPageProps {
  productId: string;
  productName: string;
  price: number;
  imageUrl: string;
}

export function ProductPage({ 
  productId, 
  productName, 
  price, 
  imageUrl 
}: ProductPageProps) {
  useEffect(() => {
    // ウィジェットスクリプトが既に読み込まれている場合は再読み込みしない
    if (document.querySelector('script[src*="widget.js"]')) {
      return;
    }
    
    // ウィジェットスクリプトを動的に読み込む
    const script = document.createElement('script');
    script.src = process.env.NEXT_PUBLIC_WIDGET_URL || 'http://localhost:3000/widget.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // クリーンアップ（必要に応じて）
      const existingScript = document.querySelector('script[src*="widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
  
  return (
    <div className="product-page">
      <div className="product-image">
        <img src={imageUrl} alt={productName} />
      </div>
      
      <div className="product-info">
        <h1>{productName}</h1>
        <p className="price">¥{price.toLocaleString()}</p>
        
        {/* Atelierウィジェット */}
        <div className="atelier-widget">
          <div
            data-atelier-public-key={process.env.NEXT_PUBLIC_ATELIER_PUBLIC_KEY || 'pub_live_030b64caa84e2995672163c125d600bd'}
            data-atelier-external-product-id={productId}
          />
        </div>
        
        <button className="add-to-cart">カートに追加</button>
      </div>
    </div>
  );
}
```

## 🎯 チェックリスト

導入前に以下を確認してください：

- [ ] Atelier管理画面にログインできる
- [ ] Widget Keyが存在し、有効になっている
- [ ] 許可ドメインにECサイトのドメインが追加されている
- [ ] 商品が登録され、`external_product_id`が設定されている
- [ ] 3Dアセットがアップロードされている
- [ ] スニペットをコピーしてECサイトに貼り付けた
- [ ] widget.jsのURLが正しい（開発環境/本番環境）
- [ ] ブラウザのコンソールでエラーがないか確認した
- [ ] ウィジェットが正しく表示されることを確認した
- [ ] 3Dモデルが表示されることを確認した
- [ ] サイズ選択、身長調整が動作することを確認した
- [ ] チャット機能が動作することを確認した

## 🌐 本番環境へのデプロイ

### widget.jsの配信方法

1. **Atelierのデプロイ先から配信（推奨）**
   - AtelierをVercelなどにデプロイ
   - `https://your-vercel-domain.vercel.app/widget.js`でアクセス可能
   - ECサイトの埋め込みコードを本番用に更新

2. **CDNにアップロード**
   - widget.jsをCDNにアップロード
   - 環境変数`NEXT_PUBLIC_WIDGET_CDN_URL`を設定
   - 管理画面の「埋め込みスニペット」ページで自動的にこのURLが使用される

### 環境変数の設定

ECサイト側で環境変数を設定する場合：

```env
# .env.local または環境変数設定
NEXT_PUBLIC_ATELIER_PUBLIC_KEY=pub_live_030b64caa84e2995672163c125d600bd
NEXT_PUBLIC_WIDGET_URL=https://your-vercel-domain.vercel.app/widget.js
NEXT_PUBLIC_ATELIER_API_URL=https://your-vercel-domain.vercel.app
```

### 許可ドメインの更新

本番環境のドメインを許可ドメインに追加：

1. Atelier管理画面の設定ページ（`/settings`）にアクセス
2. Widget 設定セクションで許可ドメインを確認
3. 本番環境のドメインが含まれていない場合、管理者に連絡して追加してもらう

## 📞 サポート

問題が発生した場合：

1. ブラウザのコンソールでエラーメッセージを確認
2. 管理画面の設定を再確認
3. このドキュメントのトラブルシューティングセクションを参照
4. それでも解決しない場合は、管理者に連絡

## 📚 関連ドキュメント

- [EC_INTEGRATION_GUIDE.md](./EC_INTEGRATION_GUIDE.md) - より詳細な統合ガイド
- [KEYS_GUIDE.md](./KEYS_GUIDE.md) - キー管理について
- [EXPERIMENT_GUIDE.md](./EXPERIMENT_GUIDE.md) - 実験・テスト方法
