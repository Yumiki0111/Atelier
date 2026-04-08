# Atelier - アパレルEC向け3D試着ウィジェット

アパレルEC向け「1キューブ埋め込み型 3D/試着ウィジェット」のMVP実装。

## 📋 プロジェクト構成

このプロジェクトはモノレポ構成で、以下のパッケージで構成されています：

- `apps/console` - Next.js管理画面
- `packages/widget` - 埋め込みウィジェット（Vanilla TS + Vite）
- `packages/shared` - 共通型定義とZodスキーマ

詳細は [DEVELOPMENT.md](./DEVELOPMENT.md) を参照してください。

## 🚀 セットアップ

### 前提条件

- Node.js 18以上
- npm

### インストール

```bash
# ルートディレクトリで
npm install
```

### 環境変数の設定

`apps/console/.env.local` を作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### データベースのセットアップ

1. Supabaseプロジェクトを作成
2. `apps/console/supabase/migrations/001_initial_schema.sql` の内容をSupabaseのSQL Editorで実行

## 🛠️ 開発

### 開発サーバーの起動

```bash
# 管理画面・API（試着プレビューはここから）
npm run dev:console
```

試着プレビュー（端末枠つきの `PreviewPanel`）は `http://localhost:3000/database/products` を開き、商品を選んでプレビューを表示してください。

`npm run build:widget` で `packages/widget/dist/widget.iife.js` を生成します。

### ビルド

```bash
# 各パッケージを個別にビルド
npm run build:console
npm run build:widget

# 全パッケージをビルド
npm run build:all
```

## 📦 パッケージ詳細

### apps/console

Next.js 16.1.4を使用した管理画面。商品管理、アセット管理、埋め込みスニペット生成などの機能を提供します。

### packages/widget

Vanilla TypeScript + Viteで構築された埋め込みウィジェット。ビルド後は単一の `widget.js` ファイルとして出力されます。

### packages/shared

共通の型定義とZodスキーマを提供します。consoleとwidgetの両方で使用されます。

## 📚 ドキュメント

詳細な開発ガイドは [DEVELOPMENT.md](./DEVELOPMENT.md) を参照してください。
