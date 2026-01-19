import { useEffect, useState, useCallback, useMemo } from "react";
import { formatTokenAmount } from "@/utils/blockchain";
import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useStacksContract } from "@/hooks/useStacksContract";
import { useWallet } from "@/contexts/WalletContext";
import { useWalletData } from "@/hooks/useWalletData";
import { Cl } from "@stacks/transactions";
import {
  blockToDate,
  formatBlockDate,
  fetchCurrentBlockHeight,
} from "@/utils/blocktime";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Shield,
  Plus,
  Eye,
  Bitcoin,
  ArrowDownToLine,
  Bell,
} from "lucide-react";

interface MerchantProfile {
  id: string;
  business_name: string;
}

interface DashboardStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalVolume: number;
}

interface RecentPayment {
  id: string;
  amount: bigint;
  currency: string;
  status: string;
  created_at: number;
  description: string;
}

export default function DashboardOverview() {
  const { merchantProfile } = useOutletContext<{
    merchantProfile: MerchantProfile;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalVolume: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const { account, isConnected } = useWallet();
  const { stxBalance, sbtcBalance } = useWalletData();
  const { readArchContract } = useStacksContract();

  const BLOCK_FETCH_INTERVAL = 60000; // 1 minute
  const DATA_CACHE_DURATION = 30000; // 30 seconds cache for dashboard data

  // Memoize the parseInvoice function to avoid recreating it on every render
  const parseInvoice = useCallback((raw: any, id: string) => {
    if (!raw?.value?.value) return null;

    const invoice = raw.value.value;
    const statusValue = invoice["status"] ? Number(invoice["status"].value) : 0;

    return {
      id,
      amount: BigInt(invoice["amount"]?.value ?? 0),
      email: invoice["email"]?.value ?? "",
      description: invoice["description"]?.value ?? "",
      status: {
        0: "pending",
        1: "paid",
        2: "expired",
      }[statusValue],
      createdAt: invoice["created-at"]
        ? Number(invoice["created-at"].value)
        : null,
      paidAt: statusValue === 1 ? Number(invoice["paid-at"]?.value ?? 0) : null,
      recipient: invoice["recipient"]?.value ?? "",
    };
  }, []);

  // Memoized function to update current block with rate limiting
  const updateCurrentBlock = useCallback(async () => {
    try {
      const blockHeight = await fetchCurrentBlockHeight();
      setCurrentBlock(blockHeight);
    } catch (error) {
      console.error("Failed to fetch current block height:", error);
    }
  }, []);

  // Optimized fetchDashboardData with caching and error handling
  const fetchDashboardData = useCallback(
    async (force = false) => {
      const now = Date.now();

      // Check cache - only fetch if forced or cache expired
      if (!force && now - lastFetchTime < DATA_CACHE_DURATION) {
        return;
      }

      try {
        setIsLoading(true);

        // Parallel fetch of critical data
        const [currentBlockHeight, invoiceCount] = await Promise.all([
          currentBlock
            ? Promise.resolve(currentBlock)
            : fetchCurrentBlockHeight(),
          readArchContract("get-invoice-count"),
        ]);

        // Update current block if we fetched it
        if (!currentBlock) {
          setCurrentBlock(currentBlockHeight);
        }

        const totalInvoices = Number(invoiceCount.value.value);

        if (totalInvoices === 0) {
          setStats({
            totalInvoices: 0,
            paidInvoices: 0,
            pendingInvoices: 0,
            totalVolume: 0,
          });
          setRecentPayments([]);
          setLastFetchTime(now);
          return;
        }

        // Batch contract calls with error handling
        const invoicePromises = Array.from({ length: totalInvoices }, (_, i) =>
          readArchContract("get-invoice-id", [Cl.uint(i)]).catch((err) => {
            console.error(`Failed to fetch invoice ID ${i}:`, err);
            return null;
          }),
        );

        const invoiceIds = (await Promise.all(invoicePromises)).filter(Boolean);

        if (invoiceIds.length === 0) {
          setLastFetchTime(now);
          return;
        }

        // Batch invoice details fetch with error handling
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

        const processedInvoices = invoiceResults
          .map((result, i) => {
            if (!result || !invoiceIds[i]) return null;
            const id = invoiceIds[i]?.value.value["invoice-id"].value;
            return parseInvoice(result, id);
          })
          .filter((invoice) => invoice !== null)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const paidInvoices = processedInvoices.filter(
          (inv) => inv.status === "paid",
        );
        const pendingInvoices = processedInvoices.filter(
          (inv) => inv.status === "pending",
        );
        const totalVolume = paidInvoices.reduce(
          (sum, inv) => sum + Number(inv.amount),
          0,
        );

        setStats({
          totalInvoices: totalInvoices,
          paidInvoices: paidInvoices.length,
          pendingInvoices: pendingInvoices.length,
          totalVolume: totalVolume / 100000000,
        });

        setRecentPayments(
          paidInvoices.slice(0, 5).map((invoice) => ({
            id: invoice.id,
            amount: invoice.amount,
            currency: "sBTC",
            status: invoice.status,
            created_at: invoice.createdAt || 0,
            description: invoice.description,
          })),
        );

        setLastFetchTime(now);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [readArchContract, parseInvoice, currentBlock, lastFetchTime],
  );

  // Optimized useEffect for initial data fetch
  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      if (merchantProfile && isConnected && mounted) {
        await fetchDashboardData(true); // Force initial fetch
      }
    };

    initializeData();

    return () => {
      mounted = false;
    };
  }, [merchantProfile?.id, isConnected]); // Only depend on stable identifiers

  // Separate useEffect for block updates with cleanup
  useEffect(() => {
    if (!isConnected) return;

    // Initial block fetch
    updateCurrentBlock();

    const interval = setInterval(() => {
      updateCurrentBlock();
    }, BLOCK_FETCH_INTERVAL);

    return () => clearInterval(interval);
  }, [isConnected, updateCurrentBlock]);

  // Memoized status badge component
  const getStatusBadge = useMemo(
    () => (status: string) => {
      switch (status) {
        case "paid":
          return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
        case "pending":
          return (
            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
          );
        case "expired":
          return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
        default:
          return <Badge variant="secondary">{status}</Badge>;
      }
    },
    [],
  );

  const handleConnect = useCallback(async () => {
    try {
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully",
      });
      await fetchDashboardData(true);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  }, [toast, fetchDashboardData]);

  // Memoized loading component
  const LoadingComponent = useMemo(
    () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),
    [],
  );

  if (isLoading && recentPayments.length === 0) {
    return LoadingComponent;
  }

  if (!isConnected && !isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Welcome to StackPay</h2>
          <p className="text-muted-foreground">
            Connect your wallet to start accepting Bitcoin payments
          </p>
        </div>
        <Button onClick={handleConnect} size="lg">
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Notification Banner */}
      {showNotification && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-medium text-green-800">Payment Received!</h4>
              <p className="text-sm text-green-700">
                A new payment of 0.001 BTC has been confirmed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Here's a summary of your Bitcoin payment activity
          </p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-xl font-bold">{sbtcBalance} sBTC</p>
              <p className="text-sm text-muted-foreground">{stxBalance} STX</p>
            </div>
            <Button
              onClick={() => navigate("/dashboard/wallet")}
              variant="outline"
            >
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Manage Wallet
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Bitcoin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalVolume.toFixed(6)} BTC
            </div>
            <p className="text-xs text-muted-foreground">Revenue processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Manage your Bitcoin payments and business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/dashboard/invoices")}
              className="h-20 flex-col"
            >
              <Plus className="h-6 w-6 mb-2" />
              Create Invoice
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard/invoices")}
              className="h-20 flex-col"
            >
              <Eye className="h-6 w-6 mb-2" />
              View Invoices
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard/wallet")}
              className="h-20 flex-col"
            >
              <Shield className="h-6 w-6 mb-2" />
              Manage Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.description || "No description"}
                    </TableCell>
                    <TableCell>
                      {formatTokenAmount(payment.amount, "sBTC")} sBTC
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBlockDate(
                        blockToDate(
                          payment.created_at,
                          currentBlock,
                          Date.now(),
                        ),
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No invoices yet</p>
              <Button
                onClick={() => navigate("/dashboard/invoices")}
                className="mt-2"
              >
                Create your first invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
