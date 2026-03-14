/*
  # Full Data Reset v5 (tennis_style migration)

  Deletes all user-generated data for a clean slate after
  replacing the "position" field with "tennis_style".
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
