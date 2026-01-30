# 擬似ECサイト - テスト用デモ

このディレクトリには、widgetをテストするための擬似ECサイトが含まれています。

## ファイル構成

- `index.html` - 商品一覧ページ
- `product-page-2.html` - ダブルジャケットの商品ページ（external_product_id指定）
- `product-page-4.html` - ウールコートの商品ページ（external_product_id指定）
- `product-page.css` - 共通スタイルシート

## 使い方

### 1. 開発サーバーを起動

```bash
# Consoleサーバーを起動（API用）- 別ターミナルで実行
npm run dev:console

# Widget開発サーバーを起動
npm run dev:widget
```

### 2. デモページの設定

**重要**: デモページを使用する前に、実際の値を設定する必要があります。

1. **Atelier管理画面で以下を確認**:
   - Widget KeyのPublic Key（設定ページ `/settings` で確認）
   - 商品の外部商品ID（`external_product_id`）- 商品データベースで確認

2. **デモページのHTMLファイルを編集**:
   - `product-page-2.html` と `product-page-4.html` を開く
   - `data-atelier-public-key` が正しく設定されているか確認
   - `data-atelier-external-product-id` が実際の `external_product_id` と一致しているか確認

**例**:
```html
<!-- 変更前 -->
<div
  data-atelier-public-key="YOUR_PUBLIC_KEY_HERE"
  data-atelier-external-product-id="PRODUCT_1">
</div>

<!-- 変更後（実際の値） -->
<div
  data-atelier-public-key="pub_live_xxxxxxxxxxxxx"
  data-atelier-external-product-id="denim-jacket-001">
</div>
```

### 3. ブラウザでアクセス

開発サーバー起動後、以下のURLにアクセスしてください：

- **商品一覧**: `http://localhost:5174/demo/index.html`
- **商品ページ2（ダブルジャケット）**: `http://localhost:5174/demo/product-page-2.html`
  - 外部商品ID指定: `data-atelier-external-product-id="e489b59b-e06e-4e3f-b403-823c85efd6f7"`
- **商品ページ4（ウールコート）**: `http://localhost:5174/demo/product-page-4.html`
  - 外部商品ID指定: `data-atelier-external-product-id="a6b494eb-a68a-45af-b868-9eb9ac03add7"`

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

各商品ページで `data-atelier-external-product-id` を使用してwidgetを埋め込んでいます：

1. **product-page-2.html**: `data-atelier-external-product-id="e489b59b-e06e-4e3f-b403-823c85efd6f7"` - ダブルジャケットの外部商品ID
2. **product-page-4.html**: `data-atelier-external-product-id="a6b494eb-a68a-45af-b868-9eb9ac03add7"` - ウールコートの外部商品ID

**注意**: `external_product_id` は、Atelier管理画面で登録した商品の `external_product_id` と一致している必要があります。

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
- `external_product_id` は、Atelier管理画面で登録した商品の `external_product_id` と一致している必要があります
- デモページは、データベースに実際に登録されている商品のみを含んでいます
