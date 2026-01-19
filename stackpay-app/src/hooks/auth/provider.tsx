import { ReactNode, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        // THEN check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
        try {
            const redirectUrl = `${window.location.origin}/`;

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    }
                }
            });

            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
                return { error };
            }

            return {};
        } catch (error: unknown) {
            console.error('Error signing up:', error);
            // Convert unknown error to AuthError
            const authError = new Error('An error occurred') as AuthError;
            authError.message = error instanceof Error ? error.message : 'An error occurred';
            toast({
                title: "Error",
                description: authError.message,
                variant: "destructive",
            });
            return { error: authError };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
                return { error };
            }

            return {};
        } catch (error: unknown) {
            console.error('Error signing in:', error);
            // Convert unknown error to AuthError
            const authError = new AuthError('An error occurred');
            authError.message = error instanceof Error ? error.message : 'An error occurred';
            toast({
                title: "Error",
                description: authError.message,
                variant: "destructive",
            });
            return { error: authError };
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error: unknown) {
            console.error('Error signing out:', error);
            // Convert unknown error to AuthError
            const authError = new AuthError('An error occurred');
            authError.message = error instanceof Error ? error.message : 'An error occurred';
            toast({
                title: "Error",
                description: authError.message,
                variant: "destructive",
            });
            throw authError;
        }
    };

    const value: typeof AuthContext extends React.Context<infer T> ? T : never = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}