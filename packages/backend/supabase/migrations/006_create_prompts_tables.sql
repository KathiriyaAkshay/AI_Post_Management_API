-- Create product_types table (Categories)
CREATE TABLE product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT, -- Optional: "{1} style in {2} background"
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Index for querying by user
CREATE INDEX idx_product_types_user_id ON product_types(user_id);

-- Create prompt_parts table
CREATE TABLE prompt_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id UUID NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by product type and order
CREATE INDEX idx_prompt_parts_product_type_id ON prompt_parts(product_type_id);

-- RLS Policies

-- Enable RLS
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_parts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage product_types"
  ON product_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage prompt_parts"
  ON prompt_parts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Customers can read their own product types and prompts
CREATE POLICY "Customers can read own product_types"
  ON product_types FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Customers can read own prompt_parts"
  ON prompt_parts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_types pt
      WHERE pt.id = prompt_parts.product_type_id AND pt.user_id = auth.uid()
    )
  );
