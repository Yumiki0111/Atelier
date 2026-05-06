# 管理画面プレビュー vs ウィジェット（埋め込み）試着 UI の比較

このリポジトリでは、試着まわりの UI は **`WidgetStyleProductPreview`**（`apps/console/src/features/preview/widget-style-product/WidgetStyleProductPreview.tsx`）に集約されています。旧ドキュメントにあった **`@Atelier/preview` パッケージや `initPreviewPanel` は存在しません**。

## 同じ点

- **同じ React コンポーネント**: 管理画面の商品プレビューも、公開ウィジェットの iframe 内（`/embed/widget-fit`）も、いずれも `WidgetStyleProductPreview` を描画している。
- **同じ試着パイプライン**: 体型・サイズ・2D フィット（`garment_spec` がある場合）などの挙動は、 props 経由で揃えられる範囲で共通化されている。

## 異なる点

### 1. 配置と枠線

| | 管理画面（データベース等のプレビュー） | ウィジェット（`packages/widget` → iframe） |
|---|----------------------------------------|--------------------------------------------|
| **枠** | `PreviewPanel` が `PhoneFrame` でラップし、端末ベゼル風の見た目になる | `EmbedWidgetFitClient` は `PhoneFrame` なしで全画面に近いコンテナに `WidgetStyleProductPreview` を載せる |
| **認証** | ログイン済み前提（`useAuth` など） | `embedPublicWidget` により未ログインの公開閲覧向け |

### 2. 起動経路

- **管理画面**: コンソール内で商品を選ぶと `PreviewPanel` が `WidgetStyleProductPreview` を直接マウントする。
- **ウィジェット**: ホストページの `widget.js` がモーダル用 iframe の `src` を `getApiBaseUrl()` 基準で組み立て、`/embed/widget-fit?publicKey=...&externalProductId=...` を読み込む（`packages/widget/src/widget-modal.ts` の `appendEmbedIframeBehindSplash`）。

### 3. API ベース URL

- **管理画面プレビュー**: 基本的にコンソールと同一オリジン（相対パスの API）。
- **埋め込み**: `data-fitlook-api-url` / スクリプトの `src` 等でコンソールのオリジンを解決（`packages/widget/src/widget-utils.ts`）。

### 4. スプラッシュ・閉じる動作

- **埋め込み**: 親の FIT&LOOK ロゴスプラッシュと iframe 内の段階表示の手切れ替えに `postMessage`（`fitlook-splash-finished` など）を使う。閉じるは `fitlook-embed-close`（`EmbedWidgetFitClient`）。

## 見た目が違う主な理由

管理画面は **`PhoneFrame`** によりプレビュー用のデバイス枠が付く一方、EC 埋め込み iframe は **フレーム無しの実運用レイアウト**に近いため、余白やスケールの印象が変わります。また `PreviewChromeScaleProvider` の `embed` / `default` により、コンポーネント内部のスケール指定も切り替わります。

## メンテナンス時の参照先

- 管理プレビュー: `apps/console/src/features/preview/PreviewPanel.tsx`
- 公開埋め込みページ: `apps/console/src/app/embed/widget-fit/EmbedWidgetFitClient.tsx`
- ホスト側スクリプト: `packages/widget/src/widget.ts`, `widget-modal.ts`, `embed-data.ts`
