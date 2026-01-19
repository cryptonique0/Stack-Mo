-- Create business categories enum
CREATE TYPE business_category AS ENUM (
  'retail', 'saas', 'freelance_services', 'ngo', 'consulting', 
  'e_commerce', 'marketplace', 'subscription', 'other'
);

-- Create verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'declined');

-- Create invoice status enum
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'expired', 'cancelled');

-- Create transaction status enum
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create merchant profiles table
CREATE TABLE public.merchant_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_category business_category NOT NULL,
  country TEXT NOT NULL,
  business_website TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL UNIQUE,
  wallet_type TEXT NOT NULL DEFAULT 'stacks',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  amount_btc DECIMAL(16, 8) NOT NULL,
  amount_usd DECIMAL(10, 2),
  description TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  payment_link TEXT NOT NULL UNIQUE,
  qr_code TEXT,
  status invoice_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  transaction_hash TEXT,
  amount_btc DECIMAL(16, 8) NOT NULL,
  amount_usd DECIMAL(10, 2),
  status transaction_status NOT NULL DEFAULT 'pending',
  confirmation_count INTEGER DEFAULT 0,
  escrow_released BOOLEAN NOT NULL DEFAULT false,
  escrow_release_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create escrow table
CREATE TABLE public.escrow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  amount_btc DECIMAL(16, 8) NOT NULL,
  amount_usd DECIMAL(10, 2),
  is_released BOOLEAN NOT NULL DEFAULT false,
  release_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for merchant_profiles
CREATE POLICY "Users can view their own merchant profile" 
ON public.merchant_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own merchant profile" 
ON public.merchant_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own merchant profile" 
ON public.merchant_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for wallets
CREATE POLICY "Merchants can view their own wallets" 
ON public.wallets 
FOR SELECT 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can create their own wallets" 
ON public.wallets 
FOR INSERT 
WITH CHECK (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can update their own wallets" 
ON public.wallets 
FOR UPDATE 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

-- Create RLS policies for invoices
CREATE POLICY "Merchants can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can create their own invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can update their own invoices" 
ON public.invoices 
FOR UPDATE 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

-- Create RLS policies for transactions
CREATE POLICY "Merchants can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

-- Create RLS policies for escrow
CREATE POLICY "Merchants can view their own escrow" 
ON public.escrow 
FOR SELECT 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can update their own escrow" 
ON public.escrow 
FOR UPDATE 
USING (merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid()));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_merchant_profiles_updated_at
  BEFORE UPDATE ON public.merchant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();