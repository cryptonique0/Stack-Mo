import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/CopyButton";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

import {
  PaymentActions,
  SuccessActions,
} from "@/components/payment/PaymentActions";
import { PaymentDetails } from "@/components/payment/PaymentDetails";
import { PaymentSuccessAnimation } from "@/components/payment/PaymentStatus";
import { useToast } from "@/hooks/use-toast";
import { useStacksContract } from "@/hooks/useStacksContract";
import { useWallet } from "@/contexts/WalletContext";
import { Cl, ClarityValue } from "@stacks/transactions";
import { hexToBytes } from "@stacks/common";
import {
  blockToDate,
  fetchCurrentBlockHeight,
  isBlockExpired,
} from "@/utils/blocktime";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  Bitcoin,
  ArrowLeft,
} from "lucide-react";
import _ from "lodash";

export interface MerchantInfo {
  business_name: string;
  business_website?: string;
}

interface Invoice {
  id: string;
  amount: bigint;
  email: string;
  description: string;
  currency: string;
  expiresAt: number | null;
  createdAt: number | null;
  paidAt: number | null;
  metadata: string;
  webhookUrl: string | null;
  merchant: string;
  recipient: string;
  status: "pending" | "paid" | "expired";
  paymentLink: string | null;
  paymentAddress: string | null;
  transactionHash?: string | null;
}

const DEFAULT_TOKEN_ADDRESS =
  "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";
const SATOSHIS_PER_BTC = 100000000;
const BLOCK_FETCH_INTERVAL = 60000;

export default function PaymentLink() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { toast } = useToast();
  const { readArchContract, callProcContract } = useStacksContract();
  const { isConnected } = useWallet();

  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [isPaying, setIsPaying] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  // Helper function to unwrap optional paid-at value
  const unwrapPaidAt = (paidAtField: any): number | null => {
    if (
      paidAtField?.type === "some" &&
      paidAtField.value?.value !== undefined
    ) {
      return Number(paidAtField.value.value);
    }
    return null;
  };

  const parseInvoice = (raw: ClarityValue, id: string): Invoice | null => {
    if (!raw?.value?.value) return null;

    const invoice = raw.value.value;
    const statusValue = Number(invoice["status"]?.value ?? 0);

    return {
      id,
      amount: BigInt(invoice["amount"]?.value ?? 0),
      email: invoice["email"]?.value ?? "",
      description: invoice["description"]?.value ?? "",
      currency: invoice["currency"]?.value ?? "",
      expiresAt: invoice["expires-at"]
        ? Number(invoice["expires-at"].value)
        : null,
      createdAt: invoice["created-at"]
        ? Number(invoice["created-at"].value)
        : null,
      paidAt: unwrapPaidAt(invoice["paid-at"]),
      metadata: invoice["metadata"]?.value ?? "",
      webhookUrl: invoice["webhook-url"]?.value ?? null,
      merchant: invoice["merchant"]?.value ?? "",
      recipient: invoice["recipient"]?.value ?? "",
      status: { 0: "pending", 1: "paid", 2: "expired" }[
        statusValue
      ] as Invoice["status"],
      paymentLink: id ? `${window.location.origin}/pay/${id}` : null,
      paymentAddress: invoice["payment-address"]?.value ?? null,
      transactionHash: invoice["transaction-hash"]?.value ?? null,
    };
  };

  // Calculate actual invoice status using the same logic as Invoices component
  const getInvoiceStatus = (invoice: Invoice): Invoice["status"] => {
    if (invoice.status === "paid") return "paid";
    return isBlockExpired(invoice.expiresAt, currentBlock)
      ? "expired"
      : "pending";
  };

  const createdDate = useMemo(() => {
    return blockToDate(invoice?.createdAt, currentBlock, Date.now());
  }, [invoice?.createdAt, currentBlock]);

  const expiresDate = useMemo(() => {
    return blockToDate(invoice?.expiresAt, currentBlock, Date.now());
  }, [invoice?.expiresAt, currentBlock]);

  const actualStatus = useMemo(() => {
    return invoice ? getInvoiceStatus(invoice) : "pending";
  }, [invoice, currentBlock]);

  const fetchInvoiceData = async () => {
    try {
      // Fetch invoice data
      const invoiceData = await readArchContract("get-invoice", [
        Cl.stringAscii(invoiceId || ""),
      ]);

      const parsedInvoice = parseInvoice(invoiceData, invoiceId || "");
      if (!parsedInvoice) throw new Error("Invalid invoice data");

      setInvoice(parsedInvoice);

      // Fetch merchant info
      const { data: merchantData } = await supabase
        .from("merchant_profiles")
        .select("business_name, business_website")
        .single();

      setMerchant(merchantData);
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      toast({
        title: "Invoice Not Found",
        description: "The requested invoice could not be found",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const payInvoice = async (): Promise<void> => {
    if (!invoiceId || !invoice) {
      toast({
        title: "Invalid Payment",
        description: "Invoice data is not available",
        variant: "destructive",
      });
      return;
    }

    setIsPaying(true);
    try {
      const amount = Number(invoice.amount);
      const txId = "0x" + Array(64).fill("0").join("");
      const txIdBytes = hexToBytes(txId.replace(/^0x/, ""));
      const [tokenContractAddress, tokenContractName] = tokenAddress.split(".");

      const functionArgs = [
        Cl.stringAscii(invoiceId),
        Cl.uint(amount),
        Cl.buffer(txIdBytes),
        Cl.contractPrincipal(tokenContractAddress, tokenContractName),
      ];

      const response = await callProcContract({
        functionName: "process-sbtc-payment",
        functionArgs: functionArgs,
      });

      if (response.txid) {
        setPaymentComplete(true);
        toast({
          title: "Payment Successful",
          description: "Your payment has been confirmed on the blockchain",
        });
      } else {
        setPaymentComplete(false);
        toast({
          title: "Payment Failed",
          description: "Payment processing failed - no transaction ID returned",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error("Payment processing error:", error);
      toast({
        title: "Payment Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  const getStatusColor = (status: Invoice["status"]) => {
    const colors = {
      paid: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    return colors[status];
  };

  const getStatusIcon = (status: Invoice["status"]) => {
    const icons = {
      paid: <CheckCircle className="h-4 w-4 mr-1" />,
      expired: <XCircle className="h-4 w-4 mr-1" />,
      pending: <Clock className="h-4 w-4 mr-1" />,
    };
    return icons[status];
  };

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const height = await fetchCurrentBlockHeight();
        setCurrentBlock(height);
      } catch (error) {
        console.error("Failed to fetch block height", error);
      }
    };

    fetchBlock();
    const interval = setInterval(fetchBlock, BLOCK_FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (invoiceId && isConnected) {
      fetchInvoiceData();
    }
  }, [invoiceId, isConnected]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-xl p-5 mx-auto">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle>Payment Link Not Found</CardTitle>
            <CardDescription>
              This payment link doesn't exist or has expired. Please contact the
              merchant for a new payment link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentComplete || actualStatus === "paid") {
    const receiptData = {
      id: invoice.id,
      description: invoice.description,
      recipient: invoice.recipient,
      amount: Number(invoice.amount) / SATOSHIS_PER_BTC,
      currency: invoice.currency,
      paidAt: invoice.paidAt || Date.now(),
      merchant: {
        business_name: merchant?.business_name || "",
      },
      paymentAddress: invoice.paymentAddress,
      transactionHash: invoice.transactionHash,
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-2xl p-5 mx-auto">
          <CardHeader className="text-center">
            <PaymentSuccessAnimation />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-green-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Amount Paid:</span>
                <span className="font-medium">
                  {Number(invoice.amount) / SATOSHIS_PER_BTC} {invoice.currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>To:</span>
                <span className="font-medium">
                  {_.truncate(merchant?.business_name || invoice.merchant, {
                    length: 16,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Transaction ID:</span>
                <span className="font-mono text-xs">{invoice.id}</span>
              </div>
            </div>

            <SuccessActions
              receiptData={receiptData}
              blockData={{
                currentBlock,
                blockTimeCallback: blockToDate,
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show expired state with centered layout
  if (actualStatus === "expired") {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Payment Expired</h1>
              <p className="text-muted-foreground">
                This payment link has expired
              </p>
            </div>

            <div className="space-y-6">
              <PaymentDetails
                id={invoice.id}
                amount={Number(invoice.amount) / SATOSHIS_PER_BTC}
                currency={invoice.currency}
                recipient={invoice.recipient}
                description={invoice.description}
                status={actualStatus}
                createdAt={createdDate}
                expiresAt={expiresDate}
                merchant={merchant}
              />

              <Card>
                <CardContent className="p-6">
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-800">
                          Invoice Expired
                        </h4>
                        <p className="text-sm text-red-700">
                          This payment link has expired. Please contact the
                          merchant for a new invoice.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <Button
                      onClick={() => window.history.back()}
                      variant="outline"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bitcoinUri = invoice.merchant
    ? `bitcoin:${invoice.merchant}?amount=${Number(invoice.amount) / SATOSHIS_PER_BTC}`
    : "";

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Payment Checkout</h1>
            <p className="text-muted-foreground">
              Complete your Bitcoin payment securely
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Payment Details Column */}
            <div className="space-y-6">
              <PaymentDetails
                id={invoice.id}
                amount={Number(invoice.amount) / SATOSHIS_PER_BTC}
                currency={invoice.currency}
                recipient={invoice.recipient}
                description={invoice.description}
                status={actualStatus}
                createdAt={createdDate}
                expiresAt={expiresDate}
                merchant={merchant}
              />

              {actualStatus === "pending" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Web Wallet Payment</CardTitle>
                    <CardDescription>
                      Pay directly with your connected wallet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label
                        htmlFor="token"
                        className="block text-sm font-medium mb-2"
                      >
                        Token Contract
                      </label>
                      <select
                        id="token"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        disabled={!isConnected}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted font-mono text-sm"
                      >
                        <option value={DEFAULT_TOKEN_ADDRESS}>
                          sBTC Token
                        </option>
                        <option value="">STX</option>
                      </select>
                    </div>

                    <Button
                      onClick={payInvoice}
                      disabled={
                        isPaying || !isConnected || actualStatus !== "pending"
                      }
                      className="w-full"
                      size="lg"
                    >
                      <Wallet className="h-5 w-5 mr-2" />
                      {isPaying ? "Processing..." : "Pay Now"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* QR Code Column - only show for pending invoices */}
            {actualStatus === "pending" && (
              <div className="space-y-6">
                {invoice.merchant && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bitcoin className="h-5 w-5 text-orange-500" />
                        Scan to Pay
                      </CardTitle>
                      <CardDescription>
                        Use your mobile Bitcoin wallet
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-4 rounded-lg border flex justify-center">
                        <QRCodeDisplay value={bitcoinUri} size={200} />
                      </div>

                      <Badge className={getStatusColor(actualStatus)}>
                        {getStatusIcon(actualStatus)}
                        {actualStatus.charAt(0).toUpperCase() +
                          actualStatus.slice(1)}
                      </Badge>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Payment Address</p>
                          <CopyButton text={invoice.merchant} />
                        </div>
                        <p className="font-mono text-sm bg-muted p-3 rounded border break-all">
                          {invoice.merchant}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-6">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Important:
                      </h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>
                          • Send exactly{" "}
                          {Number(invoice.amount) / SATOSHIS_PER_BTC}{" "}
                          {invoice.currency}
                        </li>
                        <li>• Payment will be automatically detected</li>
                        <li>• Do not send from an exchange wallet</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
