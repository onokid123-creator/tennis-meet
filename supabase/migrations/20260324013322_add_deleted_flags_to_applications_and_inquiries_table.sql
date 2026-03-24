/*
  # Add deleted flags to applications + create inquiries table

  ## Changes

  ### 1. applications table
  - Add `sender_deleted` (bool, default false): 신청자가 이 알림을 삭제/숨김 처리
  - Add `receiver_deleted` (bool, default false): 수신자(호스트)가 이 알림을 삭제/숨김 처리
  - fetch 시 본인 역할에 따라 deleted=false 인 것만 조회

  ### 2. meal_proposals table
  - Add `receiver_deleted` (bool, default false): 받은 식사 제안을 삭제 처리

  ### 3. inquiries table (NEW)
  - user_id, category, title, content
  - image_urls (text[], nullable)
  - status: 'received' | 'reviewing' | 'answered'
  - admin_reply (text, nullable)
  - created_at, answered_at
  - RLS: 본인 문의만 조회 가능

  ## Security
  - RLS enabled on inquiries
  - Users can only read/insert their own inquiries
*/

-- 1. applications: soft-delete flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'sender_deleted'
  ) THEN
    ALTER TABLE applications ADD COLUMN sender_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'receiver_deleted'
  ) THEN
    ALTER TABLE applications ADD COLUMN receiver_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. meal_proposals: receiver_deleted flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_proposals' AND column_name = 'receiver_deleted'
  ) THEN
    ALTER TABLE meal_proposals ADD COLUMN receiver_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'feature', 'inconvenience', 'other')),
  title text NOT NULL,
  content text NOT NULL,
  image_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'answered')),
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own inquiries"
  ON inquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inquiries"
  ON inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
