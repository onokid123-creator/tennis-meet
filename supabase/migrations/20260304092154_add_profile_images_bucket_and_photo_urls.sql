/*
  # Add profile_images storage bucket and photo_urls column

  1. Changes
    - Creates `profile_images` storage bucket (public) for multi-photo uploads
    - Adds `photo_urls` text[] column to profiles for storing multiple photo URLs
    - Adds storage policies for authenticated users to manage their own images

  2. Security
    - Users can only upload/delete their own images (path starts with their user_id)
    - Images are publicly readable
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_images', 'profile_images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_urls'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_urls text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'profile_images public read'
  ) THEN
    CREATE POLICY "profile_images public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile_images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'profile_images authenticated upload'
  ) THEN
    CREATE POLICY "profile_images authenticated upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'profile_images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'profile_images authenticated delete'
  ) THEN
    CREATE POLICY "profile_images authenticated delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'profile_images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
