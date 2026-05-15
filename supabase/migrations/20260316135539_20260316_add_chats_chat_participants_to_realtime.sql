
/*
  # Add chats and chat_participants to Realtime publication

  Tables chats and chat_participants were missing from supabase_realtime publication.
  These are required for real-time chat functionality in the app.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
