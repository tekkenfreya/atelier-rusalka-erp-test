-- Drop the percentage check constraint that requires numeric values
ALTER TABLE public.product_ingredients 
DROP CONSTRAINT product_ingredients_percentage_check;

-- Change percentage column from numeric to text to allow symbols/letters
ALTER TABLE public.product_ingredients 
ALTER COLUMN percentage TYPE text USING percentage::text;