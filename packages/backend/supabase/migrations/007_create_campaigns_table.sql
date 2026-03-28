-- Create enum types for campaign parameters
CREATE TYPE visual_style_type AS ENUM ('photorealistic', '3d_render', 'cinematic', 'oil_painting');
CREATE TYPE aspect_ratio_type AS ENUM ('1:1', '16:9', '9:16', '4:3');
CREATE TYPE gender_focus_type AS ENUM ('male', 'female', 'neutral');
CREATE TYPE campaign_status_type AS ENUM ('draft', 'active', 'completed');

-- Campaigns table: supports both customer-owned and admin-prebuilt campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nullable: NULL for prebuilt campaigns (owned by platform, not a user)
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Optional: links to a customer's assigned product type for prompt building
  product_type_id UUID REFERENCES product_types(id) ON DELETE SET NULL,

  -- Tracks which admin created this (for prebuilt campaigns)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- If this was cloned from a prebuilt, store the source campaign ID
  cloned_from UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  visual_style visual_style_type DEFAULT 'photorealistic',
  aspect_ratio aspect_ratio_type DEFAULT '1:1',
  mood TEXT,
  model_enabled BOOLEAN DEFAULT FALSE,
  gender_focus gender_focus_type DEFAULT 'neutral',
  status campaign_status_type DEFAULT 'draft',

  -- URLs stored after upload to Supabase Storage
  product_reference_url TEXT,
  thumbnail_url TEXT,

  -- Platform-wide prebuilt flag: when TRUE, visible to all customers (read-only)
  is_prebuilt BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for customer campaigns lookup
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);

-- Index for prebuilt campaigns lookup
CREATE INDEX idx_campaigns_is_prebuilt ON campaigns(is_prebuilt);

-- Index for cloned campaigns traceability
CREATE INDEX idx_campaigns_cloned_from ON campaigns(cloned_from);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can manage all campaigns (prebuilt and customer-owned)
CREATE POLICY "Admins can manage all campaigns"
  ON campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Customers can read all prebuilt campaigns (platform-wide templates)
CREATE POLICY "Customers can read prebuilt campaigns"
  ON campaigns FOR SELECT
  USING (
    is_prebuilt = TRUE
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'customer'
    )
  );

-- Customers can CRUD their own non-prebuilt campaigns
CREATE POLICY "Customers can manage own campaigns"
  ON campaigns FOR ALL
  USING (
    user_id = auth.uid()
    AND is_prebuilt = FALSE
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'customer'
    )
  );
