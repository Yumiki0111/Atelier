-- ============================================
-- statusカラムを削除するマイグレーション
-- ============================================

-- products テーブルからstatusカラムを削除
ALTER TABLE products DROP COLUMN IF EXISTS status;

-- statusに関連するインデックスを削除
DROP INDEX IF EXISTS idx_products_status;
DROP INDEX IF EXISTS idx_products_shop_id_status;

-- 新しいインデックスを作成（statusなし）
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
