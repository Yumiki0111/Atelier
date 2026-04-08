-- =============================================================================
-- Atelier Console: 認証・ショップ用スキーマとRLS
-- Supabase SQL Editor で実行して、profiles / pending_invites / shops / widget_keys を用意する
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. shops
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '新規ショップ',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. profiles (auth.users と 1:1、shop_id で所属ショップを表現)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーが自分のプロフィールのみ読む（API は service_role で RLS をバイパス）
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 3. pending_invites (招待未受諾のメール。post-login で profiles に昇格)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, email)
);

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. widget_keys
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.widget_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL UNIQUE,
  secret_key_hash TEXT NOT NULL,
  allowed_domains TEXT[] DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_keys ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 既存テーブルにカラムがない場合の補足（必要なら手動で ALTER を実行）
-- profiles: id, shop_id, role, email, name, preview_fit_height_cm, preview_fit_body_val, created_at, updated_at
-- pending_invites: id, shop_id, email, role, accepted_at, created_at, UNIQUE(shop_id, email)
-- shops: id, name, enabled, created_at, updated_at
-- widget_keys: id, shop_id, public_key, secret_key_hash, allowed_domains, enabled, created_at, updated_at
-- -----------------------------------------------------------------------------
-- 5. widget_designs（ウィジェットの見た目・CTA。shop_id で 1 行）
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6. events（ウィジェットのイベントログ・アナリティクス。API は service_role のみ）
-- 詳細は supabase/migrations/20260407120000_create_events.sql
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops (id) ON DELETE CASCADE,
  product_id uuid,
  type text NOT NULL,
  meta jsonb,
  session_id text,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_shop_id_created_at_idx
  ON public.events (shop_id, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 7. demo_share_links（営業用公開デモ URL /share/{token}。詳細は migrations）
-- -----------------------------------------------------------------------------
-- 20260408140000_demo_share_links.sql を参照

-- =============================================================================
