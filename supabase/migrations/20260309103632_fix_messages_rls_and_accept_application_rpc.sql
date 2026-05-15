/*
  # Fix messages RLS + accept_application RPC bulletproof v2

  ## Problems Fixed

  1. **messages INSERT RLS**: The current policy requires `auth.uid() = sender_id`,
     but system messages from the SECURITY DEFINER RPC have `sender_id = NULL`.
     Even though the function runs as the definer, RLS is evaluated against the
     calling user's context. We need to allow NULL sender_id inserts that come
     from within SECURITY DEFINER functions (or simply allow NULL sender_id rows
     from authenticated users who are participants in the chat).

  2. **accept_application RPC**: Replacing with a version that uses
     SECURITY DEFINER + `SET row_security = off` so it can bypass RLS entirely
     for the internal inserts, avoiding the sender_id NULL constraint issue.

  ## Changes
  - Drop and recreate `messages` INSERT policy to allow system messages
    (sender_id IS NULL) from chats where the caller is a participant
  - Drop and recreate `accept_application` to use `SET row_security = off`
    ensuring chat + message creation always succeeds
*/

-- Step 1: Fix messages INSERT policy to allow system messages (sender_id NULL)
DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;

CREATE POLICY "Users can send messages in their chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM chat_participants cp
        WHERE cp.chat_id = messages.chat_id
          AND cp.user_id = auth.uid()
      )
    )
    OR
    (
      sender_id IS NULL
      AND EXISTS (
        SELECT 1 FROM chats c
        WHERE c.id = messages.chat_id
          AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      )
    )
  );

-- Step 2: Replace accept_application with row_security off version
DROP FUNCTION IF EXISTS public.accept_application(uuid, uuid, uuid, uuid, text, text, text, integer, integer);

CREATE FUNCTION public.accept_application(
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
SET row_security = off
AS $$
DECLARE
  v_chat_id uuid;
  v_new_chat boolean := false;
BEGIN
  UPDATE applications
  SET status = 'accepted'
  WHERE id = p_application_id
    AND owner_id = p_host_id;

  IF NOT FOUND THEN
    RETURN json_build_object('chat_id', null, 'error', '신청을 찾을 수 없거나 권한이 없습니다.');
  END IF;

  SELECT id INTO v_chat_id
  FROM chats
  WHERE purpose = p_purpose
    AND (
      (user1_id = p_host_id AND user2_id = p_applicant_id)
      OR (user1_id = p_applicant_id AND user2_id = p_host_id)
    )
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    BEGIN
      INSERT INTO chats (user1_id, user2_id, purpose, court_id)
      VALUES (p_host_id, p_applicant_id, p_purpose, p_court_id)
      RETURNING id INTO v_chat_id;

      v_new_chat := true;

    EXCEPTION WHEN unique_violation THEN
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

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_host_id), (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  IF v_new_chat AND p_welcome_msg IS NOT NULL AND p_welcome_msg != '' THEN
    INSERT INTO messages (chat_id, sender_id, content, type, is_read)
    VALUES (v_chat_id, NULL, p_welcome_msg, 'system', false);
  END IF;

  IF p_court_id IS NOT NULL AND p_applicant_gender IS NOT NULL THEN
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
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'error', null);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'error', SQLERRM);
END;
$$;
