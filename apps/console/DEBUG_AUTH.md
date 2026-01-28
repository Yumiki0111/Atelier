# 認証デバッグガイド

## 確認すべきポイント

### 1. データベースの状態確認

Supabaseダッシュボードで以下を確認：

```sql
-- usersテーブルにレコードが存在するか確認
SELECT id, email, shop_id, role, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- auth.usersとusersテーブルの整合性確認
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  pu.id as users_table_id,
  pu.shop_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

-- shopsテーブルの確認
SELECT id, name, platform, created_at 
FROM shops 
ORDER BY created_at DESC;
```

### 2. RLSポリシーの確認

```sql
-- usersテーブルのRLSポリシー確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';
```

### 3. ブラウザコンソールで確認

ログイン時に以下のログが出力されることを確認：

```
[AuthContext] Attempting login for email: ...
[AuthContext] Login successful, user ID: ...
[AuthContext] Auth state changed: SIGNED_IN
[AuthContext] fetchShopId called for userId: ...
[shop-id API] GET request received
[shop-id API] Fetching shop_id for user: ...
[shop-id API] Query result: ...
[AuthContext] shop_id found: ...
[LoginPage] User is authenticated, redirecting to home
```

### 4. よくある問題

#### 問題1: usersテーブルにレコードが存在しない
- **症状**: `shop-id API`で404エラー
- **解決策**: `shop-id API`で自動作成されるが、手動で確認

#### 問題2: RLSポリシーでアクセス拒否
- **症状**: `shop-id API`で500エラー
- **解決策**: Service Role Keyを使用しているため、RLSはバイパスされるはず

#### 問題3: セッションが保存されない
- **症状**: ページリロードでログアウトされる
- **解決策**: `persistSession: true`が設定されているか確認

#### 問題4: isAuthenticatedが更新されない
- **症状**: ログイン成功してもリダイレクトされない
- **解決策**: `setUser`が正しく呼ばれているか確認
