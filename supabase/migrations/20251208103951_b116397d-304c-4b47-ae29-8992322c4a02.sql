-- Update RLS policies for ingredients to allow editors
DROP POLICY IF EXISTS "Admins can manage ingredients" ON public.ingredients;
CREATE POLICY "Admins and editors can manage ingredients" 
ON public.ingredients 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Update RLS policies for manufacturers to allow editors
DROP POLICY IF EXISTS "Admins can manage manufacturers" ON public.manufacturers;
CREATE POLICY "Admins and editors can manage manufacturers" 
ON public.manufacturers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Update RLS policies for products to allow editors
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins and editors can manage products" 
ON public.products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Update RLS policies for product_ingredients to allow editors
DROP POLICY IF EXISTS "Admins can manage product ingredients" ON public.product_ingredients;
CREATE POLICY "Admins and editors can manage product ingredients" 
ON public.product_ingredients 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Update RLS policies for suppliers to allow editors
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
CREATE POLICY "Admins and editors can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));