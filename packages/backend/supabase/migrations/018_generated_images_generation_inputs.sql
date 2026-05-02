-- Persist per-generation reference inputs for audit and customer asset history UI.

ALTER TABLE generated_images
  ADD COLUMN IF NOT EXISTS product_reference_input_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS product_reference_resolved_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT NULL;

COMMENT ON COLUMN generated_images.product_reference_input_url IS
  'Product reference image URL from POST /api/customer/generate body (explicit user input for that request).';
COMMENT ON COLUMN generated_images.product_reference_resolved_url IS
  'Product reference URL actually used after resolution (body wins; own campaign row when omitted; prebuilt template row URL is never auto-applied).';
COMMENT ON COLUMN generated_images.brand_logo_url IS
  'Profile logo URL at generation time (snapshot for branding audit).';
