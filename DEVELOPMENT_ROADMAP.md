# 開発ロードマップ

## 📋 現状の整理

### 完了している機能

#### Console側
- ✅ 商品CRUD（作成・編集・削除・一覧）
- ✅ アセット管理（3Dモデルのアップロード・管理）
- ✅ プレビュー機能（商品の3Dプレビュー）
- ✅ 基本的なアナリティクス（イベント集計）
- ✅ 認証・認可（Supabase Auth）
- ✅ インストールページ（埋め込みスニペット生成）

#### Widget側
- ✅ 基本的なwidget機能（キューブ表示・モーダル表示）
- ✅ 3Dモデル表示（Three.js）
- ✅ サイズ選択・身長調整
- ✅ チャット機能（LLM連携）
- ✅ イベント送信（widget_open, size_change等）

### 不足している機能

#### Console側
- ❌ **会話ログの保存・表示**（最優先）
- ❌ **アナリティクスの改善**（イベント集計の精度向上）
- ❌ **会話ログの検索・フィルタリング**
- ❌ **商品別の会話分析**

#### Widget側
- ⚠️ **本番環境用のビルド設定**
- ⚠️ **CDN配布の準備**

## 🎯 最低限必要なアナリティクス

### 必須メトリクス

1. **ウィジェット開封数** (`widget_open`)
   - 現在: ✅ 実装済み
   - 改善: 商品別の集計を追加

2. **会話ログ** (LLMとの会話)
   - 現在: ❌ 未実装
   - 実装: 会話の保存・表示・集計

3. **キューブ表示数** (`cube_view`)
   - 現在: ⚠️ 商品クリック数として集計されている
   - 改善: 独立したメトリクスとして分離

4. **キューブクリック数** (`cube_click`)
   - 現在: ⚠️ 商品クリック数として集計されている
   - 改善: 独立したメトリクスとして分離

5. **カート追加** (`add_to_cart_click`)
   - 現在: ✅ 実装済み

### 推奨メトリクス（後回し可能）

- サイズ変更数 (`size_change`)
- 身長変更数 (`height_change`)
- チェックアウト数（イベントタイプに存在しない）
- 購入数（イベントタイプに存在しない）

## 🚀 Phase 1: 最低限のアナリティクス実装（最優先）

### 1.1 会話ログの保存機能

#### データベーススキーマ

**マイグレーションファイル**: `apps/console/supabase/migrations/[timestamp]_add_conversations.sql`

```sql
-- 会話テーブル
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- メッセージテーブル
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  context JSONB, -- サイズ、身長などのコンテキスト情報
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_conversations_shop_id ON conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 更新トリガー
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**実装タスク**:
- [ ] マイグレーションファイルの作成
- [ ] マイグレーションの実行
- [ ] スキーマの検証

#### `/api/chat`での会話保存

**ファイル**: `apps/console/src/app/api/chat/route.ts`

**実装内容**:
1. 会話の開始時に`conversations`テーブルにレコードを作成（存在しない場合）
2. ユーザーメッセージを`messages`テーブルに保存
3. アシスタントレスポンスを`messages`テーブルに保存
4. 会話の`message_count`を更新

**実装タスク**:
- [ ] 会話IDの生成・管理
- [ ] セッション管理（session_idの生成・管理）
- [ ] メッセージの保存処理
- [ ] エラーハンドリング（保存失敗時の処理）

### 1.2 アナリティクスAPIの改善

#### イベント集計の改善

**ファイル**: `apps/console/src/app/api/analytics/route.ts`

**改善内容**:
1. `cube_view`と`cube_click`を分離
2. 会話ログの集計を追加
3. メッセージ数の集計を追加

**実装タスク**:
- [ ] `cube_view`を独立したメトリクスとして集計
- [ ] `cube_click`を独立したメトリクスとして集計
- [ ] 会話数の集計（conversationsテーブルから）
- [ ] メッセージ数の集計（messagesテーブルから）

**更新後のAnalyticsData型**:
```typescript
interface AnalyticsData {
  date: string;
  fullDate: string;
  キューブ表示数: number;      // cube_view
  キューブクリック数: number;   // cube_click
  ウィジェット開封数: number;  // widget_open
  会話数: number;              // conversations
  メッセージ数: number;        // messages
  カート追加: number;          // add_to_cart_click
}
```

### 1.3 アナリティクスページの更新

**ファイル**: `apps/console/src/app/(main)/analytics/page.tsx`

**更新内容**:
1. グラフの更新（新しいメトリクスに対応）
2. 主要メトリクスの更新
3. 会話数の表示

**実装タスク**:
- [ ] グラフのデータキーを更新
- [ ] 主要メトリクスカードの更新
- [ ] レイアウトの調整

### 1.4 会話ログの表示機能（最小限）

**ファイル**: `apps/console/src/app/(main)/analytics/conversations/page.tsx`（新規作成）

**実装内容**（最小限）:
1. 会話一覧の表示（日付、商品名、メッセージ数）
2. 会話詳細の表示（メッセージ履歴）
3. 商品別フィルタリング

**実装タスク**:
- [ ] 会話一覧APIの作成（`/api/analytics/conversations`）
- [ ] 会話一覧ページの作成
- [ ] 会話詳細モーダルの作成
- [ ] 商品フィルタリング機能

**UI構成（最小限）**:
```
/analytics/conversations
├── フィルタリングバー
│   └── 商品選択
├── 会話一覧テーブル
│   ├── 開始日時
│   ├── 商品名
│   ├── メッセージ数
│   └── アクション（詳細表示）
└── 会話詳細モーダル
    └── メッセージ履歴
```

## 📅 実装スケジュール（最小限）

### Week 1: 会話ログの保存機能

**Day 1-2: データベーススキーマ**
- [ ] マイグレーションファイルの作成
- [ ] マイグレーションの実行
- [ ] スキーマの検証

**Day 3-4: 会話保存機能**
- [ ] `/api/chat`での会話保存実装
- [ ] セッション管理の実装
- [ ] エラーハンドリング

**Day 5: テスト・バグ修正**
- [ ] 会話保存のテスト
- [ ] エラーケースのテスト
- [ ] バグ修正

### Week 2: アナリティクスの改善

**Day 1-2: アナリティクスAPIの改善**
- [ ] イベント集計の改善（cube_view, cube_clickの分離）
- [ ] 会話ログの集計追加
- [ ] メッセージ数の集計追加

**Day 3-4: アナリティクスページの更新**
- [ ] グラフの更新
- [ ] 主要メトリクスの更新
- [ ] UIの調整

**Day 5: テスト・バグ修正**
- [ ] アナリティクス表示のテスト
- [ ] データの整合性確認
- [ ] バグ修正

### Week 3: 会話ログの表示機能

**Day 1-2: 会話一覧API**
- [ ] `/api/analytics/conversations`の作成
- [ ] フィルタリング機能
- [ ] ページネーション

**Day 3-4: 会話ログ表示UI**
- [ ] 会話一覧ページの作成
- [ ] 会話詳細モーダルの作成
- [ ] 商品フィルタリング

**Day 5: テスト・バグ修正**
- [ ] 会話ログ表示のテスト
- [ ] パフォーマンス確認
- [ ] バグ修正

## 🔧 技術的な実装詳細

### 会話ログの保存フロー

```
Widget/Preview
  ↓ POST /api/chat
  { 
    message, 
    productId, 
    shopId, 
    conversationId?,  // 既存の会話ID（あれば）
    sessionId?        // セッションID（あれば）
  }
  ↓
Chat API Handler
  ├─ 会話の作成/取得
  │   └─ conversationIdがない場合、新規作成
  ├─ ユーザーメッセージの保存
  ├─ LLM API呼び出し
  ├─ アシスタントレスポンスの保存
  └─ 会話の更新（message_count等）
  ↓
Response
  { 
    response, 
    conversationId,  // 会話IDを返す（次回のリクエストで使用）
    sessionId        // セッションIDを返す
  }
```

### アナリティクス集計の改善

**現在の問題**:
- `cube_view`と`cube_click`が「商品クリック数」として統合されている
- 会話ログが集計されていない
- メッセージ数が集計されていない

**改善後の集計ロジック**:
```typescript
// イベント集計
events?.forEach((event) => {
  switch (event.type) {
    case "cube_view":
      dayData.キューブ表示数 += 1;
      break;
    case "cube_click":
      dayData.キューブクリック数 += 1;
      break;
    case "widget_open":
      dayData.ウィジェット開封数 += 1;
      break;
    case "add_to_cart_click":
      dayData.カート追加 += 1;
      break;
  }
});

// 会話ログ集計（conversationsテーブルから）
const { data: conversations } = await supabaseAdmin
  .from("conversations")
  .select("id, started_at")
  .eq("shop_id", shopId)
  .gte("started_at", startDate.toISOString())
  .lte("started_at", endDate.toISOString());

conversations?.forEach((conv) => {
  const dateKey = new Date(conv.started_at).toISOString().split("T")[0];
  const dayData = dailyData.get(dateKey);
  if (dayData) {
    dayData.会話数 += 1;
  }
});

// メッセージ数集計（messagesテーブルから）
const { data: messages } = await supabaseAdmin
  .from("messages")
  .select("id, created_at")
  .eq("shop_id", shopId) // JOINが必要
  .gte("created_at", startDate.toISOString())
  .lte("created_at", endDate.toISOString());

messages?.forEach((msg) => {
  const dateKey = new Date(msg.created_at).toISOString().split("T")[0];
  const dayData = dailyData.get(dateKey);
  if (dayData) {
    dayData.メッセージ数 += 1;
  }
});
```

### 会話一覧API

**エンドポイント**: `GET /api/analytics/conversations`

**クエリパラメータ**:
- `shopId` (required)
- `productId` (optional)
- `dateFrom` (optional)
- `dateTo` (optional)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**レスポンス**:
```typescript
{
  conversations: [
    {
      id: string;
      started_at: string;
      message_count: number;
      product_id: string | null;
      product_name: string | null;
      last_message: string;
      last_message_at: string;
    }
  ];
  total: number;
  page: number;
  limit: number;
}
```

**SQLクエリ例**:
```sql
SELECT 
  c.id,
  c.started_at,
  c.message_count,
  c.product_id,
  p.name as product_name,
  m.content as last_message,
  m.created_at as last_message_at
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id
LEFT JOIN LATERAL (
  SELECT content, created_at
  FROM messages
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true
WHERE c.shop_id = $1
  AND ($2::uuid IS NULL OR c.product_id = $2)
  AND ($3::timestamp IS NULL OR c.started_at >= $3)
  AND ($4::timestamp IS NULL OR c.started_at <= $4)
ORDER BY c.started_at DESC
LIMIT $5 OFFSET $6;
```

## 📊 アナリティクスページの更新

### グラフの更新

**現在のグラフ**:
- 会話（実際にはsize_change, height_changeを集計）
- メッセージ（未実装）
- 商品クリック数（cube_view + cube_click）
- ウィジェット開封数
- カート追加
- チェックアウト（未実装）
- 購入（未実装）

**更新後のグラフ**:
- キューブ表示数（新規）
- キューブクリック数（新規）
- ウィジェット開封数（既存）
- 会話数（新規・実データ）
- メッセージ数（新規・実データ）
- カート追加（既存）

### 主要メトリクスカード

**更新後のメトリクス**:
1. 総ウィジェット開封数
2. 総会話数
3. 総メッセージ数
4. 総カート追加数

## 🚀 次のアクション

### すぐに始められること

1. **マイグレーションファイルの作成**
   ```bash
   # 現在時刻を取得
   date +%Y%m%d%H%M%S
   # 例: 20260129120000_add_conversations.sql
   ```

2. **会話保存機能の実装**
   - `/api/chat`の修正
   - セッション管理の実装

3. **アナリティクスAPIの改善**
   - イベント集計の改善
   - 会話ログ集計の追加

### 並行して進められること

- アナリティクスページのUI更新（API改善と並行）
- 会話一覧APIの作成（会話保存機能と並行）

## 📝 注意事項

1. **パフォーマンス**
   - 会話ログが大量になる可能性があるため、インデックスを適切に設定
   - ページネーションを必ず実装
   - JOINクエリの最適化

2. **データ整合性**
   - 会話保存が失敗してもチャット機能は継続できるようにする
   - トランザクション処理の検討

3. **段階的な実装**
   - まずは会話保存機能を実装
   - 次にアナリティクス集計を改善
   - 最後に会話ログ表示を実装

## 🔗 関連ドキュメント

- `WIDGET_DEPLOYMENT.md` - Widgetの本番環境展開ガイド
- `DEVELOPMENT.md` - 開発ガイド
- `DATABASE_DESIGN.md` - データベース設計書
