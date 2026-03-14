/*
  # accept_application RPC 재작성 - 재매칭 시 항상 새 chat_id 생성

  ## 변경 내용
  - 기존: 같은 두 사람 + court_id 조합의 chat이 있으면 재사용
  - 변경: court_id 기반 dedup 제거 → 항상 새 채팅방(chat_id) 생성
    - 이로써 같은 두 사람이 다른 코트에서 다시 매칭되어도 대화 기록이 섞이지 않음
  - ON CONFLICT 처리도 court_id 없이 새 INSERT만 수행
  - 기존 chat_participants INSERT, slot 업데이트, 자동 마감 로직은 그대로 유지
*/

CREATE OR REPLACE FUNCTION accept_application(
  p_application_id  uuid,
  p_host_id         uuid,
  p_applicant_id    uuid,
  p_court_id        uuid,
  p_purpose         text,
  p_welcome_msg     text DEFAULT NULL,
  p_applicant_gender text DEFAULT NULL,
  p_current_male_slots   integer DEFAULT 0,
  p_current_female_slots integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id       uuid;
  v_court_format  text;
  v_capacity      integer := 2;
  v_confirmed_count integer;
BEGIN
  -- 1. Mark application as accepted
  UPDATE applications
  SET status = 'accepted'
  WHERE id = p_application_id
    AND owner_id = p_host_id;

  IF NOT FOUND THEN
    RETURN json_build_object('chat_id', NULL, 'error', '신청을 찾을 수 없거나 권한이 없습니다.');
  END IF;

  -- 2. Always create a brand-new chat (no dedup — fresh start every match)
  INSERT INTO chats (user1_id, user2_id, purpose, court_id)
  VALUES (p_host_id, p_applicant_id, p_purpose, p_court_id)
  RETURNING id INTO v_chat_id;

  IF v_chat_id IS NULL THEN
    RETURN json_build_object('chat_id', NULL, 'error', '채팅방을 생성할 수 없습니다.');
  END IF;

  -- 3. Ensure both participants are in chat_participants
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_host_id), (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- 4. Send welcome system message
  IF p_welcome_msg IS NOT NULL AND p_welcome_msg <> '' THEN
    INSERT INTO messages (chat_id, sender_id, content, type, is_read)
    VALUES (v_chat_id, NULL, p_welcome_msg, 'system', false);
  END IF;

  -- 5. Update slot counts based on gender
  IF p_court_id IS NOT NULL AND p_applicant_gender IS NOT NULL THEN
    IF p_applicant_gender IN ('male', '남성') AND p_current_male_slots > 0 THEN
      UPDATE courts
      SET
        male_slots           = GREATEST(0, male_slots - 1),
        confirmed_male_slots = COALESCE(confirmed_male_slots, 0) + 1
      WHERE id = p_court_id;
    ELSIF p_applicant_gender IN ('female', '여성') AND p_current_female_slots > 0 THEN
      UPDATE courts
      SET
        female_slots           = GREATEST(0, female_slots - 1),
        confirmed_female_slots = COALESCE(confirmed_female_slots, 0) + 1
      WHERE id = p_court_id;
    END IF;
  END IF;

  -- 6. Check capacity and auto-close court
  SELECT COALESCE(format, '') INTO v_court_format
  FROM courts WHERE id = p_court_id;

  IF v_court_format ~* '복식|혼복|남복|여복' THEN
    v_capacity := 4;
  ELSE
    v_capacity := 2;
  END IF;

  SELECT COUNT(*) INTO v_confirmed_count
  FROM chat_participants
  WHERE chat_id = v_chat_id;

  IF v_confirmed_count >= v_capacity THEN
    UPDATE courts SET status = 'closed' WHERE id = p_court_id;
    INSERT INTO messages (chat_id, sender_id, content, type, is_read)
    VALUES (v_chat_id, NULL, '매칭이 완료되어 모집이 자동 마감되었습니다!', 'system', false);
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'error', NULL, 'capacity', v_capacity);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', NULL, 'error', SQLERRM);
END;
$$;
