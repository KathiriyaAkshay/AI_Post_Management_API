-- Add top_center and bottom_center to logo_position allowed values.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_logo_position_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_logo_position_check
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
  'Preferred placement for brand logo in generated images. Used as prompt/provider hint. Values: auto, corners, top_center, bottom_center, center.';
