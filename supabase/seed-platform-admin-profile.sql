-- =============================================================================
-- auth.users に運営メール（例: info@fitandlook.com）がある状態で
-- public.profiles を追加する。Supabase SQL Editor（service_role）で実行。
--
-- アプリの post-login は「profiles が既にあれば成功」する。
-- ★ 複数ショップがある場合は、下のサブクエリで意図した shop_id を選ぶこと。
-- =============================================================================

-- ショップが 1 件も無いときだけ「運営」用を作成
INSERT INTO public.shops (name, enabled)
SELECT 'FIT&LOOK 運営', true
WHERE NOT EXISTS (SELECT 1 FROM public.shops LIMIT 1);

INSERT INTO public.profiles (id, shop_id, role, email, name)
SELECT
  u.id,
  COALESCE(
    (SELECT id FROM public.shops WHERE name = 'FIT&LOOK 運営' ORDER BY created_at DESC LIMIT 1),
    (SELECT id FROM public.shops ORDER BY created_at ASC LIMIT 1)
  ),
  'owner',
  u.email,
  NULLIF(TRIM(u.raw_user_meta_data->>'name'), '')
FROM auth.users u
WHERE lower(u.email) = lower('info@fitandlook.com')
ON CONFLICT (id) DO UPDATE SET
  shop_id = EXCLUDED.shop_id,
  role = EXCLUDED.role,
  email = EXCLUDED.email;
