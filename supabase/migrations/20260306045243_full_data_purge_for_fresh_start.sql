/*
  # Full Data Purge for Fresh Start

  Deletes ALL data from every table so the app starts completely clean.
  Schema, RLS policies, and functions are preserved.

  Deletion order respects all foreign key constraints.
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
