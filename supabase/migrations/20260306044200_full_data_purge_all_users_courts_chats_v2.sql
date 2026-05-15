/*
  # Full Data Purge v2

  Deletes ALL user data, courts, chats, messages, and applications.
  Complete reset - schema and RLS policies preserved.

  Deletion order respects foreign key constraints.
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
