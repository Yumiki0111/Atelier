-- 不要なカラムを削除
-- SKU, handle, url, preview_image_url, size_type_id を削除

-- 外部キー制約がある場合は先に削除
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS products_size_type_id_fkey;

-- カラムを削除
ALTER TABLE products 
  DROP COLUMN IF EXISTS sku,
  DROP COLUMN IF EXISTS handle,
  DROP COLUMN IF EXISTS url,
  DROP COLUMN IF EXISTS preview_image_url,
  DROP COLUMN IF EXISTS size_type_id;

-- インデックスも削除（存在する場合）
DROP INDEX IF EXISTS idx_products_size_type_id;
DROP INDEX IF EXISTS idx_products_sku_not_null;
DROP INDEX IF EXISTS idx_products_handle_not_null;
