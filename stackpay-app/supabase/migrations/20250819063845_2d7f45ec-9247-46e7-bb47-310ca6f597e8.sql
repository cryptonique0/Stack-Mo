-- Update merchant_profiles table to add webhook_url
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Update wallets table to ensure proper structure
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance_btc NUMERIC DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance_stx NUMERIC DEFAULT 0;

-- Update invoices table to add required fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'sBTC';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expiry_blocks INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expiry_minutes INTEGER;

-- Create invoice_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create transaction_status enum if it doesn't exist  
DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create verification_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'declined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create business_category enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE business_category AS ENUM ('ecommerce', 'freelancer', 'dao', 'saas', 'retail', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update column types to use enums
ALTER TABLE invoices ALTER COLUMN status TYPE invoice_status USING status::invoice_status;
ALTER TABLE transactions ALTER COLUMN status TYPE transaction_status USING status::transaction_status;
ALTER TABLE merchant_profiles ALTER COLUMN verification_status TYPE verification_status USING verification_status::verification_status;
ALTER TABLE merchant_profiles ALTER COLUMN business_category TYPE business_category USING business_category::business_category;