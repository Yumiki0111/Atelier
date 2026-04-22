-- 3D モデル URL 列を廃止（2D 試着・サムネイル等のみ）
ALTER TABLE public.assets DROP COLUMN IF EXISTS glb_url;
ALTER TABLE public.assets DROP COLUMN IF EXISTS model_url;

COMMENT ON TABLE public.assets IS 'Per-size rows for products (e.g. thumbnails); API uses service role.';
