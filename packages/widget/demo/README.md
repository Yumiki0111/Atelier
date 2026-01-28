# 擬似ECサイト - テスト用デモ

このディレクトリには、widgetをテストするための擬似ECサイトが含まれています。

## ファイル構成

- `index.html` - 商品一覧ページ
- `product-page.html` - デニムジャケットの商品ページ（productId指定）
- `product-page-2.html` - ダブルジャケットの商品ページ（SKU指定）
- `product-page-3.html` - レザージャケットの商品ページ（handle指定）
- `product-page-4.html` - ウールコートの商品ページ（URL指定）
- `product-page.css` - 共通スタイルシート

## 使い方

### 1. 開発サーバーを起動

```bash
# Consoleサーバーを起動（API用）- 別ターミナルで実行
npm run dev:console

# Widget開発サーバーを起動
npm run dev:widget
```

### 2. ブラウザでアクセス

開発サーバー起動後、以下のURLにアクセスしてください：

- **商品一覧**: `http://localhost:5174/demo/index.html`
- **商品ページ1（デニムジャケット）**: `http://localhost:5174/demo/product-page.html`
  - 商品ID指定: `data-atelier-product-id="1"`
- **商品ページ2（ダブルジャケット）**: `http://localhost:5174/demo/product-page-2.html`
  - SKU指定: `data-atelier-sku="DBL-JKT-001"`
- **商品ページ3（レザージャケット）**: `http://localhost:5174/demo/product-page-3.html`
  - Handle指定: `data-atelier-handle="leather-jacket"`
- **商品ページ4（ウールコート）**: `http://localhost:5174/demo/product-page-4.html`
  - URL指定: `data-atelier-url="https://example.com/products/wool-coat"`

### 3. Widgetの動作確認

各商品ページで以下の動作を確認できます：

1. **商品画像エリアに3Dキューブが表示される**
   - 商品画像の代わりに、widgetの3Dキューブが表示されます
   - キューブは自動的に中央に配置されます

2. **キューブをクリックしてモーダルを開く**
   - キューブをクリックすると、3D試着モーダルが開きます
   - モーダル内で3Dモデルが表示されます

3. **3Dモデルの操作**
   - サイズ選択（S/M/L）
   - 身長調整スライダー
   - 3Dモデルの回転・ズーム

4. **チャット機能**
   - AIアシスタントとの会話が可能
   - 商品に関する質問に回答します

## Widgetの埋め込み方法

### 基本的な埋め込み

各商品ページには、以下の2箇所にwidgetタグが埋め込まれています：

1. **商品画像エリア**（メイン表示）
   ```html
   <div class="product-image">
     <div
       data-atelier-shop-id="default_shop"
       data-atelier-product-id="1"
       style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
     </div>
   </div>
   ```

2. **商品情報エリア**（補助的な位置）
   ```html
   <div class="widget-section">
     <h3>3D試着</h3>
     <div class="widget-container">
       <div
         data-atelier-shop-id="default_shop"
         data-atelier-product-id="1">
       </div>
     </div>
   </div>
   ```

### 商品識別子の指定方法

各商品ページで異なる識別子を使用してwidgetを埋め込んでいます：

1. **product-page.html**: `data-atelier-product-id="1"` - 商品ID指定
2. **product-page-2.html**: `data-atelier-sku="DBL-JKT-001"` - SKU指定
3. **product-page-3.html**: `data-atelier-handle="leather-jacket"` - Handle指定
4. **product-page-4.html**: `data-atelier-url="https://example.com/products/wool-coat"` - URL指定

### スクリプトの読み込み

すべての商品ページの最後に、以下のスクリプトが含まれています：

```html
<script type="module">
  import { initWidget } from '../src/index.ts';
  initWidget();
</script>
```

このスクリプトにより、ページ内のすべてのwidgetタグが自動的に初期化されます。

## テスト項目

### 動作確認項目

- [ ] キューブが正しく表示される
- [ ] キューブをクリックしてモーダルが開く
- [ ] 3Dモデルが正しく読み込まれる
- [ ] サイズ選択が動作する
- [ ] 身長調整が動作する
- [ ] チャット機能が動作する
- [ ] イベントが正しく送信される
- [ ] 複数の商品ページで同時に動作する
- [ ] モバイル表示で正しく動作する

## カスタマイズ

商品ページのHTMLファイルを編集して、以下の項目をカスタマイズできます：

- 商品名、価格、説明
- widgetの配置位置
- スタイル（CSS）

## 注意事項

- 開発環境では、APIエラーが発生してもモックデータが使用されます
- 実際の商品データは、consoleサーバーで管理されているデータベースから取得されます
- 商品ID、SKU、Handle、URLは、実際のデータベースに存在する値を使用してください
