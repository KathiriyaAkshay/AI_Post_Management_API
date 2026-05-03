-- Profile logos bucket (public read; users manage objects under their user-id prefix)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-logos',
  'profile-logos',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users manage own profile logos" ON storage.objects;
CREATE POLICY "Users manage own profile logos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'profile-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
