-- ============================================
-- RLSポリシーをcurrent_shop_id()関数で更新
-- ============================================
-- 
-- 既存のRLSポリシーをcurrent_shop_id()関数を使用するように更新
-- これにより、ポリシーが簡潔になり、パフォーマンスも向上

-- 1. usersテーブルのRLSポリシー
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can view members of their shop" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view members of their shop"
  ON users FOR SELECT
  USING (shop_id = current_shop_id());

CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- 2. productsテーブルのRLSポリシー
-- 注意: 現時点ではproducts.shop_idはTEXT型なので、型変換が必要
DROP POLICY IF EXISTS "Users can view products of their shop" ON products;
DROP POLICY IF EXISTS "Users can create products in their shop" ON products;
DROP POLICY IF EXISTS "Users can update products of their shop" ON products;
DROP POLICY IF EXISTS "Users can delete products of their shop" ON products;

CREATE POLICY "Users can view products of their shop"
  ON products FOR SELECT
  USING (shop_id = current_shop_id()::text);

CREATE POLICY "Users can create products in their shop"
  ON products FOR INSERT
  WITH CHECK (shop_id = current_shop_id()::text);

CREATE POLICY "Users can update products of their shop"
  ON products FOR UPDATE
  USING (shop_id = current_shop_id()::text);

CREATE POLICY "Users can delete products of their shop"
  ON products FOR DELETE
  USING (shop_id = current_shop_id()::text);

-- 3. assetsテーブルのRLSポリシー
DROP POLICY IF EXISTS "Users can view assets of their shop's products" ON assets;
DROP POLICY IF EXISTS "Users can create assets for their shop's products" ON assets;
DROP POLICY IF EXISTS "Users can update assets of their shop's products" ON assets;
DROP POLICY IF EXISTS "Users can delete assets of their shop's products" ON assets;

CREATE POLICY "Users can view assets of their shop"
  ON assets FOR SELECT
  USING (shop_id = current_shop_id()::text);

CREATE POLICY "Users can create assets in their shop"
  ON assets FOR INSERT
  WITH CHECK (shop_id = current_shop_id()::text);

CREATE POLICY "Users can update assets of their shop"
  ON assets FOR UPDATE
  USING (shop_id = current_shop_id()::text);

CREATE POLICY "Users can delete assets of their shop"
  ON assets FOR DELETE
  USING (shop_id = current_shop_id()::text);

-- 4. eventsテーブルのRLSポリシー
DROP POLICY IF EXISTS "Users can view events of their shop" ON events;

CREATE POLICY "Users can view events of their shop"
  ON events FOR SELECT
  USING (shop_id = current_shop_id()::text);

-- 5. conversationsテーブルのRLSポリシー
DROP POLICY IF EXISTS "Users can view conversations of their shop" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations in their shop" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations of their shop" ON conversations;

CREATE POLICY "Users can view conversations of their shop"
  ON conversations FOR SELECT
  USING (shop_id = current_shop_id()::text);

CREATE POLICY "Users can create conversations in their shop"
  ON conversations FOR INSERT
  WITH CHECK (shop_id = current_shop_id()::text);

CREATE POLICY "Users can update conversations of their shop"
  ON conversations FOR UPDATE
  USING (shop_id = current_shop_id()::text);

-- 6. messagesテーブルのRLSポリシー
DROP POLICY IF EXISTS "Users can view messages of their shop's conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their shop's conversations" ON messages;

CREATE POLICY "Users can view messages of their shop"
  ON messages FOR SELECT
  USING (shop_id = current_shop_id()::text);

CREATE POLICY "Users can create messages in their shop"
  ON messages FOR INSERT
  WITH CHECK (shop_id = current_shop_id()::text);

-- 7. widget_configsテーブルのRLSポリシー
DROP POLICY IF EXISTS "Users can update widget configs of their shop" ON widget_configs;

CREATE POLICY "Users can view widget configs of their shop"
  ON widget_configs FOR SELECT
  USING (shop_id = current_shop_id());

CREATE POLICY "Users can update widget configs of their shop"
  ON widget_configs FOR UPDATE
  USING (shop_id = current_shop_id());
