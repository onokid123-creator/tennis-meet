/*
  # Full Data Purge v3

  Complete wipe of all user, court, chat and message data.
  Schema and RLS preserved.
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
