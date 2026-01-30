# external_product_id の活用方法

`external_product_id`は、**ECサイトの既存の商品ID**をAtelierの商品に設定することで、ECサイトとAtelierの商品を紐付ける重要な識別子です。

## 🎯 基本的な考え方

**ECサイトには既に商品IDが存在します。そのIDをAtelierの`external_product_id`に設定します。**

```
ECサイトの商品ID (例: "12345", "PRODUCT_ABC", "550e8400-...")
  ↓
Atelierコンソールで商品を登録・編集する際に
「外部商品ID」フィールドに設定
  ↓
ECサイトの商品ページで data-atelier-external-product-id="12345" を設定
  ↓
Atelierが商品を検索して、対応する3Dモデルを表示
```

## 🎯 主な活用シーン

### 1. **ECサイトとAtelierの商品を自動的に紐付ける**

ECサイトの商品ページで、その商品に対応する3Dモデルを自動的に表示できます。

#### 実装例

**Shopifyの場合:**
```liquid
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id="{{ product.id }}">
</div>
<script async src="https://your-domain.vercel.app/widget.js"></script>
```

**Next.js/Reactの場合:**
```tsx
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id={product.id}>
</div>
```

**WooCommerce (PHP)の場合:**
```php
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id="<?php echo $product->get_id(); ?>">
</div>
```

### 2. **商品ごとに異なる3Dモデルを表示**

同じテンプレートを使いながら、商品ごとに異なる3Dモデルを表示できます。

#### データフロー

```
ECサイトの商品ページ
  ↓
data-atelier-external-product-id="PRODUCT_123" を設定
  ↓
ウィジェットがAPIを呼び出し
  ↓
/api/public/widget-config?publicKey=xxx&externalProductId=PRODUCT_123
  ↓
Atelierが商品を検索 (shop_id + external_product_id)
  ↓
対応する3Dアセット（GLBファイル）を返す
  ↓
ウィジェットが3Dモデルを表示
```

### 3. **動的な商品IDの設定**

ECサイトの商品IDを動的に取得して設定できます。

#### JavaScriptでの動的設定例

```javascript
// ECサイトの商品IDを取得（例: URLパラメータから）
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('product_id') || 
                  document.querySelector('[data-product-id]')?.dataset.productId;

// ウィジェット要素に設定
const widgetElement = document.querySelector('[data-atelier-public-key]');
if (widgetElement && productId) {
  widgetElement.setAttribute('data-atelier-external-product-id', productId);
}
```

### 4. **複数のECサイトで同じ商品ID体系を使用**

同じ商品ID体系を使うことで、複数のECサイトで同じ商品を管理できます。

#### 例: 複数チャネル展開

```
Shopifyストア: product.id = "12345"
Amazon: ASIN = "B08XYZ123"
独自EC: product_id = "12345"

→ Atelierでは全て "12345" を external_product_id として登録
→ どのECサイトでも同じ3Dモデルが表示される
```

### 5. **商品検索とフィルタリング**

コンソールの商品テーブルで`external_product_id`で検索できます。

- 商品名、ブランド、**外部商品ID**で検索可能
- ECサイトの商品IDで直接検索できる

## 📊 実際の使用例

### 例1: Shopifyストア

```liquid
<!-- product.liquid テンプレート -->
<div class="product-page">
  <h1>{{ product.title }}</h1>
  <p>{{ product.price | money }}</p>
  
  <!-- Atelierウィジェット -->
  <div
    data-atelier-public-key="{{ shop.metafields.atelier.public_key }}"
    data-atelier-external-product-id="{{ product.id }}">
  </div>
  <script async src="https://atelier.vercel.app/widget.js"></script>
</div>
```

### 例2: 独自ECサイト（Next.js）

```tsx
// app/products/[id]/page.tsx
export default function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id);
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>¥{product.price}</p>
      
      {/* Atelierウィジェット */}
      <div
        data-atelier-public-key={process.env.NEXT_PUBLIC_ATELIER_PUBLIC_KEY}
        data-atelier-external-product-id={product.id}>
      </div>
      <script async src="https://atelier.vercel.app/widget.js"></script>
    </div>
  );
}
```

### 例3: 静的HTMLサイト

```html
<!-- 各商品ページで異なるIDを設定 -->
<!-- product-123.html -->
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id="123">
</div>

<!-- product-456.html -->
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id="456">
</div>
```

## 🔄 データの流れ

### 1. 商品登録時

```
Atelierコンソール
  ↓
商品を追加
  ↓
外部商品ID: "PRODUCT_123" を設定
  ↓
3Dアセットをアップロード
  ↓
データベースに保存
```

### 2. ECサイトでの表示時

```
ECサイトの商品ページ
  ↓
data-atelier-external-product-id="PRODUCT_123" を設定
  ↓
ウィジェットが読み込まれる
  ↓
API呼び出し: /api/public/widget-config?externalProductId=PRODUCT_123
  ↓
Atelierが商品を検索
  ↓
対応する3Dアセットを返す
  ↓
ウィジェットが3Dモデルを表示
```

## ⚠️ 重要なポイント

### 1. **ECサイトの商品IDをそのまま使用する**

`external_product_id`は、**ECサイトに既に存在する商品IDをそのまま設定**します。
- Atelierが新しいIDを生成するのではありません
- ECサイトの商品IDをAtelierに「教える」イメージです

### 2. **完全に一致させる必要がある**

`external_product_id`は、ECサイトで実際に使用されている商品IDと**完全に一致**させる必要があります。
- 大文字小文字も区別されます
- スペースや特殊文字も含めて完全一致が必要です

### 3. **外部商品IDは一意である必要がある**

同じショップ内で、同じ`external_product_id`を持つ商品は1つだけです。
- 同じECサイトの商品IDを複数のAtelier商品に設定することはできません

### 3. **商品IDの形式は自由**

- 数値: `"12345"`
- 文字列: `"PRODUCT_123"`
- UUID: `"550e8400-e29b-41d4-a716-446655440000"`
- ハンドル: `"denim-jacket"`（ただし、推奨は一意なID）

### 4. **未設定の場合**

`external_product_id`が未設定の場合、ウィジェットは商品を特定できず、3Dモデルを表示できません。

## 🛠️ トラブルシューティング

### 問題: 3Dモデルが表示されない

**確認事項:**
1. `external_product_id`が正しく設定されているか
2. ECサイトの商品IDと一致しているか
3. 商品に3Dアセットがアップロードされているか
4. Widget Keyの許可ドメインにECサイトのドメインが含まれているか

### 問題: 異なる商品の3Dモデルが表示される

**原因:**
- `external_product_id`が間違っている
- 複数の商品で同じ`external_product_id`が設定されている

**解決方法:**
- コンソールで商品の`external_product_id`を確認
- ECサイトの商品IDと一致しているか確認

## 📝 まとめ

`external_product_id`は、ECサイトとAtelierを結ぶ重要な橋渡し役です。

### 基本的な流れ

1. **ECサイトに商品IDが既に存在する**（例: `"12345"`, `"PRODUCT_ABC"`）
2. **Atelierコンソールで商品を登録・編集する際に、その商品IDを「外部商品ID」に設定**
3. **ECサイトの商品ページで、その商品IDを`data-atelier-external-product-id`に設定**
4. **ウィジェットが自動的に対応する3Dモデルを表示**

### メリット

✅ ECサイトの既存の商品IDをそのまま使用できる  
✅ 商品ごとに異なる3Dモデルを自動表示  
✅ テンプレートを1つ作れば全商品に対応  
✅ 複数のECサイトで同じ商品を管理  
✅ ECサイトの商品IDで直接検索可能

> **💡 覚えておくこと**: ECサイトの商品ID → Atelierの`external_product_id`に設定する
