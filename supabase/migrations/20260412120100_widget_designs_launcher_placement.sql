-- How the launcher is placed on the storefront (matches snippet data-fitlook-placement).
ALTER TABLE public.widget_designs
  ADD COLUMN IF NOT EXISTS launcher_placement text NOT NULL DEFAULT 'floating';
