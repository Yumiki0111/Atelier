# ECサイトへの導入フロー

このドキュメントでは、Atelierウィジェットを実際のECサイト（または擬似ECサイト）に導入する手順を説明します。

## 📋 前提条件

- Atelier管理画面（console）がVercelにデプロイ済み
- 管理画面にログインできるアカウントがある
- ECサイトのドメインが決まっている（例: `example.com`, `localhost:3001` など）

## 🚀 導入フロー

### Step 1: Atelier管理画面でログイン

1. Atelier管理画面にアクセス（VercelのデプロイURL）
2. ログインまたはアカウント作成
3. ショップがプロビジョニングされていることを確認

### Step 2: Widget Keyの確認・設定

1. 管理画面の「設定」ページ（`/settings`）にアクセス
2. 「Widget 設定」セクションを確認
3. **Public Key**を確認（表示/非表示を切り替え可能）
4. **許可ドメイン**を確認・設定
   - ECサイトのドメインを追加する必要がある場合、管理者に連絡
   - 例: `example.com`, `localhost:3001`（開発環境用）

> **注意**: Widget Keyが存在しない場合は、管理者に連絡して作成してもらう必要があります。

### Step 3: 商品の登録

1. 「商品データベース」ページ（`/database/products`）にアクセス
2. 「商品を追加」ボタンをクリック
3. 商品情報を入力：
   - **商品名**: ECサイトの商品名
   - **外部商品ID** (`external_product_id`): **重要** - ECサイトの商品IDと一致させる
     - 例: Shopifyの場合は商品ID、独自ECの場合は商品の一意なID
   - **SKU**: 任意（商品のSKU）
   - **ステータス**: 「公開可」または「公開中」に設定
4. 保存

### Step 4: 3Dアセットのアップロード

1. 商品詳細ページで「アセットを追加」をクリック
2. 3Dモデル（GLBファイル）をアップロード
   - サイズごと（S/M/L）にアップロード可能
   - 各サイズに対応するGLBファイルを用意
3. アセットのバージョン管理
   - 新しいアセットをアップロードすると、自動的に最新版が使用される

### Step 5: 埋め込みスニペットの取得

1. 「埋め込みスニペット」ページ（`/install`）にアクセス
2. 商品を選択（任意）
   - 商品を選択すると、`data-atelier-external-product-id`が自動的に含まれる
   - 商品を選択しない場合、ECサイト側で商品IDを指定する必要がある
3. スニペットをコピー

生成されるスニペットの例：

```html
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id="PRODUCT_123">
</div>
<script async src="https://your-vercel-domain.vercel.app/widget.js"></script>
```

### Step 6: ECサイトへの実装

#### 6.1 基本的な実装

ECサイトの商品ページに、コピーしたスニペットを貼り付けます。

**例: HTMLファイルの場合**

```html
<!DOCTYPE html>
<html>
<head>
  <title>商品ページ</title>
</head>
<body>
  <h1>デニムジャケット</h1>
  <p>価格: ¥9,800</p>
  
  <!-- Atelierウィジェット -->
  <div
    data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
    data-atelier-external-product-id="PRODUCT_123">
  </div>
  <script async src="https://your-vercel-domain.vercel.app/widget.js"></script>
  
  <!-- 商品説明など -->
  <p>商品の説明...</p>
</body>
</html>
```

#### 6.2 商品IDを動的に指定する場合

ECサイトのテンプレートエンジンを使用している場合、商品IDを動的に設定できます。

**例: Next.jsの場合**

```tsx
export default function ProductPage({ params }: { params: { id: string } }) {
  const productId = params.id; // 例: "PRODUCT_123"
  
  return (
    <div>
      <h1>商品ページ</h1>
      
      {/* Atelierウィジェット */}
      <div
        data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
        data-atelier-external-product-id={productId}
      />
      <script async src="https://your-vercel-domain.vercel.app/widget.js" />
    </div>
  );
}
```

**例: Reactの場合**

```tsx
function ProductPage({ productId }: { productId: string }) {
  return (
    <div>
      <h1>商品ページ</h1>
      
      {/* Atelierウィジェット */}
      <div
        data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
        data-atelier-external-product-id={productId}
      />
      <script async src="https://your-vercel-domain.vercel.app/widget.js" />
    </div>
  );
}
```

#### 6.3 API URLを指定する場合（オプション）

ECサイトが別のドメインにある場合、API URLを明示的に指定できます。

```html
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id="PRODUCT_123"
  data-atelier-api-url="https://your-vercel-domain.vercel.app">
</div>
<script async src="https://your-vercel-domain.vercel.app/widget.js"></script>
```

### Step 7: 動作確認

1. ECサイトの商品ページにアクセス
2. 「3Dで試着する」ボタンが表示されることを確認
3. ボタンをクリックしてモーダルが開くことを確認
4. 3Dモデルが表示されることを確認
5. サイズ選択、身長調整が動作することを確認
6. チャット機能が動作することを確認

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

4. **商品IDが一致しているか確認**
   - 管理画面の商品の`external_product_id`と、ECサイトの商品IDが一致しているか確認

### 3Dモデルが表示されない

1. **アセットがアップロードされているか確認**
   - 商品詳細ページでアセットを確認
   - GLBファイルが正しくアップロードされているか確認

2. **商品のステータスを確認**
   - 商品のステータスが「公開可」または「公開中」になっているか確認

3. **APIのレスポンスを確認**
   - ブラウザの開発者ツールのNetworkタブで、`/api/public/widget-config`のレスポンスを確認
   - `enabled: true`が返されているか確認

### CORSエラーが発生する

1. **許可ドメインを確認**
   - 設定ページで許可ドメインにECサイトのドメインが含まれているか確認
   - サブドメインも許可されているか確認（例: `example.com`が許可されていれば`shop.example.com`もOK）

2. **API URLを明示的に指定**
   - `data-atelier-api-url`属性でAPI URLを指定

## 📝 実装例

### シンプルなHTMLページ

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
            data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
            data-atelier-external-product-id="denim-jacket-001">
          </div>
          <script async src="https://your-vercel-domain.vercel.app/widget.js"></script>
        </div>
        
        <button class="add-to-cart">カートに追加</button>
      </div>
    </div>
  </main>
</body>
</html>
```

### Reactコンポーネント

```tsx
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
    script.src = 'https://your-vercel-domain.vercel.app/widget.js';
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
        data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
        data-atelier-external-product-id={productId}
      />
      
      <button className="add-to-cart">カートに追加</button>
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
- [ ] 商品のステータスが「公開可」または「公開中」になっている
- [ ] スニペットをコピーしてECサイトに貼り付けた
- [ ] ブラウザのコンソールでエラーがないか確認した
- [ ] ウィジェットが正しく表示されることを確認した
- [ ] 3Dモデルが表示されることを確認した
- [ ] チャット機能が動作することを確認した

## 📞 サポート

問題が発生した場合：

1. ブラウザのコンソールでエラーメッセージを確認
2. 管理画面の設定を再確認
3. このドキュメントのトラブルシューティングセクションを参照
4. それでも解決しない場合は、管理者に連絡
