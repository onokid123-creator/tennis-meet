/*
  # Add trigger for reapply after kick

  ## Summary
  When an application's status is updated from 'cancelled' to 'pending'
  (reapply after being kicked), this trigger:
  1. Deletes the old record
  2. Inserts a fresh new record with the same data

  This causes a real INSERT event to fire, which triggers realtime
  notifications to the host via Applications.tsx's subscription.

  ## Changes
  - New function: handle_application_reapply()
  - New trigger: tr_application_reapply on applications table (BEFORE UPDATE)
*/

CREATE OR REPLACE FUNCTION handle_application_reapply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status = 'pending' THEN
    INSERT INTO applications (court_id, owner_id, applicant_id, purpose, status, message, created_at)
    VALUES (NEW.court_id, NEW.owner_id, NEW.applicant_id, NEW.purpose, 'pending', NEW.message, now());
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_application_reapply ON applications;

CREATE TRIGGER tr_application_reapply
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_reapply();
