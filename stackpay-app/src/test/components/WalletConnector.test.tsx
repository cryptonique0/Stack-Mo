vi.mock('@/components/QRCodeDisplay', () => ({
    QRCodeDisplay: () => <div data-testid="mock-qrcode" />,
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { WalletConnector } from '../../components/WalletConnector';
import * as stacksConnect from '@stacks/connect';

// Mock @stacks/connect
vi.mock('@stacks/connect', () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn()
}));

// Define wallet address type for mocks
type WalletAddress = {
    symbol?: string;
    address: string;
    publicKey: string;
    addressType: string;
};

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast })
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
    }
}));

describe('WalletConnector', () => {
    const mockMerchantId = 'merchant-123';
    const mockOnWalletConnected = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders connect wallet options', () => {
        render(
            <WalletConnector
                merchantId={mockMerchantId}
                onWalletConnected={mockOnWalletConnected}
            />
        );

        expect(screen.getByText('Connect Hiro Wallet')).toBeInTheDocument();
        expect(screen.getByText('Generate New Wallet')).toBeInTheDocument();
    });

    it('connects to Hiro wallet successfully', async () => {
        const mockAddresses: WalletAddress[] = [
            { symbol: 'BTC', address: 'btc-address', publicKey: 'btc-pubkey', addressType: 'p2pkh' },
            { symbol: 'ETH', address: 'eth-address', publicKey: 'eth-pubkey', addressType: 'ethereum' },
            { symbol: 'STX', address: 'stx-address', publicKey: 'stx-pubkey', addressType: 'stacks' }
        ];

        vi.mocked(stacksConnect.connect).mockResolvedValueOnce({ addresses: mockAddresses });

        render(
            <WalletConnector
                merchantId={mockMerchantId}
                onWalletConnected={mockOnWalletConnected}
            />
        );

        // Open Hiro wallet card first
        const hiroCard = screen.getByText('Connect Hiro Wallet');
        await fireEvent.click(hiroCard);

        // Now find and click the inner button
        const connectButton = await screen.findAllByText('Connect Hiro Wallet');
        await fireEvent.click(connectButton[1]);

        expect(connectButton[1]).toBeDisabled();

        await waitFor(() => {
            expect(mockOnWalletConnected).toHaveBeenCalledWith('stx-address');
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Wallet Connected' })
            );
        });
    });

    it('shows loading state while connecting', async () => {
        let resolveConnect: (value: { addresses: WalletAddress[] }) => void;
        const connectPromise = new Promise<{ addresses: WalletAddress[] }>((resolve) => {
            resolveConnect = resolve;
        });

        vi.mocked(stacksConnect.connect).mockImplementationOnce(() => connectPromise); render(
            <WalletConnector
                merchantId={mockMerchantId}
                onWalletConnected={mockOnWalletConnected}
            />
        );

        const hiroCard = screen.getByText('Connect Hiro Wallet');
        await fireEvent.click(hiroCard);

        const connectButton = (await screen.findAllByText('Connect Hiro Wallet'))[1];
        await fireEvent.click(connectButton);

        expect(connectButton).toBeDisabled();

        // Resolve with a mock Stacks address that matches the expected format
        resolveConnect!({
            addresses: [{
                symbol: 'STX',
                address: 'mock-stx-address',
                publicKey: 'mock-public-key',
                addressType: 'stacks'
            }]
        });
    });

    it('handles connection errors gracefully', async () => {
        const mockError = new Error('Connection failed');
        vi.mocked(stacksConnect.connect).mockRejectedValueOnce(mockError);

        render(
            <WalletConnector
                merchantId={mockMerchantId}
                onWalletConnected={mockOnWalletConnected}
            />
        );

        const hiroCard = screen.getByText('Connect Hiro Wallet');
        await fireEvent.click(hiroCard);

        const connectButton = (await screen.findAllByText('Connect Hiro Wallet'))[1];
        await fireEvent.click(connectButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Connection Error',
                    description: 'Connection failed'
                })
            );
        });
    });
});
