-- Tracks async image generation jobs (202 + WebSocket completion).
-- Rows are written by the API (service role); customers may SELECT own rows via RLS.

CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Original request body snapshot (for support / replay)
  payload JSONB NOT NULL DEFAULT '{}',

  asset_id UUID REFERENCES generated_images(id) ON DELETE SET NULL,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_created_at ON generation_jobs(created_at DESC);

CREATE OR REPLACE FUNCTION set_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generation_jobs_updated_at
  BEFORE UPDATE ON generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_generation_jobs_updated_at();

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own generation jobs"
  ON generation_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all generation jobs"
  ON generation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMENT ON TABLE generation_jobs IS 'Async image generation: pending until worker completes; job id returned as 202 jobId';
