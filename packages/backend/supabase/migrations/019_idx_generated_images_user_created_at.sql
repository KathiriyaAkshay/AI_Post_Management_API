-- List query pattern: WHERE user_id = $1 ORDER BY created_at DESC LIMIT n OFFSET m
-- Composite index avoids sorting large per-user result sets in memory.
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created_at
  ON public.generated_images (user_id, created_at DESC);
