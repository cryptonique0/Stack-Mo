import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// Mock the window.crypto API
Object.defineProperty(window, 'crypto', {
    value: {
        getRandomValues: (arr: Uint8Array) => crypto.getRandomValues(arr),
        subtle: {
            digest: vi.fn(),
        },
    },
});

// Mock micro-stacks
vi.mock('@micro-stacks/react', () => ({
    useAuth: vi.fn(),
    useAccount: vi.fn(),
    useNetwork: vi.fn(),
    useOpenContractCall: vi.fn(),
    useOpenContractDeploy: vi.fn(),
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: {
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        })),
    })),
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Clean up after each test
afterEach(() => {
    vi.clearAllMocks();
});