-- Add API keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  subscription_name TEXT NOT NULL,
  amount_btc NUMERIC NOT NULL,
  amount_usd NUMERIC,
  interval_type TEXT NOT NULL CHECK (interval_type IN ('blocks', 'days', 'weeks', 'months')),
  interval_value INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  next_payment_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_payment_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add subscription payments table
CREATE TABLE public.subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL,
  transaction_id UUID,
  amount_btc NUMERIC NOT NULL,
  amount_usd NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_block_height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Add webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new fields to merchant_profiles
ALTER TABLE public.merchant_profiles 
ADD COLUMN api_key_prefix TEXT DEFAULT 'spk_',
ADD COLUMN fee_recipient_address TEXT,
ADD COLUMN testnet_mode BOOLEAN NOT NULL DEFAULT true;

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Merchants can view their own API keys"
ON public.api_keys FOR SELECT
USING (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Merchants can create their own API keys"
ON public.api_keys FOR INSERT
WITH CHECK (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Merchants can update their own API keys"
ON public.api_keys FOR UPDATE
USING (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Merchants can delete their own API keys"
ON public.api_keys FOR DELETE
USING (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

-- RLS Policies for subscriptions
CREATE POLICY "Merchants can view their own subscriptions"
ON public.subscriptions FOR SELECT
USING (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Merchants can create their own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Merchants can update their own subscriptions"
ON public.subscriptions FOR UPDATE
USING (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

-- RLS Policies for subscription_payments
CREATE POLICY "Merchants can view their subscription payments"
ON public.subscription_payments FOR SELECT
USING (subscription_id IN (
  SELECT id FROM subscriptions WHERE merchant_id IN (
    SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
  )
));

-- RLS Policies for webhook_logs
CREATE POLICY "Merchants can view their own webhook logs"
ON public.webhook_logs FOR SELECT
USING (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Merchants can create their own webhook logs"
ON public.webhook_logs FOR INSERT
WITH CHECK (merchant_id IN (
  SELECT id FROM merchant_profiles WHERE user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();