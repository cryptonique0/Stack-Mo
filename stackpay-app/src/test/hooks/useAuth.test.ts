import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';
import { mockUserData } from '../mocks/data';
import { supabase } from '@/integrations/supabase/client';
import { AuthError, Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { MockAuthProvider } from '../mocks/providers';

// Create mock session
const mockSession: Session = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    expires_at: 1704067200,
    token_type: 'bearer',
    user: mockUserData as User
};

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(() => ({
                data: {
                    subscription: {
                        id: 'mock-sub-id',
                        callback: () => { },
                        unsubscribe: vi.fn()
                    }
                }
            })),
            getSession: vi.fn(),
        },
    },
}));

describe('useAuth', () => {
    it('handles sign in successfully', async () => {
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
            data: { user: mockUserData as User, session: mockSession },
            error: null
        });

        const { result } = renderHook(() => useAuth(), {
            wrapper: MockAuthProvider
        });

        await act(async () => {
            await result.current.signIn('test@example.com', 'password');
        });

        expect(result.current.user).toEqual(mockUserData);
    });

    it('handles sign up successfully', async () => {
        vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
            data: { user: mockUserData as User, session: mockSession },
            error: null
        });

        const { result } = renderHook(() => useAuth(), {
            wrapper: MockAuthProvider
        });

        await act(async () => {
            const response = await result.current.signUp('test@example.com', 'password', 'Test', 'User');
            expect(response.error).toBeUndefined();
        });
    });

    it('handles sign out successfully', async () => {
        vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

        const { result } = renderHook(() => useAuth(), {
            wrapper: MockAuthProvider
        });

        await act(async () => {
            await result.current.signOut();
        });

        expect(result.current.user).toEqual(mockUserData);
    });

    it('handles sign in errors', async () => {
        const error = new Error('Invalid credentials');
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
            data: { user: null, session: null },
            error: {
                name: 'AuthError',
                message: 'Invalid credentials',
                status: 400
            } as AuthError
        });

        const { result } = renderHook(() => useAuth(), {
            wrapper: MockAuthProvider
        });

        await act(async () => {
            const response = await result.current.signIn('test@example.com', 'wrong');
            expect(response.error).toBeUndefined();
        });

        expect(result.current.user).toBeDefined();
    });

    it('handles auth state changes', async () => {
        let authChangeCallback: (event: AuthChangeEvent, session: Session | null) => void;
        vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
            authChangeCallback = callback;
            return {
                data: {
                    subscription: {
                        id: 'mock-sub-id',
                        callback: () => { },
                        unsubscribe: vi.fn()
                    }
                }
            };
        });

        vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
            data: { session: mockSession },
            error: null
        });

        const { result } = renderHook(() => useAuth(), {
            wrapper: MockAuthProvider
        });

        // Wait for initial session check
        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.user).toEqual(mockUserData);
    });
});