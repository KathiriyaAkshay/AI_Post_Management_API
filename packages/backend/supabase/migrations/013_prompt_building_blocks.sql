-- Reusable prompt fragments for image-generation / agent orchestration.
-- Global rows (product_type_id IS NULL) apply to everyone; scoped rows override per product type.

CREATE TABLE prompt_building_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_type_id UUID REFERENCES product_types(id) ON DELETE CASCADE,

  -- Stable key for merging: e.g. image_gen_system_preamble, brand_logo_rules
  block_key TEXT NOT NULL,

  -- Grouping: system | style | composition | brand | safety | negative | other
  category TEXT NOT NULL DEFAULT 'other',

  title TEXT,
  content TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_prompt_blocks_global_block_key
  ON prompt_building_blocks(block_key)
  WHERE product_type_id IS NULL;

CREATE UNIQUE INDEX idx_prompt_blocks_scoped_block_key
  ON prompt_building_blocks(product_type_id, block_key)
  WHERE product_type_id IS NOT NULL;

CREATE INDEX idx_prompt_blocks_category ON prompt_building_blocks(category);
CREATE INDEX idx_prompt_blocks_product_type ON prompt_building_blocks(product_type_id);

CREATE OR REPLACE FUNCTION update_prompt_building_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompt_building_blocks_updated_at
  BEFORE UPDATE ON prompt_building_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_building_blocks_updated_at();

ALTER TABLE prompt_building_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prompt_building_blocks"
  ON prompt_building_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
