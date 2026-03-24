-- Create product_method_steps table
CREATE TABLE public.product_method_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  step_number TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'step' CHECK (step_type IN ('step', 'notes')),
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_method_steps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view method steps"
ON public.product_method_steps
FOR SELECT
USING (true);

CREATE POLICY "Admins and editors can manage method steps"
ON public.product_method_steps
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Create index for faster queries
CREATE INDEX idx_product_method_steps_product_id ON public.product_method_steps(product_id);