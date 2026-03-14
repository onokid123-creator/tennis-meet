/*
  # Full Data Reset v3

  Deletes all user-generated data in correct dependency order:
  - court_group_chat_messages
  - court_group_chat_participants
  - court_group_chats
  - messages
  - chat_participants
  - chats
  - applications
  - courts
  - profiles
  - auth.users
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
