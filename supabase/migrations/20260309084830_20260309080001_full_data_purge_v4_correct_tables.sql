/*
  # Full data purge - all tables v4

  Clears all user data across all existing tables.
  Tables: court_group_chat_messages, court_group_chat_participants, court_group_chats,
          messages, chat_participants, chats, leave_requests, applications, courts, profiles, auth.users
*/

DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM leave_requests;
DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;
DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;
DELETE FROM auth.users;
