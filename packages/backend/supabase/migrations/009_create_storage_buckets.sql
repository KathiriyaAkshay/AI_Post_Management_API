-- Create Supabase Storage buckets
-- Run this in the Supabase dashboard SQL editor or via the Supabase CLI

-- Bucket: generated-images (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  TRUE,
  52428800, -- 50 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: product-references (private, authenticated access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-references',
  'product-references',
  FALSE,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: campaign-thumbnails (public read, admin write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-thumbnails',
  'campaign-thumbnails',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: generated-images
-- Users can only manage their own namespaced files
CREATE POLICY "Users manage own generated images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: product-references
CREATE POLICY "Users manage own product references"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'product-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: campaign-thumbnails (public read, admin write)
CREATE POLICY "Public can read campaign thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-thumbnails');

CREATE POLICY "Admins manage campaign thumbnails"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'campaign-thumbnails'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
