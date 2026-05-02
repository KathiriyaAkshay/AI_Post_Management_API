-- Display title for asset library (optional; falls back to prompt in UI if null)
ALTER TABLE generated_images
  ADD COLUMN IF NOT EXISTS name TEXT;

-- User favorite / like state for asset cards
ALTER TABLE generated_images
  ADD COLUMN IF NOT EXISTS is_liked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN generated_images.name IS 'Short display title (e.g. Cyberpunk City); optional';
COMMENT ON COLUMN generated_images.is_liked IS 'User favorite / heart toggle';
