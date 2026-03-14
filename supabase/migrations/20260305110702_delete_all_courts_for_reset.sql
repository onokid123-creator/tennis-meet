/*
  # Delete all courts for app reset

  Deletes all court records as part of the v8 reset.
  All related applications and group chats are also cleaned up via cascade or manual delete.
*/

DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM applications;
DELETE FROM courts;
