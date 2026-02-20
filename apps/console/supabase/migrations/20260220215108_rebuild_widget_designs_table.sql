-- ============================================
-- widget_designs テーブルの再構築
-- ============================================
--
-- シンプルなボタンカスタマイズスキーマに変更
-- 必要なカラム: button_color, button_text, button_shape, button_image_url

-- 既存のテーブルを削除（データは失われます）
DROP TABLE IF EXISTS widget_designs CASCADE;

-- 新しいテーブルを作成
CREATE TABLE widget_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL UNIQUE,

  -- ボタン設定（シンプル化）
  button_color TEXT DEFAULT '#ffffff',
  button_text TEXT DEFAULT '試着する',
  button_shape TEXT DEFAULT 'pill' CHECK (button_shape IN ('circle', 'pill')),
  button_image_url TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_widget_designs_shop_id ON widget_designs(shop_id);

-- updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS update_widget_designs_updated_at ON widget_designs;
CREATE TRIGGER update_widget_designs_updated_at
  BEFORE UPDATE ON widget_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS有効化
ALTER TABLE widget_designs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
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
