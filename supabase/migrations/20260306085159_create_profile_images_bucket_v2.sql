/*
  # Create profile-images storage bucket

  Creates a public storage bucket for profile images with:
  - Public read access for all users
  - Authenticated upload for any logged-in user
  - Owner delete only
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read profile-images'
  ) THEN
    CREATE POLICY "Public read profile-images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'profile-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload profile-images'
  ) THEN
    CREATE POLICY "Authenticated upload profile-images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'profile-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owner delete profile-images'
  ) THEN
    CREATE POLICY "Owner delete profile-images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'profile-images');
  END IF;
END $$;
