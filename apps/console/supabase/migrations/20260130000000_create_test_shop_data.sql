-- ============================================
-- テスト用shopデータの作成
-- ============================================

-- テスト用shopの作成（既に存在する場合はスキップ）
INSERT INTO shops (id, name, domain, platform, settings, created_at, updated_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Test Shop 1',
    'test1.example.com',
    'custom',
    '{"enabled": true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Test Shop 2',
    'test2.example.com',
    'custom',
    '{"enabled": true}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- テスト用商品の作成（shop_idはTEXT型として扱う）
-- 注意: productsテーブルのshop_idはTEXT型なので、UUIDをTEXTに変換
INSERT INTO products (shop_id, name, brand, sku, handle, url, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'デニムジャケット',
  'ATELIER BRAND',
  'DJ-001',
  'denim-jacket',
  'https://example.com/products/denim-jacket',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM products 
  WHERE shop_id = '00000000-0000-0000-0000-000000000001' 
  AND sku = 'DJ-001'
)
RETURNING id;

-- テスト用商品2（ダブルジャケット）
INSERT INTO products (shop_id, name, brand, sku, handle, url, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::text,
  'ダブルジャケット',
  'ATELIER BRAND',
  'DBL-JKT-001',
  'double-jacket',
  'https://example.com/products/double-jacket',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM products 
  WHERE shop_id = '00000000-0000-0000-0000-000000000001' 
  AND sku = 'DBL-JKT-001'
)
RETURNING id;

-- テスト用商品3（レザージャケット）
INSERT INTO products (shop_id, name, brand, sku, handle, url, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::text,
  'レザージャケット',
  'ATELIER BRAND',
  'LTH-JKT-001',
  'leather-jacket',
  'https://example.com/products/leather-jacket',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM products 
  WHERE shop_id = '00000000-0000-0000-0000-000000000001' 
  AND handle = 'leather-jacket'
)
RETURNING id;

-- テスト用商品4（ウールコート）
INSERT INTO products (shop_id, name, brand, sku, handle, url, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::text,
  'ウールコート',
  'ATELIER BRAND',
  'WL-CT-001',
  'wool-coat',
  'https://example.com/products/wool-coat',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM products 
  WHERE shop_id = '00000000-0000-0000-0000-000000000001' 
  AND url = 'https://example.com/products/wool-coat'
)
RETURNING id;

-- テスト用アセットの作成（各商品にMサイズのアセットを追加）
-- 注意: shop_idを指定する必要がある（NOT NULL制約のため）
INSERT INTO assets (product_id, shop_id, size, glb_url, version, created_at, updated_at)
SELECT 
  p.id,
  p.shop_id,  -- shop_idを追加
  'M',
  'http://localhost:3000/3d/model_men.glb',
  1,
  NOW(),
  NOW()
FROM products p
WHERE p.shop_id = '00000000-0000-0000-0000-000000000001'::text
  AND NOT EXISTS (
    SELECT 1 FROM assets a 
    WHERE a.product_id = p.id 
    AND a.size = 'M'
  );

-- 追加のサイズ（S, L）も作成
-- 注意: shop_idを指定する必要がある（NOT NULL制約のため）
-- unnestをLATERAL JOINで使用
INSERT INTO assets (product_id, shop_id, size, glb_url, version, created_at, updated_at)
SELECT 
  p.id,
  p.shop_id,
  size_val,
  'http://localhost:3000/3d/model_men.glb',
  1,
  NOW(),
  NOW()
FROM products p
CROSS JOIN LATERAL unnest(ARRAY['S', 'L']::text[]) AS size_val
WHERE p.shop_id = '00000000-0000-0000-0000-000000000001'::text
  AND NOT EXISTS (
    SELECT 1 FROM assets a 
    WHERE a.product_id = p.id 
    AND a.size = size_val
  );
