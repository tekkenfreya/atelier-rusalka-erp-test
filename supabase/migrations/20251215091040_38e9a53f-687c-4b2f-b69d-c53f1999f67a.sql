-- Allow multiple rows per product/ingredient, including in same phase
ALTER TABLE public.product_ingredients
  DROP CONSTRAINT IF EXISTS product_ingredients_product_id_ingredient_id_key;