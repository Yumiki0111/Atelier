-- =============================================================================
-- 開発用: 自分をオーナーとして招待する
-- Supabase SQL Editor で実行する前に、下の 'YOUR_EMAIL@example.com' を自分のメールに書き換える
-- 実行後、そのメールでログイン（またはサインアップ）するとダッシュボードに入れる
-- =============================================================================

-- 1. ショップが 1 件も無いときだけ作成
INSERT INTO public.shops (name, enabled)
SELECT '開発用ショップ', true
WHERE NOT EXISTS (SELECT 1 FROM public.shops LIMIT 1);

-- 2. ショップ 1 件の id で、指定メールをオーナーとして招待
-- 下の 'YOUR_EMAIL@example.com' を自分のメールに書き換えてから実行
INSERT INTO public.pending_invites (shop_id, email, role)
SELECT id, 'YOUR_EMAIL@example.com', 'owner'
FROM public.shops
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (shop_id, email) DO NOTHING;
