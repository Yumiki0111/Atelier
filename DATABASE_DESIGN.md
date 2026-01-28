# データベース設計書

## 📋 目次

1. [概要](#概要)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [認証システム](#認証システム)
4. [テーブル設計](#テーブル設計)
5. [Edge Functionsとの切り分け](#edge-functionsとの切り分け)
6. [Row Level Security (RLS)](#row-level-security-rls)
7. [インデックス設計](#インデックス設計)
8. [マイグレーション戦略](#マイグレーション戦略)

---

## 概要

本ドキュメントでは、Atelier（アパレルEC向け3D試着ウィジェット）のデータベース設計を定義します。

### 設計原則

1. **マルチテナント対応**: 複数のショップ（テナント）が独立してデータを管理できる
2. **柔軟なサイズシステム**: 商品カテゴリごとに異なるサイズタイプ（S/M/L、数字サイズ、ウエストサイズなど）に対応
3. **セキュアな認証**: Supabase Authを使用した認証システム
4. **スケーラブルな設計**: 将来の機能拡張に対応できる拡張性
5. **パフォーマンス最適化**: 適切なインデックスとクエリ最適化

---

## アーキテクチャ設計

### システム構成

```
┌─────────────────┐
│  Next.js API    │  ← 管理画面用（認証必須）
│     Routes      │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐  ┌────▼──────────────┐
│  Supabase       │  │  Edge Functions   │  ← ウィジェット用（公開API）
│  PostgreSQL     │  │                   │
└─────────────────┘  └───────────────────┘
         │
         │
┌────────▼────────┐
│  Supabase Auth  │  ← 認証システム
└─────────────────┘
```

### データフロー

1. **管理画面（Console）**
   - Next.js API Routes → Supabase（Service Role Key使用）
   - 認証: Supabase Auth（JWT）
   - RLS: ユーザーは自分のショップのデータのみアクセス可能

2. **ウィジェット（Public）**
   - Edge Functions → Supabase（Anon Key使用）
   - 認証: 不要（公開API）
   - RLS: shop_idベースでデータ取得

---

## 認証システム

### Supabase Authの活用

Supabase Authを使用して、以下の認証フローを実装します。

#### ユーザー管理

- **Supabase Auth**: ユーザー認証情報（email, password）を管理
- **users テーブル**: 認証ユーザーとショップの紐付けを管理

#### 認証フロー

```
1. ユーザーがログイン
   ↓
2. Supabase Authで認証
   ↓
3. JWTトークン取得
   ↓
4. usersテーブルからshop_idを取得
   ↓
5. RLSポリシーでshop_idベースのアクセス制御
```

#### 実装方針

- **管理画面**: Supabase Auth Client（@supabase/supabase-js）を使用
- **API Routes**: JWTトークンを検証し、shop_idを取得
- **RLS**: 自動的にshop_idベースのアクセス制御を実施

---

## テーブル設計

### 1. shops（ショップ/テナント）

各ECサイトを表すテーブル。マルチテナントの基本単位。

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT, -- ECサイトのドメイン（オプション）
  platform TEXT, -- 'shopify', 'custom', 'other'
  api_key TEXT, -- 外部API連携用（暗号化推奨）
  settings JSONB DEFAULT '{}', -- ショップ固有の設定
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shops_domain ON shops(domain);
```

**カラム説明:**
- `id`: ショップの一意識別子（UUID）
- `name`: ショップ名
- `domain`: ECサイトのドメイン（オプション）
- `platform`: プラットフォーム種別
- `api_key`: 外部API連携用のキー（暗号化推奨）
- `settings`: ショップ固有の設定（JSONB）

---

### 2. users（ユーザー）

認証ユーザーとショップの紐付けを管理。

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id, shop_id)
);

CREATE INDEX idx_users_shop_id ON users(shop_id);
CREATE INDEX idx_users_email ON users(email);
```

**カラム説明:**
- `id`: Supabase AuthのユーザーID（auth.users.idと連携）
- `shop_id`: 所属するショップ
- `role`: ユーザー権限（owner: オーナー, admin: 管理者, member: メンバー）
- `email`: メールアドレス（auth.usersと同期）
- `name`: 表示名

**注意:**
- `auth.users`テーブルはSupabase Authが自動生成
- `id`は`auth.users.id`と一致させる必要がある

---

### 3. size_types（サイズタイプ）

商品カテゴリごとに異なるサイズタイプを定義。

```sql
CREATE TABLE size_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'letter', 'number', 'waist', 'custom'
  display_name TEXT NOT NULL, -- 'レターサイズ', '数字サイズ', 'ウエストサイズ'
  sizes JSONB NOT NULL, -- 利用可能なサイズのリスト
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 例: sizes = ["S", "M", "L"] または ["1", "2", "3"] または ["28", "30", "32"]
```

**カラム説明:**
- `id`: サイズタイプの一意識別子
- `name`: サイズタイプの識別名（システム用）
- `display_name`: 表示名（UI用）
- `sizes`: 利用可能なサイズの配列（JSONB）

**サイズタイプの例:**
```json
// letter (レターサイズ)
{
  "name": "letter",
  "display_name": "レターサイズ",
  "sizes": ["XS", "S", "M", "L", "XL", "XXL"]
}

// number (数字サイズ)
{
  "name": "number",
  "display_name": "数字サイズ",
  "sizes": ["1", "2", "3", "4", "5"]
}

// waist (ウエストサイズ)
{
  "name": "waist",
  "display_name": "ウエストサイズ",
  "sizes": ["28", "30", "32", "34", "36", "38"]
}

// free (フリーサイズ)
{
  "name": "free",
  "display_name": "フリーサイズ",
  "sizes": ["FREE", "F"]
}

// shoe (靴サイズ)
{
  "name": "shoe",
  "display_name": "靴サイズ",
  "sizes": ["39", "40", "41", "42", "43", "44", "45"]
}
```

**注意**: `size_types`テーブルは柔軟に拡張可能です。必要に応じて新しいサイズタイプを追加できます。

---

### 4. products（商品）

商品情報を管理。

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT, -- 'ジャケット', 'コート', 'トップス', 'ボトムス'
  sku TEXT,
  handle TEXT, -- Shopify等のハンドル
  url TEXT, -- 商品ページのURL
  size_type_id UUID REFERENCES size_types(id), -- この商品のサイズタイプ
  thumbnail_url TEXT, -- サムネイル画像URL
  preview_image_url TEXT, -- プレビュー画像URL
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_production', 'review', 'revision', 'ready', 'published')
  ),
  metadata JSONB DEFAULT '{}', -- 追加のメタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_handle ON products(handle) WHERE handle IS NOT NULL;
CREATE INDEX idx_products_size_type_id ON products(size_type_id);
```

**カラム説明:**
- `id`: 商品の一意識別子
- `shop_id`: 所属するショップ
- `name`: 商品名
- `brand`: ブランド名
- `category`: 商品カテゴリ
- `sku`: SKU（Stock Keeping Unit）
- `handle`: プラットフォーム固有のハンドル（Shopify等）
- `url`: 商品ページのURL
- `size_type_id`: この商品が使用するサイズタイプ
- `thumbnail_url`: サムネイル画像URL
- `preview_image_url`: プレビュー画像URL
- `status`: 商品ステータス
  - `pending`: 未発注
  - `in_production`: 制作中
  - `review`: レビュー待ち
  - `revision`: 修正中
  - `ready`: 公開可
  - `published`: 公開中
- `metadata`: 追加のメタデータ（JSONB）

---

### 5. assets（3Dアセット）

商品の3Dモデル（GLBファイル）を管理。

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL, -- サイズ値（'S', 'M', 'L' または '1', '2', '3' など）
  glb_url TEXT NOT NULL, -- GLBファイルのURL
  thumbnail_url TEXT, -- アセットのサムネイル画像URL
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true, -- アクティブなアセットかどうか
  metadata JSONB DEFAULT '{}', -- 追加のメタデータ（ファイルサイズ、作成日時など）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, size, version)
);

CREATE INDEX idx_assets_product_id ON assets(product_id);
CREATE INDEX idx_assets_product_id_size ON assets(product_id, size);
CREATE INDEX idx_assets_is_active ON assets(is_active) WHERE is_active = true;
```

**カラム説明:**
- `id`: アセットの一意識別子
- `product_id`: 紐づく商品
- `size`: サイズ値（商品のsize_typeに応じて異なる形式）
- `glb_url`: GLBファイルのURL
- `thumbnail_url`: アセットのサムネイル画像URL
- `version`: バージョン番号（同じサイズで複数バージョン管理可能）
- `is_active`: アクティブなアセットかどうか（最新バージョンのみtrue推奨）
- `metadata`: 追加のメタデータ（ファイルサイズ、作成日時など）

**サイズの柔軟性:**
- 商品の`size_type_id`に応じて、`size`カラムには異なる形式の値が入る
- 例: 
  - レターサイズ: 'XS', 'S', 'M', 'L', 'XL', 'XXL'
  - 数字サイズ: '1', '2', '3', '4', '5'
  - ウエストサイズ: '28', '30', '32', '34', '36', '38'
  - フリーサイズ: 'FREE', 'F'
  - 靴サイズ: '39', '40', '41', '42', '43', '44', '45'
- `assets`テーブルの`size`カラムは`TEXT`型でCHECK制約がないため、任意の文字列を保存可能
- カスタムサイズタイプも`size_types`テーブルに追加することで対応可能

---

### 6. events（イベント）

ウィジェットからのイベントを記録。

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'cube_view',
      'cube_click',
      'widget_open',
      'size_change',
      'height_change',
      'add_to_cart_click'
    )
  ),
  meta JSONB DEFAULT '{}', -- イベント固有のメタデータ
  session_id TEXT, -- セッション識別子（オプション）
  user_agent TEXT, -- ユーザーエージェント（オプション）
  ip_address INET, -- IPアドレス（オプション、GDPR対応）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_shop_id ON events(shop_id);
CREATE INDEX idx_events_product_id ON events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_shop_id_created_at ON events(shop_id, created_at);
```

**カラム説明:**
- `id`: イベントの一意識別子
- `shop_id`: イベントが発生したショップ
- `product_id`: 関連する商品（オプション）
- `type`: イベントタイプ
  - `cube_view`: キューブが表示された
  - `cube_click`: キューブがクリックされた
  - `widget_open`: ウィジェットが開かれた
  - `size_change`: サイズが変更された
  - `height_change`: 身長が変更された
  - `add_to_cart_click`: カート追加ボタンがクリックされた
- `meta`: イベント固有のメタデータ（JSONB）
  - 例: `{"size": "M", "height": 170, "previousSize": "S"}`
- `session_id`: セッション識別子（オプション）
- `user_agent`: ユーザーエージェント（オプション）
- `ip_address`: IPアドレス（オプション、GDPR対応のため必要に応じて）

---

### 7. widget_configs（ウィジェット設定）

ショップごとのウィジェット設定を管理（オプション）。

```sql
CREATE TABLE widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}', -- ウィジェット設定
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id)
);

CREATE INDEX idx_widget_configs_shop_id ON widget_configs(shop_id);
```

**カラム説明:**
- `id`: 設定の一意識別子
- `shop_id`: ショップ（1ショップ1設定）
- `config`: ウィジェット設定（JSONB）
  - 例: `{"theme": "light", "defaultHeight": 170, "enabled": true}`

---

## Edge Functionsとの切り分け

### Next.js API Routes（管理画面用）

**用途**: 認証が必要な管理画面のCRUD操作

**エンドポイント:**
- `GET /api/products` - 商品一覧取得
- `GET /api/products/:id` - 商品詳細取得
- `POST /api/products` - 商品作成
- `PATCH /api/products/:id` - 商品更新
- `DELETE /api/products/:id` - 商品削除
- `POST /api/assets` - アセットアップロード・登録
- `GET /api/assets` - アセット一覧取得
- `PATCH /api/assets/:id` - アセット更新
- `DELETE /api/assets/:id` - アセット削除

**認証:**
- Supabase Auth JWTトークンを使用
- Service Role KeyでSupabaseにアクセス（RLSをバイパス）

**実装場所:**
- `apps/console/src/app/api/`

---

### Edge Functions（ウィジェット用）

**用途**: パブリックなウィジェット用API

**エンドポイント:**
- `GET /widget-config` - ウィジェット設定取得
- `POST /events` - イベント送信

**認証:**
- 不要（公開API）
- Anon KeyでSupabaseにアクセス
- RLSでshop_idベースのアクセス制御

**実装場所:**
- `supabase/functions/`（将来実装）

**現在の実装:**
- 一時的にNext.js API Routesで実装（`/api/public/widget-config`, `/api/events`）
- 将来的にEdge Functionsに移行予定

---

## Row Level Security (RLS)

### ポリシー設計

#### 1. shopsテーブル

```sql
-- ユーザーは自分のショップのみ閲覧可能
CREATE POLICY "Users can view their own shop"
  ON shops FOR SELECT
  USING (
    id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

-- オーナー・管理者のみ更新可能
CREATE POLICY "Owners and admins can update their shop"
  ON shops FOR UPDATE
  USING (
    id IN (
      SELECT shop_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

#### 2. usersテーブル

```sql
-- ユーザーは自分のショップのメンバーのみ閲覧可能
CREATE POLICY "Users can view members of their shop"
  ON users FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

-- オーナー・管理者のみ更新可能
CREATE POLICY "Owners and admins can update members"
  ON users FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

#### 3. productsテーブル

```sql
-- ユーザーは自分のショップの商品のみ閲覧可能
CREATE POLICY "Users can view products of their shop"
  ON products FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

-- ユーザーは自分のショップの商品を作成可能
CREATE POLICY "Users can create products in their shop"
  ON products FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

-- ユーザーは自分のショップの商品を更新可能
CREATE POLICY "Users can update products of their shop"
  ON products FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

-- ユーザーは自分のショップの商品を削除可能
CREATE POLICY "Users can delete products of their shop"
  ON products FOR DELETE
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );
```

#### 4. assetsテーブル

```sql
-- ユーザーは自分のショップの商品のアセットのみ閲覧可能
CREATE POLICY "Users can view assets of their shop's products"
  ON assets FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (
        SELECT shop_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ユーザーは自分のショップの商品のアセットを作成可能
CREATE POLICY "Users can create assets for their shop's products"
  ON assets FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (
        SELECT shop_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ユーザーは自分のショップの商品のアセットを更新可能
CREATE POLICY "Users can update assets of their shop's products"
  ON assets FOR UPDATE
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (
        SELECT shop_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ユーザーは自分のショップの商品のアセットを削除可能
CREATE POLICY "Users can delete assets of their shop's products"
  ON assets FOR DELETE
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (
        SELECT shop_id FROM users WHERE id = auth.uid()
      )
    )
  );
```

#### 5. eventsテーブル

```sql
-- パブリック: 誰でもイベントを作成可能（ウィジェット用）
CREATE POLICY "Anyone can insert events"
  ON events FOR INSERT
  WITH CHECK (true);

-- ユーザーは自分のショップのイベントのみ閲覧可能
CREATE POLICY "Users can view events of their shop"
  ON events FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );
```

#### 6. widget_configsテーブル

```sql
-- パブリック: 誰でも設定を閲覧可能（ウィジェット用）
CREATE POLICY "Anyone can view widget configs"
  ON widget_configs FOR SELECT
  USING (true);

-- ユーザーは自分のショップの設定を更新可能
CREATE POLICY "Users can update widget configs of their shop"
  ON widget_configs FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## インデックス設計

### 既存インデックス

各テーブルの定義に含まれています。以下に主要なインデックスをまとめます。

#### パフォーマンス最適化のための追加インデックス

```sql
-- 複合インデックス（よく使われるクエリパターン）
CREATE INDEX idx_products_shop_id_status ON products(shop_id, status);
CREATE INDEX idx_assets_product_id_size_active ON assets(product_id, size, is_active) WHERE is_active = true;
CREATE INDEX idx_events_shop_id_type_created_at ON events(shop_id, type, created_at DESC);

-- 部分インデックス（NULL値を除外）
CREATE INDEX idx_products_sku_not_null ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_handle_not_null ON products(handle) WHERE handle IS NOT NULL;
```

---

## マイグレーション戦略

### 既存スキーマからの移行

現在のスキーマ（`20260125231216_initial_schema.sql`）から新しいスキーマへの移行手順。

#### ステップ1: 新規テーブル作成

```sql
-- shops, users, size_types, widget_configs テーブルを作成
```

#### ステップ2: データ移行

```sql
-- 既存のproductsテーブルのshop_idをTEXTからUUIDに変換
-- 既存のassetsテーブルのsizeを柔軟な形式に対応
```

#### ステップ3: 外部キー制約追加

```sql
-- products.shop_id → shops.id
-- products.size_type_id → size_types.id
-- assets.product_id → products.id（既存）
-- events.shop_id → shops.id
```

#### ステップ4: RLS有効化

```sql
-- 各テーブルでRLSを有効化
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_configs ENABLE ROW LEVEL SECURITY;

-- ポリシーを追加
```

---

## 実装チェックリスト

### データベース

- [ ] shopsテーブル作成
- [ ] usersテーブル作成（auth.usersとの連携）
- [ ] size_typesテーブル作成（初期データ投入）
- [ ] productsテーブル更新（size_type_id追加、shop_idをUUIDに変更）
- [ ] assetsテーブル更新（sizeを柔軟な形式に対応）
- [ ] eventsテーブル更新（shop_idをUUIDに変更）
- [ ] widget_configsテーブル作成
- [ ] インデックス作成
- [ ] RLS有効化
- [ ] RLSポリシー作成

### 認証

- [ ] Supabase Auth設定
- [ ] ログイン機能実装
- [ ] ユーザー登録機能実装
- [ ] JWTトークン検証実装
- [ ] shop_id取得ロジック実装

### API

- [ ] Next.js API Routes更新（認証対応）
- [ ] Edge Functions実装（将来）
- [ ] エラーハンドリング実装

---

## 補足事項

### サイズタイプの初期データ

```sql
-- 初期データ投入
INSERT INTO size_types (name, display_name, sizes) VALUES
  ('letter', 'レターサイズ', '["S", "M", "L", "XL", "XXL"]'::jsonb),
  ('number', '数字サイズ', '["1", "2", "3", "4", "5"]'::jsonb),
  ('waist', 'ウエストサイズ', '["28", "30", "32", "34", "36", "38"]'::jsonb);
```

### セキュリティ考慮事項

1. **API Keyの暗号化**: `shops.api_key`は暗号化して保存（Supabase Vault使用推奨）
2. **IPアドレス**: `events.ip_address`はGDPR対応のため、必要に応じて匿名化
3. **RLS**: すべてのテーブルでRLSを有効化し、適切なポリシーを設定

### パフォーマンス考慮事項

1. **インデックス**: よく使われるクエリパターンに合わせてインデックスを最適化
2. **パーティショニング**: `events`テーブルは将来的に日付ベースでパーティショニングを検討
3. **アーカイブ**: 古いイベントデータは別テーブルにアーカイブ

---

## 更新履歴

- 2025-01-26: 初版作成
