-- ============================================
-- widget_keysテーブルの作成（2キー構成）
-- ============================================
-- 
-- public_key: Widgetに埋め込む（漏洩前提でOK）
-- secret_key_hash: サーバー専用（ハッシュ化して保存、絶対にクライアントに出さない）

CREATE TABLE IF NOT EXISTS widget_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,  -- 注意: 現時点ではTEXT型（後続のマイグレーションでUUIDに変更）
  public_key TEXT NOT NULL UNIQUE,  -- pub_live_xxx形式（クライアントに埋め込む、漏洩前提でOK）
  secret_key_hash TEXT NOT NULL,  -- secret_keyのハッシュ（bcrypt/argon2、平文保存しない）
  domain TEXT[] NOT NULL DEFAULT '{}',  -- 許可するドメインの配列（JSONBよりtext[]推奨）
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- secret_key_hash + shop_id でユニーク制約（同じハッシュでもshopが違えばOK）
  CONSTRAINT widget_keys_secret_hash_shop_unique UNIQUE (secret_key_hash, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_widget_keys_public_key ON widget_keys(public_key) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_widget_keys_shop_id ON widget_keys(shop_id);

-- 更新トリガー
DROP TRIGGER IF EXISTS update_widget_keys_updated_at ON widget_keys;
CREATE TRIGGER update_widget_keys_updated_at BEFORE UPDATE ON widget_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLSを有効化
ALTER TABLE widget_keys ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（shop_idで分離）
-- 注意: widget_keys.shop_idの型に応じて適切なポリシーを作成
DROP POLICY IF EXISTS "Users can view widget_keys of their shop" ON widget_keys;
DO $$
BEGIN
  -- shop_idがTEXT型の場合
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view widget_keys of their shop"
      ON widget_keys FOR SELECT
      USING (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  -- shop_idがUUID型の場合
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view widget_keys of their shop"
      ON widget_keys FOR SELECT
      USING (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can create widget_keys in their shop" ON widget_keys;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can create widget_keys in their shop"
      ON widget_keys FOR INSERT
      WITH CHECK (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can create widget_keys in their shop"
      ON widget_keys FOR INSERT
      WITH CHECK (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update widget_keys of their shop" ON widget_keys;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can update widget_keys of their shop"
      ON widget_keys FOR UPDATE
      USING (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can update widget_keys of their shop"
      ON widget_keys FOR UPDATE
      USING (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can delete widget_keys of their shop" ON widget_keys;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can delete widget_keys of their shop"
      ON widget_keys FOR DELETE
      USING (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'widget_keys' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can delete widget_keys of their shop"
      ON widget_keys FOR DELETE
      USING (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;
