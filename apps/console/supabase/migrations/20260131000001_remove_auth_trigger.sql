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

-- 3. バックフィル処理は削除
-- 注意: public.usersテーブルは既に削除されており、profilesテーブルに移行済みのため、
-- この処理は不要です。既存のauth.usersの移行は20260128190832_migrate_users_to_profiles.sqlで完了しています。
