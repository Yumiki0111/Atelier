# 管理画面プレビュー vs ウィジェットプレビューの比較

## 同じ点
- 両方とも `@atelier/preview` パッケージの `initPreviewPanel` を使用
- 同じ `initialHeight: 170`, `minHeight: 150`, `maxHeight: 190`
- 同じ `availableSizes: ["S", "M", "L", "XL"]`
- 同じベースモデル `modelUrl: "/3d/clo_model_men.glb"` (今修正済み)

## 異なる点

### 1. アセットの初期化方法
- **管理画面**: `assets: []` で初期化（空）、後で `updateAssets` で追加
- **ウィジェット**: `assets: assetList` で初期化時にアセットを渡している

### 2. PhoneFrame の有無
- **管理画面**: `PhoneFrame` コンポーネントでラップされている
- **ウィジェット**: `PhoneFrame` なし（直接コンテナに表示）

### 3. apiBaseUrl の取得方法
- **管理画面**: `window.location.origin`
- **ウィジェット**: `getApiBaseUrl() || "http://localhost:3000"`

### 4. コンテナの親要素
- **管理画面**: `PhoneFrame` 内の `div` に配置（絶対配置）
- **ウィジェット**: `contentArea` に直接配置

## 見た目の違いの原因
管理画面は `PhoneFrame` でラップされているため、フレームのスタイル（黒い枠、Dynamic Island、ステータスバーなど）が適用されています。ウィジェットは直接コンテナに表示されているため、フレームのスタイルが適用されていません。

## 統一すべき点
1. アセットの初期化方法を統一（管理画面と同じく空で初期化し、後で追加）
2. ウィジェットにも `PhoneFrame` を適用するか、管理画面から `PhoneFrame` を削除するか
