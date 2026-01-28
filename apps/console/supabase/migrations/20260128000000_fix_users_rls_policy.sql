-- usersテーブルのRLSポリシーを修正
-- 循環参照を完全に解決する

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Users can view members of their shop" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Owners and admins can update members" ON users;

-- SECURITY DEFINER関数を削除（存在する場合）
DROP FUNCTION IF EXISTS public.get_user_shop_id(UUID);

-- 1. ユーザーが自分のレコードを読み取れるポリシー（循環参照なし）
-- これは最初に評価されるため、循環参照が発生しません
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 2. SECURITY DEFINER関数を作成（RLSをバイパスしてshop_idを取得）
-- この関数はRLSをバイパスするため、循環参照が発生しません
CREATE OR REPLACE FUNCTION public.get_user_shop_id(user_id UUID)
RETURNS UUID AS $$
  SELECT shop_id FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. ユーザーが同じshopのメンバーを読み取れるポリシー
-- SECURITY DEFINER関数を使用して循環参照を回避
CREATE POLICY "Users can view members of their shop"
  ON users FOR SELECT
  USING (
    shop_id = public.get_user_shop_id(auth.uid())
  );

-- 4. 更新ポリシー（既存のものを再作成）
CREATE POLICY "Owners and admins can update members"
  ON users FOR UPDATE
  USING (
    shop_id = public.get_user_shop_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
