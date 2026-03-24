-- Create saved_exports table for persisting export configurations
CREATE TABLE public.saved_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  fields TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_exports ENABLE ROW LEVEL SECURITY;

-- Admins can manage all saved exports
CREATE POLICY "Admins can manage saved exports"
ON public.saved_exports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));