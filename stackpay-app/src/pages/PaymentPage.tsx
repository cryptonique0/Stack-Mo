import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { CopyButton } from "@/components/CopyButton";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import {
  Bitcoin,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  Download,
  ArrowLeft,
} from "lucide-react";

interface PaymentData {
  invoice: {
    id: string;
    customer_name: string;
    amount_btc: number;
    currency: string;
    description: string;
    status: "pending" | "paid" | "expired" | "cancelled";
    created_at: string;
    due_date?: string;
  };
  merchant: {
    business_name: string;
    first_name: string;
    last_name: string;
  };
  wallet: {
    wallet_address: string;
  };
}

export default function PaymentPage() {
  const { invoiceId } = useParams();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (invoiceId) {
      fetchPaymentData();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (
      paymentData?.invoice?.due_date &&
      paymentData.invoice.status === "pending"
    ) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const dueTime = new Date(paymentData.invoice.due_date!).getTime();
        const difference = dueTime - now;

        if (difference > 0) {
          const hours = Math.floor(difference / (1000 * 60 * 60));
          const minutes = Math.floor(
            (difference % (1000 * 60 * 60)) / (1000 * 60),
          );
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft("Expired");
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [paymentData]);

  const fetchPaymentData = async () => {
    try {
      // Get invoice with merchant and wallet data
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
          *,
          merchant_profiles!invoices_merchant_id_fkey (
            business_name,
            first_name,
            last_name,
            wallets!wallets_merchant_id_fkey (
              wallet_address
            )
          )
        `,
        )
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      if (invoice) {
        const merchant = invoice.merchant_profiles;
        const wallet = merchant.wallets?.[0];

        setPaymentData({
          invoice: {
            id: invoice.id,
            customer_name: invoice.customer_name,
            amount_btc: invoice.amount_btc,
            currency: invoice.currency,
            description: invoice.description,
            status: invoice.status,
            created_at: invoice.created_at,
            due_date: invoice.due_date,
          },
          merchant: {
            business_name: merchant.business_name,
            first_name: merchant.first_name,
            last_name: merchant.last_name,
          },
          wallet: {
            wallet_address: wallet?.wallet_address || "",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching payment data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "expired":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

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

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invoice Not Found</CardTitle>
            <CardDescription>
              The invoice you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { invoice, merchant, wallet } = paymentData;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-primary p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bitcoin className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">StackPay</h1>
            <p className="text-muted-foreground">Bitcoin Payment Portal</p>
          </div>

          {/* Merchant Info */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">
                    {merchant.business_name}
                  </CardTitle>
                  <CardDescription>
                    {merchant.first_name} {merchant.last_name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Payment Details */}
          <PaymentDetails
            id={invoice.id}
            amount={invoice.amount_btc}
            currency={invoice.currency}
            recipient={invoice.customer_name}
            description={invoice.description}
            status={invoice.status}
            createdAt={invoice.created_at}
            expiresAt={invoice.due_date}
            merchant={merchant}
          />

          {/* Payment Instructions */}
          {invoice.status === "pending" && wallet.wallet_address && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Payment Instructions</CardTitle>
                <CardDescription>
                  Send exactly {invoice.amount_btc} {invoice.currency} to the
                  address below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg border">
                  <QRCodeDisplay value={wallet.wallet_address} size={200} />
                </div>

                {/* Wallet Address */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Wallet Address</p>
                    <CopyButton text={wallet.wallet_address} />
                  </div>
                  <p className="font-mono text-sm bg-muted p-3 rounded border break-all">
                    {wallet.wallet_address}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Important:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Send exactly the amount shown above</li>
                    <li>• Use {invoice.currency} network only</li>
                    <li>• Payment will be automatically detected</li>
                    <li>• Do not send from an exchange wallet</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Messages */}
          {invoice.status === "paid" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 space-y-6">
                <PaymentSuccessAnimation />
                <SuccessActions
                  receiptData={{
                    id: invoice.id,
                    description: invoice.description,
                    recipient: invoice.customer_name,
                    amount: invoice.amount_btc,
                    currency: invoice.currency,
                    paidAt: new Date(),
                    merchant: {
                      business_name: merchant.business_name,
                    },
                  }}
                />
              </CardContent>
            </Card>
          )}

          {invoice.status === "expired" && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Invoice Expired
                </h3>
                <p className="text-red-700">
                  This invoice has expired. Please contact the merchant to
                  request a new invoice.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
