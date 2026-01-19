import React from 'react';
import { vi } from 'vitest';
import { AuthContext } from '../../hooks/useAuth';
import { WalletContext } from '../../contexts/WalletContext';
import { mockUserData } from './data';
import type { User, Session } from '@supabase/supabase-js';

const mockSession: Session = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    expires_at: 1704067200,
    token_type: 'bearer',
    user: mockUserData as User
};

export const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const mockAuthValue = {
        user: mockUserData as User,
        session: mockSession,
        loading: false,
        signIn: vi.fn().mockResolvedValue({}),
        signUp: vi.fn().mockResolvedValue({}),
        signOut: vi.fn().mockResolvedValue(undefined)
    };

    return (
        <AuthContext.Provider value={mockAuthValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const MockWalletProvider = ({ children }: { children: React.ReactNode }) => {
    const mockWalletValue = {
        account: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        isConnected: false,
        isLoading: false,
        connectWallet: vi.fn().mockResolvedValue(undefined),
        disconnectWallet: vi.fn()
    };

    return (
        <WalletContext.Provider value={mockWalletValue}>
            {children}
        </WalletContext.Provider>
    );
};