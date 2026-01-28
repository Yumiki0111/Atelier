-- ============================================
-- users テーブルの削除
-- ============================================
-- 
-- profiles テーブルへの完全移行が完了したため、
-- 旧 users テーブルを削除します。
-- 
-- 注意: データは既に profiles に移行済み（20260128190832_migrate_users_to_profiles.sql）

-- 1. users テーブルに関連する外部キー制約がある場合は先に削除
-- （現在の設計では users テーブルへの外部キーはないはず）

-- 2. users テーブルのRLSポリシーを削除
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
DROP POLICY IF EXISTS "Users can view members of their shop" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.users;

-- 3. users テーブルを削除（CASCADE で関連オブジェクトも削除）
DROP TABLE IF EXISTS public.users CASCADE;

-- 注意: この時点で users テーブルは完全に削除されます
-- profiles テーブルがすべての認証・ユーザー情報を管理します
