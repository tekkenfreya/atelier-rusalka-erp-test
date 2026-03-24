
CREATE TABLE public.startup_project_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'Planned',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

ALTER TABLE public.startup_project_cards ENABLE ROW LEVEL SECURITY;

-- Only admins can manage cards
CREATE POLICY "Admins can manage startup project cards"
  ON public.startup_project_cards
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view
CREATE POLICY "Authenticated users can view startup project cards"
  ON public.startup_project_cards
  FOR SELECT
  USING (true);

-- Unique constraint: one card per product
ALTER TABLE public.startup_project_cards ADD CONSTRAINT unique_product_card UNIQUE (product_id);

-- Timestamp trigger
CREATE TRIGGER update_startup_project_cards_updated_at
  BEFORE UPDATE ON public.startup_project_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
