-- 営業・デモ用: メール等で送る短い URL（/share/{token}）と商品を紐づける
CREATE TABLE IF NOT EXISTS public.demo_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_demo_share_links_shop ON public.demo_share_links(shop_id);
CREATE INDEX IF NOT EXISTS idx_demo_share_links_product ON public.demo_share_links(product_id);

COMMENT ON TABLE public.demo_share_links IS '営業共有デモ URL 用。token で公開ページから product / widget を解決する';
