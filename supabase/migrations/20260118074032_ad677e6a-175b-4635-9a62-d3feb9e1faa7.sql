-- Create table for user cloud storage integrations
CREATE TABLE public.cloud_storage_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('onedrive', 'googledrive')),
    display_name TEXT,
    is_connected BOOLEAN DEFAULT false,
    connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, provider)
);

-- Enable RLS
ALTER TABLE public.cloud_storage_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own integrations
CREATE POLICY "Users can view own integrations"
ON public.cloud_storage_integrations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own integrations
CREATE POLICY "Users can insert own integrations"
ON public.cloud_storage_integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations"
ON public.cloud_storage_integrations
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
ON public.cloud_storage_integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_cloud_storage_integrations_updated_at
BEFORE UPDATE ON public.cloud_storage_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();