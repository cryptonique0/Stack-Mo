import { createContext } from 'react';

import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    user: User | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    handleAuthStateChange: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_DELETED' | 'USER_UPDATED') => void;
    handleError: (error: Error) => void;
}

interface WalletContextType {
    account: string;
    isConnected: boolean;
    isLoading: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
}

export const MockAuthContext = createContext<AuthContextType | null>(null);
export const MockWalletContext = createContext<WalletContextType | null>(null);