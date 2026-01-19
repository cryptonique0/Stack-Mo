import { createContext } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: AuthError }>;
    signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);