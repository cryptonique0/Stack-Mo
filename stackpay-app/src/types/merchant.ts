export interface MerchantSettings {
    processorAddress: string;
    feeRecipientAddress: string;
    apiKey: string;
    webhookUrl: string;
}

export interface MerchantProfile {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    business_name: string;
    business_category: string;
    country: string;
    business_website?: string;
    webhook_url?: string;
    is_registered?: boolean;
    processor_address?: string;
    fee_recipient_address?: string;
    created_at?: string;
    updated_at?: string;
}
