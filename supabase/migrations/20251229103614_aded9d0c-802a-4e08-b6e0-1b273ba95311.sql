-- Add type column to ingredients table with default value 'Ingredient'
ALTER TABLE public.ingredients 
ADD COLUMN type text DEFAULT 'Ingredient';