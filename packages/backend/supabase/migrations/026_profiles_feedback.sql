-- Customer experience feedback (arbitrary JSON object or array)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS feedback JSONB;

COMMENT ON COLUMN profiles.feedback IS 'Optional structured feedback about the customer experience (JSON).';
