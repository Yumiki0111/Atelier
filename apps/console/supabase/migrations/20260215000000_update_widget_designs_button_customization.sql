-- ============================================
-- widget_designs テーブルの更新
-- ============================================
--
-- ウィジェット設定（背景画像、背景色、基本モデル、テーマ）を削除
-- ボタンカスタマイズ機能を拡張（画像、見出し、小見出し）

-- 古いカラムを削除
ALTER TABLE widget_designs DROP COLUMN IF EXISTS background_image;
ALTER TABLE widget_designs DROP COLUMN IF EXISTS background_color;
ALTER TABLE widget_designs DROP COLUMN IF EXISTS model_id;
ALTER TABLE widget_designs DROP COLUMN IF EXISTS theme;
ALTER TABLE widget_designs DROP COLUMN IF EXISTS button_text;

-- 新しいボタンカスタマイズカラムを追加
ALTER TABLE widget_designs ADD COLUMN IF NOT EXISTS button_image_url TEXT DEFAULT '';
ALTER TABLE widget_designs ADD COLUMN IF NOT EXISTS button_image_radius INTEGER DEFAULT 0;
ALTER TABLE widget_designs ADD COLUMN IF NOT EXISTS has_image BOOLEAN DEFAULT false;
ALTER TABLE widget_designs ADD COLUMN IF NOT EXISTS button_title TEXT DEFAULT '試着する';
ALTER TABLE widget_designs ADD COLUMN IF NOT EXISTS has_title BOOLEAN DEFAULT true;
ALTER TABLE widget_designs ADD COLUMN IF NOT EXISTS button_subtitle TEXT DEFAULT '';
ALTER TABLE widget_designs ADD COLUMN IF NOT EXISTS has_subtitle BOOLEAN DEFAULT false;
