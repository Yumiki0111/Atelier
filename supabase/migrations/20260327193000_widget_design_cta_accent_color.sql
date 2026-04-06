-- 試着 UI のアクセント（カート／体型確定・サイズ選択・スライダー等）
ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS cta_accent_color text DEFAULT '#3d3835';
