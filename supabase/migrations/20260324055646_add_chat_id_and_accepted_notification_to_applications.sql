/*
  # Add chat_id and notification fields to applications

  ## Summary
  Allows the applicant to navigate to the exact accepted chat room
  from their sent applications list. Also adds a flag to control
  whether the acceptance notification card has been dismissed.

  ## Changes

  ### applications table
  - `chat_id` (uuid, nullable): The exact chat room created when the host accepted this application.
    Set at acceptance time. Used by the applicant to navigate to the correct chat room.
  - `applicant_notified` (boolean, default false): Whether the applicant has seen/dismissed
    the acceptance notification card. When true, the card is hidden from the sent list.

  ## Notes
  - chat_id is NOT a foreign key with CASCADE to avoid breaking the notification
    if the chat room is somehow removed (defensive design).
  - No RLS changes needed — existing policies on applications already handle access.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'chat_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN chat_id uuid DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'applicant_notified' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN applicant_notified boolean NOT NULL DEFAULT false;
  END IF;
END $$;
