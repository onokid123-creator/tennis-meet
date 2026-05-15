/*
  # Create reports and blocks tables

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references auth.users)
      - `reported_id` (uuid, references auth.users)
      - `reason` (text) - 신고 사유
      - `created_at` (timestamptz)
    - `blocks`
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, references auth.users)
      - `blocked_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - unique constraint on (blocker_id, blocked_id)

  2. Security
    - Enable RLS on both tables
    - Users can insert their own reports/blocks
    - Users can read their own blocks (for filtering)
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own blocks"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can read own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);
