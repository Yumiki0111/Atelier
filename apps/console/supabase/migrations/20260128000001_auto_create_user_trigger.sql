-- ============================================
-- 正しい設計: auth.usersにユーザーが作成されたら自動的にusersテーブルにレコードを作成
-- ============================================
-- 
-- このトリガーにより、Supabase Authenticationでユーザーが作成された際に、
-- 自動的にusersテーブルにレコードが作成されます。
-- 
-- これにより、手動でSQLを実行する必要がなくなります。

-- 1. 関数を作成: ユーザー作成時に自動的にusersテーブルにレコードを作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_shop_id UUID;
BEGIN
  -- デフォルトショップを取得または作成
  SELECT id INTO default_shop_id
  FROM shops
  WHERE name = 'デフォルトショップ'
  LIMIT 1;

  -- デフォルトショップが存在しない場合は作成
  IF default_shop_id IS NULL THEN
    INSERT INTO shops (id, name, domain, platform)
    VALUES (gen_random_uuid(), 'デフォルトショップ', NULL, 'custom')
    RETURNING id INTO default_shop_id;
  END IF;

  -- usersテーブルにレコードを作成
  INSERT INTO public.users (id, shop_id, email, name, role)
  VALUES (
    NEW.id,
    default_shop_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'owner'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. トリガーを作成: auth.usersにINSERTされたときに実行
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 既存のユーザーに対してusersテーブルにレコードを作成（一度だけ実行）
-- 注意: この部分は既存のユーザーがいる場合のみ実行
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
