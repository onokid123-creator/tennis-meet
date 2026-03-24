/*
  # Add is_deleted to inquiries table

  ## Changes
  - Add `is_deleted` (boolean, default false) to `inquiries` table
  - fetch 시 is_deleted=false 인 것만 조회
  - 삭제 시 is_deleted=true 로 soft delete 처리

  ## Security
  - 기존 RLS 정책 유지 (본인 문의만 SELECT/INSERT)
  - UPDATE 정책 추가: 본인이 자기 문의 수정/삭제 가능
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inquiries' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE inquiries ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE POLICY "Users can update own inquiries"
  ON inquiries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
