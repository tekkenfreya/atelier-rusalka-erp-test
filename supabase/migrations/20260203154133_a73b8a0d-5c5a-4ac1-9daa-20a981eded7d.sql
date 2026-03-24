-- Add format column to scheduled_exports table
ALTER TABLE public.scheduled_exports 
ADD COLUMN format TEXT NOT NULL DEFAULT 'excel';

-- Add comment for clarity
COMMENT ON COLUMN public.scheduled_exports.format IS 'Export format: excel, pdf, csv, csv-utf8';