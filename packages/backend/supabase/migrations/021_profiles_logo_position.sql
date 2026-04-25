-- Per-user preferred logo placement for image generation composition hints.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS logo_position TEXT NOT NULL DEFAULT 'auto'
  CHECK (logo_position IN (
    'auto',
    'top_left',
    'top_right',
    'top_center',
    'bottom_left',
    'bottom_right',
    'bottom_center',
    'center'
  ));

COMMENT ON COLUMN profiles.logo_position IS
  'Preferred placement for brand logo in generated images. Used as prompt/provider hint.';

