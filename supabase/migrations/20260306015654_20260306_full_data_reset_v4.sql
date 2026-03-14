/*
  # Full Data Reset v4

  Deletes all user-generated data for a clean slate.
  Order: messages → participants → chats → group chat data → applications → courts → profiles → auth users
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
