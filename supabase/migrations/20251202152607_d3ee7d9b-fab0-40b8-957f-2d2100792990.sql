-- Add phase column to product_ingredients table
ALTER TABLE public.product_ingredients ADD COLUMN phase text DEFAULT 'A';