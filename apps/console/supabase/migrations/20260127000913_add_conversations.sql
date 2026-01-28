-- ============================================
-- 会話ログ機能のためのテーブル追加
-- ============================================

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
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_product_id ON messages(product_id);

-- 更新トリガー
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) の設定
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations テーブルのポリシー
CREATE POLICY "Users can view conversations of their shop"
  ON conversations FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations in their shop"
  ON conversations FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations of their shop"
  ON conversations FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id::text FROM users WHERE id = auth.uid()
    )
  );

-- messages テーブルのポリシー
CREATE POLICY "Users can view messages of their shop's conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE shop_id IN (
        SELECT shop_id::text FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create messages in their shop's conversations"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE shop_id IN (
        SELECT shop_id::text FROM users WHERE id = auth.uid()
      )
    )
  );
