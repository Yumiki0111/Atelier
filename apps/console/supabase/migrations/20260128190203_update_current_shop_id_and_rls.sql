-- ============================================
-- current_shop_id() を profiles ベースに変更し、RLS を更新
-- ============================================

-- current_shop_id(): profiles から shop_id を取得
CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid()
$$;


-- profiles: 自分自身のみ参照・更新可能
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_select_self"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_self"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- pending_invites: 原則サーバー（Service Role）専用テーブルとする
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- クライアントからは操作させない前提のため、ポリシーは定義しない
-- （Service Role キーでのみアクセス）


-- products: current_shop_id() ベースで shop_id UUID をRLSに適用
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view products of their shop" ON public.products;
DROP POLICY IF EXISTS "Users can create products in their shop" ON public.products;
DROP POLICY IF EXISTS "Users can update products of their shop" ON public.products;
DROP POLICY IF EXISTS "Users can delete products of their shop" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_select"
  ON public.products
  FOR SELECT
  USING (shop_id = current_shop_id());

CREATE POLICY "products_insert"
  ON public.products
  FOR INSERT
  WITH CHECK (shop_id = current_shop_id());

CREATE POLICY "products_update"
  ON public.products
  FOR UPDATE
  USING (shop_id = current_shop_id());

CREATE POLICY "products_delete"
  ON public.products
  FOR DELETE
  USING (shop_id = current_shop_id());


-- assets: shop_id UUID でテナント分離
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assets of their shop" ON public.assets;
DROP POLICY IF EXISTS "Users can create assets in their shop" ON public.assets;
DROP POLICY IF EXISTS "Users can update assets of their shop" ON public.assets;
DROP POLICY IF EXISTS "Users can delete assets of their shop" ON public.assets;
DROP POLICY IF EXISTS "assets_select" ON public.assets;
DROP POLICY IF EXISTS "assets_insert" ON public.assets;
DROP POLICY IF EXISTS "assets_update" ON public.assets;
DROP POLICY IF EXISTS "assets_delete" ON public.assets;

CREATE POLICY "assets_select"
  ON public.assets
  FOR SELECT
  USING (shop_id = current_shop_id());

CREATE POLICY "assets_insert"
  ON public.assets
  FOR INSERT
  WITH CHECK (shop_id = current_shop_id());

CREATE POLICY "assets_update"
  ON public.assets
  FOR UPDATE
  USING (shop_id = current_shop_id());

CREATE POLICY "assets_delete"
  ON public.assets
  FOR DELETE
  USING (shop_id = current_shop_id());


-- widget_keys: 原則サーバー専用。RLSは Service Role 前提。
ALTER TABLE public.widget_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view widget_keys of their shop" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can create widget_keys in their shop" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can update widget_keys of their shop" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can delete widget_keys of their shop" ON public.widget_keys;

-- 通常ユーザーからの操作は想定しないため、ポリシーは定義しない。

