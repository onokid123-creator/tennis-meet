/*
  # accept_application 함수 시그니처 수정 및 웰컴 메시지 추가

  ## 변경 사항
  - 프론트엔드 호출 방식에 맞게 파라미터 시그니처 재정의
  - p_welcome_msg 파라미터 추가: 채팅방 입장 시 자동 시스템 메시지 전송
  - p_applicant_gender 파라미터로 성별 슬롯 감소 처리
  - 기존 함수 드롭 후 재생성

  ## 파라미터
  - p_application_id: 신청 ID
  - p_host_id: 호스트(코트 소유자) ID
  - p_applicant_id: 신청자 ID
  - p_court_id: 코트 ID
  - p_purpose: 목적 (tennis/dating)
  - p_welcome_msg: 채팅방 생성 시 자동 발송할 웰컴 메시지
  - p_applicant_gender: 신청자 성별 (슬롯 감소용)
  - p_current_male_slots: 현재 남성 슬롯 수
  - p_current_female_slots: 현재 여성 슬롯 수
*/

-- 기존 함수 모두 드롭 (파라미터 수 무관)
DROP FUNCTION IF EXISTS accept_application(uuid, uuid, uuid, uuid, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS accept_application(uuid, uuid, uuid, uuid, text, text, text, text, integer, integer);

-- 새 함수 생성 (프론트엔드 호출 시그니처에 맞춤)
CREATE OR REPLACE FUNCTION accept_application(
  p_application_id uuid,
  p_host_id uuid,
  p_applicant_id uuid,
  p_court_id uuid,
  p_purpose text,
  p_welcome_msg text,
  p_applicant_gender text,
  p_current_male_slots integer,
  p_current_female_slots integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id uuid;
  v_is_new_chat boolean := false;
BEGIN
  -- 신청 상태를 accepted로 변경
  UPDATE applications
  SET status = 'accepted'
  WHERE id = p_application_id;

  -- 기존 채팅방 찾기
  SELECT id INTO v_chat_id
  FROM chats
  WHERE (
    (user1_id = p_host_id AND user2_id = p_applicant_id) OR
    (user1_id = p_applicant_id AND user2_id = p_host_id)
  )
  AND purpose = p_purpose
  AND (court_id = p_court_id OR (court_id IS NULL AND p_court_id IS NULL))
  LIMIT 1;

  -- 없으면 새로 생성
  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user1_id, user2_id, purpose, court_id)
    VALUES (p_host_id, p_applicant_id, p_purpose, p_court_id)
    RETURNING id INTO v_chat_id;

    v_is_new_chat := true;
  END IF;

  -- 채팅 참여자 등록
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_host_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- 신규 채팅방이면 웰컴 메시지 삽입
  IF v_is_new_chat AND p_welcome_msg IS NOT NULL AND p_welcome_msg != '' THEN
    INSERT INTO messages (chat_id, sender_id, content, type)
    VALUES (v_chat_id, NULL, p_welcome_msg, 'system');
  END IF;

  -- 성별별 슬롯 감소 처리
  IF p_applicant_gender = '남성' AND p_current_male_slots > 0 THEN
    UPDATE courts
    SET
      male_slots = GREATEST(0, male_slots - 1),
      confirmed_male_slots = COALESCE(confirmed_male_slots, 0) + 1
    WHERE id = p_court_id;
  ELSIF p_applicant_gender = '여성' AND p_current_female_slots > 0 THEN
    UPDATE courts
    SET
      female_slots = GREATEST(0, female_slots - 1),
      confirmed_female_slots = COALESCE(confirmed_female_slots, 0) + 1
    WHERE id = p_court_id;
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'error', null);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'error', SQLERRM);
END;
$$;
