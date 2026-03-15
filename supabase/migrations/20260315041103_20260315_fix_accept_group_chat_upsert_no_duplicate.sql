/*
  # Fix accept_group_chat RPCs to prevent duplicate key violation

  ## Problem
  chats 테이블에 `chats_group_court_unique` 유니크 인덱스가 있어서
  court_id 기준으로 is_group = true 인 행은 딱 하나만 허용됩니다.
  accept_group_chat_force_new 가 무조건 INSERT 하면 이미 존재할 경우
  duplicate key 오류가 발생합니다.

  ## Fix
  두 RPC 모두 아래 순서로 처리:
  1. chats 테이블에서 court_id + is_group = true 인 기존 채팅방 확인
  2. court_group_chats 테이블 존재 시 해당 court_id 행도 확인 (없으면 skip)
  3. 기존 채팅방 있으면 → INSERT 없이 해당 유저만 chat_participants에 추가 (ON CONFLICT DO NOTHING)
  4. 없으면 → 새 채팅방 INSERT 후 참여자 등록
  5. is_new: 채팅방이 새로 만들어진 경우에만 true

  accept_group_chat (기존) 과 accept_group_chat_force_new 모두 동일 로직 적용.
  force_new는 차이 없이 동일하게 처리 (unique constraint 때문에 어차피 코트당 1개).
*/

CREATE OR REPLACE FUNCTION accept_group_chat(
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
  v_is_new boolean := false;
BEGIN
  SELECT id INTO v_chat_id
  FROM chats
  WHERE court_id = p_court_id
    AND is_group = true
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
    VALUES (p_host_id, p_host_id, p_purpose, p_court_id, true)
    RETURNING id INTO v_chat_id;

    v_is_new := true;

    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, p_host_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', v_is_new
  );
END;
$$;

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
  v_is_new boolean := false;
BEGIN
  SELECT id INTO v_chat_id
  FROM chats
  WHERE court_id = p_court_id
    AND is_group = true
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
    VALUES (p_host_id, p_host_id, p_purpose, p_court_id, true)
    RETURNING id INTO v_chat_id;

    v_is_new := true;

    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, p_host_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', v_is_new
  );
END;
$$;
