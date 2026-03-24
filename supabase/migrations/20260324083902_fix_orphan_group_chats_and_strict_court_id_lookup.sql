/*
  # Fix orphan group chats and enforce strict court_id lookup

  ## Problem
  Previous versions of accept_group_chat RPC created group chat rooms without
  storing the court_id in the chats table (left as NULL). These orphan rooms
  remained with host_left=false and the host still present as a participant.

  When the old RPC (before court_id filtering was added) ran, it would find these
  old court_id=NULL rooms and incorrectly connect new applicants to them instead
  of the correct current court room.

  ## Fixes

  ### 1. Mark old court_id=NULL group rooms as host_left=true
  These rooms have no valid court association and should be considered "dead".
  Marking them host_left=true ensures:
  - They are excluded from all valid room lookups
  - The accept_group_chat RPC will never reuse them
  - Existing participants can still read old messages but no new joins happen

  ### 2. Harden accept_group_chat RPC with NULL guard
  If p_court_id is NULL for any reason, immediately raise an error instead of
  silently creating a broken room or matching wrong rooms.

  ### 3. Strict court_id match in RPC
  The room lookup already uses court_id = p_court_id. With NULL rooms marked
  as dead, this eliminates all false matches.
*/

-- Step 1: Mark all court_id=NULL group chat rooms as host_left=true
-- These are orphan rooms from old RPC versions that had no court_id tracking
UPDATE public.chats
SET host_left = true
WHERE is_group = true
  AND court_id IS NULL
  AND host_left = false;

-- Step 2: Replace accept_group_chat with hardened version
-- Added: p_court_id NULL guard, explicit court_id IS NOT NULL check in lookup
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
  -- Guard: court_id must never be NULL
  IF p_court_id IS NULL THEN
    RAISE EXCEPTION 'p_court_id must not be NULL';
  END IF;

  -- Step 1: Find an existing VALID room for this exact court + host
  -- Conditions:
  --   court_id must match exactly (prevents cross-court room reuse)
  --   court_id must not be NULL (extra safety)
  --   user1_id = host (host created the room)
  --   is_group = true
  --   host_left = false (host has not left)
  --   host is still an active participant
  SELECT c.id INTO v_chat_id
  FROM public.chats c
  WHERE c.court_id = p_court_id
    AND c.court_id IS NOT NULL
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
    -- Valid room found: add only the new applicant
    -- Existing participants (host, previous applicants) are NOT modified
    -- ON CONFLICT DO NOTHING preserves existing joined_at for re-joining users
    v_is_new := false;

    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_applicant_id, false, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;

  ELSE
    -- No valid room: create a brand new room for this court
    v_is_new := true;

    INSERT INTO public.chats (user1_id, user2_id, purpose, court_id, is_group, host_left, confirmed_user_ids)
    VALUES (p_host_id, NULL, p_purpose, p_court_id, true, false, '{}')
    RETURNING id INTO v_chat_id;

    -- Register host first
    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_host_id, false, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Register applicant
    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_applicant_id, false, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'is_new', v_is_new);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'is_new', false, 'error', SQLERRM);
END;
$$;
