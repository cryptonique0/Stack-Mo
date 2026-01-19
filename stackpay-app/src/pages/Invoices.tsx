import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import { useStacksContract } from "@/hooks/useStacksContract";
import {
  blockToDate,
  fetchCurrentBlockHeight,
  isBlockExpired,
  formatBlockDate,
} from "@/utils/blocktime";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateInvoiceDrawer } from "@/components/invoices/CreateInvoiceDrawer";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt,
  Plus,
  ArrowLeft,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Cl } from "@stacks/transactions";
import { Invoice } from "@/utils/blockchain";

export default function Invoices() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { account, isConnected } = useWallet();
  const { readArchContract } = useStacksContract();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [hasFetchedInitially, setHasFetchedInitially] = useState(false);

  const BLOCK_FETCH_INTERVAL = 60000; // 1 minute
  const DATA_CACHE_DURATION = 30000; // 30 seconds

  // Memoized auth check
  const shouldRedirect = useMemo(() => !user && !loading, [user, loading]);

  // Redirect effect with cleanup
  useEffect(() => {
    if (shouldRedirect) {
      navigate("/auth");
    }
  }, [shouldRedirect, navigate]);

  // Memoized parseInvoice function
  const parseInvoice = useCallback((raw: any, id: string): Invoice | null => {
    if (!raw?.value?.value) return null;

    const invoice = raw.value.value;
    const statusValue = invoice["status"] ? Number(invoice["status"].value) : 0;

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
      paidAt: statusValue === 1 ? Number(invoice["paid-at"]?.value ?? 0) : null,
      metadata: invoice["metadata"]?.value ?? "",
      webhookUrl: invoice["webhook-url"]?.value ?? null,
      merchant: invoice["merchant"]?.value ?? "",
      recipient: invoice["recipient"]?.value ?? "",
      status: {
        0: "pending",
        1: "paid",
        2: "expired",
      }[statusValue] as "pending" | "paid" | "expired",
      paymentLink: id ? `${window.location.origin}/pay/${id}` : null,
      paymentAddress: invoice["payment-address"]?.value ?? null,
    };
  }, []);

  const updateCurrentBlock = useCallback(async () => {
    try {
      const blockHeight = await fetchCurrentBlockHeight();
      setCurrentBlock(blockHeight);
    } catch (error) {
      console.error("Failed to fetch current block height:", error);
    }
  }, []);

  const fetchBlockchainInvoices = useCallback(
    async (force = false) => {
      const now = Date.now();

      // Implement caching to reduce API calls
      if (
        !force &&
        hasFetchedInitially &&
        now - lastFetchTime < DATA_CACHE_DURATION
      ) {
        return;
      }

      setIsLoading(true);
      try {
        // Get total number of invoices
        const noOfInvoices = await readArchContract("get-invoice-count");
        const totalInvoices = Number(noOfInvoices.value.value);

        if (totalInvoices === 0) {
          setInvoices([]);
          setLastFetchTime(now);
          setHasFetchedInitially(true);
          return;
        }

        // Batch fetch invoice IDs with error handling
        const invoicePromises = Array.from({ length: totalInvoices }, (_, i) =>
          readArchContract("get-invoice-id", [Cl.uint(i)]).catch((err) => {
            console.error(`Failed to fetch invoice ID ${i}:`, err);
            return null;
          }),
        );

        const invoiceIds = (await Promise.all(invoicePromises)).filter(Boolean);

        if (invoiceIds.length === 0) {
          setInvoices([]);
          setLastFetchTime(now);
          setHasFetchedInitially(true);
          return;
        }

        // Batch fetch invoice details with error handling
        const invoiceDetailsPromises = invoiceIds.map((invoiceId) => {
          const id = invoiceId?.value.value["invoice-id"].value;
          return id
            ? readArchContract("get-invoice", [Cl.stringAscii(id)]).catch(
                (err) => {
                  console.error(`Failed to fetch invoice ${id}:`, err);
                  return null;
                },
              )
            : Promise.resolve(null);
        });

        const invoiceResults = await Promise.all(invoiceDetailsPromises);

        // Process invoice data with filtering for current merchant
        const invoicesArray: Invoice[] = invoiceResults
          .map((result, i) => {
            if (!result || !invoiceIds[i]) return null;
            const id = invoiceIds[i]?.value.value["invoice-id"].value ?? null;
            return id ? parseInvoice(result, id) : null;
          })
          .filter((invoice): invoice is Invoice => {
            // Filter for current merchant's invoices
            return invoice !== null && invoice.merchant === account;
          });

        setInvoices(invoicesArray.reverse()); // Show newest first
        setLastFetchTime(now);
        setHasFetchedInitially(true);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
        toast({
          title: "Error fetching invoices",
          description: "Failed to load invoices. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      readArchContract,
      parseInvoice,
      account,
      toast,
      hasFetchedInitially,
      lastFetchTime,
    ],
  );

  // Optimized initial data fetch
  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      if (isConnected && mounted && !shouldRedirect) {
        await Promise.all([
          fetchBlockchainInvoices(true),
          updateCurrentBlock(),
        ]);
      }
    };

    initializeData();

    return () => {
      mounted = false;
    };
  }, [isConnected, shouldRedirect]); // Only essential dependencies

  // Separate effect for periodic block updates
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(updateCurrentBlock, BLOCK_FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [isConnected, updateCurrentBlock]);

  // Memoized status functions
  const getInvoiceStatus = useCallback(
    (invoice: Invoice): Invoice["status"] => {
      if (invoice.status === "paid") return "paid";
      return isBlockExpired(invoice.expiresAt, currentBlock)
        ? "expired"
        : "pending";
    },
    [currentBlock],
  );

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case "expired":
        return <XCircle className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
    }
  }, []);

  // Optimized refresh handler
  const handleInvoiceCreated = useCallback(() => {
    fetchBlockchainInvoices(true); // Force refresh when new invoice created
  }, [fetchBlockchainInvoices]);

  // Memoized loading component
  const LoadingComponent = useMemo(
    () => (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    ),
    [],
  );

  if (loading || (isLoading && !hasFetchedInitially)) {
    return LoadingComponent;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="bg-primary p-2 rounded-lg">
                <Receipt className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Invoices</h1>
                <p className="text-sm text-muted-foreground">
                  Create and manage your Bitcoin invoices
                </p>
              </div>
            </div>

            <CreateInvoiceDrawer onInvoiceCreated={handleInvoiceCreated} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {invoices.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>No Invoices Yet</CardTitle>
              <CardDescription>
                Create your first invoice to start accepting Bitcoin payments
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <CreateInvoiceDrawer onInvoiceCreated={handleInvoiceCreated}>
                <Button size="lg" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Invoice
                </Button>
              </CreateInvoiceDrawer>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Invoices</h2>
              <p className="text-sm text-muted-foreground">
                {invoices.length} total
              </p>
            </div>

            <div className="grid gap-4">
              {invoices.map((invoice) => {
                const status = getInvoiceStatus(invoice);
                return (
                  <Card key={invoice.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">
                              Recipient: {invoice.recipient.slice(0, 8)}...
                            </h3>
                            <Badge className={getStatusColor(status)}>
                              {getStatusIcon(status)}
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {invoice.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium">
                              {Number(invoice.amount) / 100000000}{" "}
                              {invoice.currency}
                            </span>
                            <span className="text-muted-foreground">
                              Created{" "}
                              {formatBlockDate(
                                blockToDate(
                                  invoice.createdAt,
                                  currentBlock,
                                  Date.now(),
                                ),
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              ID: {invoice.id}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CopyButton
                            text={invoice.paymentLink}
                            label="Copy Link"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/pay/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
