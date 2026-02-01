-- ============================================
-- events, conversations, messagesテーブルの外部キー制約に
-- ON DELETE CASCADE を追加
-- ============================================

-- events テーブルの外部キー制約を更新
-- 既存の制約を削除（PostgreSQLが自動生成した名前の可能性があるため、全ての可能性を試す）
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- 既存の外部キー制約を検索して削除
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'events'::regclass
      AND contype = 'f'
      AND confrelid = 'products'::regclass
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'events'::regclass AND attname = 'product_id')];
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE events DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- ON DELETE CASCADE を設定した新しい制約を追加
ALTER TABLE events
  ADD CONSTRAINT events_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE CASCADE;

-- conversations テーブルの外部キー制約を更新
-- 既存の制約を削除（PostgreSQLが自動生成した名前の可能性があるため、全ての可能性を試す）
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- 既存の外部キー制約を検索して削除
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'conversations'::regclass
      AND contype = 'f'
      AND confrelid = 'products'::regclass
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'conversations'::regclass AND attname = 'product_id')];
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE conversations DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- ON DELETE CASCADE を設定した新しい制約を追加
ALTER TABLE conversations
  ADD CONSTRAINT conversations_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE CASCADE;

-- messages テーブルの外部キー制約を更新
-- 既存の制約を削除（PostgreSQLが自動生成した名前の可能性があるため、全ての可能性を試す）
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- 既存の外部キー制約を検索して削除
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'messages'::regclass
      AND contype = 'f'
      AND confrelid = 'products'::regclass
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'messages'::regclass AND attname = 'product_id')];
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE messages DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- ON DELETE CASCADE を設定した新しい制約を追加
ALTER TABLE messages
  ADD CONSTRAINT messages_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE CASCADE;
