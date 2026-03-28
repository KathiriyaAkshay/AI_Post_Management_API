-- ─────────────────────────────────────────────────────────────────
-- campaign_config_options
--
-- Drives the dropdown/toggle options shown in the campaign builder
-- and studio. Options can be global (product_type_id IS NULL) or
-- scoped to a specific product type.
--
-- Resolution rule (enforced in backend service):
--   1. Use product-type-specific options when they exist for a group.
--   2. Fall back to global defaults (product_type_id IS NULL).
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE campaign_config_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = global platform default; non-null = override for that product type
  product_type_id UUID REFERENCES product_types(id) ON DELETE CASCADE,

  -- Which control group this option belongs to
  option_type     TEXT NOT NULL,
  CONSTRAINT chk_option_type CHECK (
    option_type IN ('visual_style', 'aspect_ratio', 'mood', 'gender_focus')
  ),

  value           TEXT NOT NULL,   -- stored in campaigns table
  label           TEXT NOT NULL,   -- shown in UI
  description     TEXT,            -- tooltip / hint text

  -- icon: Material Symbol name (used for visual_style, gender_focus)
  icon            TEXT,

  -- gradient classes for mood colour swatches (Tailwind CSS)
  gradient_from   TEXT,
  gradient_to     TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate values per option group scope
CREATE UNIQUE INDEX idx_config_options_global_unique
  ON campaign_config_options(option_type, value)
  WHERE product_type_id IS NULL;

CREATE UNIQUE INDEX idx_config_options_type_unique
  ON campaign_config_options(product_type_id, option_type, value)
  WHERE product_type_id IS NOT NULL;

-- Fast lookup by product type + type
CREATE INDEX idx_config_options_product_type ON campaign_config_options(product_type_id, option_type);

-- ─────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE campaign_config_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaign_config_options"
  ON campaign_config_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can read active options"
  ON campaign_config_options FOR SELECT
  USING (is_active = TRUE AND auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────
-- SEED: Global platform defaults
-- These become the fallback when no product-type override exists.
-- ─────────────────────────────────────────────────────────────────

-- Visual Styles
INSERT INTO campaign_config_options (option_type, value, label, icon, sort_order) VALUES
  ('visual_style', 'photorealistic', 'Photorealistic', 'photo_camera',   1),
  ('visual_style', '3d_render',      '3D Render',      'view_in_ar',     2),
  ('visual_style', 'cinematic',      'Cinematic',      'movie',          3),
  ('visual_style', 'oil_painting',   'Oil Painting',   'brush',          4),
  ('visual_style', 'flat_lay',       'Flat Lay',       'grid_on',        5),
  ('visual_style', 'macro',          'Macro',          'zoom_in',        6);

-- Aspect Ratios
INSERT INTO campaign_config_options (option_type, value, label, sort_order) VALUES
  ('aspect_ratio', '1:1',  '1:1 (Square)',    1),
  ('aspect_ratio', '16:9', '16:9 (Landscape)',2),
  ('aspect_ratio', '9:16', '9:16 (Portrait)', 3),
  ('aspect_ratio', '4:3',  '4:3 (Standard)',  4),
  ('aspect_ratio', '4:5',  '4:5 (Portrait)',  5);

-- Moods (gradient_from / gradient_to are Tailwind utility classes)
INSERT INTO campaign_config_options (option_type, value, label, gradient_from, gradient_to, sort_order) VALUES
  ('mood', 'professional',    'Professional',    'from-gray-400',   'to-gray-700',    1),
  ('mood', 'elegant',         'Elegant',         'from-purple-400', 'to-pink-600',    2),
  ('mood', 'vibrant',         'Vibrant',         'from-yellow-200', 'to-yellow-500',  3),
  ('mood', 'minimalist',      'Minimalist',      'from-slate-200',  'to-slate-400',   4),
  ('mood', 'warm',            'Warm',            'from-orange-400', 'to-red-500',     5),
  ('mood', 'cool',            'Cool',            'from-blue-400',   'to-indigo-600',  6),
  ('mood', 'moody',           'Moody',           'from-slate-400',  'to-slate-800',   7),
  ('mood', 'energetic',       'Energetic',       'from-green-400',  'to-emerald-600', 8),
  ('mood', 'bright',          'Bright',          'from-yellow-300', 'to-amber-500',   9),
  ('mood', 'golden_hour',     'Golden Hour',     'from-yellow-400', 'to-orange-600',  10),
  ('mood', 'neon_futuristic', 'Neon / Futuristic','from-cyan-400',  'to-purple-600',  11);

-- Gender Focus
INSERT INTO campaign_config_options (option_type, value, label, icon, sort_order) VALUES
  ('gender_focus', 'neutral', 'Neutral / No Model', 'person',  1),
  ('gender_focus', 'male',    'Male Model',          'man',     2),
  ('gender_focus', 'female',  'Female Model',        'woman',   3);
