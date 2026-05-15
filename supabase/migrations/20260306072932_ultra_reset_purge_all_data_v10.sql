/*
  # Ultra Reset: Purge All Data v10

  Deletes all rows from every data table for a clean slate.
  Schema, indexes, and RLS policies are preserved.
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
