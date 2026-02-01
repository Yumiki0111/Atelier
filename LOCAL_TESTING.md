# ローカル環境でのテスト方法

ECサイトとAtelierコンソールアプリをローカルで動かしてテストする方法です。

## 前提条件

- Node.js 18以上
- npm

## セットアップ手順

### 1. Atelierコンソールアプリを起動

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
npm run copy:widget --workspace=@atelier/console
```

または、コンソールアプリのビルド時に自動的にコピーされます。

### 3. ECサイトでwidget.jsを読み込む

ECサイトのHTMLで、以下のようにwidget.jsを読み込みます：

#### 方法1: ローカルのwidget.jsを直接読み込む（推奨）

```html
<!-- AtelierコンソールアプリのローカルURLからwidget.jsを読み込む -->
<script async src="http://localhost:3000/widget.js"></script>

<!-- ウィジェット要素 -->
<div 
  data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
  data-atelier-external-product-id="g115253154287"
  data-atelier-api-url="http://localhost:3000">
</div>
```

**重要**: `data-atelier-api-url="http://localhost:3000"` を追加することで、APIリクエストがローカルのコンソールアプリに送信されます。

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
  data-atelier-public-key="pub_live_030b64caa84e2995672163c125d600bd"
  data-atelier-external-product-id="g115253154287"
  data-atelier-api-url="http://localhost:3000">
</div>
```

## 注意点

### CORS設定

ローカル環境で異なるポート間で通信する場合、CORSの設定が必要です。AtelierコンソールアプリのAPIは既にCORS対応済みですが、ECサイトのポートが許可されていない場合は、`apps/console/src/app/api/public/widget-config/route.ts` のCORS設定を確認してください。

### 開発モードの判定

widget.jsは、以下の条件で開発モードと判定されます：
- ポート番号が `5173` または `5174` の場合
- 開発モードでは、APIエラーが発生してもモックデータで動作します

### デバッグ

ブラウザの開発者ツール（F12）でコンソールを開き、以下のログを確認してください：

- `[Atelier Widget] Button clicked!` - ボタンがクリックされた
- `[Atelier Widget] Fetching widget config from: ...` - APIリクエストのURL
- `[Atelier Widget] API response status: ...` - APIレスポンスのステータス
- `[Atelier Widget] Error in handleCubeClick: ...` - エラーメッセージ

## トラブルシューティング

### widget.jsが読み込まれない

- コンソールアプリが `http://localhost:3000` で起動しているか確認
- ブラウザのコンソールでネットワークエラーを確認
- `public/widget.js` が存在するか確認

### APIリクエストが失敗する

- `data-atelier-api-url` が正しく設定されているか確認
- コンソールアプリのログでAPIリクエストが来ているか確認
- CORSエラーが出ていないか確認

### 3Dモデルが表示されない

- コンソールアプリの `public/3d/` ディレクトリにモデルファイルがあるか確認
- ブラウザのコンソールでモデル読み込みエラーを確認
