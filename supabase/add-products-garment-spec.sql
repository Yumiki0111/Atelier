-- 開発タブから登録する SVG フィット用ペイロード（リグ・デバッグ除いたサニタイズ済み JSON）
-- Supabase SQL Editor または psql で products テーブルがあるプロジェクトに対して実行してください。

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS garment_spec JSONB;

COMMENT ON COLUMN public.products.garment_spec IS 'Sanitized custom garment payload (paths, landmarks, grading, measure vertices). No rig paths or debug flags.';
