-- Fix: Make advertiser_id nullable to allow campaigns to use user_id instead
-- This fixes the error: "null value in column "advertiser_id" violates not-null constraint"

ALTER TABLE public.campaigns 
  ALTER COLUMN advertiser_id DROP NOT NULL;

