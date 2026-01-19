import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import { useStacksContract } from "@/hooks/useStacksContract";
import {
  blockToDate,
  fetchCurrentBlockHeight,
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
import { CopyButton } from "@/components/CopyButton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt,
  ArrowLeft,
  Eye,
  CheckCircle,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Cl } from "@stacks/transactions";
import { Invoice } from "@/utils/blockchain";
import { MerchantInfo } from "./PaymentLink";
import { supabase } from "@/integrations/supabase/client";

export default function Receipts() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { account, isConnected } = useWallet();
  const { readArchContract } = useStacksContract();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [hasFetchedInitially, setHasFetchedInitially] = useState(false);

  // Filter and sort states
  const [searchId, setSearchId] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [amountFilter, setAmountFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const BLOCK_FETCH_INTERVAL = 60000; // 1 minute
  const DATA_CACHE_DURATION = 30000; // 30 seconds

  // Memoized auth check
  const shouldRedirect = useMemo(() => !user && !loading, [user, loading]);

  // Redirect effect
  useEffect(() => {
    if (shouldRedirect) {
      navigate("/auth");
    }
  }, [shouldRedirect, navigate]);

  const updateCurrentBlock = useCallback(async () => {
    try {
      const blockHeight = await fetchCurrentBlockHeight();
      setCurrentBlock(blockHeight);
    } catch (error) {
      console.error("Failed to fetch current block height:", error);
    }
  }, []);

  // Helper function to unwrap optional paid-at value
  const unwrapPaidAt = useCallback((paidAtField: any): number | null => {
    if (
      paidAtField?.type === "some" &&
      paidAtField.value?.value !== undefined
    ) {
      return Number(paidAtField.value.value);
    }
    return null;
  }, []);

  const parseInvoice = useCallback(
    (raw: any, id: string): Invoice | null => {
      if (!raw?.value?.value) return null;

      const invoice = raw.value.value;
      const statusValue = invoice["status"]
        ? Number(invoice["status"].value)
        : 0;

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
        status: {
          0: "pending",
          1: "paid",
          2: "expired",
        }[statusValue] as "pending" | "paid" | "expired",
        paymentLink: id ? `${window.location.origin}/pay/${id}` : null,
        paymentAddress: invoice["payment-address"]?.value ?? null,
        transactionHash: invoice["transaction-hash"]?.value ?? null,
      };
    },
    [unwrapPaidAt],
  );

  const fetchBlockchainInvoices = useCallback(
    async (force = false) => {
      const now = Date.now();

      // Implement caching
      if (
        !force &&
        hasFetchedInitially &&
        now - lastFetchTime < DATA_CACHE_DURATION
      ) {
        return;
      }

      setIsLoading(true);
      try {
        // Parallel fetch of merchant data and invoices
        const [merchantDataResult, noOfInvoices] = await Promise.all([
          supabase
            .from("merchant_profiles")
            .select("business_name, business_website")
            .single(), // Graceful fallback
          readArchContract("get-invoice-count"),
        ]);

        if (merchantDataResult.data) {
          setMerchant(merchantDataResult.data);
        }

        const totalInvoices = Number(noOfInvoices.value.value);

        if (totalInvoices === 0) {
          setInvoices([]);
          setLastFetchTime(now);
          setHasFetchedInitially(true);
          return;
        }

        // Batch fetch with error handling
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

        const paidInvoices = invoiceResults
          .map((result, i) => {
            if (!result || !invoiceIds[i]) return null;
            const id = invoiceIds[i]?.value.value["invoice-id"].value ?? null;
            const invoice = id ? parseInvoice(result, id) : null;
            return invoice?.status === "paid" && invoice.merchant === account
              ? invoice
              : null;
          })
          .filter((invoice): invoice is Invoice => invoice !== null);

        setInvoices(paidInvoices);
        setLastFetchTime(now);
        setHasFetchedInitially(true);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
        toast({
          title: "Error fetching receipts",
          description: "Failed to load receipts. Please try again.",
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
  }, [isConnected, shouldRedirect]);

  // Separate effect for periodic block updates
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(updateCurrentBlock, BLOCK_FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [isConnected, updateCurrentBlock]);

  // Memoized filter and sort logic
  const filteredAndSortedInvoices = useMemo(() => {
    const filtered = invoices.filter((invoice) => {
      const matchesId = invoice.id
        .toLowerCase()
        .includes(searchId.toLowerCase());
      const matchesEmail = invoice.email
        .toLowerCase()
        .includes(searchEmail.toLowerCase());
      const matchesAmount =
        amountFilter === "" ||
        (Number(invoice.amount) / 100000000).toString().includes(amountFilter);

      return matchesId && matchesEmail && matchesAmount;
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison = (a.paidAt || 0) - (b.paidAt || 0);
          break;
        case "amount":
          comparison = Number(a.amount) - Number(b.amount);
          break;
        case "id":
          comparison = a.id.localeCompare(b.id);
          break;
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [invoices, searchId, searchEmail, amountFilter, sortBy, sortOrder]);

  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
    },
    [sortBy, sortOrder],
  );

  const getSortIcon = useCallback(
    (field: string) => {
      if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
      return sortOrder === "asc" ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      );
    },
    [sortBy, sortOrder],
  );

  const downloadReceipt = useCallback(
    async (invoice: Invoice) => {
      try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Colors
        const primaryColor = [245, 123, 0]; // Orange
        const secondaryColor = [156, 163, 175]; // Gray
        const darkColor = [31, 41, 55]; // Dark gray

        // Header Background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 50, "F");

        // Company/Merchant Header
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, "bold");
        doc.text(
          merchant?.business_name || "Payment Receipt",
          pageWidth / 2,
          20,
          {
            align: "center",
          },
        );

        doc.setFontSize(12);
        doc.setFont(undefined, "normal");
        doc.text("Payment Confirmation", pageWidth / 2, 35, {
          align: "center",
        });

        // Reset text color
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

        // Receipt Title
        doc.setFontSize(18);
        doc.setFont(undefined, "bold");
        doc.text("RECEIPT", 20, 70);

        // Add decorative line
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(2);
        doc.line(20, 75, pageWidth - 20, 75);

        // Receipt Details Section
        let yPos = 95;
        const lineHeight = 10;
        const labelWidth = 50;

        // Helper function to add labeled row
        const addReceiptRow = (
          label: string,
          value: string,
          isBold = false,
        ) => {
          doc.setFont(undefined, "bold");
          doc.setFontSize(10);
          doc.setTextColor(
            secondaryColor[0],
            secondaryColor[1],
            secondaryColor[2],
          );
          doc.text(label.toUpperCase(), 20, yPos);

          doc.setFont(undefined, isBold ? "bold" : "normal");
          doc.setFontSize(isBold ? 12 : 10);
          doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
          doc.text(value, 20 + labelWidth, yPos);
          yPos += lineHeight;
        };

        // Invoice Details
        addReceiptRow("Receipt ID:", invoice.id);
        addReceiptRow("Description:", invoice.description);
        addReceiptRow("Recipient:", invoice.recipient);
        addReceiptRow("Email:", invoice.email || "Not provided");

        yPos += 5; // Extra spacing before amount

        // Amount (highlighted)
        doc.setFillColor(248, 250, 252); // Light gray background
        doc.rect(15, yPos - 5, pageWidth - 30, 15, "F");
        doc.setFont(undefined, "bold");
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("AMOUNT PAID:", 20, yPos + 5);
        doc.text(
          `${Number(invoice.amount) / 100000000} ${invoice.currency}`,
          pageWidth - 20,
          yPos + 5,
          { align: "right" },
        );

        yPos += 25;

        // Payment Information
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("PAYMENT INFORMATION", 20, yPos);
        yPos += 10;

        addReceiptRow(
          "Payment Date:",
          formatBlockDate(
            blockToDate(invoice.paidAt!, currentBlock, Date.now()),
          ),
        );
        addReceiptRow("Payment Address:", account || "N/A");

        // Footer section
        yPos = pageHeight - 60;

        // Add decorative line
        doc.setDrawColor(
          secondaryColor[0],
          secondaryColor[1],
          secondaryColor[2],
        );
        doc.setLineWidth(1);
        doc.line(20, yPos, pageWidth - 20, yPos);

        yPos += 15;

        // Thank you message
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("Thank you for your payment!", pageWidth / 2, yPos, {
          align: "center",
        });

        yPos += 10;

        // Footer info
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.setTextColor(
          secondaryColor[0],
          secondaryColor[1],
          secondaryColor[2],
        );
        doc.text(
          "This receipt serves as confirmation of your completed payment.",
          pageWidth / 2,
          yPos,
          { align: "center" },
        );

        yPos += 8;
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          pageWidth / 2,
          yPos,
          { align: "center" },
        );

        // Save the PDF
        doc.save(`receipt-${invoice.id}.pdf`);

        toast({
          title: "Receipt Downloaded",
          description: "Your receipt has been downloaded successfully",
        });
      } catch (error) {
        console.error("Error generating receipt:", error);
        toast({
          title: "Error",
          description: "Failed to generate receipt",
          variant: "destructive",
        });
      }
    },
    [merchant, currentBlock, account, toast],
  );

  // Memoized clear filters handler
  const clearFilters = useCallback(() => {
    setSearchId("");
    setSearchEmail("");
    setAmountFilter("");
  }, []);

  // Memoized loading component
  const LoadingComponent = useMemo(
    () => (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading receipts...</p>
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
                <h1 className="text-2xl font-bold">Receipts</h1>
                <p className="text-sm text-muted-foreground">
                  View and download receipts for completed payments
                </p>
              </div>
            </div>
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
              <CardTitle>No Receipts Yet</CardTitle>
              <CardDescription>
                Receipts will appear here once you receive payments for your
                invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/invoices")}
              >
                View Invoices
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Filters Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter & Search Receipts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search by ID</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter receipt ID..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Search by Email
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter email..."
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Filter by Amount
                    </label>
                    <Input
                      placeholder="Enter amount..."
                      value={amountFilter}
                      onChange={(e) => setAmountFilter(e.target.value)}
                      type="number"
                      step="0.00000001"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort by</label>
                    <Select
                      value={`${sortBy}-${sortOrder}`}
                      onValueChange={(value) => {
                        const [field, order] = value.split("-");
                        setSortBy(field);
                        setSortOrder(order);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">
                          Date (Latest First)
                        </SelectItem>
                        <SelectItem value="date-asc">
                          Date (Oldest First)
                        </SelectItem>
                        <SelectItem value="amount-desc">
                          Amount (High to Low)
                        </SelectItem>
                        <SelectItem value="amount-asc">
                          Amount (Low to High)
                        </SelectItem>
                        <SelectItem value="id-asc">ID (A-Z)</SelectItem>
                        <SelectItem value="id-desc">ID (Z-A)</SelectItem>
                        <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                        <SelectItem value="email-desc">Email (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear filters button */}
                {(searchId || searchEmail || amountFilter) && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Payment Receipts</h2>
              <p className="text-sm text-muted-foreground">
                Showing {filteredAndSortedInvoices.length} of {invoices.length}{" "}
                receipts
              </p>
            </div>

            {/* Receipts Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("id")}
                            className="h-auto p-0 font-semibold"
                          >
                            Receipt ID {getSortIcon("id")}
                          </Button>
                        </th>
                        <th className="text-left p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("email")}
                            className="h-auto p-0 font-semibold"
                          >
                            Customer {getSortIcon("email")}
                          </Button>
                        </th>
                        <th className="text-left p-4">Description</th>
                        <th className="text-left p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("amount")}
                            className="h-auto p-0 font-semibold"
                          >
                            Amount {getSortIcon("amount")}
                          </Button>
                        </th>
                        <th className="text-left p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("date")}
                            className="h-auto p-0 font-semibold"
                          >
                            Date Paid {getSortIcon("date")}
                          </Button>
                        </th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-right p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b hover:bg-muted/25 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-mono text-sm flex items-center gap-2">
                              {invoice.id.slice(0, 8)}...
                              <CopyButton text={invoice.id} />
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium">
                                {invoice.recipient.slice(0, 12)}...
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {invoice.email || "No email"}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div
                              className="max-w-[200px] truncate"
                              title={invoice.description}
                            >
                              {invoice.description}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-green-700">
                              {Number(invoice.amount) / 100000000}{" "}
                              {invoice.currency}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {formatBlockDate(
                                blockToDate(
                                  invoice.paidAt!,
                                  currentBlock,
                                  Date.now(),
                                ),
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadReceipt(invoice)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/pay/${invoice.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredAndSortedInvoices.length === 0 && (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No matching receipts
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search filters or create a new invoice
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
