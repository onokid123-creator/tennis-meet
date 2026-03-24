/*
  # Add sender_deleted to meal_proposals

  ## Changes
  - `meal_proposals` 테이블에 `sender_deleted` 컬럼 추가 (boolean, default false)
  - 송신자가 보낸 pending 제안을 삭제할 때 sender_deleted=true 처리
  - fetch 시 sender가 본인이고 sender_deleted=true인 항목은 제외

  ## Notes
  - 기존 receiver_deleted와 동일한 패턴
  - RLS 정책은 이미 존재하는 meal_proposals 정책 사용
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_proposals' AND column_name = 'sender_deleted'
  ) THEN
    ALTER TABLE meal_proposals ADD COLUMN sender_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;
