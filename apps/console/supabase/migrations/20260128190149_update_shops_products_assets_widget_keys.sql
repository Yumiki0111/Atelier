-- ============================================
-- shops / products / assets / widget_keys の仕様反映
-- ============================================

-- shops: enabled フラグを追加（既存カラムは維持）
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;


-- products: external_product_id と (shop_id, external_product_id) の一意制約
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_product_id TEXT;

-- 既存のRLSポリシーは shop_id TEXT を前提に定義されているため、
-- 型変更前に一度削除しておく（後続のmigrationでprofiles/current_shop_id()ベースに再定義する）。
-- 全てのproductsテーブルのポリシーを削除（名前が異なる可能性があるため、全て削除）
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', r.policyname);
  END LOOP;
END $$;

-- products.shop_id は初期スキーマで TEXT 型だが、
-- マルチテナント設計に合わせて UUID 型に揃える。
-- すでにUUID形式の文字列で保存されていることを前提に変換する。
ALTER TABLE public.products
  ALTER COLUMN shop_id TYPE UUID USING shop_id::uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'products_shop_external_unique'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_shop_external_unique
      UNIQUE (shop_id, external_product_id);
  END IF;
END $$;


-- assets: shop_id を UUID 型で保持し、products と複合FKで同一shopを強制
-- 既に TEXT 型の shop_id がある前提で UUID へ変換する。
-- 全てのassetsテーブルのポリシーを削除（名前が異なる可能性があるため、全て削除）
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'assets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.assets', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.assets
  ALTER COLUMN shop_id TYPE UUID USING shop_id::uuid;

-- products に UNIQUE (shop_id, id) を追加（assets の複合FK用）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_shop_id_id_unique'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_shop_id_id_unique UNIQUE (shop_id, id);
  END IF;
END $$;

-- assets に複合FKを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_shop_product_fk'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_shop_product_fk
      FOREIGN KEY (shop_id, product_id)
      REFERENCES public.products (shop_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;


-- widget_keys: スキーマを仕様に合わせる
-- shop_id を UUID 型に変更する前に、既存のRLSポリシーを削除
-- 全てのwidget_keysテーブルのポリシーを削除（名前が異なる可能性があるため、全て削除）
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'widget_keys'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.widget_keys', r.policyname);
  END LOOP;
END $$;

-- shop_id を UUID 型に変更
ALTER TABLE public.widget_keys
  ALTER COLUMN shop_id TYPE UUID USING shop_id::uuid;

-- domain カラムを allowed_domains にリネーム（text[]）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'widget_keys'
      AND  column_name  = 'domain'
  ) THEN
    ALTER TABLE public.widget_keys
      RENAME COLUMN domain TO allowed_domains;
  END IF;
END $$;

ALTER TABLE public.widget_keys
  ALTER COLUMN enabled SET NOT NULL,
  ALTER COLUMN enabled SET DEFAULT TRUE;

