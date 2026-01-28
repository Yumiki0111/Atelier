# データベース設計書と既存コードの整合性チェックレポート

## 📋 概要

このドキュメントは、`DATABASE_DESIGN.md`で定義されたデータベース設計と既存コードの整合性を確認した結果をまとめています。

**確認日**: 2025-01-26  
**対象**: 全ファイル

---

## 🔴 重大な不整合（修正必須）

### 1. shop_idの型不一致

**問題:**
- **既存マイグレーション**: `shop_id TEXT NOT NULL`
- **設計書**: `shop_id UUID NOT NULL REFERENCES shops(id)`

**影響範囲:**
- `apps/console/supabase/migrations/20260125231216_initial_schema.sql`
- `apps/console/src/app/api/products/route.ts` (shop_idをTEXTとして扱っている)
- `apps/console/src/app/api/events/route.ts` (shop_idをTEXTとして扱っている)
- `apps/console/src/app/api/public/widget-config/route.ts` (shop_idをTEXTとして扱っている)
- `apps/console/src/contexts/AuthContext.tsx` (shopIdを"default_shop"という文字列で管理)
- `packages/shared/src/types/product.ts` (shopId: string)
- `packages/shared/src/schemas/product.schema.ts` (shopId: z.string())

**修正が必要なファイル:**
1. マイグレーションファイル（shop_idをUUIDに変更）
2. 型定義（shopIdをUUID形式に変更）
3. API Routes（shop_idの扱いをUUIDに変更）
4. AuthContext（shopIdをUUID形式で管理）

---

### 2. サイズタイプの固定値問題

**問題:**
- **既存コード**: `ProductSize = "S" | "M" | "L"` (固定値)
- **設計書**: 柔軟なサイズタイプシステム（`size_types`テーブル）

**影響範囲:**
- `packages/shared/src/types/product.ts` (ProductSize型が固定)
- `packages/shared/src/schemas/product.schema.ts` (productSizeSchemaが固定)
- `apps/console/src/features/products/components/AssetManagementDialog.tsx` (S/M/Lのみ選択可能)
- `apps/console/src/app/api/assets/route.ts` (sizeのCHECK制約がS/M/L固定)
- `apps/console/supabase/migrations/20260125231216_initial_schema.sql` (size CHECK制約)

**修正が必要なファイル:**
1. 型定義（ProductSizeを柔軟な形式に対応）
2. スキーマ（productSizeSchemaを柔軟な形式に対応）
3. UIコンポーネント（サイズタイプに応じたサイズ選択UI）
4. マイグレーション（size CHECK制約を削除）

---

### 3. productsテーブルの不足カラム

**問題:**
- **既存マイグレーション**: `category`, `size_type_id`, `thumbnail_url`, `preview_image_url`が存在しない
- **設計書**: これらのカラムが必要

**影響範囲:**
- `apps/console/supabase/migrations/20260125231216_initial_schema.sql`
- `packages/shared/src/types/product.ts` (thumbnailUrl, previewImageUrlは型定義にあるが、DBにない)
- `apps/console/src/app/api/products/route.ts` (これらのフィールドをマッピングしていない)

**修正が必要なファイル:**
1. マイグレーションファイル（カラム追加）
2. API Routes（カラムのマッピング追加）

---

### 4. assetsテーブルの不足カラム

**問題:**
- **既存マイグレーション**: `is_active`, `thumbnail_url`が存在しない
- **設計書**: これらのカラムが必要

**影響範囲:**
- `apps/console/supabase/migrations/20260125231216_initial_schema.sql`
- `packages/shared/src/types/product.ts` (Asset型にこれらのフィールドがない)
- `apps/console/src/app/api/assets/route.ts` (これらのフィールドを扱っていない)

**修正が必要なファイル:**
1. マイグレーションファイル（カラム追加）
2. 型定義（Asset型にフィールド追加）
3. API Routes（カラムの扱い追加）

---

### 5. eventsテーブルの不足カラム

**問題:**
- **既存マイグレーション**: `session_id`, `user_agent`, `ip_address`が存在しない
- **設計書**: これらのカラムが必要（オプション）

**影響範囲:**
- `apps/console/supabase/migrations/20260125231216_initial_schema.sql`
- `packages/shared/src/types/product.ts` (Event型にこれらのフィールドがない)
- `apps/console/src/app/api/events/route.ts` (これらのフィールドを扱っていない)

**修正が必要なファイル:**
1. マイグレーションファイル（カラム追加）
2. 型定義（Event型にフィールド追加）
3. API Routes（カラムの扱い追加）

---

### 6. 新規テーブルの未実装

**問題:**
- **設計書**: `shops`, `users`, `size_types`, `widget_configs`テーブルが必要
- **既存コード**: これらのテーブルが存在しない

**影響範囲:**
- 認証システム（usersテーブルが必要）
- マルチテナント対応（shopsテーブルが必要）
- サイズタイプシステム（size_typesテーブルが必要）
- ウィジェット設定（widget_configsテーブルが必要）

**修正が必要:**
1. マイグレーションファイル（新規テーブル作成）
2. 初期データ投入（size_types）

---

## 🟡 中程度の不整合（修正推奨）

### 7. 型定義の重複・不整合

**問題:**
- `packages/shared/src/types/product.ts`と`apps/console/src/features/products/products.types.ts`が異なる型定義を持っている

**詳細:**
- `packages/shared/src/types/product.ts`: 設計書に準拠した型定義
- `apps/console/src/features/products/products.types.ts`: 古い型定義（category, sizes配列など）

**影響範囲:**
- `apps/console/src/features/products/products.types.ts`が使用されていない可能性がある

**修正が必要:**
1. 重複する型定義を削除
2. `packages/shared`の型定義を統一

---

### 8. 認証システムの未実装

**問題:**
- **設計書**: Supabase Authを使用した認証システム
- **既存コード**: モック実装のみ（localStorageベース）

**影響範囲:**
- `apps/console/src/contexts/AuthContext.tsx` (モック実装)
- `apps/console/src/app/login/page.tsx` (実際の認証処理なし)

**修正が必要:**
1. Supabase Authの実装
2. usersテーブルとの連携
3. JWTトークン検証

---

### 9. RLS（Row Level Security）の未実装

**問題:**
- **設計書**: 全テーブルでRLSを有効化し、適切なポリシーを設定
- **既存マイグレーション**: RLSの設定がない

**影響範囲:**
- セキュリティ（データアクセス制御ができない）

**修正が必要:**
1. マイグレーションファイル（RLS有効化とポリシー追加）

---

## 🟢 軽微な不整合（任意修正）

### 10. インデックスの不足

**問題:**
- **設計書**: 追加のインデックスが定義されている
- **既存マイグレーション**: 基本的なインデックスのみ

**影響範囲:**
- パフォーマンス（クエリ速度）

**修正が必要:**
1. マイグレーションファイル（追加インデックス作成）

---

### 11. widget_configsテーブルの未使用

**問題:**
- **設計書**: `widget_configs`テーブルが定義されている
- **既存コード**: このテーブルを使用していない

**影響範囲:**
- ウィジェット設定機能（現在は未実装）

**修正が必要:**
1. 将来的に実装（現在は任意）

---

## 📝 修正優先順位

### フェーズ1: データベース構造の修正（必須）

1. ✅ 新規テーブル作成（shops, users, size_types, widget_configs）
2. ✅ productsテーブルのカラム追加（category, size_type_id, thumbnail_url, preview_image_url）
3. ✅ assetsテーブルのカラム追加（is_active, thumbnail_url）
4. ✅ eventsテーブルのカラム追加（session_id, user_agent, ip_address）
5. ✅ shop_idをTEXTからUUIDに変更
6. ✅ size CHECK制約の削除（柔軟なサイズ対応）

### フェーズ2: 型定義とスキーマの修正（必須）

1. ✅ ProductSize型を柔軟な形式に対応
2. ✅ productSizeSchemaを柔軟な形式に対応
3. ✅ shopIdをUUID形式に対応
4. ✅ Asset型に不足フィールド追加
5. ✅ Event型に不足フィールド追加
6. ✅ Product型に不足フィールド追加

### フェーズ3: API Routesの修正（必須）

1. ✅ shop_idの扱いをUUIDに変更
2. ✅ 新規カラムのマッピング追加
3. ✅ サイズタイプに対応した処理追加

### フェーズ4: UIコンポーネントの修正（必須）

1. ✅ AssetManagementDialog（サイズタイプに応じたサイズ選択）
2. ✅ ProductAddDialog（category, size_type_idの入力）

### フェーズ5: 認証システムの実装（推奨）

1. ✅ Supabase Authの実装
2. ✅ usersテーブルとの連携
3. ✅ JWTトークン検証

### フェーズ6: RLSの実装（推奨）

1. ✅ RLS有効化
2. ✅ ポリシー作成

---

## 🔍 ファイル別チェックリスト

### マイグレーションファイル

- [ ] `apps/console/supabase/migrations/20260125231216_initial_schema.sql`
  - [ ] shopsテーブル作成
  - [ ] usersテーブル作成
  - [ ] size_typesテーブル作成
  - [ ] productsテーブル: shop_idをUUIDに変更
  - [ ] productsテーブル: category追加
  - [ ] productsテーブル: size_type_id追加
  - [ ] productsテーブル: thumbnail_url追加
  - [ ] productsテーブル: preview_image_url追加
  - [ ] assetsテーブル: size CHECK制約削除
  - [ ] assetsテーブル: is_active追加
  - [ ] assetsテーブル: thumbnail_url追加
  - [ ] eventsテーブル: shop_idをUUIDに変更
  - [ ] eventsテーブル: session_id追加
  - [ ] eventsテーブル: user_agent追加
  - [ ] eventsテーブル: ip_address追加
  - [ ] widget_configsテーブル作成
  - [ ] RLS有効化
  - [ ] RLSポリシー作成

### 型定義ファイル

- [ ] `packages/shared/src/types/product.ts`
  - [ ] ProductSize型を柔軟な形式に対応
  - [ ] Product型にcategory追加
  - [ ] Product型にsizeTypeId追加
  - [ ] Asset型にisActive追加
  - [ ] Asset型にthumbnailUrl追加
  - [ ] Event型にsessionId追加
  - [ ] Event型にuserAgent追加
  - [ ] Event型にipAddress追加

- [ ] `packages/shared/src/schemas/product.schema.ts`
  - [ ] productSizeSchemaを柔軟な形式に対応
  - [ ] productSchemaにcategory追加
  - [ ] productSchemaにsizeTypeId追加
  - [ ] assetSchemaにisActive追加
  - [ ] assetSchemaにthumbnailUrl追加
  - [ ] eventSchemaにsessionId追加
  - [ ] eventSchemaにuserAgent追加
  - [ ] eventSchemaにipAddress追加

- [ ] `apps/console/src/features/products/products.types.ts`
  - [ ] 削除または統合（重複を解消）

### API Routes

- [ ] `apps/console/src/app/api/products/route.ts`
  - [ ] shop_idの扱いをUUIDに変更
  - [ ] category, size_type_id, thumbnail_url, preview_image_urlのマッピング追加

- [ ] `apps/console/src/app/api/products/[id]/route.ts`
  - [ ] category, size_type_id, thumbnail_url, preview_image_urlのマッピング追加

- [ ] `apps/console/src/app/api/assets/route.ts`
  - [ ] is_active, thumbnail_urlの扱い追加

- [ ] `apps/console/src/app/api/events/route.ts`
  - [ ] shop_idの扱いをUUIDに変更
  - [ ] session_id, user_agent, ip_addressの扱い追加

- [ ] `apps/console/src/app/api/public/widget-config/route.ts`
  - [ ] shop_idの扱いをUUIDに変更
  - [ ] サイズタイプに対応した処理追加

### UIコンポーネント

- [ ] `apps/console/src/features/products/components/AssetManagementDialog.tsx`
  - [ ] サイズタイプに応じたサイズ選択UI

- [ ] `apps/console/src/features/products/components/ProductAddDialog.tsx`
  - [ ] category入力フィールド追加
  - [ ] size_type_id選択フィールド追加

### 認証・コンテキスト

- [ ] `apps/console/src/contexts/AuthContext.tsx`
  - [ ] Supabase Authの実装
  - [ ] shopIdをUUID形式で管理

- [ ] `apps/console/src/lib/supabase/client.ts`
  - [ ] 認証機能の実装確認

- [ ] `apps/console/src/lib/supabase/server.ts`
  - [ ] JWTトークン検証の実装確認

### フック

- [ ] `apps/console/src/features/products/useProducts.ts`
  - [ ] 実際のAPI呼び出しに変更（現在はモック）

- [ ] `apps/console/src/features/products/useAssets.ts`
  - [ ] 新規フィールドの扱い確認

---

## ✅ 整合性が取れている部分

### 1. ステータス定義

- `ProductStatus`の定義は設計書と一致
- `EventType`の定義は設計書と一致

### 2. 基本的なテーブル構造

- `products`, `assets`, `events`テーブルの基本的な構造は設計書と一致
- 主キー、外部キー、タイムスタンプの扱いは設計書と一致

### 3. API設計

- エンドポイントの設計は設計書と一致
- エラーハンドリングの基本構造は適切

---

## 🚨 注意事項

### マイグレーション戦略

既存のデータベースにデータが存在する場合、以下の点に注意が必要です：

1. **shop_idの型変更**: TEXTからUUIDへの変更は、既存データの移行が必要
2. **size CHECK制約の削除**: 既存のデータがS/M/L以外の場合、制約削除が必要
3. **新規テーブルの作成**: 既存データとの整合性を保つ必要がある

### 後方互換性

以下の変更は後方互換性に影響する可能性があります：

1. **shop_idの型変更**: 既存のAPIクライアントがTEXT形式を期待している場合
2. **ProductSize型の変更**: 既存のコードが固定値（"S" | "M" | "L"）を期待している場合

### 段階的な移行

以下の順序で段階的に移行することを推奨します：

1. 新規テーブル作成（shops, users, size_types, widget_configs）
2. 既存テーブルへのカラム追加（後方互換性を保つ）
3. 型定義の更新
4. API Routesの更新
5. UIコンポーネントの更新
6. shop_idの型変更（最後に実施）

---

## 📊 まとめ

### 重大な不整合: 6件
### 中程度の不整合: 3件
### 軽微な不整合: 2件

**総合評価**: 設計書と既存コードの間に**重大な不整合が複数存在**します。統合前に修正が必要です。

**推奨アクション**: 
1. まずマイグレーションファイルを修正
2. 次に型定義とスキーマを修正
3. その後API RoutesとUIコンポーネントを修正
4. 最後に認証システムとRLSを実装

---

## 更新履歴

- 2025-01-26: 初版作成
