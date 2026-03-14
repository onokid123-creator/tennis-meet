/*
  # 채팅방 완전 삭제(영구 퇴장) 지원

  ## 변경 사항 요약
  기존 `left_by` 배열 방식을 유지하되, RLS SELECT 정책을 강화하여
  `left_by`에 내 ID가 포함된 방은 DB 조회 단계에서 완전히 차단합니다.
  또한 두 참여자가 모두 퇴장 시 chats + messages 데이터를 자동으로 삭제하는
  트리거 함수를 추가합니다.

  ## 세부 변경

  ### 1. chats RLS SELECT 정책 교체
  - 기존: user1_id = 나 OR user2_id = 나 → left_by 무시
  - 변경: 위 조건 + left_by 배열에 내 ID가 없어야 함

  ### 2. messages RLS SELECT 정책 교체
  - chats의 새 SELECT 조건(left_by 필터 포함)과 동일한 기준 적용

  ### 3. messages RLS INSERT 정책 교체
  - system 메시지는 나가는 유저가 left_by 업데이트 직전에 보내므로
    아직 참여자인 상태에서 허용 → 기존 정책 유지(이미 존재)

  ### 4. 자동 클린업 트리거
  - chats.left_by 업데이트 시, 배열 길이가 2 이상(두 사람 모두 퇴장)이면
    해당 chat 행을 DELETE → CASCADE로 messages도 함께 삭제

  ## 보안
  - RLS 정책은 모두 authenticated 사용자만 허용
  - left_by 필터를 DB 레벨에서 강제 적용
*/

-- 1. chats SELECT 정책 교체 (left_by 필터 추가)
DROP POLICY IF EXISTS "사용자는 본인 채팅방 조회 가능" ON chats;

CREATE POLICY "사용자는 본인 채팅방 조회 가능"
  ON chats FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND NOT (left_by @> ARRAY[auth.uid()::text])
  );

-- 2. messages SELECT 정책 교체 (left_by 필터 포함)
DROP POLICY IF EXISTS "사용자는 본인 채팅방 메시지 조회 가능" ON messages;

CREATE POLICY "사용자는 본인 채팅방 메시지 조회 가능"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
        AND NOT (chats.left_by @> ARRAY[auth.uid()::text])
    )
  );

-- 3. 자동 클린업 함수: 두 사람 모두 퇴장 시 채팅방 + 메시지 완전 삭제
CREATE OR REPLACE FUNCTION cleanup_empty_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- left_by 배열 길이가 2 이상이면 두 참여자 모두 퇴장한 것
  IF array_length(NEW.left_by, 1) >= 2 THEN
    DELETE FROM chats WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. 트리거 연결 (chats UPDATE 시 실행)
DROP TRIGGER IF EXISTS trg_cleanup_empty_chat ON chats;

CREATE TRIGGER trg_cleanup_empty_chat
  AFTER UPDATE OF left_by ON chats
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_empty_chat();
