-- Allow SharePoint as a scheduled export destination
ALTER TABLE public.scheduled_exports
  DROP CONSTRAINT IF EXISTS scheduled_exports_destination_check;

ALTER TABLE public.scheduled_exports
  ADD CONSTRAINT scheduled_exports_destination_check
  CHECK (destination IN ('onedrive', 'googledrive', 'email', 'sharepoint'));