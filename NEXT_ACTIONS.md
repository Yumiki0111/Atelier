# ネクストアクション

## 📋 現在の状態

✅ **完了済み**
- データベース設計書の作成
- コードを設計書に合わせて修正
- 型定義とスキーマの整合性確認
- マイグレーションファイルの作成
- ✅ **データベースマイグレーションの実行**（完了）
- ✅ **useProductsの実装**（実APIを呼び出す実装済み）
- ✅ **認証システムの実装**（Supabase Authを使用）
- ✅ **API Routesの認証対応**（`getAuthenticatedUser`を使用）
- ✅ **会話ログの保存・表示機能**（`/api/chat`で保存、`/api/analytics/conversations`で取得）

## 🎯 優先度別のネクストアクション

### 🔴 優先度: 高（即座に実施）

#### 1. アナリティクス集計の改善

**現状**: イベント集計は実装済みだが、`cube_view`と`cube_click`の分離が必要

**必要な改善**:
- `cube_view`と`cube_click`を独立したメトリクスとして集計
- 会話ログの集計（conversationsテーブルから）
- メッセージ数の集計（messagesテーブルから）

**実装ファイル**:
- `apps/console/src/app/api/analytics/route.ts`
- `apps/console/src/features/analytics/useAnalytics.ts`

**参考**:
- `DEVELOPMENT_ROADMAP.md`の「アナリティクス集計の改善」セクション

---

#### 2. アナリティクスページの更新

**現状**: グラフとメトリクスカードが実装済みだが、新しいメトリクスに対応が必要

**必要な更新**:
- グラフのデータキーを更新（キューブ表示数、キューブクリック数、会話数、メッセージ数）
- 主要メトリクスカードの更新

**実装ファイル**:
- `apps/console/src/app/(main)/analytics/page.tsx`

---

### 🟡 優先度: 中（次に実施）

#### 3. サイズタイプ選択UIの実装

**現状**: `AssetManagementDialog`でサイズを固定リストから選択

**改善案**:
- 商品の`sizeTypeId`に応じて、動的にサイズ選択肢を表示
- `size_types`テーブルからサイズタイプを取得するAPIエンドポイントの作成

**実装ファイル**:
- `apps/console/src/app/api/size-types/route.ts`（新規）
- `apps/console/src/features/products/components/AssetManagementDialog.tsx`

---

#### 4. テストデータの投入

**目的**: 開発・テスト用のデータを投入

**手順**:
1. テスト用の`shop`を作成
2. テスト用の`user`を作成
3. テスト用の`product`を作成
4. テスト用の`asset`を作成
5. テスト用の`conversation`と`message`を作成（アナリティクス確認用）

---

### 🟢 優先度: 低（後で実施）

#### 5. サイズタイプ選択UIの実装

**現状**: `AssetManagementDialog`でサイズを固定リストから選択

**改善案**:
- 商品の`sizeTypeId`に応じて、動的にサイズ選択肢を表示
- `size_types`テーブルからサイズタイプを取得するAPIエンドポイントの作成

**実装ファイル**:
- `apps/console/src/app/api/size-types/route.ts`（新規）
- `apps/console/src/features/products/components/AssetManagementDialog.tsx`

---

#### 6. テストデータの投入

**目的**: 開発・テスト用のデータを投入

**手順**:
1. テスト用の`shop`を作成
2. テスト用の`user`を作成
3. テスト用の`product`を作成
4. テスト用の`asset`を作成

---

## 📝 実装手順（推奨順序）

### フェーズ1: データベースセットアップ（完了）

1. ✅ マイグレーションファイルの確認
2. ✅ Supabaseプロジェクトへの接続
3. ✅ マイグレーションの実行
4. ✅ データベース構造の確認

### フェーズ2: 基本機能の実装（完了）

1. ✅ `useProducts`の実装（実APIを呼び出す実装）
2. ✅ 商品一覧ページの動作確認
3. ✅ 商品作成・編集機能の動作確認
4. ✅ アセット管理機能の動作確認

### フェーズ3: 認証システムの実装（完了）

1. ✅ Supabase Authの設定
2. ✅ ログイン機能の実装
3. ✅ ユーザー登録機能の実装
4. ✅ `shop_id`取得ロジックの実装
5. ✅ API Routesの認証対応

### フェーズ4: 会話ログ機能の実装（完了）

1. ✅ 会話ログの保存機能（`/api/chat`）
2. ✅ 会話一覧API（`/api/analytics/conversations`）
3. ✅ 会話詳細API（`/api/analytics/conversations/[id]`）
4. ✅ 会話ログ表示UI（`analytics/page.tsx`の会話ログタブ）

### フェーズ5: アナリティクスの改善（次のフェーズ）

1. ⬜ アナリティクスAPIの改善（`cube_view`と`cube_click`の分離）
2. ⬜ 会話ログ集計の追加
3. ⬜ メッセージ数集計の追加
4. ⬜ アナリティクスページの更新
5. ⬜ 動作確認とテスト

---

## 🚀 すぐに始められること

### 1. アナリティクスAPIの改善

`apps/console/src/app/api/analytics/route.ts`を修正して、以下のメトリクスを追加：
- `cube_view`と`cube_click`の分離
- 会話数の集計（conversationsテーブルから）
- メッセージ数の集計（messagesテーブルから）

### 2. アナリティクスページの更新

`apps/console/src/app/(main)/analytics/page.tsx`を更新して、新しいメトリクスに対応：
- グラフのデータキーを更新
- 主要メトリクスカードの更新

### 3. テストデータの投入

開発・テスト用のデータを投入して、アナリティクス機能を確認：
- テスト用の会話データ
- テスト用のメッセージデータ
- テスト用のイベントデータ

---

## 📚 参考資料

- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - データベース設計書
- [DATABASE_CODE_INTEGRATION_REPORT.md](./DATABASE_CODE_INTEGRATION_REPORT.md) - 整合性チェックレポート
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発ガイド

---

## ⚠️ 注意事項

1. **マイグレーション実行前**: 既存データがある場合はバックアップを取得
2. **認証実装**: Supabase Authの設定が必要（プロジェクト設定で有効化）
3. **RLSポリシー**: マイグレーション実行後、動作確認が必要

---

## 更新履歴

- 2025-01-26: 初版作成
- 2025-01-29: 完了項目を更新（マイグレーション、認証、会話ログ機能が完了）