-- Multi-location profile field for small businesses (no branch table).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_locations JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.business_locations IS
  'Array of location objects: [{id,label,address,contact_number,include_by_default,is_active}] used in generation context.';

-- Best-effort backfill from legacy single address/contact into one default location.
UPDATE profiles
SET business_locations = jsonb_build_array(
  jsonb_strip_nulls(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'label', 'Main location',
      'address', NULLIF(TRIM(address), ''),
      'contact_number', NULLIF(TRIM(contact_number), ''),
      'include_by_default', true,
      'is_active', true
    )
  )
)
WHERE business_locations = '[]'::jsonb
  AND (NULLIF(TRIM(address), '') IS NOT NULL OR NULLIF(TRIM(contact_number), '') IS NOT NULL);

