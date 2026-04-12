-- Supabase SQL Editor または psql で、既存の products テーブルに対して実行してください。
-- （migrations/20260411120000_products_price_yen.sql と同等）

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_yen integer;

COMMENT ON COLUMN public.products.price_yen IS 'Product price in whole JPY (shop defines tax-in or ex).';
