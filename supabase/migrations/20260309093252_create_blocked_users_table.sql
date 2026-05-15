/*
  # Create blocked_users table

  ## Summary
  This migration creates the blocked_users table to support the "hide user" feature
  in dating chat rooms. When a user leaves a dating chat and chooses to hide the other
  person, a record is inserted here. The Home page filters out courts from blocked users.

  ## New Tables
  - `blocked_users`
    - `id` (uuid, primary key, auto-generated)
    - `blocker_id` (uuid, references auth.users - the user who did the blocking)
    - `blocked_id` (uuid, references auth.users - the user who was blocked/hidden)
    - `created_at` (timestamptz, default now())
    - Unique constraint on (blocker_id, blocked_id) to prevent duplicates

  ## Security
  - RLS enabled
  - Users can only insert their own block records (blocker_id = auth.uid())
  - Users can only read their own block records
  - Users can delete their own block records
*/

CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own block records"
  ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can read own block records"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own block records"
  ON blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS blocked_users_blocker_id_idx ON blocked_users(blocker_id);
