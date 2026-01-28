# Widget実験ガイド

## 📋 実験方法の選択肢

### 方法1: 既存の開発用プレビューページを活用（最も簡単）

**概要**: 既に実装されている`packages/widget/index.html`を使用

**手順**:
```bash
# 1. Consoleサーバーを起動（API用）
npm run dev:console

# 2. Widget開発サーバーを起動（別ターミナル）
npm run dev:widget
```

**メリット**:
- ✅ すぐに始められる（既に実装済み）
- ✅ 複数のデモパターンを一度に確認できる
- ✅ 開発環境で動作確認しやすい

**デメリット**:
- ❌ 実際のECサイトの見た目ではない
- ❌ 商品ページのレイアウトを再現できない

**用途**: 基本的な動作確認、API連携テスト

---

### 方法2: シンプルなHTMLファイルで実験（推奨）

**概要**: 実際のECサイトを模したシンプルなHTMLファイルを作成

**作成するファイル例**:
```html
<!-- packages/widget/demo-product-page.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>商品ページ - デニムジャケット</title>
  <style>
    body { font-family: sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .product-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .product-image { background: #f0f0f0; height: 500px; }
    .product-info h1 { font-size: 24px; }
    .price { font-size: 28px; font-weight: bold; margin: 20px 0; }
    .widget-container { margin: 40px 0; padding: 20px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="product-container">
    <div class="product-image">
      <p>商品画像エリア</p>
    </div>
    <div class="product-info">
      <h1>デニムジャケット</h1>
      <p class="price">¥12,800</p>
      <p>カジュアルなデニムジャケットです。</p>
      
      <!-- Widget埋め込み -->
      <div class="widget-container">
        <h3>3D試着</h3>
        <div
          data-atelier-shop-id="default_shop"
          data-atelier-product-id="1">
        </div>
      </div>
      
      <button>カートに追加</button>
    </div>
  </div>
  
  <!-- Widgetスクリプト（開発環境） -->
  <script type="module">
    import { initWidget } from './src/widget.ts';
    initWidget();
  </script>
</body>
</html>
```

**手順**:
1. 上記のようなHTMLファイルを作成
2. Viteの開発サーバーで開く（`npm run dev:widget`）
3. ブラウザで`http://localhost:5174/demo-product-page.html`にアクセス

**メリット**:
- ✅ 実際のECサイトに近い見た目
- ✅ 商品ページのレイアウトを再現できる
- ✅ 簡単に作成・修正できる
- ✅ 複数の商品ページパターンを試せる

**デメリット**:
- ❌ 完全なECサイト機能はない（カート追加などはモック）

**用途**: UI/UXの確認、レイアウトテスト、実際の使用感確認

---

### 方法3: ビルド済みwidget.jsを外部HTMLで使用

**概要**: ビルドした`widget.js`を外部のHTMLファイルから読み込む

**手順**:
```bash
# 1. Widgetをビルド
cd packages/widget
npm run build

# 2. dist/widget.jsが生成される
# 3. 任意の場所にHTMLファイルを作成してwidget.jsを読み込む
```

**作成するHTML例**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>商品ページ</title>
</head>
<body>
  <h1>商品名</h1>
  
  <!-- Widget埋め込み -->
  <div
    data-atelier-shop-id="default_shop"
    data-atelier-product-id="1">
  </div>
  
  <!-- ビルド済みwidget.jsを読み込み -->
  <script src="http://localhost:5174/dist/widget.js"></script>
</body>
</html>
```

**メリット**:
- ✅ 本番環境に近い形でテストできる
- ✅ CDN配布を想定したテストができる
- ✅ 外部サイトからも読み込める（CORS設定が必要）

**デメリット**:
- ❌ ビルドが必要（開発サイクルが長い）
- ❌ デバッグがしにくい

**用途**: 本番環境の動作確認、CDN配布テスト

---

### 方法4: ローカルサーバーで擬似ECサイトを作成

**概要**: 簡単なNode.js/ExpressサーバーでECサイトを模擬

**必要なファイル**:
- `packages/widget/demo-server/` ディレクトリ
- Expressサーバー（商品ページを配信）
- 静的HTMLファイル（商品ページテンプレート）

**メリット**:
- ✅ より本番環境に近い
- ✅ 複数の商品ページを簡単に作成できる
- ✅ ルーティングもテストできる

**デメリット**:
- ❌ 実装に時間がかかる
- ❌ メンテナンスが必要

**用途**: より高度なテスト、複数ページのテスト

---

### 方法5: 既存のECサイト（Shopify等）に一時的に埋め込む

**概要**: 実際のShopifyストアやテストストアにwidgetを埋め込む

**手順**:
1. Widgetをビルド
2. `widget.js`をCDNまたはホスティングサービスにアップロード
3. Shopifyのテーマエディタで商品ページにスニペットを追加

**メリット**:
- ✅ 最も本番環境に近い
- ✅ 実際のユーザー体験を確認できる
- ✅ パフォーマンステストができる

**デメリット**:
- ❌ 実際のサイトに影響を与える可能性
- ❌ デバッグが難しい
- ❌ テスト環境が必要

**用途**: 最終的な動作確認、パフォーマンステスト

---

## 🎯 推奨アプローチ

### 段階的な実験フロー

1. **フェーズ1: 基本動作確認**
   - 方法1（既存の開発用プレビューページ）を使用
   - Widgetの基本機能を確認
   - API連携をテスト

2. **フェーズ2: UI/UX確認**
   - 方法2（シンプルなHTMLファイル）を作成
   - 実際のECサイトに近い見た目で確認
   - レイアウトやデザインを調整

3. **フェーズ3: 本番環境テスト**
   - 方法3（ビルド済みwidget.js）を使用
   - CDN配布を想定したテスト
   - パフォーマンスを確認

4. **フェーズ4: 実環境テスト（オプション）**
   - 方法5（既存ECサイト）に埋め込む
   - 最終的な動作確認

---

## 🛠️ すぐに試せる実験方法

### 最も簡単な方法（今すぐ試せる）

```bash
# ターミナル1: Consoleサーバー起動
npm run dev:console

# ターミナル2: Widget開発サーバー起動
npm run dev:widget
```

ブラウザで `http://localhost:5174` にアクセスすると、既に4つのデモパターンが表示されます。

### 次のステップ（商品ページ風のHTMLを作成）

`packages/widget/demo-product-page.html` のようなファイルを作成して、より実際のECサイトに近い形で実験できます。

---

## 📝 実験時に確認すべき項目

- [ ] Widgetが正しく表示されるか
- [ ] キューブをクリックしてモーダルが開くか
- [ ] APIから設定が取得できるか（開発環境ではモックデータ）
- [ ] イベントが送信されるか（開発環境では無視される）
- [ ] 複数の商品ページで同時に動作するか
- [ ] ページのCSSと衝突しないか（Shadow DOM）
- [ ] モバイル表示で正しく動作するか
- [ ] パフォーマンス（読み込み速度、レンダリング速度）

---

## 💡 実験のヒント

1. **ブラウザの開発者ツールを活用**
   - Consoleタブでエラーを確認
   - NetworkタブでAPI呼び出しを確認
   - ElementsタブでShadow DOMを確認

2. **複数の商品パターンでテスト**
   - 商品ID指定
   - SKU指定
   - Handle指定
   - 商品情報なし

3. **異なるブラウザで確認**
   - Chrome
   - Firefox
   - Safari
   - Edge

4. **モバイル表示も確認**
   - ブラウザのデバイスモードを使用
   - 実際のスマートフォンで確認
