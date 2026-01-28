# Atelier - 開発ガイド

## 📋 プロジェクト概要

アパレルEC向け「1キューブ埋め込み型 3D/試着ウィジェット」のMVP実装。

### 最重要方針

- **モノレポ構成**: `console` と `widget` を明確に分離
- **完璧な設計より E2Eで1本通るMVP を最優先**
- **リポジトリ構成**: モノレポで管理し、各パッケージは独立してビルド・配布可能

### ターゲット

- 自社ECを主戦場とする中〜大規模アパレル（エンプラ含む）
- Shopify限定ではない（独自ECも想定）
- UIは商品ページに同じ見た目のキューブを1つ置く
- キューブをクリックすると、その商品に紐づく内容をモーダル表示
- 顧客価値: 返品削減・問い合わせ削減・CV改善
- 服制作は外注前提 → 外注運用が回るコンソール設計が必要

---

## 🏗️ リポジトリ構成

```
atelier/                          # モノレポルート
├── apps/
│   └── console/                  # Next.js 管理画面
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/          # Next.js API Routes
│       │   │   ├── (main)/       # 管理画面ページ
│       │   │   └── ...
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── features/
│       │   └── lib/
│       ├── public/
│       ├── package.json
│       ├── next.config.ts
│       └── tsconfig.json
├── packages/
│   ├── widget/                   # 埋め込みウィジェット（Vanilla TS + Vite）
│   │   ├── src/
│   │   ├── dist/                 # ビルド出力（widget.js）
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── shared/                   # 共通型・Zodスキーマ
│       ├── src/
│       │   ├── types/
│       │   └── schemas/
│       └── package.json
├── package.json                  # ルート（workspaces設定）
└── README.md
```

### パッケージ間の依存関係

```
console ──┐
          ├──> shared (共通型・Zodスキーマ)
widget ───┘

console と widget は直接依存しない
```

---

## 🚀 開発フロー

### パッケージマネージャー

**npm workspaces** を使用

### 初回セットアップ

```bash
# ルートディレクトリで
npm install
```

### 開発サーバーの起動

#### 方法1: 各パッケージディレクトリで実行（基本）

```bash
# Consoleを開発
cd apps/console
npm run dev

# Widgetを開発
cd packages/widget
npm run dev
```

#### 方法2: ルートから実行（推奨）

```bash
# Consoleを起動
npm run dev:console

# Widgetを起動
npm run dev:widget
```

### ビルド

```bash
# 各パッケージを個別にビルド
npm run build:console
npm run build:widget

# 全パッケージをビルド
npm run build:all
```

### ルート package.json のスクリプト例

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:console": "npm run dev --workspace=@atelier/console",
    "dev:widget": "npm run dev --workspace=@atelier/widget",
    "build:console": "npm run build --workspace=@atelier/console",
    "build:widget": "npm run build --workspace=@atelier/widget",
    "build:all": "npm run build --workspaces",
    "lint": "npm run lint --workspaces"
  }
}
```

---

## 📦 各パッケージの詳細

### 1. apps/console（管理画面）

**技術スタック:**
- Next.js 16.1.4 (App Router)
- React 19.2.3
- TypeScript
- Tailwind CSS 4
- Radix UI
- TanStack Query
- React Three Fiber（3Dプレビュー用）

**ページ構成:**
- `/` - ダッシュボード（Home）
- `/database/products` - 商品データベース
- `/analytics` - 分析
- `/settings` - 設定
- `/install` - 埋め込みスニペット発行（新規追加）

**必須機能（MVP）:**

#### 商品データベース
- 商品CRUD（作成 / 編集 / 更新）
- 外注運用用ステータス管理
  - 未発注 / 制作中 / レビュー待ち / 修正中 / 公開可 / 公開中
- 商品に対する 3Dアセット管理
  - size（S/M/L）
  - glbUrl
  - version
- プレビュー枠（商品名・サイズ・紐づくアセットが分かる）

#### Installページ（重要）
- 各商品ごとに埋め込みスニペットを生成
- 形式:
```html
<div
  data-atelier-shop-id="SHOP_ID"
  data-atelier-product-id="PRODUCT_ID">
</div>
<script async src="https://your-cdn.example.com/widget.js"></script>
```

- Shopify前提にしない
- productId が取れない場合の代替:
  - `data-atelier-sku`
  - `data-atelier-handle`
  - `data-atelier-url`

---

### 2. packages/widget（埋め込みウィジェット）

**技術スタック:**
- Vanilla TypeScript
- Vite（ビルドツール）
- Three.js（3D表示用、後で追加）

**技術方針:**
- buildすると単一の `widget.js` を出力
- Shadow DOM を使い、EC側CSSと衝突しない
- 外部依存は最小限

**挙動（最小MVP）:**
1. 指定された div に共通デザインのキューブを描画
2. クリック → モーダル表示
3. `GET /public/widget-config` を呼び出す
4. 商品名・サイズUIを表示（最初は3D無しでもOK）
5. イベントを `POST /events` で送信

**ビルド出力:**
- `dist/widget.js` - CDN配布用の単一ファイル

---

### 3. packages/shared（共通型・Zodスキーマ）

**技術スタック:**
- TypeScript
- Zod（スキーマバリデーション）

**役割:**
- 共通の型定義（Product, Asset, Event など）
- Zodスキーマ（APIリクエスト/レスポンスのバリデーション）
- console と widget の両方で使用

**例:**
```typescript
// packages/shared/src/types/product.ts
export interface Product {
  id: string;
  shopId: string;
  name: string;
  brand: string;
  sku?: string;
  handle?: string;
  url?: string;
  status: ProductStatus;
}

// packages/shared/src/schemas/product.schema.ts
import { z } from 'zod';
export const productSchema = z.object({ ... });
```

---

## 🗄️ データベース（Supabase）

### 使用技術
- **Supabase** (PostgreSQL)
- Supabase Client Library（TypeScript）

### データモデル（最小）

#### products テーブル
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  sku TEXT,
  handle TEXT,
  url TEXT,
  status TEXT NOT NULL, -- 'pending', 'in_production', 'review', 'revision', 'ready', 'published'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### assets テーブル
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL, -- 'S', 'M', 'L'
  glb_url TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, size, version)
);
```

#### events テーブル
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  type TEXT NOT NULL, -- 'cube_view', 'cube_click', 'widget_open', 'size_change', 'height_change', 'add_to_cart_click'
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_shop_id ON events(shop_id);
CREATE INDEX idx_events_product_id ON events(product_id);
CREATE INDEX idx_events_created_at ON events(created_at);
```

### Supabase設定

#### 環境変数
```env
# apps/console/.env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### クライアント初期化
```typescript
// apps/console/src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## 🔌 API設計

### 配置場所
**Next.js API Routes** として `apps/console/src/app/api/` に配置

### エンドポイント一覧

#### ウィジェット用（公開API）

##### GET /api/public/widget-config
商品設定を取得（ウィジェット用）

**Query Parameters:**
- `shopId` (required)
- `productId` (optional)
- `sku` (optional)
- `handle` (optional)
- `url` (optional)

**Response:**
```json
{
  "enabled": true,
  "asset": {
    "defaultSize": "M",
    "sizes": {
      "S": { "glbUrl": "https://..." },
      "M": { "glbUrl": "https://..." },
      "L": { "glbUrl": "https://..." }
    }
  }
}
```

##### POST /api/events
イベントを受信

**Request Body:**
```json
{
  "shopId": "shop_123",
  "productId": "prod_456",
  "type": "cube_click",
  "meta": {
    "size": "M",
    "height": 170
  }
}
```

**Event Types:**
- `cube_view` - キューブが表示された
- `cube_click` - キューブがクリックされた
- `widget_open` - ウィジェットが開かれた
- `size_change` - サイズが変更された
- `height_change` - 身長が変更された
- `add_to_cart_click` - カート追加ボタンがクリックされた

#### 管理用API

##### GET /api/products
商品一覧を取得

##### GET /api/products/:id
商品詳細を取得

##### POST /api/products
商品を作成

##### PATCH /api/products/:id
商品を更新

##### POST /api/assets
アセットをアップロード・登録

---

## 📝 実装優先順位（厳守）

1. **DB & 型定義（packages/shared）**
   - Supabaseテーブル作成
   - 共通型定義
   - Zodスキーマ

2. **API（widget-config / events）**
   - `GET /api/public/widget-config`
   - `POST /api/events`
   - Supabase連携

3. **コンソールの商品CRUD + ステータス**
   - 商品一覧・詳細
   - 商品作成・編集
   - ステータス管理
   - アセット管理

4. **Installページ & スニペット生成**
   - 埋め込みスニペット生成UI
   - コピー機能

5. **widget.js（キューブ → モーダル）**
   - キューブ描画
   - モーダル表示
   - API呼び出し
   - イベント送信

6. **Analytics（商品別ランキング・日次）**
   - イベント集計
   - グラフ表示

---

## 🛠️ 技術スタック

### 共通
- TypeScript 5
- Zod 4.3.5（バリデーション）

### Console
- Next.js 16.1.4
- React 19.2.3
- Tailwind CSS 4
- Radix UI（UIコンポーネント）
- TanStack Query 5.90.19
- React Three Fiber 9.5.0（3D表示）
- React Hook Form 7.71.1

### Widget
- Vanilla TypeScript
- Vite（ビルドツール）
- Three.js（3D表示、後で追加）

### データベース
- Supabase (PostgreSQL)
- @supabase/supabase-js

### パッケージマネージャー
- npm workspaces

---

## 📋 チェックリスト

### モノレポ移行
- [ ] ルート `package.json` と `pnpm-workspace.yaml` を作成
- [ ] 現在の内容を `apps/console/` に移動
- [ ] `packages/shared/` を作成
- [ ] `packages/widget/` を作成
- [ ] 各パッケージの `package.json` を設定
- [ ] TypeScriptパス解決を設定

### データベース
- [ ] Supabaseプロジェクト作成
- [ ] テーブル作成（products, assets, events）
- [ ] RLS（Row Level Security）設定
- [ ] 環境変数設定

### API実装
- [ ] `GET /api/public/widget-config`
- [ ] `POST /api/events`
- [ ] `GET /api/products`
- [ ] `POST /api/products`
- [ ] `PATCH /api/products/:id`
- [ ] `POST /api/assets`

### Console実装
- [ ] 商品一覧ページ
- [ ] 商品作成・編集
- [ ] ステータス管理
- [ ] アセット管理
- [ ] Installページ

### Widget実装
- [ ] キューブ描画
- [ ] モーダル表示
- [ ] API呼び出し
- [ ] イベント送信
- [ ] ビルド設定（単一widget.js出力）

### Analytics
- [ ] イベント集計
- [ ] グラフ表示

---

## 🚨 重要な注意事項

1. **モノレポ構成を厳守**: console と widget は直接依存しない
2. **共通型は shared のみ**: 型定義は `packages/shared` に集約
3. **widget.js は単一ファイル**: ビルド後は1つのJSファイルとして配布可能であること
4. **Shadow DOM使用**: widgetはEC側CSSと衝突しないようShadow DOMを使用
5. **MVP優先**: 完璧な設計より、E2Eで1本通ることを最優先

---

## 📚 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)

---

## 🔄 更新履歴

- 2024-XX-XX: 初版作成
