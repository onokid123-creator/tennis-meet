/*
  # Full Data Purge for Fresh Test Start

  Deletes all user data, courts, chats, messages, applications, and auth users
  so testing can begin from scratch with a clean signup flow.

  Tables cleared (in dependency order):
  - leave_requests
  - court_group_chat_messages
  - court_group_chat_participants
  - court_group_chats
  - messages
  - chat_participants
  - chats
  - applications
  - courts
  - blocked_users
  - profiles
  - auth.users (via delete)
*/

DELETE FROM leave_requests;
DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;
DELETE FROM applications;
DELETE FROM courts;
DELETE FROM blocked_users;
DELETE FROM profiles;
DELETE FROM auth.users;
