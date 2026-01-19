// Mock user data
export const mockUserData = {
    id: '1',
    email: 'test@example.com',
    email_verified: true,
    phone_verified: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    aud: 'authenticated',
    app_metadata: {
        provider: 'email',
        providers: ['email']
    },
    user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        avatar_url: null
    },
    role: 'authenticated',
    phone: null,
};

// Mock merchant data
export const mockMerchantData = {
    id: '1',
    user_id: '1',
    business_name: 'Test Business',
    webhook_url: 'https://example.com/webhook',
    created_at: '2025-10-17T00:00:00Z',
};

// Mock invoice data
export const mockInvoiceData = {
    id: 'INV_1234',
    merchant_id: '1',
    recipient: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    amount: 100000000n, // 100 STX
    currency: 'STX',
    status: 'pending',
    description: 'Test Invoice',
    metadata: '{}',
    email: 'customer@example.com',
    created_at: '2025-10-17T00:00:00Z',
    expires_at: '2025-10-18T00:00:00Z',
};

export const mockWalletData = {
    address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    publicKey: '0000000000000000000000000000000000000000000000000000000000000000',
};

export const mockBlockchainData = {
    lastBlock: 100000,
    stacksChainTip: '0x000000000000000000000000000000000000000000000000000000000000000',
};