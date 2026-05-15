/*
  # Fix chats table for group chat support

  ## Problem
  - user2_id is NOT NULL, preventing group chats from being created without a second user
  - UNIQUE constraint on (user1_id, user2_id, purpose) causes duplicate key errors
    when the same host accepts multiple applicants for the same group court

  ## Changes
  1. Make user2_id nullable (group chats don't require a fixed second user)
  2. Drop the old unique constraint that prevents group chat dedup
  3. Add a new partial unique constraint that only applies to non-group (1:1) chats
     so direct chats between the same two users for the same purpose are still deduplicated
  4. Add a partial unique constraint on court_id for group chats (one group chat per court)
*/

-- Make user2_id nullable so group chats can be created without specifying user2
ALTER TABLE chats ALTER COLUMN user2_id DROP NOT NULL;

-- Drop the old unique constraint (user1_id, user2_id, purpose) that blocks group chat inserts
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user1_id_user2_id_purpose_key;

-- New partial unique constraint: for 1:1 chats, still prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS chats_1v1_unique
  ON chats (user1_id, user2_id, purpose)
  WHERE is_group = false AND user2_id IS NOT NULL;

-- New partial unique constraint: only one group chat per court
CREATE UNIQUE INDEX IF NOT EXISTS chats_group_court_unique
  ON chats (court_id)
  WHERE is_group = true AND court_id IS NOT NULL;
