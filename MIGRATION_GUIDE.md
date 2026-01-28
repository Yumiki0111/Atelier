# マルチテナント統合マイグレーションガイド

## 📋 概要

このガイドでは、マルチテナント対応のためのマイグレーションをSupabase CLIで実行する手順を説明します。

## ⚠️ 事前準備

1. **Supabase CLIのインストール確認**
   ```bash
   supabase --version
   ```

2. **Supabaseプロジェクトへのリンク**
   ```bash
   cd apps/console
   supabase link --project-ref your-project-ref
   ```
   - `your-project-ref`はSupabase Dashboardのプロジェクト設定から取得

3. **データベースのバックアップ**
   - Supabase Dashboardでデータベースのバックアップを取得
   - 問題が発生した場合に復元できるようにする

4. **環境の確認**
   - Supabase CLIがインストールされていること
   - プロジェクトにリンクされていること

## 📝 マイグレーション実行手順

### 全マイグレーションを一括実行（推奨）

**実行方法**:
```bash
cd apps/console

# プロジェクトにリンク（初回のみ）
supabase link --project-ref your-project-ref

# すべてのマイグレーションを実行
# 注意: 既存のマイグレーションより前のタイムスタンプの場合は --include-all が必要
supabase db push --include-all
```

これにより、`supabase/migrations/`ディレクトリ内のすべてのマイグレーションファイルが順番に実行されます。

**注意**: 
- `supabase db push`は、リモートデータベースに未実行のマイグレーションをすべて適用します
- 既に実行済みのマイグレーションはスキップされます
- **既存のマイグレーションより前のタイムスタンプのマイグレーションファイルがある場合、`--include-all`フラグが必要です**

### 個別にマイグレーションを確認・実行

#### ステップ1: current_shop_id()関数の作成

**ファイル**: `apps/console/supabase/migrations/20260127174021_create_current_shop_id_function.sql`

**内容**:
- `current_shop_id()`関数を作成（SECURITY INVOKER）
- `users`テーブルから`shop_id`を取得する関数
- RLSポリシーで使用される

**実行方法**:
```bash
cd apps/console
# --include-all フラグを使用してすべてのマイグレーションを実行
supabase db push --include-all
```

または、特定のマイグレーションまで実行：
```bash
supabase migration up --target 20260127174021 --include-all
```

**確認**:
```bash
# リモートデータベースに接続して確認
supabase db remote exec "SELECT proname, prosrc FROM pg_proc WHERE proname = 'current_shop_id';"
```

#### ステップ2: 子テーブルにshop_idを追加

**ファイル**: `apps/console/supabase/migrations/20260127174022_add_shop_id_to_child_tables.sql`

**内容**:
- `assets`テーブルに`shop_id`カラムを追加
- `messages`テーブルに`shop_id`カラムを追加
- 既存データの`shop_id`を親テーブルから設定

**実行方法**:
```bash
cd apps/console
# --include-all フラグを使用
supabase db push --include-all
```

**注意**:
- 既存データがある場合、`shop_id`がNULLのレコードがあるとエラーになる
- エラーが発生した場合は、該当レコードを確認して修正

#### ステップ3: widget_keysテーブルの作成

**ファイル**: `apps/console/supabase/migrations/20260127174023_create_widget_keys_table.sql`

**内容**:
- `widget_keys`テーブルを作成
- 2キー構成（public_key + secret_key_hash）
- RLSポリシーを設定

**実行方法**:
```bash
cd apps/console
# --include-all フラグを使用
supabase db push --include-all
```

**確認**:
```bash
# テーブルが作成されたか確認
supabase db remote exec "SELECT table_name FROM information_schema.tables WHERE table_name = 'widget_keys';"
```

#### ステップ4: RLSポリシーの更新

**ファイル**: `apps/console/supabase/migrations/20260127174024_update_rls_policies_with_function.sql`

**内容**:
- 既存のRLSポリシーを`current_shop_id()`関数を使用するように更新
- すべてのテーブルで`current_shop_id()`関数を使用

**実行方法**:
```bash
cd apps/console
# --include-all フラグを使用
supabase db push --include-all
```

**注意**:
- 既存のポリシーが削除されるため、実行前に確認
- エラーが発生した場合は、個別にポリシーを確認

#### ステップ5: 自動ユーザー作成トリガーの更新

**ファイル**: `apps/console/supabase/migrations/20260127174025_update_auto_create_user_trigger.sql`

**内容**:
- `handle_new_user()`関数を更新（usersテーブルを使用）
- 既存ユーザーに対してusersテーブルにレコードを作成

**実行方法**:
```bash
cd apps/console
# --include-all フラグを使用
supabase db push --include-all
```

**確認**:
```bash
# 既存ユーザーがusersテーブルに作成されたか確認
supabase db remote exec "SELECT COUNT(*) FROM users;"
```

## ✅ 実行後の確認

### 1. マイグレーション状態の確認
```bash
cd apps/console
supabase migration list
```

### 2. 関数の確認
```bash
# current_shop_id()関数が正しく動作するか確認
supabase db remote exec "SELECT current_shop_id();"
```

### 3. テーブル構造の確認
```bash
# assetsテーブルにshop_idが追加されたか確認
supabase db remote exec "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'shop_id';"

# messagesテーブルにshop_idが追加されたか確認
supabase db remote exec "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'shop_id';"
```

### 4. RLSポリシーの確認
```bash
# RLSポリシーが正しく設定されているか確認
supabase db remote exec "SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('users', 'products', 'assets', 'events', 'conversations', 'messages', 'widget_keys');"
```

### 4. 動作確認
- [ ] ログインが正常に動作する
- [ ] 商品一覧が正常に表示される
- [ ] 商品の作成・編集・削除が正常に動作する
- [ ] 自分のshopのデータのみアクセスできる

## 🔧 トラブルシューティング

### エラー: `supabase: command not found`
**原因**: Supabase CLIがインストールされていない

**対処**:
```bash
# macOS
brew install supabase/tap/supabase

# または npm
npm install -g supabase
```

### エラー: `project not linked`
**原因**: プロジェクトにリンクされていない

**対処**:
```bash
cd apps/console
supabase link --project-ref your-project-ref
```

### エラー: `Found local migration files to be inserted before the last migration`
**原因**: ローカルのマイグレーションファイルが既存のマイグレーションより前のタイムスタンプになっている

**対処**: 
```bash
cd apps/console
supabase db push --include-all
```

### エラー: `function current_shop_id() does not exist`
**原因**: ステップ1のマイグレーションが実行されていない

**対処**: 
```bash
cd apps/console
supabase db push --include-all
```

### エラー: `column "shop_id" does not exist`
**原因**: ステップ2のマイグレーションが実行されていない

**対処**: 
```bash
cd apps/console
supabase db push --include-all
```

### エラー: `relation "widget_keys" does not exist`
**原因**: ステップ3のマイグレーションが実行されていない

**対処**: 
```bash
cd apps/console
supabase db push --include-all
```

### エラー: `policy "..." does not exist`
**原因**: 既存のポリシーが存在しない

**対処**: エラーを無視して続行（新しいポリシーが作成される）

### マイグレーションの状態確認
```bash
# 実行済みのマイグレーションを確認
cd apps/console
supabase migration list

# リモートデータベースの状態を確認
supabase db remote status
```

## 📚 参考資料

- `MULTI_TENANT_STRATEGY.md` - マルチテナント戦略の詳細
- `INTEGRATION_PROGRESS.md` - 統合の進捗状況
- `TROUBLESHOOTING.md` - トラブルシューティングガイド
