# E2Eテスト

このディレクトリには、Playwrightを使用したE2Eテストが含まれています。

## 📋 テストファイル

- `auth.spec.ts` - 認証フローのテスト（ログイン・サインアップ）
- `product-crud.spec.ts` - 商品CRUDのテスト（作成・編集・削除）
- `asset-preview.spec.ts` - アセット管理とプレビューのテスト
- `install.spec.ts` - Installページのスニペット生成テスト

## 🚀 テストの実行

### 基本的な実行方法

```bash
# すべてのテストを実行
npm run test:e2e

# UIモードで実行（視覚的に確認しながら実行）
npm run test:e2e:ui

# ヘッドモードで実行（ブラウザを表示しながら実行）
npm run test:e2e:headed

# デバッグモードで実行
npm run test:e2e:debug
```

### 特定のテストファイルを実行

```bash
# 認証テストのみ実行
npx playwright test e2e/auth.spec.ts

# 商品CRUDテストのみ実行
npx playwright test e2e/product-crud.spec.ts
```

### 特定のブラウザで実行

```bash
# Chromiumのみ
npx playwright test --project=chromium

# Firefoxのみ
npx playwright test --project=firefox

# WebKitのみ
npx playwright test --project=webkit
```

## ⚙️ 環境変数の設定

テスト用の認証情報を設定する場合、環境変数を設定してください：

```bash
export TEST_USER_EMAIL=test@example.com
export TEST_USER_PASSWORD=testpassword
```

または、`.env.test`ファイルを作成して設定することもできます。

### テスト用ユーザーの作成

テストを完全に実行するには、テスト用のユーザーアカウントを作成する必要があります：

1. アプリケーションにアクセスして、サインアップページからテスト用ユーザーを作成
2. または、Supabase Dashboardから直接ユーザーを作成

## 📊 テスト結果の解釈

### 現在のテスト結果

- **48テスト** - 16テスト × 3ブラウザ（Chromium、Firefox、WebKit）
- **9テストがパス** - 認証が不要な基本機能のテスト
- **39テストがスキップ** - 認証が必要なテスト（テスト用ユーザーが存在しない場合）

### スキップを減らすには

1. **テスト用ユーザーを作成**
   ```bash
   # 環境変数を設定
   export TEST_USER_EMAIL=your-test-user@example.com
   export TEST_USER_PASSWORD=your-test-password
   ```

2. **テストデータを準備**
   - 商品データベースにテスト用の商品を作成
   - アセットを追加

3. **テストを再実行**
   ```bash
   npm run test:e2e
   ```

## 📝 テストの前提条件

1. **開発サーバーの起動**: テスト実行時、自動的に開発サーバーが起動されます
2. **データベースのセットアップ**: Supabaseのマイグレーションが実行されている必要があります
3. **テスト用ユーザー**: テスト用のユーザーアカウントが作成されている必要があります（認証が必要なテストの場合）

## 🔍 テストレポートの確認

テスト実行後、HTMLレポートが生成されます：

```bash
# レポートを開く
npx playwright show-report
```

## 🐛 トラブルシューティング

### テストが失敗する場合

1. **開発サーバーが起動しているか確認**
   - テストは自動的に開発サーバーを起動しますが、既に起動している場合は再利用されます

2. **データベース接続を確認**
   - 環境変数が正しく設定されているか確認してください

3. **テスト用ユーザーの存在を確認**
   - テスト用のユーザーアカウントが作成されているか確認してください

### タイムアウトエラーが発生する場合

`playwright.config.ts`のタイムアウト設定を調整してください：

```typescript
use: {
  actionTimeout: 10000, // アクションのタイムアウト（ミリ秒）
  navigationTimeout: 30000, // ナビゲーションのタイムアウト（ミリ秒）
}
```

### 多くのテストがスキップされる場合

- テスト用ユーザーが作成されていない可能性があります
- 環境変数`TEST_USER_EMAIL`と`TEST_USER_PASSWORD`が設定されているか確認してください
- テスト用ユーザーでログインできるか確認してください

## 📚 参考資料

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
