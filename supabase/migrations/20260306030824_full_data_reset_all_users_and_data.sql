/*
  # Full Data Reset - Delete All User Data

  This migration deletes all data from the following tables:
  - messages (chat messages)
  - chat_participants (chat membership)
  - chats (1:1 chat rooms)
  - court_group_chat_messages (group chat messages)
  - court_group_chat_participants (group chat membership)
  - court_group_chats (group chat rooms)
  - applications (all applications)
  - courts (all courts)
  - profiles (all user profiles)
  
  Note: Auth users must be deleted separately via Supabase dashboard or admin API.
  This clears all app data for a fresh start.
*/

DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;
DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;
