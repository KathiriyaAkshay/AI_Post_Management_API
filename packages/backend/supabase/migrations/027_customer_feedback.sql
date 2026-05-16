-- One row per feedback submission; admins list aggregate via GET /admin/feedback
CREATE TABLE customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX idx_customer_feedback_created_at ON customer_feedback(created_at DESC);

CREATE OR REPLACE FUNCTION set_customer_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_customer_feedback_updated_at
  BEFORE UPDATE ON customer_feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_feedback_updated_at();

ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own feedback rows"
  ON customer_feedback FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all customer feedback"
  ON customer_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update customer feedback"
  ON customer_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete customer feedback"
  ON customer_feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Prefer table rows over profile JSON blob (single source of truth)
ALTER TABLE profiles DROP COLUMN IF EXISTS feedback;
