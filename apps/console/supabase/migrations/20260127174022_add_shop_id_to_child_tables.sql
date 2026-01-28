-- ============================================
-- 子テーブルにshop_idを追加
-- ============================================
-- 
-- assets, messagesテーブルにshop_idを冗長に保持
-- RLSの簡素化、クエリ性能向上、事故防止のため

-- 1. assetsテーブルにshop_idを追加
ALTER TABLE assets ADD COLUMN IF NOT EXISTS shop_id TEXT;

-- 2. 既存データのshop_idを設定（product経由）
-- 注意: 現時点ではproducts.shop_idはTEXT型なので、そのまま設定
UPDATE assets a
SET shop_id = p.shop_id
FROM products p
WHERE a.product_id = p.id
  AND a.shop_id IS NULL;

-- 3. shop_idをNOT NULLに（既存データがある場合は注意）
-- まず、NULLが無いことを確認してから実行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM assets WHERE shop_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot set shop_id to NOT NULL: some assets have NULL shop_id. Please fix data first.';
  END IF;
END $$;

ALTER TABLE assets ALTER COLUMN shop_id SET NOT NULL;

-- 4. messagesテーブルにshop_idを追加
ALTER TABLE messages ADD COLUMN IF NOT EXISTS shop_id TEXT;

-- 5. 既存データのshop_idを設定（conversation経由）
UPDATE messages m
SET shop_id = c.shop_id
FROM conversations c
WHERE m.conversation_id = c.id
  AND m.shop_id IS NULL;

-- 6. shop_idをNOT NULLに
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM messages WHERE shop_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot set shop_id to NOT NULL: some messages have NULL shop_id. Please fix data first.';
  END IF;
END $$;

ALTER TABLE messages ALTER COLUMN shop_id SET NOT NULL;

-- 7. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_assets_shop_id ON assets(shop_id);
CREATE INDEX IF NOT EXISTS idx_messages_shop_id ON messages(shop_id);
