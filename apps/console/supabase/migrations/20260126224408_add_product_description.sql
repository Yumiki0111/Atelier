-- ============================================
-- productsテーブルにdescriptionカラムを追加
-- ============================================

-- products テーブルにdescriptionカラムを追加
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS description TEXT;

-- インデックスは不要（全文検索が必要な場合は後で追加）
