/*
  # Full Data Purge - Fresh Start v2

  Deletes all data from all tables in correct order (respecting FK constraints)
  and removes all auth users.

  Tables cleared (in dependency order):
    - court_group_chat_messages
    - court_group_chat_participants
    - court_group_chats
    - leave_requests
    - messages
    - chat_participants
    - chats
    - applications
    - blocked_users
    - courts
    - profiles
    - auth.users
*/

DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM leave_requests;
DELETE FROM court_group_chats;
DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;
DELETE FROM applications;
DELETE FROM blocked_users;
DELETE FROM courts;
DELETE FROM profiles;
DELETE FROM auth.users;
