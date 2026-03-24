-- Create scheduled_exports table for storing schedule configurations
CREATE TABLE public.scheduled_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  saved_export_id UUID NOT NULL REFERENCES public.saved_exports(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  destination TEXT NOT NULL CHECK (destination IN ('onedrive', 'googledrive', 'email')),
  destination_path TEXT, -- OneDrive/Google Drive folder path
  email TEXT, -- Email address if destination is email
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_exports ENABLE ROW LEVEL SECURITY;

-- Admins can manage all scheduled exports
CREATE POLICY "Admins can manage scheduled exports"
ON public.scheduled_exports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create export_history table for tracking export runs
CREATE TABLE public.export_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_export_id UUID NOT NULL REFERENCES public.scheduled_exports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  file_name TEXT,
  file_size INTEGER,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage export history
CREATE POLICY "Admins can manage export history"
ON public.export_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_exports_updated_at
BEFORE UPDATE ON public.scheduled_exports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();