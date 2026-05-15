/*
  # Chat Room Rules: Always Create New Chat on Accept

  ## Summary
  This migration enforces strict "always new chat room" rules for both 1v1 and group chats.

  ## Changes

  ### 1. New column: chats.host_left (boolean)
  - Marks a chat room as "dead" when the host has left
  - Dead rooms are NEVER reused for new applications
  - Default: false

  ### 2. Rewrite accept_group_chat RPC
  - ALWAYS creates a new chat room when accepting an application
  - Never reuses any existing chat room, regardless of court_id or host
  - New participant gets joined_at = now() so they cannot see prior messages in any future shared room
  - Existing group chat lookup is completely removed

  ### 3. Rewrite accept_1v1_chat RPC
  - Already receives a fresh chat_id from the frontend (always new INSERT)
  - Registers both participants with joined_at = now()
  - ON CONFLICT: preserve existing joined_at (do not reset for existing participants)

  ## Security
  - Both functions remain SECURITY DEFINER to bypass RLS recursion
  - RLS policies on chat_participants still apply for reads

  ## Message Visibility
  - ChatRoom.tsx already filters messages: WHERE created_at >= chat_participants.joined_at
  - This ensures new participants (joined_at = now()) see only messages from entry point
  - Existing participants are unaffected (their joined_at is preserved)
*/

-- 1. Add host_left column to chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'host_left' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.chats ADD COLUMN host_left boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Rewrite accept_group_chat: ALWAYS create new chat room
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
BEGIN
  -- ALWAYS create a brand new group chat room
  -- Never reuse existing rooms — prevents cross-matching and wrong-room issues
  INSERT INTO public.chats (user1_id, user2_id, purpose, court_id, is_group, host_left, confirmed_user_ids)
  VALUES (p_host_id, NULL, p_purpose, p_court_id, true, false, '{}')
  RETURNING id INTO v_chat_id;

  -- Add host as first participant with joined_at = now()
  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (v_chat_id, p_host_id, false, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Add applicant as participant with joined_at = now()
  -- They can only see messages from this point forward
  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (v_chat_id, p_applicant_id, false, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object('chat_id', v_chat_id, 'is_new', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'is_new', false, 'error', SQLERRM);
END;
$$;

-- 3. Rewrite accept_1v1_chat: preserve joined_at for existing, set for new
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
  -- Insert host participant; if already exists preserve their joined_at
  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (p_chat_id, p_host_id, false, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Insert applicant participant; if already exists preserve their joined_at
  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (p_chat_id, p_applicant_id, false, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
