-- Add custom_sections column to campaigns
-- Each section is a user-defined prompt modifier:
-- { id, title, description, prompt_weight: 'low'|'medium'|'high', sort_order }
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT '[]'::jsonb;

-- GIN index for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_campaigns_custom_sections ON campaigns USING gin(custom_sections);
