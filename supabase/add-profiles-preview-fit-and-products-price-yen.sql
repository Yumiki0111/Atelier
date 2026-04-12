-- SQL Editor 用（migrations/20260413120000_repair_profiles_preview_fit_and_products_price_yen.sql と同等）

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preview_fit_height_cm integer,
  ADD COLUMN IF NOT EXISTS preview_fit_body_val integer;

COMMENT ON COLUMN public.profiles.preview_fit_height_cm IS '試着プレビュー: 身長 cm（150–195）';
COMMENT ON COLUMN public.profiles.preview_fit_body_val IS '試着プレビュー: 体型スライダー 0–100';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_yen integer;

COMMENT ON COLUMN public.products.price_yen IS 'Product price in whole JPY (shop defines tax-in or ex).';
