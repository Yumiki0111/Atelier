-- ============================================
-- auth.usersのトリガーを削除
-- ============================================
-- 
-- auth.usersテーブルに設定されているトリガーを削除し、
-- signup APIで手動でusersテーブルにレコードを作成する方式に統一します。
-- 
-- これにより、トリガーによるエラーを回避し、より制御可能な認証フローを実現します。

-- 1. トリガーを削除（存在する場合のみ）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. トリガー関数を削除（他の場所で使用されていない場合）
-- 注意: 他のトリガーで使用されている可能性があるため、CASCADEは使用しない
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. 既存のauth.usersに存在するが、public.usersに存在しないユーザーを処理
-- これは一度だけ実行されるバックフィル処理です
DO $$
DECLARE
  default_shop_id UUID;
  auth_user RECORD;
BEGIN
  -- デフォルトショップを取得または作成
  SELECT id INTO default_shop_id
  FROM shops
  WHERE name = 'デフォルトショップ'
  LIMIT 1;

  IF default_shop_id IS NULL THEN
    INSERT INTO shops (id, name, domain, platform)
    VALUES (gen_random_uuid(), 'デフォルトショップ', NULL, 'custom')
    RETURNING id INTO default_shop_id;
  END IF;

  -- auth.usersに存在するが、public.usersに存在しないユーザーを処理
  FOR auth_user IN
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'name', '') as name
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    INSERT INTO public.users (id, shop_id, email, name, role)
    VALUES (
      auth_user.id,
      default_shop_id,
      auth_user.email,
      auth_user.name,
      'owner'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
