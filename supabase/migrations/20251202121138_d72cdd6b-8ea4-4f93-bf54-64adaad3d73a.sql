-- Create storage bucket for ingredient images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ingredient-images', 'ingredient-images', true);

-- Create policy for viewing images (public)
CREATE POLICY "Public can view ingredient images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ingredient-images');

-- Create policy for uploading images (authenticated users)
CREATE POLICY "Authenticated users can upload ingredient images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ingredient-images');

-- Create policy for updating images (admins only)
CREATE POLICY "Admins can update ingredient images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ingredient-images' AND has_role(auth.uid(), 'admin'));

-- Create policy for deleting images (admins only)
CREATE POLICY "Admins can delete ingredient images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ingredient-images' AND has_role(auth.uid(), 'admin'));