
/*
  # Replace accept_application RPC with bulletproof version

  ## Problem
  The unique constraint `chats_user1_id_user2_id_purpose_key` is NOT commutative.
  If chat (A, B, tennis) exists and we try to insert (B, A, tennis), Postgres throws
  error code 23505 even though the pair is logically the same.

  The previous RPC checked for existing chats before inserting, but the INSERT still
  raced and sometimes hit the constraint if called twice, or if the lookup missed due
  to ordering differences.

  ## Changes
  - Replace function body to:
    1. Always search BOTH orderings (user1=host/user2=applicant AND user1=applicant/user2=host)
    2. Wrap the INSERT in an EXCEPTION block that catches 23505 and falls back to SELECT
    3. On fallback, re-add both participants idempotently
  - This makes the function truly idempotent regardless of ordering
*/

CREATE OR REPLACE FUNCTION public.accept_application(
  p_application_id uuid,
  p_host_id uuid,
  p_applicant_id uuid,
  p_court_id uuid,
  p_purpose text,
  p_welcome_msg text,
  p_applicant_gender text DEFAULT NULL,
  p_current_male_slots integer DEFAULT 0,
  p_current_female_slots integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_chat_id uuid;
  v_new_chat boolean := false;
BEGIN
  -- Step 1: Accept the application
  UPDATE applications
  SET status = 'accepted'
  WHERE id = p_application_id
    AND owner_id = p_host_id;

  IF NOT FOUND THEN
    RETURN json_build_object('chat_id', null, 'error', '신청을 찾을 수 없거나 권한이 없습니다.');
  END IF;

  -- Step 2: Find existing chat (both orderings)
  SELECT id INTO v_chat_id
  FROM chats
  WHERE purpose = p_purpose
    AND (
      (user1_id = p_host_id AND user2_id = p_applicant_id)
      OR (user1_id = p_applicant_id AND user2_id = p_host_id)
    )
  LIMIT 1;

  -- Step 3: If no chat, try to create one
  IF v_chat_id IS NULL THEN
    BEGIN
      INSERT INTO chats (user1_id, user2_id, purpose, court_id)
      VALUES (p_host_id, p_applicant_id, p_purpose, p_court_id)
      RETURNING id INTO v_chat_id;

      v_new_chat := true;

    EXCEPTION WHEN unique_violation THEN
      -- Race condition or ordering collision — fetch the existing one
      SELECT id INTO v_chat_id
      FROM chats
      WHERE purpose = p_purpose
        AND (
          (user1_id = p_host_id AND user2_id = p_applicant_id)
          OR (user1_id = p_applicant_id AND user2_id = p_host_id)
        )
      LIMIT 1;
    END;
  END IF;

  IF v_chat_id IS NULL THEN
    RETURN json_build_object('chat_id', null, 'error', '채팅방을 생성할 수 없습니다.');
  END IF;

  -- Step 4: Ensure both participants exist (idempotent)
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_host_id), (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Step 5: Send welcome message only for new chats
  IF v_new_chat THEN
    INSERT INTO messages (chat_id, sender_id, content, type, is_read)
    VALUES (v_chat_id, null, p_welcome_msg, 'system', false);
  END IF;

  -- Step 6: Update slot counts
  IF p_court_id IS NOT NULL AND p_applicant_gender IS NOT NULL THEN
    IF p_applicant_gender = '남성' THEN
      UPDATE courts
      SET
        male_slots = GREATEST(0, male_slots - 1),
        confirmed_male_slots = confirmed_male_slots + 1
      WHERE id = p_court_id;
    ELSIF p_applicant_gender = '여성' THEN
      UPDATE courts
      SET
        female_slots = GREATEST(0, female_slots - 1),
        confirmed_female_slots = confirmed_female_slots + 1
      WHERE id = p_court_id;
    END IF;
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'error', null);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'error', SQLERRM);
END;
$$;
