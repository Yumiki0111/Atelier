-- ウィジェット・コンソール共通のイベントログ（アナリティクス用）
-- PostgREST: public.events が無いと /api/analytics と /api/events が失敗します

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

CREATE INDEX IF NOT EXISTS events_type_idx
  ON public.events (type);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.events IS 'Widget analytics events; accessed via service_role API only.';
