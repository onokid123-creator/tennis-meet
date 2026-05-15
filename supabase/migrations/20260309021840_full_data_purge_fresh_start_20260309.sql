/*
  # Full Data Purge - Fresh Start

  Deletes all user-generated data from all tables for a completely clean start.
  - Removes all messages
  - Removes all chat_participants
  - Removes all chats
  - Removes all group chat members and group chats
  - Removes all applications
  - Removes all courts
  - Signs out / deletes all auth users
*/

DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_chat_members') THEN
    DELETE FROM group_chat_members;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_chats') THEN
    DELETE FROM group_chats;
  END IF;
END $$;

DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;

DELETE FROM auth.users;
