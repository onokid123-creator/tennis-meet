/*
  # Create profile-images storage bucket with public access policies

  1. Creates the 'profile-images' bucket if it doesn't exist (public)
  2. Adds policies for:
     - Public SELECT (anyone can view)
     - Authenticated INSERT (anyone logged in can upload)
     - Authenticated UPDATE (anyone logged in can update/overwrite)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public Access profile-images'
  ) THEN
    CREATE POLICY "Public Access profile-images"
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
      AND policyname = 'Authenticated upload profile-images'
  ) THEN
    CREATE POLICY "Authenticated upload profile-images"
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
      AND policyname = 'Authenticated update profile-images'
  ) THEN
    CREATE POLICY "Authenticated update profile-images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'profile-images');
  END IF;
END $$;
