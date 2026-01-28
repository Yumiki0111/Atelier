-- ============================================
-- current_shop_id()関数の作成
-- ============================================
-- 
-- RLSポリシーで使用する関数
-- ⚠️ SECURITY DEFINERは使わない（危険になりうる）
-- SECURITY INVOKER（デフォルト）でOK

-- current_shop_id()関数を作成
CREATE OR REPLACE FUNCTION current_shop_id()
RETURNS UUID
LANGUAGE SQL
STABLE
-- SECURITY INVOKER がデフォルト（明示的に書かなくてもOK）
AS $$
  SELECT shop_id FROM public.users WHERE id = auth.uid()
$$;

-- インデックスを追加（関数の性能向上）
CREATE INDEX IF NOT EXISTS idx_users_id_shop_id ON users(id, shop_id);
