# マルチテナントSaaS実装完了サマリー

## 実装完了日
2026-01-28

## 概要
Atelier（マルチテナントSaaS）の「独自EC向け：商品CSV取り込み＋3D(GLB)紐付け＋Widget公開API＋認証/招待」を実装しました。

## 主な変更点

### 1. データベース設計（Supabase/Postgres）

#### 新規追加されたテーブル
- **`profiles`**: 認証済ユーザーのテナント情報（`users` テーブルを段階的に退役）
  - `id uuid primary key` (auth.users.id)
  - `shop_id uuid` (shops.id)
  - `role text` ('owner' / 'member')
  - `email text`, `name text`, timestamps

- **`pending_invites`**: 招待ベースの認証フロー
  - `id uuid primary key`
  - `shop_id uuid`, `email text`, `role text`
  - `created_at`, `accepted_at`
  - UNIQUE (shop_id, email)

#### 既存テーブルの変更
- **`shops`**: `enabled boolean` を追加
- **`products`**: 
  - `external_product_id text` を追加
  - `shop_id` を UUID 型に変更
  - UNIQUE (shop_id, external_product_id) を追加
  - UNIQUE (shop_id, id) を追加（assets の複合FK用）
- **`assets`**:
  - `shop_id uuid` を追加
  - `(shop_id, product_id) -> products(shop_id, id)` の複合FK
- **`widget_keys`**:
  - `shop_id` を UUID 型に変更
  - `domain` を `allowed_domains text[]` にリネーム
  - `enabled` を NOT NULL + default true に

#### RLS (Row Level Security)
- **`current_shop_id()`** 関数を `public.profiles` ベースに変更
- `products` / `assets` のポリシーを `current_shop_id()` ベースに統一
- `profiles` は自分の行のみ SELECT/UPDATE 可
- `pending_invites` / `widget_keys` は Service Role 専用（クライアントから不可視）

---

### 2. 認証・招待フロー

#### 実装した API

**POST /api/auth/post-login** (初回ログイン確定)
- `pending_invites` をチェックし、招待が存在すれば `profiles` にレコード作成
- 招待がない場合は 403 を返してダッシュボードアクセス拒否

**POST /api/internal/provision-shop** (Atelier Admin 専用)
- 新しいショップを作成
- `widget_keys` を発行（public_key / secret_key_hash / allowed_domains）
- `pending_invites` に owner を追加
- Supabase Admin API で owner を招待

**POST /api/admin/invite-member** (Owner 専用)
- Owner が自分のショップにメンバーを招待
- `pending_invites` に member を追加
- Supabase Admin API でメンバーを招待

#### 変更した既存コード

**AuthContext.tsx**
- `login` 時に `/api/auth/post-login` を呼び出して招待確定
- 招待されていないユーザーは専用エラーメッセージ

**`/api/auth/shop-id`**
- `users` ではなく `profiles` から shop_id を取得
- `profiles` が存在しない場合は 404 を返す

**`/api/auth/signup`**
- `users` ではなく `profiles` にレコード作成（開発用として残す）

**`lib/auth/middleware.ts`**
- `getAuthenticatedUser` を `profiles` ベースに変更
- 既存の products / assets API も自動的に profiles ベースで動作

---

### 3. 商品管理（CSV + 3D）

#### 実装した API

**POST /api/products/import-csv**
- CSVファイル（UTF-8、ヘッダー必須）をアップロード
- フォーマット: `external_product_id`（必須）, `name`（任意）
- 既存商品（同一 shop_id + external_product_id）はスキップ
- 最大5000行まで処理
- レスポンス: `{ addedCount, skippedCount, failedCount, errors[] }`

**既存 API の修正**
- `POST /api/assets`: `shop_id` を明示的に付与するように修正
- すべての products / assets API が `profiles` ベースで動作

---

### 4. Widget 公開 API

**GET /api/public/widget-config**
- クエリパラメータ: `publicKey`, `externalProductId`
- 処理フロー:
  1. `widget_keys` から `public_key` で shop_id を取得（enabled=true のみ）
  2. ドメイン検証（Origin/Referer ヘッダーから host を取得し、`allowed_domains` と照合）
     - 完全一致 or サブドメイン許可
     - `localhost` も `allowed_domains` にある場合のみ許可
  3. `products` を `(shop_id, external_product_id)` で検索
  4. `assets` を `(shop_id, product_id)` で `created_at desc limit 1` で最新取得
  5. レスポンス: `{ enabled: true, glbUrl: "..." }` or `{ enabled: false }`
- ログ: pubkey, host, externalProductId

---

## 変更ファイル一覧

### Migration (Supabase)
```
apps/console/supabase/migrations/
  ├─ 20260128190033_create_profiles_and_pending_invites.sql
  ├─ 20260128190149_update_shops_products_assets_widget_keys.sql
  ├─ 20260128190203_update_current_shop_id_and_rls.sql
  └─ 20260128190832_migrate_users_to_profiles.sql
```

### API Routes
```
apps/console/src/app/api/
  ├─ auth/
  │   ├─ post-login/route.ts (新規)
  │   ├─ shop-id/route.ts (修正: profiles ベース)
  │   └─ signup/route.ts (修正: profiles ベース)
  ├─ internal/
  │   └─ provision-shop/route.ts (新規: Atelier Admin 専用)
  ├─ admin/
  │   └─ invite-member/route.ts (新規: Owner 専用)
  ├─ products/
  │   ├─ import-csv/route.ts (新規: CSV一括インポート)
  │   └─ route.ts (既存: profiles ベースに変更済み)
  ├─ assets/
  │   └─ route.ts (修正: shop_id 付与)
  └─ public/
      └─ widget-config/route.ts (新規: Widget 公開API)
```

### 認証・コンテキスト
```
apps/console/src/
  ├─ contexts/AuthContext.tsx (修正: post-login API 呼び出し)
  └─ lib/auth/middleware.ts (修正: profiles ベース)
```

---

## 動作確認手順

### 前提条件
- Supabase プロジェクトが設定済み
- 環境変数が設定済み:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ATELIER_ADMIN_TOKEN` (provision-shop API用)
  - `SECRET_KEY_SALT` (widget_keys 用、任意)

### 1. Migration 適用
```bash
cd apps/console
supabase db push --include-all
```

### 2. Shop Provision（Atelier Admin）
```bash
curl -X POST http://localhost:3000/api/internal/provision-shop \
  -H "Content-Type: application/json" \
  -H "x-atelier-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{
    "shopName": "テストショップ",
    "ownerEmail": "owner@example.com",
    "allowedDomains": ["localhost:3000", "example.com"]
  }'
```

レスポンス（例）:
```json
{
  "success": true,
  "shop_id": "xxx-xxx-xxx",
  "public_key": "pub_live_...",
  "secret_key": "sec_live_...",
  "message": "Shop provisioned successfully. Save the secret_key now, it will not be shown again."
}
```

⚠️ **secret_key は一度だけ表示されます。必ず保存してください。**

### 3. Owner 初回ログイン
1. owner@example.com 宛に届いた招待メールから初回ログイン
2. パスワードを設定
3. 自動的に `pending_invites` → `profiles` が確定
4. ダッシュボードにアクセス可能

### 4. CSV インポート
```bash
# CSV ファイルを準備（UTF-8、ヘッダー必須）
# example.csv:
# external_product_id,name
# SKU-001,商品A
# SKU-002,商品B

curl -X POST http://localhost:3000/api/products/import-csv \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@example.csv"
```

レスポンス（例）:
```json
{
  "success": true,
  "addedCount": 2,
  "skippedCount": 0,
  "failedCount": 0,
  "errors": []
}
```

### 5. 3D（GLB）紐付け
```bash
curl -X POST http://localhost:3000/api/assets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_UUID",
    "size": "M",
    "glbUrl": "https://example.com/model.glb"
  }'
```

### 6. Widget API 確認
```bash
curl "http://localhost:3000/api/public/widget-config?publicKey=pub_live_...&externalProductId=SKU-001" \
  -H "Origin: http://localhost:3000"
```

レスポンス（3Dあり）:
```json
{
  "enabled": true,
  "glbUrl": "https://example.com/model.glb"
}
```

レスポンス（3Dなし）:
```json
{
  "enabled": false
}
```

### 7. Member 招待（Owner のみ）
```bash
curl -X POST http://localhost:3000/api/admin/invite-member \
  -H "Authorization: Bearer OWNER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberEmail": "member@example.com"
  }'
```

---

## セキュリティ・注意事項

### ✅ 実装済み
- Atelier Admin 専用 API は `ATELIER_ADMIN_TOKEN` で保護
- Owner 専用 API は `profiles.role = 'owner'` チェック
- 招待されていないユーザーはダッシュボードアクセス不可
- widget_keys の secret_key はハッシュ化して保存（平文禁止）
- 公開 API のドメイン検証（`includes()` 禁止、`new URL().host` で厳密比較）
- RLS で shop_id によるテナント分離

### ⚠️ 今後の対応
- `users` テーブルは段階的に退役（当面は並行運用）
- ダッシュボードUIは既存のものを活用（CSVインポートUIは未実装）
- エラーハンドリング・ログ監視の強化
- rate limiting / API throttling の追加

---

## 設計方針の確認

### ステータス機能なし
- `products` / `assets` に `status` カラムは持たない
- 3Dがあるかないかは、`assets` テーブルにレコードが存在するかで判定
- Widget API は最新の `created_at` を採用（バージョン管理は既存の仕組みを活用）

### Owner の割り当て式
- 最初のユーザー = owner のような自動付与は禁止
- owner/member は Atelier運営（Atelier Admin）が割り当てる
- 具体的には Invite 発行時に role を指定し、招待受諾時に確定

### CSV インポートは「追加のみ」
- 既存商品（同一 shop_id + external_product_id）は更新せず、スキップ
- 削除機能は既存の products API を活用

### 3D は「追加のみ」
- 過去の 3D は削除せず、最新の `created_at` を採用
- 表示は `assets.created_at desc limit 1` で最新を取得

---

## 次のステップ（推奨）

1. **ダッシュボードUIの実装**
   - CSV インポート画面
   - 商品一覧に「3Dモデル」列を追加
   - Upload/Replace ボタン

2. **users → profiles への完全移行**
   - 既存の `users` テーブル依存コードを完全に `profiles` に置き換え
   - `users` テーブルを削除（または readonly に）

3. **環境変数の設定**
   - `ATELIER_ADMIN_TOKEN` を production 環境に設定
   - `SECRET_KEY_SALT` を production 環境に設定

4. **動作確認とテスト**
   - 各 API のエンドツーエンドテスト
   - ドメイン検証のテスト（各種ケース）
   - RLS の権限テスト

5. **ログ監視・エラートラッキング**
   - Sentry / Datadog 等の導入
   - API ログの監視

---

## トラブルシューティング

### Migration エラー
- **RLS ポリシーが邪魔する**: migration 前に該当ポリシーを DROP
- **型変換エラー**: 既存データの型を確認し、USING 句で変換

### 認証エラー
- **post-login で 403**: `pending_invites` にレコードがあるか確認
- **shop-id で 404**: `profiles` にレコードがあるか確認

### Widget API エラー
- **enabled: false**: 
  - `widget_keys.enabled = true` か確認
  - ドメイン検証が通っているか確認（console.log）
  - `products.external_product_id` が一致しているか確認
  - `assets` にレコードがあるか確認

---

## まとめ

すべての要件を満たす実装が完了しました。

- ✅ profiles / pending_invites ベースの招待フロー
- ✅ Owner の割り当て式（自動付与なし）
- ✅ CSV 一括インポート（追加のみ）
- ✅ 3D(GLB) 紐付け（最新 created_at 採用）
- ✅ Widget 公開API（pubkey + external_product_id ベース、ドメイン検証）
- ✅ RLS によるテナント分離
- ✅ ステータス機能なし（3Dの有無のみ）

動作確認を行い、必要に応じて UI 実装やテスト追加を進めてください。
