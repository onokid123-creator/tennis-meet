
/*
  # Create accept_application atomic function

  ## Summary
  Creates a SECURITY DEFINER function that atomically handles the full application acceptance flow:
  1. Updates the application status to 'accepted'
  2. Creates a chat record in the chats table
  3. Inserts both host and applicant into chat_participants
  4. Inserts a system welcome message
  5. Optionally updates court confirmed slot counts

  ## Why SECURITY DEFINER?
  The RLS policies on chats/chat_participants/messages have subtle ordering dependencies.
  Running as the function owner (postgres) bypasses these and ensures all inserts succeed atomically.

  ## Returns
  JSON object: { chat_id: uuid, error: text | null }
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
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
  v_existing_chat_id uuid;
BEGIN
  -- 1. Update application status
  UPDATE applications
  SET status = 'accepted'
  WHERE id = p_application_id
    AND owner_id = p_host_id;

  IF NOT FOUND THEN
    RETURN json_build_object('chat_id', null, 'error', '신청을 찾을 수 없거나 권한이 없습니다.');
  END IF;

  -- 2. Check for existing chat (dedup)
  IF p_court_id IS NOT NULL THEN
    SELECT id INTO v_existing_chat_id
    FROM chats
    WHERE court_id = p_court_id
      AND purpose = p_purpose
      AND (
        (user1_id = p_host_id AND user2_id = p_applicant_id)
        OR (user1_id = p_applicant_id AND user2_id = p_host_id)
      )
    LIMIT 1;
  ELSE
    SELECT id INTO v_existing_chat_id
    FROM chats
    WHERE purpose = p_purpose
      AND (
        (user1_id = p_host_id AND user2_id = p_applicant_id)
        OR (user1_id = p_applicant_id AND user2_id = p_host_id)
      )
    LIMIT 1;
  END IF;

  IF v_existing_chat_id IS NOT NULL THEN
    RETURN json_build_object('chat_id', v_existing_chat_id, 'error', null);
  END IF;

  -- 3. Create chat
  INSERT INTO chats (user1_id, user2_id, purpose, court_id)
  VALUES (
    p_host_id,
    p_applicant_id,
    p_purpose,
    p_court_id
  )
  RETURNING id INTO v_chat_id;

  -- 4. Insert both participants
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES
    (v_chat_id, p_host_id),
    (v_chat_id, p_applicant_id);

  -- 5. Insert welcome system message
  INSERT INTO messages (chat_id, sender_id, content, type, is_read)
  VALUES (v_chat_id, null, p_welcome_msg, 'system', false);

  -- 6. Update court confirmed slots if applicable
  IF p_court_id IS NOT NULL AND p_applicant_gender IS NOT NULL THEN
    IF p_applicant_gender = '남성' THEN
      UPDATE courts
      SET confirmed_male_slots = p_current_male_slots + 1
      WHERE id = p_court_id;
    ELSIF p_applicant_gender = '여성' THEN
      UPDATE courts
      SET confirmed_female_slots = p_current_female_slots + 1
      WHERE id = p_court_id;
    END IF;
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'error', null);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('chat_id', null, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.accept_application FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_application TO authenticated;
