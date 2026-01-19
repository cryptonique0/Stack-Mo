-- Remove verification status from merchant_profiles table
ALTER TABLE public.merchant_profiles 
DROP COLUMN IF EXISTS verification_status,
DROP COLUMN IF EXISTS verification_documents;

-- Drop the verification_status enum if it exists
DROP TYPE IF EXISTS public.verification_status;