-- Default global platform preamble for customer image generation (see platformImagePromptService.js).
-- Admins can edit or replace via /admin/prompt-blocks; block_key must stay image_gen_platform_system.

INSERT INTO prompt_building_blocks (
  product_type_id,
  block_key,
  category,
  title,
  content,
  is_active,
  sort_order
)
SELECT
  NULL,
  'image_gen_platform_system',
  'system',
  'Platform image generation preamble',
  'Generate commercial-quality marketing imagery suitable for social media, e-commerce listings, and small-business advertising. Use clear subject focus, professional lighting, and coherent composition. Avoid unrelated brand logos, illegible or misleading text overlays, watermarks, and NSFW content unless the user explicitly requests it.',
  TRUE,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM prompt_building_blocks
  WHERE product_type_id IS NULL AND block_key = 'image_gen_platform_system'
);
