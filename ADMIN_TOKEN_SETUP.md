# Atelier Admin Token セットアップガイド

このガイドでは、Atelier の管理者トークンの発行・設定・管理方法を説明します。

## 📋 目次

1. [管理者トークンとは](#管理者トークンとは)
2. [初回セットアップ](#初回セットアップ)
3. [本番環境への設定](#本番環境への設定)
4. [セキュリティベストプラクティス](#セキュリティベストプラクティス)

---

## 🔐 管理者トークンとは

`Atelier_ADMIN_TOKEN` は、Atelier の内部管理機能（新規ショップの作成など）へのアクセスを保護するための認証トークンです。

**用途**:
- `/admin/provision-shop` ページでの新規ショップ作成
- `POST /api/internal/provision-shop` API の認証

**重要**: このトークンは絶対に外部に公開しないでください。

---

## 🚀 初回セットアップ

### STEP 1: トークンを生成

ターミナルで以下のいずれかのコマンドを実行：

#### **方法1: OpenSSL（推奨）**
```bash
openssl rand -hex 32
```

出力例:
```
1311d7f4ddeef9512b71ed663aae1c40f18efb12a40140123e5ec21cc1d97f3d
```

#### **方法2: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **方法3: Python**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### STEP 2: `.env.local` ファイルを作成

プロジェクトルートの `apps/console/` ディレクトリに `.env.local` ファイルを作成：

```bash
cd apps/console
cp .env.example .env.local
```

### STEP 3: トークンを設定

`.env.local` ファイルを編集し、生成したトークンを設定：

```bash
# apps/console/.env.local

# Supabase Configuration（既存の設定はそのまま）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ✅ ここに生成したトークンをペースト
Atelier_ADMIN_TOKEN=1311d7f4ddeef9512b71ed663aae1c40f18efb12a40140123e5ec21cc1d97f3d

# Secret Key Salt（widget_keys のハッシュ化用）
# こちらも同様にランダムな文字列を生成して設定
SECRET_KEY_SALT=$(openssl rand -hex 16)
```

### STEP 4: 開発サーバーを再起動

環境変数を読み込むため、Next.js 開発サーバーを再起動：

```bash
npm run dev
```

### STEP 5: トークンを安全に保管

生成したトークンを以下のいずれかの方法で保管：

#### **推奨: パスワードマネージャー**
- **1Password**: 
  1. New Item → Secure Note
  2. Title: "Atelier Admin Token"
  3. Note: トークンをペースト
  
- **LastPass**:
  1. Add Item → Secure Note
  2. Name: "Atelier Admin Token"
  3. Notes: トークンをペースト

- **Bitwarden**:
  1. Add Item → Secure Note
  2. Name: "Atelier Admin Token"
  3. Notes: トークンをペースト

#### **代替: 暗号化されたドキュメント**
- 会社の内部 Wiki（アクセス制限付き）
- 暗号化された Google Drive / Notion ページ

---

## 🌐 本番環境への設定

### Vercel にデプロイする場合

1. Vercel ダッシュボードにアクセス
2. プロジェクト → **Settings** → **Environment Variables**
3. 以下の変数を追加：

```
Name: Atelier_ADMIN_TOKEN
Value: 1311d7f4ddeef9512b71ed663aae1c40f18efb12a40140123e5ec21cc1d97f3d
Environment: Production, Preview, Development
```

4. **Save** をクリック
5. プロジェクトを再デプロイ

### Railway にデプロイする場合

1. Railway ダッシュボードにアクセス
2. プロジェクト → **Variables** タブ
3. **New Variable** をクリック
4. 以下を入力：

```
Variable Name: Atelier_ADMIN_TOKEN
Value: 1311d7f4ddeef9512b71ed663aae1c40f18efb12a40140123e5ec21cc1d97f3d
```

5. **Add** をクリック
6. 自動的に再デプロイされます

### その他のホスティングサービス

各サービスの環境変数設定画面で `Atelier_ADMIN_TOKEN` を設定してください。

---

## 🛡️ セキュリティベストプラクティス

### ✅ すべきこと

1. **長いランダムな文字列を使用**
   - 最低64文字（32バイトの16進数）
   - 推測不可能なランダム値

2. **Git にコミットしない**
   - `.env.local` は `.gitignore` に含まれていることを確認
   - 誤ってコミットした場合は、すぐに新しいトークンを生成して置き換える

3. **定期的にローテーション**
   - 3〜6ヶ月ごとにトークンを再生成
   - チームメンバーの退職時など、必要に応じて即座に変更

4. **アクセス制限**
   - トークンは必要な管理者のみに共有
   - パスワードマネージャーで安全に共有

5. **ログの監視**
   - `/api/internal/provision-shop` へのアクセスログを監視
   - 不正なアクセス試行がないか定期的に確認

### ❌ してはいけないこと

1. **簡単なパスワードを使用**
   - ❌ `admin123`、`password`、`Atelier-token` など

2. **公開リポジトリにコミット**
   - ❌ GitHub、GitLab などの公開リポジトリに含めない

3. **クライアントサイドで使用**
   - ❌ フロントエンドコードや `NEXT_PUBLIC_` プレフィックスは使わない

4. **平文で共有**
   - ❌ Slack、メール、チャットで直接送信しない
   - ✅ パスワードマネージャーの共有機能を使用

---

## 🔄 トークンの変更・ローテーション

トークンを変更する必要がある場合：

### STEP 1: 新しいトークンを生成

```bash
openssl rand -hex 32
```

### STEP 2: 環境変数を更新

#### ローカル開発環境
```bash
# apps/console/.env.local を編集
Atelier_ADMIN_TOKEN=<新しいトークン>
```

#### 本番環境
1. Vercel / Railway などの環境変数設定画面で更新
2. プロジェクトを再デプロイ

### STEP 3: チーム全体に通知

管理者全員に新しいトークンを共有（パスワードマネージャー経由）。

---

## 📝 使用方法

### `/admin/provision-shop` ページでの使用

1. `/admin/provision-shop` にアクセス
2. 「管理者トークン」フィールドに `Atelier_ADMIN_TOKEN` の値を入力
3. ショップ情報を入力して「ショップを作成」

### API での使用（cURL 例）

```bash
curl -X POST http://localhost:3000/api/internal/provision-shop \
  -H "Content-Type: application/json" \
  -H "x-Atelier-admin-token: YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "shopName": "テストショップ",
    "ownerEmail": "owner@example.com",
    "allowedDomains": ["localhost:3000", "example.com"]
  }'
```

---

## 🆘 トラブルシューティング

### Q: "Unauthorized" エラーが表示される

**原因**: トークンが正しく設定されていない、または間違っている

**解決方法**:
1. `.env.local` の `Atelier_ADMIN_TOKEN` を確認
2. 開発サーバーを再起動（`npm run dev`）
3. トークンに余分なスペースや改行がないか確認

### Q: "Admin token not configured" エラーが表示される

**原因**: サーバー側で環境変数が読み込まれていない

**解決方法**:
1. `.env.local` ファイルが `apps/console/` ディレクトリに存在するか確認
2. ファイル名が `.env.local` であることを確認（`.env` ではない）
3. 開発サーバーを再起動

### Q: トークンを紛失した

**解決方法**:
1. 新しいトークンを生成（上記の手順）
2. `.env.local` と本番環境の環境変数を更新
3. 開発サーバー/本番環境を再起動

---

## 📞 サポート

質問や問題がある場合は、開発チームにお問い合わせください。

**⚠️ 注意**: トークンの値そのものをチャットやメールで送信しないでください。
