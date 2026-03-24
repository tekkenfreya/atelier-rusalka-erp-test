-- Add scheduled_hour column to scheduled_exports table
ALTER TABLE public.scheduled_exports
ADD COLUMN scheduled_hour INTEGER NOT NULL DEFAULT 9 CHECK (scheduled_hour >= 0 AND scheduled_hour <= 23);