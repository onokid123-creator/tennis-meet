/*
  # Full Data Reset

  ## Summary
  Deletes all user-generated data for a fresh start.
  All tables are cleared in dependency order to avoid FK constraint errors.

  ## Tables Cleared (in order)
  1. court_group_chat_messages
  2. court_group_chat_participants
  3. court_group_chats
  4. messages
  5. chat_participants
  6. chats
  7. applications
  8. courts
  9. profiles
  10. auth.users (cascades to profiles)

  ## Notes
  - RLS policies remain intact
  - App will require fresh sign-up after this reset
*/

DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;
DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;
DELETE FROM auth.users;
