/*
  # Fix 1v1 chat accept to upsert + group chat rejoin support

  ## Changes

  ### accept_1v1_chat (기존)
  - 이미 chat_id를 받아서 participants만 등록하는 RPC - 유지

  ### accept_1v1_chat_safe (신규)
  - court_id + host_id + applicant_id 조합으로 기존 1v1 채팅방 먼저 확인
  - 존재하면 → 기존 chat_id 반환 (is_new: false)
  - 존재하지 않으면 → 새 채팅방 INSERT (is_new: true)
  - participants: host, applicant 모두 upsert (DELETE+INSERT for applicant to reset joined_at)

  ### accept_group_chat_with_rejoin (신규)
  - chats 테이블에서 court_id + is_group=true 기존 채팅방 확인
  - 있으면 → chat_participants에 applicant만 추가 (ON CONFLICT DO NOTHING)
  - 없으면 → 새 채팅방 생성
  - is_new: 채팅방 새로 생성된 경우만 true
  - is_rejoin: 기존 채팅방에 재입장한 경우 true
*/

-- 1v1 채팅 safe upsert RPC
CREATE OR REPLACE FUNCTION accept_1v1_chat_safe(
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
  -- court_id + host + applicant 조합으로 기존 채팅방 확인
  SELECT id INTO v_chat_id
  FROM chats
  WHERE court_id = p_court_id
    AND is_group = false
    AND (
      (user1_id = p_host_id AND user2_id = p_applicant_id)
      OR (user1_id = p_applicant_id AND user2_id = p_host_id)
    )
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    -- 신규 채팅방 생성
    INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
    VALUES (p_host_id, p_applicant_id, p_purpose, p_court_id, false)
    RETURNING id INTO v_chat_id;

    v_is_new := true;
  END IF;

  -- host 참여자 등록 (재입장 시 joined_at 갱신)
  DELETE FROM chat_participants WHERE chat_id = v_chat_id AND user_id = p_host_id;
  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_host_id, now());

  -- applicant 참여자 등록 (재입장 시 joined_at 갱신)
  DELETE FROM chat_participants WHERE chat_id = v_chat_id AND user_id = p_applicant_id;
  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_applicant_id, now());

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', v_is_new
  );
END;
$$;

-- 그룹 채팅 rejoin 지원 RPC (chats 테이블 기반)
CREATE OR REPLACE FUNCTION accept_group_chat_with_rejoin(
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
  v_is_rejoin boolean := false;
BEGIN
  -- court_id + is_group=true 기존 채팅방 확인
  SELECT id INTO v_chat_id
  FROM chats
  WHERE court_id = p_court_id
    AND is_group = true
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    -- 신규 그룹 채팅방 생성
    INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
    VALUES (p_host_id, p_host_id, p_purpose, p_court_id, true)
    RETURNING id INTO v_chat_id;

    v_is_new := true;

    -- 호스트 참여자 등록
    INSERT INTO chat_participants (chat_id, user_id, joined_at)
    VALUES (v_chat_id, p_host_id, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  ELSE
    -- 기존 채팅방 재입장 여부 확인
    IF NOT EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_id = v_chat_id AND user_id = p_applicant_id
    ) THEN
      v_is_rejoin := true;
    END IF;
  END IF;

  -- applicant 재입장 처리 (joined_at 갱신으로 이전 메시지 안 보이게)
  DELETE FROM chat_participants WHERE chat_id = v_chat_id AND user_id = p_applicant_id;
  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_applicant_id, now());

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', v_is_new,
    'is_rejoin', v_is_rejoin
  );
END;
$$;
