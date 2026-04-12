-- リモートで古い migration 履歴だけ先に進んでいた場合など、列だけ欠けている状態を修復する。
-- 既存の 20260407180000 / 20260411120000 と同等（IF NOT EXISTS のみ）。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preview_fit_height_cm integer,
  ADD COLUMN IF NOT EXISTS preview_fit_body_val integer;

COMMENT ON COLUMN public.profiles.preview_fit_height_cm IS '試着プレビュー: 身長 cm（150–195）';
COMMENT ON COLUMN public.profiles.preview_fit_body_val IS '試着プレビュー: 体型スライダー 0–100';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_yen integer;

COMMENT ON COLUMN public.products.price_yen IS 'Product price in whole JPY (shop defines tax-in or ex).';
