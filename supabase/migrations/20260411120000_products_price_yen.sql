-- 商品の販売金額（日本円の整数）。税込／税抜は店舗運用に任せる。
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_yen integer;

COMMENT ON COLUMN public.products.price_yen IS 'Product price in whole JPY (shop defines tax-in or ex).';
