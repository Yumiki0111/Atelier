# 仕様書: リグ付き SVG 商品の登録・保存・ライブラリ表示・2D プレビュー

## 1. 目的とスコープ

### 1.1 目的

開発タブで調整した **袖丈・着丈指定・グレーディング情報を含むカスタム服データ（リグ付き SVG 由来）** と **商品画像** をまとめてサーバーへ送り、`products` に永続化する。商品ライブラリ画面では **画像グリッド＋商品情報** で一覧し、カード操作で **モデル＋登録したリグ付き SVG を同一フィットパイプラインでプレビュー** できるようにする。

### 1.2 スコープ内

- バックエンド: 受信・検証・ストレージ（画像）・DB 書き込み・一覧/詳細での返却。
- フロント: 開発タブからの送信 UI、商品ライブラリの表示・プレビュー UI。
- **既存の「モデル rig と服 rig の一致判定・配置」ロジックの再利用**（新規に二重実装しない）。

### 1.3 スコープ外（本仕様では扱わない）

- **モデルと商品を単一ファイルにエクスポート**する機能。
- ウィジェット向け 3D アセット（GLB）との統合（既存 `assets` 行とは別系統でよい。将来の接続は別タスク）。

---

## 2. 現状実装との差分（ギャップ）

以下は実装前に認識しておくべき **既存コードとの不一致** である。

| 項目 | 現状 | 本仕様で必要な状態 |
|------|------|-------------------|
| `garment_spec` 保存内容 | `sanitizeCustomGarmentForProductDb` / `stripGarmentSpecForStorage` が **`debugRigPathDs`（服側リグ path）を削除** | プレビューで開発タブと同じ rig 整列を行うには、**服側リグ path を永続化**する必要がある（名称は後述） |
| 商品画像 | `thumbnailUrl` はスキーマ上あるが、開発登録フローでは **未使用**（JSON POST のみ） | **画像アップロード**と **公開可能な URL を `thumbnail_url`（または専用カラム）に保存** |
| 商品 DB プレビュー | `PreviewPanel` は **3D（`model_test.glb` + `@Atelier/preview`）** が中心 | `garment_spec` がある商品は **2D フィットキャンバス** でプレビューする経路が必要（3D 専用のままでは要件を満たさない） |
| 一覧 UI | `ProductLibraryGrid` は画像＋1 行ラベルのみ | 要件どおり **下に商品名・その他情報** をどこまで載せるかを固定する（現状は `externalProductId` 優先表示など PoC 寄り） |

---

## 3. 機能要件

### 3.1 開発タブからの送信

- **入力**
  - 必須: 商品名（既存と同様）。
  - 必須: `CustomGarmentData` 相当のペイロード（path、ランドマーク、採寸、**平置き cm グレード**（`presetId: garmentFlatCmGrading`）のマークアップ・サイズカタログ等）。
  - **必須（本仕様）**: 服 SVG から分離・保持している **リグ用 path 配列**（現コードでは `debugRigPathDs`）。モデル側 rig は開発画面と同様に **アプリ同梱のモデル rig（`pathData` / `modelRigData` 系）** を用いる。
  - 必須: **商品画像**（1 枚。フォーマット・最大サイズは「未決定」参照）。
- **処理**
  - サーバーで `shop_id` は **認証ユーザのショップに固定**（既存 `POST /api/products` と同様）。
  - `garment_spec` は JSONB に保存。服リグ path を **除外しない**（保存ポリシーを変更）。
  - 画像はオブジェクトストレージ（例: Supabase Storage）に保存し、**HTTPS URL を商品レコードに紐付け**。
- **非機能**
  - リクエストサイズ上限（JSON + 画像）をサーバー・リバースプロキシ双方で定義する。

### 3.2 DB 保存

- 既存: `products.garment_spec`（JSONB）、`products.thumbnail_url`。
- 追加マイグレーションが必要な場合のみ別カラムを検討（原則 `thumbnail_url` で足りる想定）。

### 3.3 商品ライブラリ（一覧）

- **上**: 商品画像をカード状に配置（アスペクト比・プレースホルダは UI ガイドで固定）。
- **下**: 商品名、および合意した **商品情報フィールド**（例: ブランド、カテゴリ、登録日、外部 ID 等）。現状未入力の項目は非表示または「—」。
- データソース: `GET /api/products`（認証済みショップスコープ）。

### 3.4 プレビュー（タップ）

- **表示**: **モデル（既存の 2D ボディ＋モデル rig）** と **登録された服 path＋服リグ** を重ねた結果。
- **ロジック**: プレビューは `useFittingCanvasData` 経由で **`fittingCanvasCompute`**（`computeFittingCanvasSnapshot`）と同一入力を受け取る（身長・体重、`customGarmentData`、`rigBodyEnabled` / `rigGarmentEnabled`、`bodyModelVariant` 等）。
- **リグ一致の再利用（新規実装禁止の意味）**
  - 一致判定: `customGarment/rigMatching.ts` の **`garmentDebugRigMatchesLoadedRig`**（服 `debugRigPathDs` とロード済み `rigLinePaths` の幾何一致）。
  - 身長スケール等: `bodyParams.ts` の **`getBodyParams(..., rigLinePaths)`**、`rigDerivedHeight.ts` 経由の Y スケール。
  - 配置で rig ランドマークを優先する分岐は **`fittingCanvasCompute` 内の `useRigLandmarksForPlacement`** 周辺（開発 HUD に出ている `rigLm` / `lm` の意味と同系）。
- **「リグ手動ロジック」**（要語彙の固定）  
  要件文の意図としては、プレビュー側でも開発と同様に **肩インデックス等の手動調整**や **リグ表示トグル**が必要かどうかが曖昧。  
  - **最小案**: 身長・体重・サイズプリセット（`garment_spec` 内）のみ変更可能。  
  - **最大案**: 開発用コントロールの該当サブセット（肩デバッグ等）をプレビューに埋め込む。  
  → **製品としてどちらにするか決定必須**（「未決定事項」参照）。

---

## 4. データモデル（論理）

### 4.1 `garment_spec`（JSONB）

- 型: 既存 `CustomGarmentData` をベースに、**服リグ path 配列を必須または推奨**とする。
- **命名の整理（推奨）**
  - 永続化用に `garmentRigPathDs` など **プロダクト向け名称**へリネームし、開発時の `debugRigPathDs` はそのエイリアスとして扱う、または保存直前にマップする。  
  - 「debug」という語が DB・API に残ると除外ポリシーと矛盾しやすい。

### 4.2 画像

- 保存先: バケットパス規約（例: `shops/{shopId}/products/{productId}/thumbnail.{ext}`）。
- URL: `thumbnail_url` に格納。クライアントは `<img src>` で利用。

---

## 5. API 設計（案）

### 5.1 作成

- **案 A（推奨）**: `POST /api/products` を **`multipart/form-data`** に拡張  
  - フィールド例: `payload`（JSON 文字列） + `image`（ファイル）。
  - メリット: 1 リクエストで完結。トランザクション境界は「商品 insert → ストレージ upload」の順序とロールバック方針を決める。
- **案 B**: `POST /api/products`（JSON）後に `POST /api/products/{id}/thumbnail` で画像のみアップロード。  
  - メリット: 既存 JSON クライアントを壊しにくい。

### 5.2 取得

- 既存 `GET /api/products` / `GET /api/products/:id` で `garment_spec` と `thumbnail_url` を返す（既に近い形で実装あり）。画像 URL の署名付き化が必要なら別途。

### 5.3 検証

- Zod: `createProductSchema` に合わせ、`garment_spec` の形を段階的に厳格化（初回は `unknown` のまま + サーバー側キー検証でも可）。
- 画像: MIME、最大バイト、解像度上限。

---

## 6. プレビュー UI 構成（案）

- 条件分岐: `selectedProduct.garmentSpec` が存在する → **2D プレビューパネル**（新コンポーネントまたは `PreviewPanel` 内ブランチ）。存在しない → 従来の 3D プレビュー。
- 2D 側は **`useFittingCanvasData`＋キャンバス表示** で、`customGarmentData` に API から復元したオブジェクトを渡す。モデル rig は開発と同じデータソースを使い、**服リグは `garment_spec` から復元**する。

---

## 7. セキュリティ・権限

- 認証済みユーザのみ作成・一覧・プレビュー用取得可（現状踏襲）。
- ストレージ: ショップ単位で読み取り可能なポリシー、または署名付き URL。公開バケットにしないか、CDN 経由の読み取り範囲を決める。

---

## 8. 未決定事項（詰めが必要な点）

1. **服リグの保存キー**: `debugRigPathDs` のままか、`garmentRigPathDs` へリネームか（旧データ互換）。
2. **画像制約**: 形式（PNG/JPEG/WebP）、最大サイズ、必須か任意か。
3. **「リグ手動ロジック」の UI 範囲**: プレビューで編集可能にするか、閲覧のみか。編集する場合、変更をサーバーに保存するか（通常は不要）。
4. **一覧の「商品情報」列挙**: ブランド・カテゴリ・SKU・説明文など、どこまで表示するか。
5. **サイズ概念**: 3D 用の S/M/L トグルと、**平置き cm 固定カタログ**（`GARMENT_FLAT_CM_SIZE_TABLE` 相当）の対応（2D 専用商品ではプレビュー UI をサイズ切替に寄せるか）。
6. **アップロード失敗時の整合性**: 商品レコードのみ作成され画像が無い状態の許容と、クリーンアップジョブの要否。
7. **リグ不一致時の UX**: `garmentDebugRigMatchesLoadedRig` が false のとき、警告表示・自動フォールバック（従来 placement）のどちらを標準にするか。

---

## 9. 実装時の参照コード（再利用の根拠）

| 用途 | 主なファイル |
|------|----------------|
| 服・モデル rig 一致 | `apps/console/src/app/(main)/development/fitting/customGarment/rigMatching.ts` |
| フィット計算・rig ランドマーク利用 | `apps/console/src/lib/fitting-compute/fittingCanvasCompute.ts` |
| 身長とモデル rig | `apps/console/src/app/(main)/development/fitting/body/bodyParams.ts`, `rigDerivedHeight.ts` |
| プレビュー計算の入口 | `useFittingCanvasData.ts`（`fitting/canvas/`） |
| 現状の DB 向けサニタイズ（変更対象） | `sanitizeCustomGarmentForProductDb.ts`, `stripGarmentSpecForStorage.ts` |
| 現状の一覧・3D プレビュー | `ProductLibraryGrid.tsx`, `PreviewPanel.tsx` |

---

## 10. 受け入れ条件（チェックリスト）

- [ ] 開発タブから **画像＋リグ情報を含む `garment_spec`** を送ると、`products` に保存される。
- [ ] 商品ライブラリに **画像と商品情報** が表示される。
- [ ] カード操作でプレビューが開き、**2D でモデル＋服（リグ付き）** が表示される。
- [ ] リグ整列は **`rigMatching.ts` / `fittingCanvasCompute` の既存経路**を通る（新規に同等ロジックを複製していない）。
- [ ] 未決定事項が決まり、UI・API・ストレージに反映されている。

---

*文書バージョン: 0.1（2025-03-22）*
