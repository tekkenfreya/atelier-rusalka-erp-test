-- Add batch_config column to saved_exports table for storing batch calculation configuration
ALTER TABLE public.saved_exports
ADD COLUMN batch_config jsonb DEFAULT NULL;

-- Comment explaining the structure
COMMENT ON COLUMN public.saved_exports.batch_config IS 'Stores batch calculation config: {moisturizerVolume, moisturizerQuantity, cleanserVolume, cleanserQuantity, serumVolume, serumQuantity, foamingShowerGelVolume, foamingShowerGelQuantity}';