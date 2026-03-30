-- 手動実行用。先に `migrations/20260327180000_create_widget_designs.sql` でテーブル作成済みであること。
-- widget_designs に未追加のカラムのみ追加する。

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS interface_background_color text DEFAULT '#fafafa';

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS canvas_background_color text DEFAULT '#fafafa';

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS cta_cart_label text DEFAULT 'カートに追加';

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS cta_try_on_label text DEFAULT 'この体型で試着する';

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS cta_accent_color text DEFAULT '#3d3835';
