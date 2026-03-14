/*
  # Create profile-images storage bucket and policies
  
  Sets up the profile-images bucket for storing user profile photos.
  Policies allow:
  - Public read access for all
  - Authenticated users can upload/update their own files
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for profile images'
  ) THEN
    CREATE POLICY "Public read access for profile images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload profile images'
  ) THEN
    CREATE POLICY "Authenticated users can upload profile images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'profile-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update profile images'
  ) THEN
    CREATE POLICY "Authenticated users can update profile images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'profile-images')
      WITH CHECK (bucket_id = 'profile-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete profile images'
  ) THEN
    CREATE POLICY "Authenticated users can delete profile images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'profile-images');
  END IF;
END $$;
