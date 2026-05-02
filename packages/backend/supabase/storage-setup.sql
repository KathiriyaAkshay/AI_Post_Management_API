-- Storage Buckets Setup for Nexus Hub
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Fixes: "Bucket not found" when calling /storage/signed-url

-- 1. Create buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('generated-images', 'generated-images', TRUE, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('product-references', 'product-references', FALSE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('campaign-thumbnails', 'campaign-thumbnails', TRUE, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies for generated-images
DROP POLICY IF EXISTS "Users manage own generated images" ON storage.objects;
CREATE POLICY "Users manage own generated images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Storage RLS policies for product-references
DROP POLICY IF EXISTS "Users manage own product references" ON storage.objects;
CREATE POLICY "Users manage own product references"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'product-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Storage RLS policies for campaign-thumbnails (public read, customers + admins can upload)
DROP POLICY IF EXISTS "Public can read campaign thumbnails" ON storage.objects;
CREATE POLICY "Public can read campaign thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-thumbnails');

DROP POLICY IF EXISTS "Admins manage campaign thumbnails" ON storage.objects;
CREATE POLICY "Admins manage campaign thumbnails"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'campaign-thumbnails'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Allow customers to upload to their own folder (user_id/...)
DROP POLICY IF EXISTS "Customers manage own campaign thumbnails" ON storage.objects;
CREATE POLICY "Customers manage own campaign thumbnails"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'campaign-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
