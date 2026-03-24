-- Add original_order_amount column to store the original order amount before reception
ALTER TABLE public.order_items
ADD COLUMN original_order_amount numeric;

-- Set existing original_order_amount to match order_amount for non-received items
UPDATE public.order_items
SET original_order_amount = order_amount
WHERE order_amount > 0;

-- For items already received (order_amount = 0), we can't recover the original amount
-- They will need to be set manually or we leave them as null