/*
  # Fix accept_group_chat: Join existing valid room instead of always creating new

  ## Summary
  Previously accept_group_chat always created a brand new chat room on every acceptance.
  This caused the host and existing participants to be moved to a new room when a new
  applicant was accepted, breaking continuity of conversation.

  ## New Logic
  1. Look for an existing VALID chat room for this court + host combination:
     - Same court_id
     - host (user1_id) is still a participant in chat_participants
     - host_left = false (host has not left the room)
     - is_group = true
  2. If a valid room exists:
     - Add the new applicant to that room with joined_at = now()
       (they can only see messages from this point forward)
     - Host and existing participants are NOT touched (their joined_at preserved)
     - Return is_new = false
  3. If no valid room exists (host left, or no room yet):
     - Create a brand new chat room
     - Add host with joined_at = now()
     - Add applicant with joined_at = now()
     - Return is_new = true

  ## "Valid" room criteria
  A room is valid if:
  - court_id matches
  - user1_id = host (created by host)
  - is_group = true
  - host_left = false
  - The host still exists in chat_participants for that room

  ## Message visibility
  - New joiners always get joined_at = now() so they cannot see prior messages
  - Existing participants' joined_at is preserved via ON CONFLICT DO NOTHING

  ## Tables affected
  - chats (read + conditional insert)
  - chat_participants (read + insert)
*/

CREATE OR REPLACE FUNCTION public.accept_group_chat(
  p_court_id UUID,
  p_host_id UUID,
  p_applicant_id UUID,
  p_purpose TEXT DEFAULT 'tennis'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
  v_is_new BOOLEAN := false;
BEGIN
  -- Step 1: Find an existing valid room for this court + host
  -- Valid = host hasn't left, is_group, host is still a participant
  SELECT c.id INTO v_chat_id
  FROM public.chats c
  WHERE c.court_id = p_court_id
    AND c.user1_id = p_host_id
    AND c.is_group = true
    AND c.host_left = false
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = c.id
        AND cp.user_id = p_host_id
    )
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    -- Step 2a: Valid room found — add applicant only, preserve everyone else
    v_is_new := false;

    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_applicant_id, false, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;

  ELSE
    -- Step 2b: No valid room — create a brand new one
    v_is_new := true;

    INSERT INTO public.chats (user1_id, user2_id, purpose, court_id, is_group, host_left, confirmed_user_ids)
    VALUES (p_host_id, NULL, p_purpose, p_court_id, true, false, '{}')
    RETURNING id INTO v_chat_id;

    -- Add host as first participant
    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_host_id, false, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Add applicant
    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_applicant_id, false, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'is_new', v_is_new);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'is_new', false, 'error', SQLERRM);
END;
$$;
