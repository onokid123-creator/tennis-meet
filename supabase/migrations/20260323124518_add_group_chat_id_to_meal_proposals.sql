/*
  # meal_proposals 테이블에 group_chat_id 컬럼 추가

  ## 변경 사항
  - chat_id를 nullable로 변경 (1v1 채팅방용)
  - group_chat_id 컬럼 추가 (그룹 채팅방용, court_group_chats 참조)

  ## 이유
  - GroupChatRoom은 court_group_chats 테이블을 사용
  - 기존 chat_id는 chats 테이블 참조 (1v1 채팅방용)
*/

ALTER TABLE meal_proposals
  ALTER COLUMN chat_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_proposals' AND column_name = 'group_chat_id'
  ) THEN
    ALTER TABLE meal_proposals ADD COLUMN group_chat_id uuid REFERENCES court_group_chats(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_proposals_group_chat_id ON meal_proposals(group_chat_id);
