-- ショップごとのウィジェット UI 設定（インターフェース色・CTA 文言・アクセント色など）
-- 後続の ALTER マイグレーションより先に実行する（テーブルが無いと ALTER が失敗するため）

CREATE TABLE IF NOT EXISTS public.widget_designs (
  shop_id uuid NOT NULL PRIMARY KEY REFERENCES public.shops (id) ON DELETE CASCADE,
  background_image text,
  background_color text,
  theme text DEFAULT 'light',
  button_color text DEFAULT '#ffffff',
  button_text text DEFAULT '',
  button_shape text DEFAULT 'pill',
  button_image_url text,
  interface_background_color text DEFAULT '#fafafa',
  canvas_background_color text DEFAULT '#fafafa',
  cta_cart_label text DEFAULT 'カートに追加',
  cta_try_on_label text DEFAULT 'この体型で試着する',
  cta_accent_color text DEFAULT '#3d3835',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
