# ローカル環境でのテスト方法

ECサイトと FIT&LOOK コンソールアプリをローカルで動かしてテストする方法です。

## 前提条件

- Node.js 18以上
- npm

## セットアップ手順

### 1. FIT&LOOK コンソールアプリを起動

```bash
# ルートディレクトリで
npm run dev:console
```

これで `http://localhost:3000` でコンソールアプリが起動します。

### 2. widget.jsをビルドしてコピー

```bash
# widget.jsをビルド
npm run build:widget

# publicディレクトリにコピー
npm run copy:widget --workspace=@Atelier/console
```

または、コンソールアプリのビルド時に自動的にコピーされます。

### 3. ECサイトでwidget.jsを読み込む

ECサイトのHTMLで、以下のようにwidget.jsを読み込みます：

#### 方法1: ローカルのwidget.jsを直接読み込む（推奨）

```html
<!-- FIT&LOOK コンソールアプリのローカルURLからwidget.jsを読み込む -->
<script async src="http://localhost:3000/widget.js"></script>

<!-- ウィジェット要素 -->
<div 
  data-fitlook-public-key="pub_live_030b64caa84e2995672163c125d600bd"
  data-fitlook-external-product-id="g115253154287"
  data-fitlook-api-url="http://localhost:3000">
</div>
```

**重要**: `data-fitlook-api-url="http://localhost:3000"` を追加することで、APIリクエストがローカルのコンソールアプリに送信されます。

従来の `data-atelier-*` 属性もウィジェットは読み取り互換です。

#### 方法2: ローカルファイルとしてwidget.jsを配置

```bash
# widget.jsをECサイトのpublicディレクトリにコピー
cp packages/widget/dist/widget.iife.js /path/to/ec-site/public/widget.js
```

```html
<!-- ECサイトのローカルURLから読み込む -->
<script async src="http://localhost:3001/widget.js"></script>

<!-- API URLを明示的に指定 -->
<div 
  data-fitlook-public-key="pub_live_030b64caa84e2995672163c125d600bd"
  data-fitlook-external-product-id="g115253154287"
  data-fitlook-api-url="http://localhost:3000">
</div>
```

## 注意点

### CORS設定

ローカル環境で異なるポート間で通信する場合、CORSの設定が必要です。FIT&LOOK コンソールアプリのAPIは既にCORS対応済みですが、ECサイトのポートが許可されていない場合は、`apps/console/src/app/api/public/widget-config/route.ts` のCORS設定を確認してください。

### 開発モードの判定

widget.jsは、以下の条件で開発モードと判定されます：
- ポート番号が `3000` または `3001` の場合（localhost / 127.0.0.1）
- 開発モードでは、APIエラーが発生してもモックデータで動作します

### デバッグ

ブラウザの開発者ツール（F12）でコンソールを開き、以下のログを確認してください：

- `[FIT&LOOK Widget]` で始まるログ — ウィジェットの動作・API・エラー

## トラブルシューティング

### widget.jsが読み込まれない

- コンソールアプリが `http://localhost:3000` で起動しているか確認
- ブラウザのコンソールでネットワークエラーを確認
- `public/widget.js` が存在するか確認

### APIリクエストが失敗する

- `data-fitlook-api-url`（または従来の `data-atelier-api-url`）が正しく設定されているか確認
- コンソールアプリのログでAPIリクエストが来ているか確認
- CORSエラーが出ていないか確認

### 3Dモデルが表示されない

- コンソールアプリの `public/3d/` ディレクトリにモデルファイルがあるか確認
- ブラウザのコンソールでモデル読み込みエラーを確認
