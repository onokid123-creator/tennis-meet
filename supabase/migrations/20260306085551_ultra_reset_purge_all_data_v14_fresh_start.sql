/*
  # Ultra Reset - Purge All Data for Fresh Start

  Deletes all test data so the app starts completely clean:
  - All messages
  - All chat_participants
  - All chats
  - All group chat messages
  - All group_chat_participants
  - All group_chats
  - All applications
  - All courts
  - All profiles
  - All auth users (via cascade)
*/

DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_chat_messages') THEN
    DELETE FROM group_chat_messages;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_chat_participants') THEN
    DELETE FROM group_chat_participants;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_chats') THEN
    DELETE FROM group_chats;
  END IF;
END $$;

DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;

DELETE FROM auth.users;
