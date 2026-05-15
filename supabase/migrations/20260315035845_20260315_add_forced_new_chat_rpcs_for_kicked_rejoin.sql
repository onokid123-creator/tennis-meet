/*
  # Add forced new chat RPCs for kicked user rejoin

  ## Summary
  강퇴(kicked/cancelled) 이력이 있는 유저가 재신청 후 수락될 때,
  기존 채팅방에 재입장하지 않고 완전히 새로운 채팅방을 생성하는 RPC 함수를 추가합니다.

  ## New Functions

  ### accept_group_chat_force_new(court_id, host_id, applicant_id, purpose)
  - 기존 court_id 기반 그룹 채팅방을 무시하고 항상 새 채팅방 생성
  - 호스트와 신청자를 새 채팅방 참여자로 등록
  - is_new = true 반환 (웰컴 메시지 트리거용)

  ### accept_1v1_chat_force_new(host_id, applicant_id, court_id, purpose)
  - 기존 court_id + 유저쌍 기반 1v1 채팅방을 무시하고 항상 새 채팅방 생성
  - 호스트와 신청자를 새 채팅방 참여자로 등록
  - is_new = true 반환

  ## Why
  강퇴 후 재수락 시 기존 accept_group_chat/accept_1v1_chat은 court_id로
  기존 채팅방을 찾아 재입장시키기 때문에 is_new = false가 되어
  웰컴 메시지와 신청자 알림이 전송되지 않는 문제 해결.
*/

CREATE OR REPLACE FUNCTION accept_group_chat_force_new(
  p_court_id uuid,
  p_host_id uuid,
  p_applicant_id uuid,
  p_purpose text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
  VALUES (p_host_id, p_host_id, p_purpose, p_court_id, true)
  RETURNING id INTO v_chat_id;

  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_host_id, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_applicant_id, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION accept_1v1_chat_force_new(
  p_host_id uuid,
  p_applicant_id uuid,
  p_court_id uuid,
  p_purpose text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
  VALUES (p_host_id, p_applicant_id, p_purpose, p_court_id, false)
  RETURNING id INTO v_chat_id;

  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_host_id, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_applicant_id, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', true
  );
END;
$$;
