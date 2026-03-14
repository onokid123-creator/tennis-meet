/*
  # Delete all courts for v9 reset

  Clears all court-related data for the app reset.
*/

DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM applications;
DELETE FROM courts;
