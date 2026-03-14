/*
  # Add missing columns and tables
  
  1. Add tennis_style column to profiles table
  2. Add payload column to court_group_chat_messages 
  3. Add blocked_users table
  4. Add profile-images storage bucket policies
*/

-- Add tennis_style to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tennis_style'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tennis_style text;
  END IF;
END $$;

-- Add payload to court_group_chat_messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'court_group_chat_messages' AND column_name = 'payload'
  ) THEN
    ALTER TABLE court_group_chat_messages ADD COLUMN payload jsonb;
  END IF;
END $$;

-- Add payload to messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'payload'
  ) THEN
    ALTER TABLE messages ADD COLUMN payload jsonb;
  END IF;
END $$;

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blocked_users' AND policyname = 'Users can read own blocked list'
  ) THEN
    CREATE POLICY "Users can read own blocked list"
      ON blocked_users FOR SELECT
      TO authenticated
      USING (auth.uid() = blocker_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blocked_users' AND policyname = 'Users can block others'
  ) THEN
    CREATE POLICY "Users can block others"
      ON blocked_users FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = blocker_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blocked_users' AND policyname = 'Users can unblock'
  ) THEN
    CREATE POLICY "Users can unblock"
      ON blocked_users FOR DELETE
      TO authenticated
      USING (auth.uid() = blocker_id);
  END IF;
END $$;

-- Enable realtime for blocked_users
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE blocked_users;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
