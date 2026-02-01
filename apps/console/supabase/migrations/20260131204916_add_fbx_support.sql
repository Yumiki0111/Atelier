-- Add model_url column to assets table (supporting both GLB and FBX)
-- Keep glb_url for backward compatibility, but use model_url going forward
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model_url TEXT;

-- Migrate existing glb_url data to model_url
UPDATE assets SET model_url = glb_url WHERE model_url IS NULL AND glb_url IS NOT NULL;

-- Make model_url NOT NULL after migration (but allow NULL temporarily for backward compatibility)
-- We'll make it NOT NULL in a future migration after all data is migrated
