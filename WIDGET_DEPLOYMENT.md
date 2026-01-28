# Widget 本番展開ガイド

## 📋 現状の整理

### 現在の実装状況

1. **開発環境（デモ）**
   - `packages/widget/index.html` - 開発用プレビューページ
   - `npm run dev:widget` - 開発サーバー起動（ポート5174）
   - 開発環境では`localhost:3000`のAPIを呼び出す設定

2. **ビルド**
   - `npm run build:widget` - 単一の`dist/widget.js`ファイルを生成
   - IIFE形式で出力（グローバルスコープで使用可能）

3. **インストールページ**
   - `/install` - 埋め込みスニペット生成ページ
   - CDN URLは環境変数`NEXT_PUBLIC_WIDGET_CDN_URL`で設定

## 🚀 本番環境への展開ステップ

### ステップ1: ビルド設定の最適化

#### 1.1 本番環境用のビルド設定

`packages/widget/vite.config.ts`を環境に応じて設定：

```typescript
// 本番環境用の設定を追加
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    define: {
      // 本番環境では環境変数から取得、開発環境ではlocalhost
      'process.env.API_BASE_URL': isProduction
        ? JSON.stringify(process.env.WIDGET_API_BASE_URL || '')
        : JSON.stringify('http://localhost:3000'),
    },
    build: {
      // 本番環境ではminifyと圧縮を有効化
      minify: isProduction ? 'esbuild' : false,
      sourcemap: !isProduction,
      // ...
    },
  };
});
```

#### 1.2 バージョン管理

`package.json`にバージョン情報を追加：

```json
{
  "version": "1.0.0",
  "scripts": {
    "build:prod": "NODE_ENV=production vite build",
    "build:dev": "vite build"
  }
}
```

### ステップ2: CDN配布の準備

#### 2.1 CDNサービスの選択

推奨オプション：
- **Vercel** - 簡単にデプロイ可能、自動CDN配布
- **Cloudflare Pages** - 無料プランあり、高速
- **AWS CloudFront** - スケーラブル、カスタマイズ可能
- **Netlify** - 簡単、無料プランあり

#### 2.2 デプロイ設定例（Vercel）

`packages/widget/vercel.json`:

```json
{
  "buildCommand": "npm run build:prod",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/widget.js",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 2.3 環境変数の設定

`.env.production`:

```env
WIDGET_API_BASE_URL=https://your-api.example.com
```

### ステップ3: API URLの動的設定

#### 3.1 本番環境でのAPI URL取得

現在の実装では、本番環境では現在のオリジンを使用していますが、より柔軟にするために：

```typescript
function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  
  // 1. 環境変数から取得（ビルド時に設定）
  if (typeof process !== "undefined" && process.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // 2. data-atelier-api-url属性から取得（ページごとに設定可能）
  const apiUrlAttr = document.querySelector('[data-atelier-api-url]')?.getAttribute('data-atelier-api-url');
  if (apiUrlAttr) {
    return apiUrlAttr;
  }
  
  // 3. デフォルト: 現在のオリジン（widget.jsと同じドメイン）
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
}
```

#### 3.2 インストールページの更新

`/install`ページで、API URLも設定できるように：

```typescript
const generateSnippet = (productId?: string) => {
  const attributes: string[] = [`data-atelier-shop-id="${shopId}"`];
  
  if (productId) {
    attributes.push(`data-atelier-product-id="${productId}"`);
  }
  
  // API URLを指定する場合
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiUrl) {
    attributes.push(`data-atelier-api-url="${apiUrl}"`);
  }

  return `<div
  ${attributes.join("\n  ")}>
</div>
<script async src="${WIDGET_CDN_URL}"></script>`;
};
```

### ステップ4: エラーハンドリングの改善

#### 4.1 本番環境でのエラー処理

開発環境と本番環境で異なるエラーメッセージを表示：

```typescript
// widget.ts
if (isDevelopmentMode()) {
  // 開発環境: 詳細なエラーメッセージ
  throw new Error("開発環境では、consoleサーバー（npm run dev:console）を起動してください。");
} else {
  // 本番環境: ユーザーフレンドリーなメッセージ
  throw new Error("サービスに接続できません。しばらくしてから再度お試しください。");
}
```

### ステップ5: バージョン管理とロールバック

#### 5.1 バージョン付きURL

CDNでバージョン管理：

```
https://cdn.example.com/widget-v1.0.0.js
https://cdn.example.com/widget-latest.js (シンボリックリンク)
```

#### 5.2 インストールページでのバージョン選択

```typescript
const WIDGET_VERSION = process.env.NEXT_PUBLIC_WIDGET_VERSION || 'latest';
const WIDGET_CDN_URL = `https://cdn.example.com/widget-${WIDGET_VERSION}.js`;
```

### ステップ6: モニタリングとアナリティクス

#### 6.1 エラー追跡

SentryやLogRocketなどのエラー追跡サービスを統合：

```typescript
// widget.ts
try {
  // API呼び出し
} catch (error) {
  // エラー追跡サービスに送信
  if (window.Sentry) {
    window.Sentry.captureException(error);
  }
  throw error;
}
```

#### 6.2 パフォーマンス監視

```typescript
// ロード時間の計測
const loadStart = performance.now();
// widget初期化
const loadTime = performance.now() - loadStart;
console.log(`Widget loaded in ${loadTime}ms`);
```

## 📝 推奨される展開フロー

### Phase 1: 開発・テスト環境
1. ✅ 開発環境での動作確認（現在完了）
2. ✅ プレビュー機能での動作確認（現在完了）
3. ⏳ ビルド済みwidget.jsのローカルテスト
4. ⏳ ステージング環境でのテスト

### Phase 2: 本番準備
1. ⏳ CDNサービスのセットアップ
2. ⏳ 環境変数の設定
3. ⏳ ビルド・デプロイパイプラインの構築
4. ⏳ エラーハンドリングの改善

### Phase 3: 本番展開
1. ⏳ 小規模なテスト展開（1-2店舗）
2. ⏳ モニタリングとフィードバック収集
3. ⏳ 段階的な展開
4. ⏳ 全店舗への展開

## 🔧 次のアクションアイテム

### すぐにできること

1. **ビルド設定の改善**
   - [ ] 本番環境用のビルド設定を追加
   - [ ] 環境変数の設定方法をドキュメント化

2. **CDN配布の準備**
   - [ ] CDNサービスの選択
   - [ ] デプロイ設定ファイルの作成
   - [ ] 環境変数の設定

3. **インストールページの改善**
   - [ ] API URLの設定オプション追加
   - [ ] バージョン選択機能の追加
   - [ ] 使用方法のドキュメント改善

### 中期的な改善

1. **エラーハンドリング**
   - [ ] 本番環境用のエラーメッセージ
   - [ ] エラー追跡サービスの統合
   - [ ] リトライ機能の実装

2. **パフォーマンス**
   - [ ] コード分割の最適化
   - [ ] キャッシュ戦略の改善
   - [ ] ロード時間の監視

3. **機能拡張**
   - [ ] 多言語対応
   - [ ] テーマカスタマイズ
   - [ ] A/Bテスト機能

## 📚 参考リソース

- [Vite ビルド設定](https://vitejs.dev/config/build-options.html)
- [CDN配布ベストプラクティス](https://web.dev/cdn/)
- [Widget埋め込みパターン](https://web.dev/embed-best-practices/)
