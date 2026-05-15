/*
  # Full Data Reset v3

  Deletes all data from every table in dependency order,
  then deletes all auth users.
*/

DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM chat_participants;
DELETE FROM messages;
DELETE FROM chats;
DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;

DELETE FROM auth.users;
