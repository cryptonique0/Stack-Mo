import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Bitcoin,
  Plus,
  Eye,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  Shield,
  LogOut,
  Settings,
} from "lucide-react";

interface MerchantProfile {
  id: string;
  business_name: string;
}

interface DashboardStats {
  totalInvoices: number;
  pendingPayments: number;
  completedPayments: number;
  escrowBalance: number;
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [merchantProfile, setMerchantProfile] =
    useState<MerchantProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    pendingPayments: 0,
    completedPayments: 0,
    escrowBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user && !loading) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchMerchantProfile();
    }
  }, [user, loading, navigate]);

  const fetchMerchantProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from("merchant_profiles")
        .select("id, business_name")
        .eq("user_id", user?.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found, redirect to onboarding
          navigate("/onboarding");
          return;
        }
        throw error;
      }

      setMerchantProfile(profile);
      await fetchDashboardStats(profile.id);
    } catch (error) {
      console.error("Error fetching merchant profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async (merchantId: string) => {
    try {
      // Fetch invoice stats
      const { data: invoices } = await supabase
        .from("invoices")
        .select("status, amount_btc")
        .eq("merchant_id", merchantId);

      // Fetch transaction stats
      const { data: transactions } = await supabase
        .from("transactions")
        .select("status, amount_btc")
        .eq("merchant_id", merchantId);

      // Fetch escrow balance
      const { data: escrow } = await supabase
        .from("escrow")
        .select("amount_btc")
        .eq("merchant_id", merchantId)
        .eq("is_released", false);

      const totalInvoices = invoices?.length || 0;
      const pendingPayments =
        invoices?.filter((inv) => inv.status === "pending").length || 0;
      const completedPayments =
        transactions?.filter((tx) => tx.status === "completed").length || 0;
      const escrowBalance =
        escrow?.reduce((sum, item) => sum + Number(item.amount_btc), 0) || 0;

      setStats({
        totalInvoices,
        pendingPayments,
        completedPayments,
        escrowBalance,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <Bitcoin className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">StackPay</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.user_metadata?.first_name || "Merchant"}{" "}
                  👋
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Business Overview */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {merchantProfile?.business_name || "Your Business"} Overview
          </h2>
          <p className="text-muted-foreground">
            Here's a summary of your Bitcoin payment activity
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Invoices
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                Created this month
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
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Payments
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.completedPayments}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Escrow Balance
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.escrowBalance.toFixed(6)} BTC
              </div>
              <p className="text-xs text-muted-foreground">Funds in escrow</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your Bitcoin payments and wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/invoices")}
                className="h-20 flex-col"
              >
                <Plus className="h-6 w-6 mb-2" />
                Create New Invoice
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/invoices")}
                className="h-20 flex-col"
              >
                <Eye className="h-6 w-6 mb-2" />
                View Invoices
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/wallet")}
                className="h-20 flex-col"
              >
                <Wallet className="h-6 w-6 mb-2" />
                Manage Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
