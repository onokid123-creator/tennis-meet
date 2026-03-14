
/*
  # Fix gender slot decrement logic

  ## Summary
  Updates the accept_application function to decrement male_slots or female_slots
  directly instead of incrementing confirmed_male_slots/confirmed_female_slots.
  
  ## Changes
  - When a male applicant is accepted: male_slots decremented by 1 (min 0)
  - When a female applicant is accepted: female_slots decremented by 1 (min 0)
  - Court post is never deleted on acceptance
  - "마감" status is shown only when BOTH male_slots AND female_slots reach 0

  ## Notes
  - The court record is always preserved; only slot counts change
  - This replaces the confirmed_*_slots increment approach
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
  UPDATE applications
  SET status = 'accepted'
  WHERE id = p_application_id
    AND owner_id = p_host_id;

  IF NOT FOUND THEN
    RETURN json_build_object('chat_id', null, 'error', '신청을 찾을 수 없거나 권한이 없습니다.');
  END IF;

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
    IF p_court_id IS NOT NULL AND p_applicant_gender IS NOT NULL THEN
      IF p_applicant_gender = '남성' THEN
        UPDATE courts
        SET male_slots = GREATEST(0, male_slots - 1)
        WHERE id = p_court_id;
      ELSIF p_applicant_gender = '여성' THEN
        UPDATE courts
        SET female_slots = GREATEST(0, female_slots - 1)
        WHERE id = p_court_id;
      END IF;
    END IF;
    RETURN json_build_object('chat_id', v_existing_chat_id, 'error', null);
  END IF;

  INSERT INTO chats (user1_id, user2_id, purpose, court_id)
  VALUES (
    p_host_id,
    p_applicant_id,
    p_purpose,
    p_court_id
  )
  RETURNING id INTO v_chat_id;

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES
    (v_chat_id, p_host_id),
    (v_chat_id, p_applicant_id);

  INSERT INTO messages (chat_id, sender_id, content, type, is_read)
  VALUES (v_chat_id, null, p_welcome_msg, 'system', false);

  IF p_court_id IS NOT NULL AND p_applicant_gender IS NOT NULL THEN
    IF p_applicant_gender = '남성' THEN
      UPDATE courts
      SET male_slots = GREATEST(0, male_slots - 1)
      WHERE id = p_court_id;
    ELSIF p_applicant_gender = '여성' THEN
      UPDATE courts
      SET female_slots = GREATEST(0, female_slots - 1)
      WHERE id = p_court_id;
    END IF;
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'error', null);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('chat_id', null, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_application FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_application TO authenticated;
