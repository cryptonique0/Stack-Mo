import { connect, disconnect, isConnected } from '@stacks/connect';
import { useEffect, useState } from "react";
import {
    Wallet,
    ExternalLink,
    Shield,
    CheckCircle,
    Plus,
    Send,
    Copy,
    Clock,
    DollarSign,
    UserCheck,
    Key,
} from "lucide-react";
import {
    principalCV,
    uintCV,
    stringAsciiCV,
    stringUtf8CV,
    someCV,
    noneCV,
    bufferCV,
    contractPrincipalCV,
    Cl,
} from '@stacks/transactions';
import { useContract } from './hooks/useContract';

// Types
interface WalletAddress {
    addressType?: string;
    symbol?: string;
    address: string;
}

interface WalletResponse {
    addresses: WalletAddress[];
}

interface Invoice {
    id: string;
    amount: number;
    description: string;
    customerEmail: string;
    recipientAddress: string;
    status: string;
    createdAt: string;
    paymentUrl: string;
    currency: string;
    expiresInBlocks: number;
    metadata: string;
    email: string;
    webhook?: string;
}

interface CreateInvoiceParams {
    recipient: string;
    amount: number;
    currency: string;
    expiresInBlocks: number;
    description: string;
    metadata: string;
    email: string;
    webhook?: string;
}

interface ProcessPaymentParams {
    invoiceId: string;
    amount: number;
    txId: string;
    token: string;
}

interface RegisterMerchantParams {
    webhook?: string;
}

export default function PaymentsPage() {
    const { callArchContract, callProcContract, readArchContract, readProcContract } = useContract();

    const authenticated = isConnected();
    const [isLoading, setIsLoading] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);


    // Wallet state
    const [walletAddress, setWalletAddress] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);

    // Merchant registration state
    const [webhookForRegistration, setWebhookForRegistration] = useState("");
    // const [apiKey, setApiKey] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);

    // Invoice creation state
    const [invoiceAmount, setInvoiceAmount] = useState("");
    const [invoiceDescription, setInvoiceDescription] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [invoiceCurrency, setInvoiceCurrency] = useState("sBTC");
    const [expiresInBlocks, setExpiresInBlocks] = useState("144"); // ~24 hours
    const [invoiceMetadata, setInvoiceMetadata] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

    // Payment state
    const [invoiceId, setInvoiceId] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    // const [recipientAddress, setRecipientAddress] = useState("");
    const [paymentTxId, setPaymentTxId] = useState("");
    const [tokenAddress, setTokenAddress] = useState("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"); // sBTC token
    const [isPaying, setIsPaying] = useState(false);

    const copyToClipboard = (text: string): void => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    // Function to create API key hash (simplified - in production use proper hashing)
    const createApiKeyHash = (apiKey: string): Uint8Array => {
        const encoder = new TextEncoder();
        const data = encoder.encode(apiKey);
        const hash = new Uint8Array(32);

        // Simple hash - in production, use crypto.subtle.digest('SHA-256', data)
        for (let i = 0; i < data.length && i < 32; i++) {
            hash[i] = data[i];
        }

        return hash;
    };

    useEffect(() => {
        if (authenticated) {
            fetchBlockchainInvoices();
        }

        // fetch blockchain invoices
        fetchBlockchainInvoices();
    }, [authenticated]);

    const fetchBlockchainInvoices = async () => {
        setIsLoading(true);
        try {
            const noOfInvoices = await readArchContract("get-invoice-count");
            // @ts-expect-error value type
            const totalInvoices = Number(await noOfInvoices.value.value);
            console.log('totalInvoices', totalInvoices);

            const invoicesPromises = [];
            for (let i = 0; i <= totalInvoices; i++) {
                const invoiceId = await readArchContract("get-invoice-id", [Cl.uint(i)]);
                // @ts-expect-error value type
                const { value } = invoiceId.value.value['invoice-id'];
                // console.log("invoice id", value);
                // const invoice = await readArchContract("get-invoice", [Cl.stringAscii(value)]);
                // console.log("invoice", invoice.value.value);
                // @ts-expect-error value type
                invoicesPromises.push(invoice.value.value);
            }
            console.log("here");
            const invoiceResults = await Promise.all(invoicesPromises);
            console.log("there");
            console.log('invoiceResults', invoiceResults);

            // Map results to your Invoice type (adjust parsing as needed)
            const invoicesArray = invoiceResults.map((result: any, idx: number) => ({
                id: result['id'],
                amount: Number(result['amount'].value),
                description: result['description'].value,
                customerEmail: result['email'].value,
                currency: result['currency'].value,
                expiresInBlocks: Number(result['expires-at'].value) - Number(result['created-at'].value),
                metadata: result['metadata'].value,
                webhookUrl: result['webhook-url'].value || "",
                recipientAddress: result['recipient'].value,
                status: result['status'].value === 0n ? "pending" : "paid",
                createdAt: Number(result['created-at'].value),
                paymentUrl: "", // Not available in the invoice data
            }));

            console.log('invoicesArray', invoicesArray);

            setInvoices(invoicesArray);
        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const connectWallet = async (): Promise<void> => {
        console.log("Connect wallet button clicked");
        setIsConnecting(true);
        try {
            const response: WalletResponse = await connect();

            // Try different address extraction methods for different wallets
            let stxAddress: string = '';

            // For Xverse wallet
            const xverseAddress: string | undefined = response.addresses.find((addr: WalletAddress) => addr.addressType === 'stacks')?.address;

            // For Leather wallet
            const leatherAddress: string | undefined = response.addresses.find((addr: WalletAddress) => addr.symbol === 'STX')?.address;

            // Fallback to index 2 (original method)
            const fallbackAddress: string | undefined = response.addresses[2]?.address;

            stxAddress = xverseAddress || leatherAddress || fallbackAddress || '';

            if (!stxAddress) {
                throw new Error('Could not retrieve wallet address');
            }

            console.log("Connected to wallet:", stxAddress);
            setWalletAddress(stxAddress);

        } catch (error: unknown) {
            console.error("Failed to connect wallet:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert("Failed to connect wallet: " + errorMessage);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = (): void => {
        try {
            disconnect();
            setWalletAddress("");
            setIsRegistered(false);
            console.log("Wallet disconnected");
        } catch (error: unknown) {
            console.error("Error disconnecting:", error);
        }
    };

    const registerMerchant = async (): Promise<void> => {
        if (!walletAddress) {
            alert("Please connect your wallet first");
            return;
        }

        setIsRegistering(true);
        try {
            // Create API key hash
            // const apiKeyHash = createApiKeyHash(apiKey);

            // Prepare contract parameters
            const registrationParams: RegisterMerchantParams = {
                webhook: webhookForRegistration || undefined,
            };

            console.log("Registering merchant with params:", registrationParams);

            // Call smart contract register-merchant function
            const functionArgs = [
                registrationParams.webhook ? someCV(stringAsciiCV(registrationParams.webhook)) : noneCV(),
            ];

            const response = await callArchContract({
                functionName: 'register-merchant',
                functionArgs: functionArgs
            });

            console.log("Merchant registration response:", response);

            // Log the response properly
            if (response.txid) {
                console.log("✅ Merchant registration successful - Transaction ID:", response.txid);
                setIsRegistered(true);
                alert("Merchant registered successfully! Transaction ID: " + response.txid);

                // Reset registration form
                // setApiKey("");
                setWebhookForRegistration("");
            } else {
                console.error("❌ Merchant registration failed - No transaction ID returned");
                throw new Error("Registration failed - no transaction ID returned");
            }

        } catch (error: unknown) {
            console.error("❌ Failed to register merchant:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert("Failed to register merchant: " + errorMessage);
        } finally {
            setIsRegistering(false);
        }
    };

    const createInvoice = async (): Promise<void> => {
        if (!invoiceAmount || !invoiceDescription) {
            alert("Please fill in amount and description");
            return;
        }

        if (!isRegistered) {
            alert("Please register as a merchant first before creating invoices");
            return;
        }

        setIsCreatingInvoice(true);
        try {
            // Prepare contract parameters
            const contractParams: CreateInvoiceParams = {
                recipient: walletAddress, // principal
                amount: Math.floor(parseFloat(invoiceAmount) * 100000000), // Convert to satoshis (uint)
                currency: invoiceCurrency, // string-ascii 10
                expiresInBlocks: parseInt(expiresInBlocks), // uint
                description: invoiceDescription, // string-utf8 256
                metadata: invoiceMetadata || customerEmail || "", // string-utf8 256
                email: customerEmail || "", // string-ascii 256
                webhook: webhookUrl || undefined // optional string-ascii 256
            };

            console.log("Creating invoice with params:", contractParams);

            // Call smart contract create-invoice function
            const functionArgs = [
                principalCV(contractParams.recipient),
                uintCV(contractParams.amount),
                stringAsciiCV(contractParams.currency),
                uintCV(contractParams.expiresInBlocks),
                stringUtf8CV(contractParams.description),
                stringUtf8CV(contractParams.metadata),
                stringUtf8CV(contractParams.email),
                contractParams.webhook ? someCV(stringAsciiCV(contractParams.webhook)) : noneCV()
            ];

            const response = await callArchContract({
                functionName: 'create-invoice',
                functionArgs: functionArgs
            });

            console.log("Invoice creation response:", response);

            // Log the response properly and extract invoice ID
            const invoiceId = `INV-${Date.now()}`;
            if (response.txid) {
                console.log("✅ Invoice creation successful - Transaction ID:", response.txid);
                // In a real implementation, you'd parse the response to get the actual invoice ID
                // For now, we'll use a generated one
                // invoiceId = response;
                console.log(response);

                const invoice: Invoice = {
                    id: invoiceId,
                    amount: contractParams.amount,
                    description: contractParams.description,
                    customerEmail: customerEmail,
                    recipientAddress: contractParams.recipient,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    paymentUrl: `${window.location.origin}/pay/${invoiceId}`,
                    currency: contractParams.currency,
                    expiresInBlocks: contractParams.expiresInBlocks,
                    metadata: contractParams.metadata,
                    email: contractParams.email,
                    webhook: contractParams.webhook
                };

                setCreatedInvoice(invoice);

                // Reset form
                setInvoiceAmount("");
                setInvoiceDescription("");
                setCustomerEmail("");
                setInvoiceMetadata("");
                setWebhookUrl("");

                alert(`Invoice created successfully! Invoice ID: ${invoiceId}, Transaction ID: ${response.txid}`);
            } else {
                console.error("❌ Invoice creation failed - No transaction ID returned");
                throw new Error("Invoice creation failed - no transaction ID returned");
            }

        } catch (error: unknown) {
            console.error("❌ Failed to create invoice:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert("Failed to create invoice: " + errorMessage);
        } finally {
            setIsCreatingInvoice(false);
        }
    };

    const payInvoice = async (): Promise<void> => {
        if (!paymentAmount || !invoiceId) {
            alert("Please fill in all payment details including invoice ID");
            return;
        }

        setIsPaying(true);
        try {
            // Prepare contract parameters for process-sbtc-payment
            const paymentParams: ProcessPaymentParams = {
                invoiceId: invoiceId, // string-ascii 64
                amount: Math.floor(parseFloat(paymentAmount) * 100000000), // Convert to satoshis (uint)
                txId: paymentTxId || "0x" + Array(64).fill("0").join(""), // buff 32 (mock tx id)
                token: tokenAddress // token contract address
            };

            console.log("Processing payment with params:", paymentParams);

            // Parse token contract address (format: ADDRESS.CONTRACT-NAME)
            const [tokenContractAddress, tokenContractName] = paymentParams.token.split('.');
            console.log(tokenContractAddress, tokenContractName);

            // Call smart contract process-sbtc-payment function
            const functionArgs = [
                stringAsciiCV(paymentParams.invoiceId),
                uintCV(paymentParams.amount),
                bufferCV(createApiKeyHash(paymentParams.txId)),
                contractPrincipalCV(tokenContractAddress, tokenContractName)
            ];

            const response = await callProcContract({
                functionName: 'process-sbtc-payment',
                functionArgs: functionArgs
            });

            console.log("Payment processing response:", response);

            // Log the response properly
            if (response.txid) {
                console.log("✅ Payment processing successful - Transaction ID:", response.txid);
                alert("Payment processed successfully! Transaction ID: " + response.txid);

                // Reset form
                setInvoiceId("");
                setPaymentAmount("");
                // setRecipientAddress("");
                setPaymentTxId("");
            } else {
                console.error("❌ Payment processing failed - No transaction ID returned");
                throw new Error("Payment processing failed - no transaction ID returned");
            }

        } catch (error: unknown) {
            console.error("❌ Failed to process payment:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert("Failed to process payment: " + errorMessage);
        } finally {
            setIsPaying(false);
        }
    };

    const setProcessor = async (): Promise<void> => {
        if (!walletAddress) {
            alert("Please connect your wallet first");
            return;
        }

        try {
            const functionArgs = [
                principalCV(walletAddress)
            ];

            const response = await callArchContract({
                functionName: 'set-processor',
                functionArgs: functionArgs
            });

            console.log("Set processor response:", response);

            if (response.txid) {
                console.log("✅ Set processor successful - Transaction ID:", response.txid);
                alert("Processor set successfully! Transaction ID: " + response.txid);
            } else {
                console.error("❌ Set processor failed - No transaction ID returned");
                throw new Error("Set processor failed - no transaction ID returned");
            }

        } catch (error: unknown) {
            console.error("❌ Failed to set processor:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert("Failed to set processor: " + errorMessage);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="text-center py-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">sBTC Payments</h1>
                    <p className="text-lg text-gray-600">Manage your Bitcoin payments on Stacks</p>
                </div>

                <button onClick={setProcessor} className='bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center gap-2 cursor-pointer'>Set Processor</button>

                {/* Wallet Connection */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                            <Wallet className="h-5 w-5" />
                            Wallet Connection
                        </h2>
                        <p className="text-gray-600">Connect your Stacks wallet to manage payments</p>
                    </div>

                    {!walletAddress ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Shield className="h-4 w-4" />
                                <span>Secure connection via browser extension</span>
                            </div>
                            <button
                                onClick={connectWallet}
                                disabled={isConnecting}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center gap-2 cursor-pointer"
                            >
                                {isConnecting ? "Connecting..." : "Connect Wallet"}
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-green-700 font-medium">Wallet Connected</span>
                                {isRegistered && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <UserCheck className="h-5 w-5 text-blue-600" />
                                        <span className="text-blue-700 font-medium">Merchant Registered</span>
                                    </>
                                )}
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium mb-1">Address</div>
                                <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono flex-1 bg-white p-2 rounded border">{walletAddress}</code>
                                    <button
                                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded border cursor-pointer"
                                        onClick={() => copyToClipboard(walletAddress)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <button
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md border cursor-pointer"
                                onClick={disconnectWallet}
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>

                {/* Merchant Registration */}
                {walletAddress && !isRegistered && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold text-yellow-900 flex items-center gap-2 mb-2">
                                <UserCheck className="h-5 w-5" />
                                Register as Merchant
                            </h2>
                            <p className="text-yellow-800">Register before creating invoices</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label htmlFor="webhook-registration" className="block text-sm font-medium text-yellow-900 mb-1">
                                    Webhook URL (Optional)
                                </label>
                                <input
                                    id="webhook-registration"
                                    type="url"
                                    placeholder="https://your-api.com/webhook"
                                    value={webhookForRegistration}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhookForRegistration(e.target.value)}
                                    className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                                />
                            </div>

                            <button
                                onClick={registerMerchant}
                                disabled={isRegistering}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isRegistering ? "Registering..." : "Register Merchant"}
                                <Key className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">

                    {/* Create Invoice */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                                <Plus className="h-5 w-5" />
                                Create Invoice
                            </h2>
                            <p className="text-gray-600">Generate a payment request for your customers</p>
                            {!isRegistered && walletAddress && (
                                <p className="text-sm text-yellow-600 mt-1">⚠️ Please register as a merchant first</p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount (sBTC)
                                </label>
                                <input
                                    id="amount"
                                    type="number"
                                    step="0.00000001"
                                    placeholder="0.001"
                                    value={invoiceAmount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvoiceAmount(e.target.value)}
                                    disabled={!walletAddress || !isRegistered}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                                    Currency
                                </label>
                                <select
                                    id="currency"
                                    value={invoiceCurrency}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInvoiceCurrency(e.target.value)}
                                    disabled={!walletAddress || !isRegistered}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="sBTC">sBTC</option>
                                    <option value="STX">STX</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="expires" className="block text-sm font-medium text-gray-700 mb-1">
                                    Expires In Blocks
                                </label>
                                <input
                                    id="expires"
                                    type="number"
                                    placeholder="144"
                                    value={expiresInBlocks}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresInBlocks(e.target.value)}
                                    disabled={!walletAddress || !isRegistered}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">~144 blocks = 24 hours</p>
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    placeholder="Payment for services..."
                                    value={invoiceDescription}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInvoiceDescription(e.target.value)}
                                    disabled={!walletAddress || !isRegistered}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-1">
                                    Metadata
                                </label>
                                <textarea
                                    id="metadata"
                                    placeholder="Additional invoice metadata..."
                                    value={invoiceMetadata}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInvoiceMetadata(e.target.value)}
                                    disabled={!walletAddress || !isRegistered}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Customer Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="customer@example.com"
                                    value={customerEmail}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerEmail(e.target.value)}
                                    disabled={!walletAddress || !isRegistered}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label htmlFor="webhook" className="block text-sm font-medium text-gray-700 mb-1">
                                    Webhook URL (Optional)
                                </label>
                                <input
                                    id="webhook"
                                    type="url"
                                    placeholder="https://your-api.com/webhook"
                                    value={webhookUrl}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhookUrl(e.target.value)}
                                    disabled={!walletAddress || !isRegistered}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <button
                                onClick={createInvoice}
                                disabled={!walletAddress || !isRegistered || isCreatingInvoice}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isCreatingInvoice ? "Creating..." : "Create Invoice"}
                                <DollarSign className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Pay Invoice */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                                <Send className="h-5 w-5" />
                                Pay Invoice
                            </h2>
                            <p className="text-gray-600">Send sBTC payment to an address or invoice</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label htmlFor="invoice-id" className="block text-sm font-medium text-gray-700 mb-1">
                                    Invoice ID (Required)
                                </label>
                                <input
                                    id="invoice-id"
                                    placeholder="INV-1234567890"
                                    value={invoiceId}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvoiceId(e.target.value)}
                                    disabled={!walletAddress}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label htmlFor="pay-amount" className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount (sBTC)
                                </label>
                                <input
                                    id="pay-amount"
                                    type="number"
                                    step="0.00000001"
                                    placeholder="0.001"
                                    value={paymentAmount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                                    disabled={!walletAddress}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label htmlFor="tx-id" className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction ID (Optional)
                                </label>
                                <input
                                    id="tx-id"
                                    placeholder="0x123abc..."
                                    value={paymentTxId}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentTxId(e.target.value)}
                                    disabled={!walletAddress}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate</p>
                            </div>

                            <div>
                                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                                    Token Contract
                                </label>
                                <select
                                    id="token"
                                    value={tokenAddress}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTokenAddress(e.target.value)}
                                    disabled={!walletAddress}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 font-mono text-sm"
                                >
                                    <option value="SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token">sBTC Token</option>
                                    <option value="ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token">sBTC 1 (Test)</option>
                                    <option value="ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-deposit">sBTC 2 (Test)</option>
                                    <option value="ST3CMM6R79V7ZPATPXY4SKN5DKK7N4XRAS83GNV80.sbtc-token">sBTC 3 (Test)</option>
                                    <option value="">STX</option>
                                </select>
                            </div>

                            <button
                                onClick={payInvoice}
                                disabled={!walletAddress || isPaying}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isPaying ? "Processing Payment..." : "Process sBTC Payment"}
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Created Invoice Display */}
                {createdInvoice && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <h2 className="text-xl font-semibold text-green-800">Invoice Created</h2>
                            </div>
                            <p className="text-green-700">Your payment request is ready to share</p>
                        </div>

                        <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium text-green-800 mb-1">Invoice ID</div>
                                    <div className="bg-white p-2 rounded border">
                                        <code className="text-sm">{createdInvoice.id}</code>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-green-800 mb-1">Amount</div>
                                    <div className="bg-white p-2 rounded border">
                                        <span className="font-semibold">{(createdInvoice.amount / 100000000).toFixed(8)} {createdInvoice.currency}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-green-800 mb-1">Payment URL</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={createdInvoice.paymentUrl}
                                        readOnly
                                        className="flex-1 px-3 py-2 bg-white border rounded-md text-sm"
                                    />
                                    <button
                                        className="bg-white hover:bg-gray-50 border p-2 rounded-md cursor-pointer"
                                        onClick={() => copyToClipboard(createdInvoice.paymentUrl)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Clock className="h-4 w-4" />
                                <span>Created {new Date(createdInvoice.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}