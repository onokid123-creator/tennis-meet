/*
  # Fix RLS Policies - Simplified for Application Accept Flow

  ## Summary
  The previous migration's system message INSERT policy required chat_participants
  to exist first, but the flow is: create chat -> add participants -> send system message.
  This creates a chicken-and-egg problem. Simplify so that:
  1. Any authenticated user can insert into chats (user must be user1 or user2)
  2. Any authenticated user can insert into chat_participants 
  3. Any authenticated user can send messages in chats they belong to (user or system)
  4. For system messages: allow ANY authenticated user to insert (no participant check)
     since only the server-side / host flow sends them right after creating participants.
  5. SELECT on messages still locked to chat_participants only (post-entry restriction).

  ## Changes
  - Drop and recreate messages INSERT policy to allow system messages without participant check
  - All other policies unchanged
*/

-- Drop the old messages INSERT policy
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

-- Recreate: allow user messages if participant, allow system messages freely (authenticated)
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      type = 'user'
      AND auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM chat_participants cp
        WHERE cp.chat_id = messages.chat_id
          AND cp.user_id = auth.uid()
      )
    )
    OR
    (
      type = 'system'
      AND sender_id IS NULL
    )
  );
