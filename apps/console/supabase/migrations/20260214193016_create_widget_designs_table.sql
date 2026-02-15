-- ============================================
-- widget_designs テーブルの作成
-- ============================================
--
-- ショップごとのウィジェットデザイン設定を保存するテーブル
-- 各ショップにつき1行（UNIQUE制約）

CREATE TABLE IF NOT EXISTS widget_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL UNIQUE,

  -- ウィジェット設定
  background_image TEXT DEFAULT '',
  background_color TEXT DEFAULT '#f5f5f5',
  model_id TEXT DEFAULT 'clo_model_men',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),

  -- ボタン設定
  button_text TEXT DEFAULT '試着する',
  button_color TEXT DEFAULT '#ffffff',
  button_radius INTEGER DEFAULT 8,
  button_width INTEGER DEFAULT 200,
  button_height INTEGER DEFAULT 56,
  button_font_size INTEGER DEFAULT 14,
  button_border_width INTEGER DEFAULT 0,
  button_border_color TEXT DEFAULT '#000000',
  button_shadow BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_widget_designs_shop_id ON widget_designs(shop_id);

-- updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS update_widget_designs_updated_at ON widget_designs;
CREATE TRIGGER update_widget_designs_updated_at
  BEFORE UPDATE ON widget_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS有効化
ALTER TABLE widget_designs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（supabaseAdmin は service role で RLS バイパスするので、
-- 主にクライアント直接アクセス時のセキュリティ用）
DROP POLICY IF EXISTS "Users can view widget designs of their shop" ON widget_designs;
CREATE POLICY "Users can view widget designs of their shop"
  ON widget_designs FOR SELECT
  USING (shop_id = current_shop_id()::text);

DROP POLICY IF EXISTS "Users can insert widget designs for their shop" ON widget_designs;
CREATE POLICY "Users can insert widget designs for their shop"
  ON widget_designs FOR INSERT
  WITH CHECK (shop_id = current_shop_id()::text);

DROP POLICY IF EXISTS "Users can update widget designs of their shop" ON widget_designs;
CREATE POLICY "Users can update widget designs of their shop"
  ON widget_designs FOR UPDATE
  USING (shop_id = current_shop_id()::text);
