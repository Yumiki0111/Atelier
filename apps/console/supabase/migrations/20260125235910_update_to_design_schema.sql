-- ============================================
-- データベース設計書に合わせたマイグレーション
-- ============================================

-- 1. 新規テーブル作成

-- shops テーブル
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  platform TEXT CHECK (platform IN ('shopify', 'custom', 'other')),
  api_key TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_domain ON shops(domain);

-- users テーブル
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- size_types テーブル
CREATE TABLE IF NOT EXISTS size_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  sizes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- widget_configs テーブル
CREATE TABLE IF NOT EXISTS widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id)
);

CREATE INDEX IF NOT EXISTS idx_widget_configs_shop_id ON widget_configs(shop_id);

-- 2. 既存テーブルの更新

-- products テーブルにカラム追加
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS size_type_id UUID REFERENCES size_types(id),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- products テーブルのshop_idをUUIDに変更（既存データがある場合は注意）
-- 注意: 既存データがある場合、移行スクリプトが必要
-- ここでは、既存のTEXT型のshop_idを保持しつつ、新しいUUID型のカラムを追加する方法を取る
-- または、既存データをクリアしてから実行する

-- 既存のshop_idをUUIDに変換するための一時カラムを作成
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id_uuid UUID;

-- 既存のshop_idがTEXTの場合、shopsテーブルから対応するUUIDを取得して設定
-- 注意: この処理は既存データの移行が必要な場合のみ実行
-- UPDATE products p
-- SET shop_id_uuid = s.id
-- FROM shops s
-- WHERE p.shop_id = s.name OR p.shop_id = s.id::text;

-- 一時カラムを正式なカラムに置き換える（既存データ移行後）
-- ALTER TABLE products DROP COLUMN shop_id;
-- ALTER TABLE products RENAME COLUMN shop_id_uuid TO shop_id;
-- ALTER TABLE products ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE products ADD CONSTRAINT fk_products_shop_id FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

-- 暫定的に、shop_idをTEXTのまま保持し、外部キー制約は追加しない
-- 本番環境では、データ移行後にUUID型に変更する

-- products テーブルのインデックス追加（カラムが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'size_type_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_products_size_type_id ON products(size_type_id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_products_sku_not_null ON products(sku) WHERE sku IS NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'handle'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_products_handle_not_null ON products(handle) WHERE handle IS NOT NULL;
  END IF;
END $$;

-- assets テーブルのsize CHECK制約を削除（柔軟なサイズ対応）
-- 初期スキーマで設定されたCHECK制約を削除
DO $$ 
BEGIN
  -- CHECK制約が存在する場合のみ削除
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assets_size_check' 
    AND conrelid = 'assets'::regclass
  ) THEN
    ALTER TABLE assets DROP CONSTRAINT assets_size_check;
  END IF;
END $$;

-- assets テーブルにカラム追加
ALTER TABLE assets 
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- assets テーブルのインデックス追加
CREATE INDEX IF NOT EXISTS idx_assets_product_id_size_active ON assets(product_id, size, is_active) WHERE is_active = true;

-- events テーブルのshop_idをUUIDに変更（productsと同様の処理）
ALTER TABLE events ADD COLUMN IF NOT EXISTS shop_id_uuid UUID;

-- events テーブルにカラム追加
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET;

-- events テーブルのインデックス追加
CREATE INDEX IF NOT EXISTS idx_events_shop_id_type_created_at ON events(shop_id, type, created_at DESC);

-- 3. 更新トリガー

DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_widget_configs_updated_at ON widget_configs;
CREATE TRIGGER update_widget_configs_updated_at BEFORE UPDATE ON widget_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. 初期データ投入（size_types）

INSERT INTO size_types (name, display_name, sizes) VALUES
  ('letter', 'レターサイズ', '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb),
  ('number', '数字サイズ', '["1", "2", "3", "4", "5"]'::jsonb),
  ('waist', 'ウエストサイズ', '["28", "30", "32", "34", "36", "38"]'::jsonb),
  ('free', 'フリーサイズ', '["FREE", "F"]'::jsonb),
  ('shoe', '靴サイズ', '["39", "40", "41", "42", "43", "44", "45"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 5. RLS (Row Level Security) の設定

-- RLSを有効化
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_types ENABLE ROW LEVEL SECURITY;

-- shops テーブルのポリシー
DROP POLICY IF EXISTS "Users can view their own shop" ON shops;
CREATE POLICY "Users can view their own shop"
  ON shops FOR SELECT
  USING (
    id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update their shop" ON shops;
CREATE POLICY "Owners and admins can update their shop"
  ON shops FOR UPDATE
  USING (
    id IN (
      SELECT shop_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- users テーブルのポリシー
DROP POLICY IF EXISTS "Users can view members of their shop" ON users;
CREATE POLICY "Users can view members of their shop"
  ON users FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update members" ON users;
CREATE POLICY "Owners and admins can update members"
  ON users FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- products テーブルのポリシー
-- 注意: 既存のDBではproducts.shop_idが既にUUID型に変更されている可能性があるため、
-- カラム型を確認してから適切なポリシーを作成
DROP POLICY IF EXISTS "Users can view products of their shop" ON products;
DO $$
BEGIN
  -- shop_idがTEXT型の場合
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view products of their shop"
      ON products FOR SELECT
      USING (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  -- shop_idがUUID型の場合
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view products of their shop"
      ON products FOR SELECT
      USING (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can create products in their shop" ON products;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can create products in their shop"
      ON products FOR INSERT
      WITH CHECK (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can create products in their shop"
      ON products FOR INSERT
      WITH CHECK (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update products of their shop" ON products;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can update products of their shop"
      ON products FOR UPDATE
      USING (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can update products of their shop"
      ON products FOR UPDATE
      USING (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can delete products of their shop" ON products;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can delete products of their shop"
      ON products FOR DELETE
      USING (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can delete products of their shop"
      ON products FOR DELETE
      USING (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

-- assets テーブルのポリシー
-- 注意: products.shop_idの型に応じて適切なポリシーを作成
DROP POLICY IF EXISTS "Users can view assets of their shop's products" ON assets;
DO $$
BEGIN
  -- products.shop_idがTEXT型の場合
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view assets of their shop''s products"
      ON assets FOR SELECT
      USING (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id::text FROM users WHERE id = auth.uid()
          )
        )
      )');
  -- products.shop_idがUUID型の場合
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view assets of their shop''s products"
      ON assets FOR SELECT
      USING (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id FROM users WHERE id = auth.uid()
          )
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can create assets for their shop's products" ON assets;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can create assets for their shop''s products"
      ON assets FOR INSERT
      WITH CHECK (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id::text FROM users WHERE id = auth.uid()
          )
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can create assets for their shop''s products"
      ON assets FOR INSERT
      WITH CHECK (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id FROM users WHERE id = auth.uid()
          )
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update assets of their shop's products" ON assets;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can update assets of their shop''s products"
      ON assets FOR UPDATE
      USING (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id::text FROM users WHERE id = auth.uid()
          )
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can update assets of their shop''s products"
      ON assets FOR UPDATE
      USING (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id FROM users WHERE id = auth.uid()
          )
        )
      )');
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can delete assets of their shop's products" ON assets;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can delete assets of their shop''s products"
      ON assets FOR DELETE
      USING (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id::text FROM users WHERE id = auth.uid()
          )
        )
      )');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can delete assets of their shop''s products"
      ON assets FOR DELETE
      USING (
        product_id IN (
          SELECT id FROM products
          WHERE shop_id IN (
            SELECT shop_id FROM users WHERE id = auth.uid()
          )
        )
      )');
  END IF;
END $$;

-- events テーブルのポリシー
DROP POLICY IF EXISTS "Anyone can insert events" ON events;
CREATE POLICY "Anyone can insert events"
  ON events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view events of their shop" ON events;
DO $$
BEGIN
  -- events.shop_idがTEXT型の場合
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'shop_id' AND data_type = 'text'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view events of their shop"
      ON events FOR SELECT
      USING (
        shop_id IN (
          SELECT shop_id::text FROM users WHERE id = auth.uid()
        )
      )');
  -- events.shop_idがUUID型の場合
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'shop_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE format('CREATE POLICY "Users can view events of their shop"
      ON events FOR SELECT
      USING (
        shop_id IN (
          SELECT shop_id FROM users WHERE id = auth.uid()
        )
      )');
  END IF;
END $$;

-- widget_configs テーブルのポリシー
DROP POLICY IF EXISTS "Anyone can view widget configs" ON widget_configs;
CREATE POLICY "Anyone can view widget configs"
  ON widget_configs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update widget configs of their shop" ON widget_configs;
CREATE POLICY "Users can update widget configs of their shop"
  ON widget_configs FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM users WHERE id = auth.uid()
    )
  );

-- size_types テーブルのポリシー（全員が閲覧可能）
DROP POLICY IF EXISTS "Anyone can view size types" ON size_types;
CREATE POLICY "Anyone can view size types"
  ON size_types FOR SELECT
  USING (true);
