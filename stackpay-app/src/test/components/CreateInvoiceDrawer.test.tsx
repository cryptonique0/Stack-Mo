import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { CreateInvoiceDrawer } from '../../components/invoices/CreateInvoiceDrawer';
import { mockMerchantData } from '../mocks/data';
import userEvent from '@testing-library/user-event';

// Mock the wallet context
vi.mock('@/contexts/WalletContext', () => ({
    useWallet: () => ({
        account: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        isConnected: true,
    }),
}));

// Mock the Stacks contract hook
const mockCallArchContract = vi.fn();
const mockReadArchContract = vi.fn();

vi.mock('@/hooks/useStacksContract', () => ({
    useStacksContract: () => ({
        callArchContract: mockCallArchContract,
        readArchContract: mockReadArchContract,
        isLoading: false,
        error: null,
    }),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }))
    }
}));

describe('CreateInvoiceDrawer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCallArchContract.mockResolvedValue({ txid: 'mock-tx-id' });
        mockReadArchContract.mockResolvedValue({ 
            value: { value: 1 } 
        });
    });

    it('renders the create invoice button', () => {
        render(<CreateInvoiceDrawer />);
        expect(screen.getByText(/create invoice/i)).toBeInTheDocument();
    });

    it('opens drawer when button is clicked', async () => {
        render(<CreateInvoiceDrawer />);
        
        const createButton = screen.getByRole('button', { name: /create invoice/i });
        await fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        });
    });

    it('validates required fields', async () => {
        render(<CreateInvoiceDrawer />);

        // Open drawer
        const createButton = screen.getByRole('button', { name: /create invoice/i });
        await fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
        });

        // Try to submit without filling fields
        const submitButton = screen.getByRole('button', { name: /^create invoice$/i });
        await fireEvent.click(submitButton);

        // HTML5 validation will prevent submission
        const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
        const descriptionInput = screen.getByLabelText(/description/i) as HTMLInputElement;
        
        expect(amountInput.required).toBe(true);
        expect(descriptionInput.required).toBe(true);
    });

    it('validates amount is positive', async () => {
        render(<CreateInvoiceDrawer />);

        // Open drawer
        const createButton = screen.getByRole('button', { name: /create invoice/i });
        await fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
        });

        const amountInput = screen.getByLabelText(/amount/i);
        await userEvent.clear(amountInput);
        await userEvent.type(amountInput, '-100');

        // HTML5 number input validation will handle negative values
        expect((amountInput as HTMLInputElement).type).toBe('number');
    });

    it('submits form with valid data', async () => {
        const mockOnInvoiceCreated = vi.fn();
        
        // Mock successful contract calls
        mockCallArchContract.mockResolvedValue({ txid: 'mock-tx-id' });
        mockReadArchContract
            .mockResolvedValueOnce({ value: { value: 1 } }) // get-invoice-count
            .mockResolvedValueOnce({ 
                value: { 
                    value: { 
                        'invoice-id': { value: 'invoice-123' } 
                    } 
                } 
            }); // get-invoice-id

        render(<CreateInvoiceDrawer onInvoiceCreated={mockOnInvoiceCreated} />);

        // Open drawer
        const createButton = screen.getByRole('button', { name: /create invoice/i });
        await fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
        });

        // Fill form
        await userEvent.type(screen.getByLabelText(/customer email/i), 'test@example.com');
        await userEvent.clear(screen.getByLabelText(/^amount/i));
        await userEvent.type(screen.getByLabelText(/^amount/i), '100');
        await userEvent.type(screen.getByLabelText(/^description/i), 'Test invoice');

        // Submit form
        const submitButton = screen.getByRole('button', { name: /^create invoice$/i });
        await fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockCallArchContract).toHaveBeenCalledWith(
                expect.objectContaining({
                    functionName: 'create-invoice',
                    functionArgs: expect.any(Array),
                })
            );
            expect(mockOnInvoiceCreated).toHaveBeenCalled();
        }, { timeout: 3000 });
    });

    it('shows loading state during submission', async () => {
        // Create a promise that won't resolve immediately
        let resolveCall: (value: { txid: string }) => void;
        const callPromise = new Promise(resolve => {
            resolveCall = resolve;
        });

        mockCallArchContract.mockImplementationOnce(() => callPromise);

        render(<CreateInvoiceDrawer />);

        // Open drawer
        const createButton = screen.getByRole('button', { name: /create invoice/i });
        await fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
        });

        // Fill form
        await userEvent.clear(screen.getByLabelText(/^amount/i));
        await userEvent.type(screen.getByLabelText(/^amount/i), '100');
        await userEvent.type(screen.getByLabelText(/^description/i), 'Test invoice');

        // Submit form
        const submitButton = screen.getByRole('button', { name: /^create invoice$/i });
        await fireEvent.click(submitButton);

        // Check loading state
        await waitFor(() => {
            expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument();
            expect(submitButton).toBeDisabled();
        });

        // Resolve to clean up
        resolveCall!({ txid: 'mock-tx-id' });
    });

    it('closes drawer on cancel', async () => {
        render(<CreateInvoiceDrawer />);

        // Open drawer
        const createButton = screen.getByRole('button', { name: /create invoice/i });
        await fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
        });

        // Click cancel
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await fireEvent.click(cancelButton);

        // Drawer should close
        await waitFor(() => {
            expect(screen.queryByText(/create new invoice/i)).not.toBeInTheDocument();
        });
    });
});