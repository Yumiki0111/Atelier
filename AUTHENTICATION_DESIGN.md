# 認証システムの正しい設計

## 📋 正しい設計の原則

### 1. ユーザー作成フロー

#### ✅ 正しい方法（推奨）

**方法A: サインアップAPIを使用（現在実装済み）**
- `/api/auth/signup` エンドポイントを使用
- Supabase Authでユーザー作成 + `users`テーブルにレコード作成を自動化
- メリット: エラーハンドリングが容易、トランザクション管理が可能

**方法B: Supabaseトリガーを使用（最も確実）**
- `auth.users`にユーザーが作成されたら、自動的に`users`テーブルにレコードを作成
- メリット: Authenticationで直接作成しても自動的に処理される
- 実装: `20260128000001_auto_create_user_trigger.sql` を実行

#### ❌ 避けるべき方法

- Supabase DashboardのAuthenticationから直接ユーザーを作成
  - `users`テーブルにレコードが作成されない
  - 手動でSQLを実行する必要がある

### 2. RLSポリシーの設計

#### ✅ 正しい設計

```sql
-- 1. ユーザーが自分のレコードを読み取れる（循環参照なし）
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 2. 同じshopのメンバーを読み取れる（循環参照なし）
CREATE POLICY "Users can view members of their shop"
  ON users FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );
```

**重要**: 最初のポリシー（自分のレコード）が先に評価されるため、循環参照が発生しません。

#### ❌ 間違った設計

```sql
-- 循環参照が発生する設計
CREATE POLICY "Users can view members of their shop"
  ON users FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()  -- 循環参照！
    )
  );
```

この設計では、`shop_id`を取得するために`users`テーブルを参照する必要があり、同じポリシーを再評価して循環参照が発生します。

### 3. データベース構造

#### ✅ 正しい構造

```
auth.users (Supabase管理)
  ↓
public.users (アプリケーション管理)
  - id: auth.users.id を参照
  - shop_id: shops.id を参照
  - email, name, role など
```

**設計思想**:
- `auth.users`: 認証情報のみ（Supabaseが管理）
- `public.users`: アプリケーション固有の情報（shop_id, roleなど）

## 🚀 実装手順（正しい方法）

### ステップ1: RLSポリシーの修正

```sql
-- apps/console/supabase/migrations/20260128000000_fix_users_rls_policy.sql
-- を実行
```

### ステップ2: 自動トリガーの設定（推奨）

```sql
-- apps/console/supabase/migrations/20260128000001_auto_create_user_trigger.sql
-- を実行
```

これにより、今後は：
- Supabase Authenticationでユーザーを作成 → 自動的に`users`テーブルにレコード作成
- サインアップAPIでユーザーを作成 → 自動的に`users`テーブルにレコード作成

### ステップ3: 既存ユーザーの処理

既にAuthenticationで作成したユーザーは、トリガーの「既存ユーザー処理」部分で自動的に処理されます。

## 📝 まとめ

### 正しい設計のポイント

1. **自動化**: トリガーで自動的に`users`テーブルにレコードを作成
2. **RLSポリシー**: 循環参照を避ける設計
3. **一貫性**: すべてのユーザー作成方法で同じ処理が実行される

### 現在の問題点

1. ❌ 手動でSQLを実行する必要がある
2. ❌ RLSポリシーが循環参照を起こしている
3. ❌ Authenticationで直接作成したユーザーが処理されない

### 解決方法

1. ✅ RLSポリシーのマイグレーションを実行
2. ✅ 自動トリガーを設定
3. ✅ 既存ユーザーを自動処理

これにより、今後はどの方法でユーザーを作成しても、自動的に正しく動作します。
