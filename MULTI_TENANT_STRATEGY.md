# マルチテナント戦略

## 📋 概要

Atelierは複数の会社（テナント）にSaaSとして提供されるため、各テナントのデータを完全に分離する必要があります。

## 🏗️ アーキテクチャ

### 1. データ分離戦略

#### 設計原則
- **全テーブルにshop_id**: スケールしても破綻しにくく、インデックス戦略も立てやすい
- **子テーブルにもshop_idを冗長に保持**: RLSの簡素化、クエリ性能向上、事故防止
- **RLSで最終防衛線**: APIのミスをDB側で止められる

#### テーブル構造（改善版）
```sql
-- すべてのテーブルにshop_idが含まれる（子テーブルも含む）
-- 重要: shop_idはUUID型を使用（FK・複合FK・インデックス・型安全性が向上）
shops (id UUID, name, domain, ...)
users (id UUID REFERENCES auth.users(id), shop_id UUID REFERENCES shops(id), ...)
products (id UUID, shop_id UUID, ...)
assets (id UUID, shop_id UUID, product_id UUID, ...)  -- shop_idを冗長に保持
events (id UUID, shop_id UUID, product_id UUID, ...)
conversations (id UUID, shop_id UUID, product_id UUID, ...)
messages (id UUID, shop_id UUID, conversation_id UUID, ...)  -- shop_idを冗長に保持
widget_keys (id UUID, shop_id UUID, public_key TEXT, secret_key_hash TEXT, domain TEXT[], ...)
```

#### ⚠️ 重要な設計原則

**1. users.id は auth.users.id と同じUUID**
```sql
-- users.id を auth.users.id と同一UUIDにする（RLSの前提）
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id),
  role TEXT NOT NULL DEFAULT 'member',
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
- RLSで`auth.uid()`を使用するため、`users.id = auth.users.id`である必要がある
- これにより`WHERE id = auth.uid()`が正しく動作する
- **重要**: コード内では常に`public.users`を明示的に参照する（`auth.users`と混同しない）

**2. shop_id は UUID型を使用**
- TEXT型ではなくUUID型にすることで：
  - 外部キー制約が正しく機能
  - 複合FKが使える
  - インデックス性能が向上
  - アプリ側の型安全性が向上

#### なぜ子テーブルにもshop_idを持つのか？

**問題点（shop_idを持たない場合）**:
- RLSで毎回JOIN/EXISTSが必要 → パフォーマンス低下
- インデックスが効きづらい
- バグると「別テナントのデータ参照」が起きる

**解決策（shop_idを冗長に持つ）**:
- RLSがシンプルになる（`shop_id = current_shop_id()`のみ）
- インデックスが効きやすい（`(shop_id, created_at)`など）
- 整合性はDB制約で保証（複合FK/トリガー）

### 2. 認証・認可

#### ⚠️ 重要な注意: usersテーブル名の扱い

**注意**: Supabaseは`auth.users`が別に存在する。アプリ側に`public.users`を作ると混同が起きやすい。

**方針**: `users`テーブルを使用（`profiles`への変更は行わない）
- `auth.users` → Supabase Authのユーザー情報
- `public.users` → アプリケーション固有のプロフィール情報（shop_id含む）
- **重要**: コード内では常に`public.users`を明示的に参照する癖をつける

#### ユーザー認証フロー
1. ユーザーがSupabase Authでログイン
2. `users`テーブルから`shop_id`を取得（`users.id = auth.uid()`で直接取得）
   - **重要**: `users.id`は`auth.users.id`と同じUUIDなので、JOIN不要
   - **注意**: `public.users`を明示的に参照する（`auth.users`と混同しない）
3. すべてのAPIリクエストで`shop_id`を検証
4. RLSポリシーで自動的にデータをフィルタリング（`current_shop_id()`関数を使用）

#### shop_idの取得元ルール（統一必須）

**ルール**: 「どこから取るか」を統一し、例外を作らない

| エンドポイント種別 | shop_idの取得元 | 検証方法 |
|------------------|----------------|---------|
| 認証あり | JWT → `users.shop_id` | `getAuthenticatedUser()`で取得 |
| 公開API | `public_key` → `widget_keys.shop_id` | APIキーから解決 |
| **禁止** | クエリパラメータの`shopId`をそのまま信用 | ❌ 絶対にしない |

#### APIエンドポイント

**認証が必要なエンドポイント**: `/api/products`, `/api/assets`, `/api/analytics`など
- `getAuthenticatedUser()`で認証チェック
- JWTから`shop_id`を取得（`users`テーブル経由）
- クエリパラメータの`shopId`は無視（認証情報の`shop_id`を使用）

**公開エンドポイント**: `/api/public/widget-config`, `/api/events`, `/api/chat`
- `public_key`から`shop_id`を解決（`widget_keys`テーブル）
- ドメイン検証（Origin/Refererが登録ドメインと一致するか）
- データベースで`shop_id`でフィルタリング

### 3. Widgetの初期化（セキュアな設計）

#### ⚠️ 現在の実装の問題点

**問題**: 公開APIで`shopId`をパラメータで受け取る設計
- shopIdを推測・収集されるリスク
- そのshopの公開情報が全部抜ける可能性
- イベント/会話のような「公開したくないが認証もできない」領域が危ない

#### 推奨設計: APIキー（public_key）ベース

**埋め込み例**:
```html
<div
  data-atelier-pubkey="pub_live_xxx"
  data-atelier-product-id="product_456">
</div>
```

**サーバー側の処理**:
1. `public_key`から`shop_id`を解決（`widget_keys`テーブル）
2. `product_id`がその`shop_id`に属するか検証
3. ドメイン検証（Origin/Refererが登録ドメインと一致するか）
4. すべてOKなら設定を返す

**メリット**:
- ✅ shop_idを外に出さない（推測されにくい）
- ✅ ローテーション可能（public_keyを変更すれば即座に無効化）
- ✅ ドメイン検証で簡易な漏洩対策（完全ではないが実務では効果的）

**widget_keysテーブル**:
```sql
CREATE TABLE widget_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL UNIQUE,  -- pub_live_xxx形式（クライアントに埋め込む）
  secret_key_hash TEXT NOT NULL,  -- secret_keyのハッシュ（bcrypt/argon2、平文保存しない）
  domain TEXT[] NOT NULL DEFAULT '{}',  -- 許可するドメインの配列（JSONBよりtext[]推奨）
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widget_keys_public_key ON widget_keys(public_key) WHERE enabled = true;
CREATE INDEX idx_widget_keys_shop_id ON widget_keys(shop_id);
-- secret_key_hashは検索に使うためインデックスは不要（ハッシュ照合はアプリ側で）
```

**2キー構成の理由**:
- **public_key**: Widgetに埋め込む（漏洩前提で設計）
  - ドメイン制限
  - レート制限
  - 返すデータを最小化（設定・公開前提の情報のみ）
- **secret_key**: 管理画面/バッチ/管理API専用（絶対にクライアントに出さない）
  - 商品作成・編集
  - アセット管理
  - アナリティクス取得
  - **重要**: secret_keyはハッシュ化して保存（`secret_key_hash`）
  - 照合は「受け取ったキーをハッシュ照合」方式

**ドメイン検証の実装（厳密比較）**:
```typescript
// ⚠️ includes()は危険: evil.com?allowed=your.com のようなケースで引っかかる
// URLとしてパースしてhostを厳密比較する

const origin = request.headers.get('origin') || request.headers.get('referer');
const allowedDomains = widgetKey.domain as string[]; // text[]配列

// ⚠️ 重要: ドメイン検証は「防御強化」であって「認証」ではない
// - Origin/Refererは無いこともある
// - 偽装も理論上できる
// - だから公開APIは返す情報を最小化（ここ超大事）
// 「公開キー + ドメイン検証 + レート制限 + 最小レスポンス」のセット運用が現実解

if (allowedDomains.length > 0 && origin) {
  try {
    const url = new URL(origin);
    const host = url.host; // 例: "shop.example.com"
    
    // 完全一致またはサブドメイン許可（endsWith使用）
    const isAllowed = allowedDomains.some(domain => {
      // 完全一致
      if (host === domain) return true;
      
      // サブドメイン許可（例: shop.example.com が example.com を許可）
      if (host.endsWith('.' + domain)) return true;
      
      // 開発環境用（localhost等）
      if (domain === 'localhost' && (host.includes('localhost') || host.includes('127.0.0.1'))) {
        return true;
      }
      
      return false;
    });
    
    if (!isAllowed) {
      console.warn(`[Widget Config] Domain not allowed: ${host} for key ${publicKey}`);
      return NextResponse.json(
        { enabled: false },
        { status: 200, headers: getCorsHeaders() }
      );
    }
  } catch (error) {
    // URLパースエラー（無効なorigin）
    console.warn(`[Widget Config] Invalid origin: ${origin}`);
    return NextResponse.json(
      { enabled: false },
      { status: 200, headers: getCorsHeaders() }
    );
  }
}
```

### 4. データベース制約（整合性の強制）

#### A) 複合FKで「同一shop内」を強制

**例: assetsテーブル**
```sql
-- products: (shop_id, id) にユニーク制約
ALTER TABLE products 
  ADD CONSTRAINT products_shop_id_id_unique 
  UNIQUE (shop_id, id);

-- assets: (shop_id, product_id) が products に存在することを強制
ALTER TABLE assets
  ADD CONSTRAINT assets_product_same_shop
  FOREIGN KEY (shop_id, product_id)
  REFERENCES products (shop_id, id);

-- 同様にmessagesも
ALTER TABLE messages
  ADD CONSTRAINT messages_conversation_same_shop
  FOREIGN KEY (shop_id, conversation_id)
  REFERENCES conversations (shop_id, id);
```

**効果**: 異なるshopのproduct_idを参照しようとするとDBエラーで防げる

#### B) 典型インデックス戦略

**原則**: tenant/shop_idを必ず先頭に

```sql
-- 時系列クエリ
CREATE INDEX idx_events_shop_created ON events(shop_id, created_at DESC);
CREATE INDEX idx_conversations_shop_started ON conversations(shop_id, started_at DESC);

-- 一意系
CREATE INDEX idx_products_shop_handle ON products(shop_id, handle) WHERE handle IS NOT NULL;
CREATE INDEX idx_products_shop_sku ON products(shop_id, sku) WHERE sku IS NOT NULL;

-- 検索系
CREATE INDEX idx_products_shop_name ON products(shop_id, name);
```

**効果**: shop_idで先に絞り込むため、クエリ性能が大幅に向上

#### C) トリガーについて

**原則**: 複合FK制約があれば、整合性担保のトリガーは基本不要

- 複合FK制約（`assets(shop_id, product_id) -> products(shop_id, id)`）があれば、DBが自動的に整合性を保証
- トリガーは増えるほど「予期せぬ遅延」「デバッグ困難」を招く
- まずは制約で完結させる

**トリガーを残す場合**:
- 制約で表現できないルールのみ（例：`enabled=false`のとき参照禁止など）
- ビジネスロジック的な検証が必要な場合のみ

**例: enabledチェックが必要な場合のみ**:
```sql
-- 例: 無効なshopの商品を参照できないようにする（制約では表現できない）
CREATE OR REPLACE FUNCTION ensure_shop_enabled()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM shops 
    WHERE id = NEW.shop_id 
    AND enabled = true  -- 制約では表現できない
  ) THEN
    RAISE EXCEPTION 'Shop is not enabled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 🚀 実装計画

### Phase 1: データベース接続と基本構造の改善（即座に実施）

1. **テーブル構造の改善**
   - `users`テーブルを使用（`profiles`への変更は行わない）
   - 子テーブル（assets, messages）に`shop_id`を追加
   - 複合FK制約の追加

2. **テスト用shopの作成**
   - データベースに実際のshopレコードを作成
   - テスト用の商品・アセットデータを投入

3. **デモページの更新**
   - `default_shop` → 実際のshop_idに変更
   - データベースから取得した商品データを使用

### Phase 2: セキュリティ強化（優先度高）

1. **widget_keysテーブルの作成**
   - APIキー管理用テーブル
   - public_keyからshop_idを解決する機能

2. **公開APIの改善**
   - `shopId`パラメータを廃止
   - `public_key`ベースの認証に変更
   - ドメイン検証の実装

3. **shop_id取得ルールの統一**
   - 認証あり: JWT → `users.shop_id`
   - 公開API: `public_key` → `widget_keys.shop_id`
   - クエリパラメータの`shopId`を信用しない

### Phase 3: パフォーマンス最適化

1. **インデックスの最適化**
   - shop_idを先頭にした複合インデックス
   - 時系列クエリ用のインデックス

2. **RLSポリシーの最適化**
   - シンプルなポリシー（shop_id比較のみ）
   - JOIN不要な設計

### Phase 4: 本番環境対応

1. **レート制限**
   - shopごとにレート制限を設定
   - 過剰なリクエストを防止

2. **監査ログ**
   - すべてのデータアクセスをログに記録
   - 問題発生時の追跡が可能

3. **APIキーのローテーション機能**
   - キーの無効化・再発行
   - 段階的な移行サポート

## 📝 実装詳細

### 1. テーブル構造の改善マイグレーション

```sql
-- ============================================
-- Phase 1: usersテーブルの確認
-- ============================================

-- usersテーブルが正しく設定されていることを確認
-- 注意: usersテーブルはそのまま使用（profilesへの変更は行わない）

-- users.id を auth.users.id と同一UUIDにする（既存データがある場合は注意）
-- 既存のusers.idがauth.users.idと一致していることを確認してから実行
-- 新規作成時は、auth.users.idをそのまま使用する

-- ============================================
-- Phase 2: shop_id を UUID に変更
-- ============================================

-- shopsテーブルのidがUUIDであることを確認（既にUUIDの場合はスキップ）
-- 注意: 既存データがある場合は、移行スクリプトが必要

-- productsテーブルのshop_idをUUIDに変更
-- ⚠️ 注意: 既存データがある場合の移行は要注意
-- 既存のshop_idの中身次第で壊れやすい（nameで紐づけは危険）

-- 移行手順（安全な方法）:
-- 1. 旧shop_id→新UUIDの対応表を作成（確実に置換するため）
CREATE TEMP TABLE shop_id_mapping (
  old_shop_id TEXT PRIMARY KEY,
  new_shop_id UUID NOT NULL
);

-- 2. 対応表を作成（既存データの確認が必要）
INSERT INTO shop_id_mapping (old_shop_id, new_shop_id)
SELECT DISTINCT 
  p.shop_id as old_shop_id,
  s.id as new_shop_id
FROM products p
INNER JOIN shops s ON (
  p.shop_id = s.id::text OR  -- UUIDをTEXTに変換したもの
  p.shop_id = s.name         -- 名前で紐づけ（注意: 重複があると危険）
)
WHERE p.shop_id IS NOT NULL;

-- 3. shop_id_uuidカラムを追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id_uuid UUID;

-- 4. 対応表を使って確実に置換
UPDATE products p
SET shop_id_uuid = m.new_shop_id
FROM shop_id_mapping m
WHERE p.shop_id = m.old_shop_id;

-- 5. データ整合性を確認（shop_id_uuidがNULLでないことを確認）
-- SELECT COUNT(*) FROM products WHERE shop_id_uuid IS NULL;
-- もしNULLがあれば、対応表を見直す

-- 6. 旧カラムを削除して新カラムに置き換え
ALTER TABLE products DROP COLUMN shop_id;
ALTER TABLE products RENAME COLUMN shop_id_uuid TO shop_id;
ALTER TABLE products ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE products ADD CONSTRAINT fk_products_shop_id 
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

-- 同様に他のテーブルも変更（events, conversations等）

-- ============================================
-- Phase 3: 子テーブルにshop_idを追加
-- ============================================

-- assetsテーブルにshop_idを追加（UUID型）
ALTER TABLE assets ADD COLUMN IF NOT EXISTS shop_id UUID;

-- 既存データのshop_idを設定（product経由）
UPDATE assets a
SET shop_id = p.shop_id
FROM products p
WHERE a.product_id = p.id;

-- shop_idをNOT NULLに
ALTER TABLE assets ALTER COLUMN shop_id SET NOT NULL;

-- messagesテーブルにshop_idを追加（UUID型）
ALTER TABLE messages ADD COLUMN IF NOT EXISTS shop_id UUID;

-- 既存データのshop_idを設定（conversation経由）
UPDATE messages m
SET shop_id = c.shop_id
FROM conversations c
WHERE m.conversation_id = c.id;

-- shop_idをNOT NULLに
ALTER TABLE messages ALTER COLUMN shop_id SET NOT NULL;

-- ============================================
-- Phase 4: 複合FK制約の追加
-- ============================================

-- products: (shop_id, id) にユニーク制約
ALTER TABLE products 
  ADD CONSTRAINT products_shop_id_id_unique 
  UNIQUE (shop_id, id);

-- assets: (shop_id, product_id) が products に存在することを強制
ALTER TABLE assets
  ADD CONSTRAINT assets_product_same_shop
  FOREIGN KEY (shop_id, product_id)
  REFERENCES products (shop_id, id);

-- conversations: (shop_id, id) にユニーク制約
ALTER TABLE conversations
  ADD CONSTRAINT conversations_shop_id_id_unique
  UNIQUE (shop_id, id);

-- messages: (shop_id, conversation_id) が conversations に存在することを強制
ALTER TABLE messages
  ADD CONSTRAINT messages_conversation_same_shop
  FOREIGN KEY (shop_id, conversation_id)
  REFERENCES conversations (shop_id, id);
```

### 2. widget_keysテーブルの作成（2キー構成 + セキュアな実装）

```sql
CREATE TABLE widget_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL UNIQUE,  -- pub_live_xxx形式（クライアントに埋め込む、漏洩前提でOK）
  secret_key_hash TEXT NOT NULL,  -- secret_keyのハッシュ（bcrypt/argon2、平文保存しない）
  domain TEXT[] NOT NULL DEFAULT '{}',  -- 許可するドメインの配列（JSONBよりtext[]推奨）
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- secret_key_hash + shop_id でユニーク制約（同じハッシュでもshopが違えばOK）
  CONSTRAINT widget_keys_secret_hash_shop_unique UNIQUE (secret_key_hash, shop_id)
);

CREATE INDEX idx_widget_keys_public_key ON widget_keys(public_key) WHERE enabled = true;
CREATE INDEX idx_widget_keys_shop_id ON widget_keys(shop_id);

-- 更新トリガー
CREATE TRIGGER update_widget_keys_updated_at BEFORE UPDATE ON widget_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**2キー構成の使い分け**:
- **public_key**: Widgetに埋め込む（漏洩前提）
  - `/api/public/widget-config` - 設定取得
  - `/api/events` - イベント送信
  - `/api/chat` - チャット機能
- **secret_key**: 管理画面/バッチ/管理API専用（絶対にクライアントに出さない）
  - `/api/products` - 商品管理
  - `/api/assets` - アセット管理
  - `/api/analytics` - アナリティクス取得
  - **重要**: secret_keyはハッシュ化して保存（`secret_key_hash`）

**secret_keyの照合方法（アプリ側）**:
```typescript
import bcrypt from 'bcrypt';

// secret_keyの照合
async function verifySecretKey(secretKey: string, secretKeyHash: string): Promise<boolean> {
  return await bcrypt.compare(secretKey, secretKeyHash);
}

// secret_keyの保存（新規作成時）
async function hashSecretKey(secretKey: string): Promise<string> {
  return await bcrypt.hash(secretKey, 10);
}
```

### 3. widget-config APIの改善（public_keyベース + 厳密なドメイン検証）

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const publicKey = searchParams.get("publicKey");
  const productId = searchParams.get("productId");
  // ... 他の識別子

  if (!publicKey) {
    return NextResponse.json(
      { error: "publicKey is required" },
      { status: 400, headers: getCorsHeaders() }
    );
  }

  // public_keyからshop_idを解決
  const { data: widgetKey } = await supabaseAdmin
    .from("widget_keys")
    .select("shop_id, domain, enabled")
    .eq("public_key", publicKey)
    .eq("enabled", true)
    .single();

  if (!widgetKey) {
    return NextResponse.json(
      { enabled: false },
      { status: 200, headers: getCorsHeaders() }
    );
  }

  // ドメイン検証（厳密比較）
  const origin = request.headers.get("origin") || request.headers.get("referer");
  const allowedDomains = widgetKey.domain as string[];
  
  if (allowedDomains.length > 0 && origin) {
    try {
      const url = new URL(origin);
      const host = url.host; // 例: "shop.example.com"
      
      // 完全一致またはサブドメイン許可
      const isAllowed = allowedDomains.some(domain => {
        // 完全一致
        if (host === domain) return true;
        
        // サブドメイン許可（例: shop.example.com が example.com を許可）
        if (host.endsWith('.' + domain)) return true;
        
        // 開発環境用（localhost等）
        if (domain === 'localhost' && (host.includes('localhost') || host.includes('127.0.0.1'))) {
          return true;
        }
        
        return false;
      });
      
      if (!isAllowed) {
        console.warn(`[Widget Config] Domain not allowed: ${host} for key ${publicKey}`);
        return NextResponse.json(
          { enabled: false },
          { status: 200, headers: getCorsHeaders() }
        );
      }
    } catch (error) {
      // URLパースエラー（無効なorigin）
      console.warn(`[Widget Config] Invalid origin: ${origin}`);
      return NextResponse.json(
        { enabled: false },
        { status: 200, headers: getCorsHeaders() }
      );
    }
  }

  const shopId = widgetKey.shop_id;

  // 以下、既存の商品検索ロジック（shop_idを使用）
  // ...
}
```

### 4. RLSポリシーの改善（関数化で高速化・簡潔化）

**RLS関数の作成（安全な実装）**:
```sql
-- current_shop_id()関数を作成（パターン化して運用を楽にする）
-- ⚠️ SECURITY DEFINER は使わない（危険になりうる）
-- SECURITY DEFINER を使うと、関数の実行者権限ではなく作成者権限でテーブルが読めてしまう
-- 設計を誤るとデータ露出の踏み台になる可能性がある
CREATE OR REPLACE FUNCTION current_shop_id()
RETURNS UUID
LANGUAGE SQL
STABLE
-- SECURITY INVOKER がデフォルト（明示的に書かなくてもOK）
AS $$
  SELECT shop_id FROM public.users WHERE id = auth.uid()
$$;

-- インデックスを追加（関数の性能向上）
CREATE INDEX idx_users_id_shop_id ON users(id, shop_id);
```

**なぜSECURITY DEFINERを使わないのか？**
- SECURITY DEFINERを使うと、関数の実行者権限ではなく作成者権限でテーブルが読めてしまう
- 設計を誤るとデータ露出の踏み台になる可能性がある
- RLS用の関数は通常、SECURITY INVOKER（デフォルト）でOK

**どうしてもSECURITY DEFINERが必要な場合**:
```sql
-- search_pathを固定してSQLインジェクション的な事故を避ける
CREATE OR REPLACE FUNCTION current_shop_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM users WHERE id = auth.uid()
$$;
```

**RLSポリシーの実装（関数使用）**:
```sql
-- assetsテーブルのRLS（shop_id比較のみ、JOIN不要）
CREATE POLICY "Users can only access assets from their shop"
ON assets FOR ALL
USING (shop_id = current_shop_id());

-- messagesテーブルのRLS（同様にシンプル）
CREATE POLICY "Users can only access messages from their shop"
ON messages FOR ALL
USING (shop_id = current_shop_id());

-- productsテーブルのRLS
CREATE POLICY "Users can only access products from their shop"
ON products FOR ALL
USING (shop_id = current_shop_id());

-- conversationsテーブルのRLS
CREATE POLICY "Users can only access conversations from their shop"
ON conversations FOR ALL
USING (shop_id = current_shop_id());

-- eventsテーブルのRLS
CREATE POLICY "Users can only access events from their shop"
ON events FOR ALL
USING (shop_id = current_shop_id());
```

**メリット**:
- ✅ パターン化されて運用が楽
- ✅ 関数がキャッシュされるため高速
- ✅ ポリシーが簡潔で読みやすい
- ✅ 変更が必要な場合、関数を修正するだけ

## 🔒 セキュリティ考慮事項

### 1. データ分離（多層防御）

**レイヤー1: アプリケーション層**
- APIレベルでshop_idを検証
- クエリパラメータのshopIdを信用しない
- 認証情報またはpublic_keyからshop_idを取得

**レイヤー2: データベース層（最終防衛線）**
- RLSポリシーで自動的にデータを分離
- 複合FK制約で整合性を強制
- トリガーで追加の検証

### 2. 認証・認可

**管理画面**:
- Supabase Authで認証
- `users`テーブルから`shop_id`を取得
- JWTに含まれる`shop_id`を使用

**Widget（公開API）**:
- `public_key`ベースの認証
- ドメイン検証（Origin/Refererチェック）
- shop_idを外部に露出しない

### 3. APIキーの管理

**キーの形式**:
- `pub_live_xxx`（本番環境）
- `pub_test_xxx`（テスト環境）
- プレフィックスで環境を識別

**ローテーション**:
- 新しいキーを発行
- 旧キーを無効化（`enabled = false`）
- 段階的な移行をサポート

### 4. レート制限

- shopごとにレート制限を設定
- public_keyごとにレート制限を設定
- DDoS攻撃を防止

### 5. 監査ログ

- すべてのデータアクセスをログに記録
- shop_id、public_key、IPアドレスを記録
- 問題発生時の追跡が可能

## 📚 参考資料

- [Supabase Multi-tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)

## ✅ 改善チェックリスト

### 必須改善項目（本番レベルに必須）

- [ ] **`users.id`を`auth.users.id`と同一UUIDにする**（RLSの前提）
  - **重要**: コード内では常に`public.users`を明示的に参照する（`auth.users`と混同しない）
- [ ] **`shop_id`をTEXTからUUIDに変更**（FK・複合FK・インデックス・型安全性）
- [ ] 子テーブル（assets, messages）に`shop_id`を追加（UUID型）
- [ ] 複合FK制約の追加
- [ ] `widget_keys`テーブルの作成（2キー構成: public_key + secret_key_hash）
  - `public_key`: 平文保存OK（漏洩前提）
  - `secret_key_hash`: ハッシュ化して保存（平文保存しない）
- [ ] 公開APIを`public_key`ベースに変更
- [ ] **ドメイン検証を`includes()`ではなく`URL().host`で厳密比較**
- [ ] shop_id取得ルールの統一（クエリパラメータを信用しない）
- [ ] インデックスの最適化（shop_idを先頭に）
- [ ] **RLSポリシーを`current_shop_id()`関数で実装**（高速化・簡潔化）
  - 関数がキャッシュされるため高速
  - ポリシーが簡潔で読みやすい
  - ⚠️ **SECURITY DEFINERを外す**（SECURITY INVOKERがデフォルト、危険になりうる）
  - `public.users`とスキーマ固定する癖が安全（`auth.users`と混同しない）
- [ ] トリガーは最小限に（複合FKで整合性が保証されるため基本不要）

### 推奨改善項目

- [ ] `domain`をJSONBから`text[]`に変更（型が明確、扱いやすい、好みでOK）
- [ ] レート制限の実装（shopごと、public_keyごと）
- [ ] 監査ログの実装
- [ ] APIキーのローテーション機能

## 🎯 まとめ：本番レベルに必須の改善点

この戦略は方向性が良いが、以下の改善点を実装すれば本番レベルになる：

### 優先度1: セキュリティ（即座に実施）

#### 1. current_shop_id() の SECURITY DEFINER を外す

```sql
-- ❌ 危険
CREATE FUNCTION current_shop_id() ... SECURITY DEFINER

-- ✅ 安全
CREATE FUNCTION current_shop_id()
RETURNS UUID
LANGUAGE SQL
STABLE
-- SECURITY INVOKER がデフォルト（明示的に書かなくてもOK）
AS $$
  SELECT shop_id FROM public.users WHERE id = auth.uid()
$$;
```

**理由**: SECURITY DEFINERを使うと、関数の実行者権限ではなく作成者権限でテーブルが読めてしまう。設計を誤るとデータ露出の踏み台になる。RLS用の関数は通常、SECURITY INVOKER（デフォルト）でOK。

**どうしてもSECURITY DEFINERが必要な場合**:
```sql
-- search_pathを固定してSQLインジェクション的な事故を避ける
CREATE FUNCTION current_shop_id() ... SECURITY DEFINER SET search_path = public
```

#### 2. secret_key を平文保存しない（ハッシュ化）

```sql
-- ❌ 危険
secret_key TEXT NOT NULL UNIQUE

-- ✅ 安全
secret_key_hash TEXT NOT NULL  -- bcrypt/argon2でハッシュ化
```

**理由**: DBに平文で保存すると、漏洩時に即死する。「public_keyは漏洩前提でOK」「secret_keyは漏洩させない」がコンセプトなら、秘密鍵だけはハッシュ保存が本番の定番。

**照合方法**:
```typescript
// secret_keyの照合（アプリ側）
import bcrypt from 'bcrypt';

async function verifySecretKey(secretKey: string, secretKeyHash: string): Promise<boolean> {
  return await bcrypt.compare(secretKey, secretKeyHash);
}

// 検索は secret_key_hash になるので "unique" は工夫が必要
// 例: (secret_key_hash, shop_id) でユニーク制約
```

### 優先度2: データベース構造（次に実施）

#### 3. users.id を auth.users.id と同一UUIDにする（RLSの前提）

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id),
  -- ...
);
```

**理由**: RLSで`WHERE id = auth.uid()`を使用するため、`users.id = auth.users.id`である必要がある
**注意**: コード内では常に`public.users`を明示的に参照する（`auth.users`と混同しない）

#### 4. shop_id を UUID 化（FK・複合FK・インデックス・型安全性）

```sql
-- すべてのテーブルでshop_idをUUID型に
products (shop_id UUID REFERENCES shops(id))
assets (shop_id UUID, product_id UUID)
-- ...
```

**理由**: 
- 外部キー制約が正しく機能
- 複合FKが使える
- インデックス性能が向上
- アプリ側の型安全性が向上

**⚠️ 注意**: 移行時は対応表を作成して確実に置換
- `name`で紐づけは危険（重複があると壊れる）
- 既存の`shop_id`の中身次第で壊れやすい
- 現実的には、移行前に旧shop_id→新UUIDの対応表を作成して、確実に置換するのが安全
- マイグレーション例の`WHERE p.shop_id = s.id::text OR p.shop_id = s.name`は注意が必要

### 優先度3: 実装の改善（推奨）

#### 5. domain を text[] にする（JSONBより扱いやすい）

```sql
-- ❌ JSONB
domain JSONB DEFAULT '[]'::jsonb

-- ✅ text[]
domain TEXT[] NOT NULL DEFAULT '{}'
```

**理由**: Postgres的には配列を普通に使った方が扱いやすい。型が明確、アプリ側も`string[]`と一致、クエリやチェックも書きやすい。

#### 6. ドメイン検証は includes() をやめて URL().host で厳密比較

```typescript
// ❌ 危険
origin.includes(domain)  // evil.com?allowed=your.com で引っかかる

// ✅ 安全
const url = new URL(origin);
const host = url.host;
host === domain || host.endsWith('.' + domain)
```

**理由**: `includes()`は`evil.com?allowed=your.com`のような攻撃で引っかかる可能性がある

**⚠️ 重要**: ドメイン検証は「防御強化」であって「認証」ではない
- Origin/Refererは無いこともある（モバイルアプリなど）
- 偽装も理論上できる（HTTPヘッダーは改ざん可能）
- だから公開APIは返す情報を最小化（ここ超大事）
- 「公開キー + ドメイン検証 + レート制限 + 最小レスポンス」のセット運用が現実解
- 完全なセキュリティは不可能だが、実務では「被害を現実的に下げる」効果が大きい

---

この改善点を実装すれば、マルチテナントSaaSとして安全に運用できる基盤が整います。
