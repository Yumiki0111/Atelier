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

## CLI でマイグレーションをリモートに適用する

前提: [Supabase CLI](https://supabase.com/docs/guides/cli) をインストールし、`supabase login` 済み。

1. リポジトリルートでリンク（初回のみ）: `supabase link --project-ref <project-ref>`（Dashboard → Project Settings → General の **Reference ID**）。
2. `apps/console/.env.local` に **`SUPABASE_DB_PASSWORD`** を設定する（Dashboard → Project Settings → **Database** → Database password。不明なら Reset）。
3. リポジトリルートで **`npm run db:push`**。`scripts/supabase-db-push.mjs` が `.env.local` を読み、`supabase db push -p …` を非対話で実行します。
4. ドライラン: `npm run db:push -- --dry-run`

未適用だと API が `Could not find the table 'public.assets'`や `price_yen` 列エラー（PostgREST の schema cache）を返します。`assets` は `migrations/20260412120000_create_assets.sql`、`price_yen` は `migrations/20260411120000_products_price_yen.sql` などが対象です。

※ `supabase/config.toml` の `[db] major_version` はリモートの Postgres と合わせてください（ずれているとローカル `supabase start` などで不整合が出やすいです）。`db push` は主にマイグレーション SQL のリモート適用です。

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
