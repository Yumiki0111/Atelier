-- インターフェース設定: フォン内背景・描画キャンパス・CTA 文言
-- widget_designs テーブルが存在するプロジェクトで実行してください。

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS interface_background_color text DEFAULT '#fafafa';

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS canvas_background_color text DEFAULT '#fafafa';

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS cta_cart_label text DEFAULT 'カートに追加';

ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS cta_try_on_label text DEFAULT 'この体型で試着する';
