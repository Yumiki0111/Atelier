-- ============================================
-- users テーブルから profiles への移行
-- ============================================
-- 
-- 既存の users テーブルのデータを profiles にコピーし、
-- 今後は profiles ベースの認証フローに統一する。
-- users テーブルは当面残すが、新規登録は profiles のみに書き込む。

-- 既存 users のデータを profiles にコピー（重複は無視）
INSERT INTO public.profiles (id, shop_id, role, email, name, created_at, updated_at)
SELECT 
  u.id,
  u.shop_id,
  u.role,
  u.email,
  u.name,
  u.created_at,
  u.updated_at
FROM public.users u
ON CONFLICT (id) DO NOTHING;

-- 注意: users テーブルは削除せず、段階的に退役させる
-- 今後の新規登録は profiles のみを使用する
