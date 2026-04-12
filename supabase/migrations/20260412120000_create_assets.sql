-- 商品あたりの 3D アセット（サイズ・バージョン）。API は service_role でアクセス。
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  size text NOT NULL,
  glb_url text,
  model_url text,
  thumbnail_url text,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_shop_id_idx ON public.assets (shop_id);
CREATE INDEX IF NOT EXISTS assets_product_id_size_version_idx
  ON public.assets (product_id, size, version DESC);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.assets IS 'Per-size 3D model URLs (GLB/FBX) for widget try-on; API uses service role.';
