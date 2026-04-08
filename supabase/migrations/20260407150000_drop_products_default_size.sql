-- 商品の初期表示サイズ（DB 列）は不要になったため削除（列が無い環境では何もしない）
ALTER TABLE public.products
DROP COLUMN IF EXISTS default_size;
