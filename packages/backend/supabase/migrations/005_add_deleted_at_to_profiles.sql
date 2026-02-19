-- Add deleted_at column to profiles table for soft deletes
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for deleted_at to speed up filtering
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
