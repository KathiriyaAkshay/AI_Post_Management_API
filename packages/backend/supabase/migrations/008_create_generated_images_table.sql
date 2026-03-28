-- Generated images (assets) table
-- Stores every image produced by the AI generation service
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner of this asset (always a customer)
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Optional: links back to the campaign that was used to generate this image
  -- Can be NULL if image was generated ad-hoc
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- The full prompt that was sent to the AI service
  prompt_used TEXT,

  -- URL to the stored image in Supabase Storage
  image_url TEXT NOT NULL,

  -- File metadata
  file_size INTEGER,         -- in bytes
  format TEXT DEFAULT 'PNG', -- PNG, JPEG, WEBP
  width INTEGER,             -- in pixels
  height INTEGER,            -- in pixels
  color_space TEXT DEFAULT 'sRGB',

  -- Extensible JSONB for future fields (e.g. generation_id, provider, seed, etc.)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick per-user asset lookups
CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);

-- Index for per-campaign asset lookups
CREATE INDEX idx_generated_images_campaign_id ON generated_images(campaign_id);

-- Index for date-based queries (dashboard chart data)
CREATE INDEX idx_generated_images_created_at ON generated_images(created_at);

-- Enable RLS
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Admins can read all generated images
CREATE POLICY "Admins can read all generated images"
  ON generated_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Customers can only access their own generated images
CREATE POLICY "Customers can manage own generated images"
  ON generated_images FOR ALL
  USING (user_id = auth.uid());
