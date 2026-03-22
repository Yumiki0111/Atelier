# Supabase スキーマと RLS

## ログイン・認証まわりで必要なテーブル

- **shops** … ショップ。provision 時に 1 件作成。
- **profiles** … 認証ユーザーとショップの対応。`id` = `auth.users.id`。post-login で作成。
- **pending_invites** … 招待未受諾。メール・ショップ・ロール。post-login で profiles に昇格し `accepted_at` を更新。
- **widget_keys** … ショップごとのウィジェット鍵。

API は `SUPABASE_SERVICE_ROLE_KEY` で RLS をバイパスしてアクセスするため、上記テーブルに RLS を有効にしたままでもサーバー側の取得・更新は動作します。

## 手順

1. Supabase Dashboard → SQL Editor を開く。
2. `schema-and-rls.sql` の内容を貼り付けて実行する。
3. 既にテーブルがある場合は `CREATE TABLE IF NOT EXISTS` でスキップされる。カラム不足の場合は手動で `ALTER TABLE` を追加する。

## ログインで「Failed to fetch」が出る場合

1. **Supabase Auth に届いていない**
   - `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` が正しいか（例: `https://xxxx.supabase.co`）。
   - ネットワーク・ファイアウォールで Supabase の URL がブロックされていないか。

2. **「このメールアドレスは招待されていません」と出る**
   - そのメールを **pending_invites** に 1 件追加する必要があります。
   - **開発用**: `seed-invite-owner.sql` を開き、`YOUR_EMAIL@example.com` を自分のメールに書き換え、Supabase SQL Editor で実行する。その後、そのメールでログイン（またはサインアップ）すると入れます。
   - **本番運用**: 管理用プロビジョニング API でショップ作成すると、owner の **pending_invites** が作成されます。

3. **環境変数**
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` … クライアント（ログインなど）。
   - `SUPABASE_SERVICE_ROLE_KEY` … サーバー（profiles / shops 等の読み書き）。未設定だと shop-id API が 500 になる。
