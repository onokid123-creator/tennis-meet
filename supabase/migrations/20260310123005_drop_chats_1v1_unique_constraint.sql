/*
  # Drop chats_1v1_unique index

  The unique index (user1_id, user2_id, purpose) on non-group chats
  prevents the same user pair from having more than one 1:1 chat per
  purpose, even when the courts are different. This blocks the intended
  behavior where each court creates its own independent chat room.

  This migration drops that constraint so that the application-level
  dedup (which already checks court_id) takes sole responsibility.
*/

DROP INDEX IF EXISTS chats_1v1_unique;
