/*
  # Fix is_confirmed always FALSE on chat participant creation

  ## Problem
  Both accept_1v1_chat and accept_group_chat RPCs were inserting
  chat_participants with is_confirmed = true, causing ChatRoom to
  immediately treat new chats as already confirmed.

  ## Changes
  1. accept_1v1_chat: is_confirmed = false on INSERT, no SET is_confirmed on conflict
  2. accept_group_chat: is_confirmed = false on INSERT, no SET is_confirmed on conflict

  ## Rule
  is_confirmed must only become TRUE when the user clicks the confirm button in ChatRoom.
  Chat creation must NEVER set is_confirmed = true.
*/

CREATE OR REPLACE FUNCTION public.accept_1v1_chat(
  p_chat_id UUID,
  p_host_id UUID,
  p_applicant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (p_chat_id, p_host_id, false, now())
  ON CONFLICT (chat_id, user_id) DO UPDATE SET joined_at = now();

  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (p_chat_id, p_applicant_id, false, now())
  ON CONFLICT (chat_id, user_id) DO UPDATE SET joined_at = now();

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

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
  SELECT id INTO v_chat_id
  FROM public.chats
  WHERE court_id = p_court_id
    AND user1_id = p_host_id
    AND is_group = true
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id, purpose, court_id, is_group, confirmed_user_ids)
    VALUES (p_host_id, NULL, p_purpose, p_court_id, true, '{}')
    RETURNING id INTO v_chat_id;

    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_host_id, false, now())
    ON CONFLICT (chat_id, user_id) DO UPDATE SET joined_at = now();

    v_is_new := true;
  END IF;

  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (v_chat_id, p_applicant_id, false, now())
  ON CONFLICT (chat_id, user_id) DO UPDATE SET joined_at = now();

  RETURN json_build_object('chat_id', v_chat_id, 'is_new', v_is_new);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'is_new', false, 'error', SQLERRM);
END;
$$;
