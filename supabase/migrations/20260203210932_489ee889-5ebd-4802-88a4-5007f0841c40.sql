-- Drop the existing check constraint
ALTER TABLE public.cloud_storage_integrations 
DROP CONSTRAINT IF EXISTS cloud_storage_integrations_provider_check;

-- Add new check constraint that includes sharepoint
ALTER TABLE public.cloud_storage_integrations 
ADD CONSTRAINT cloud_storage_integrations_provider_check 
CHECK (provider IN ('onedrive', 'googledrive', 'sharepoint'));