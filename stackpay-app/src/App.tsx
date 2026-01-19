import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { startTransactionMonitoring } from "@/jobs/monitor-transactions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/contexts/WalletContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import Wallet from "./pages/Wallet";
import Invoices from "./pages/Invoices";
import Receipts from "./pages/Receipts";
import Subscriptions from "./pages/Subscriptions";
import Webhooks from "./pages/Webhooks";
import Settings from "./pages/Settings";
import PaymentPage from "./pages/PaymentPage";
import PaymentLink from "./pages/PaymentLink";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Start monitoring blockchain transactions
    const cleanup = startTransactionMonitoring();
    console.log("Transaction monitoring started. Cleanup function:", cleanup);
    return () => {
      console.log("Cleaning up transaction monitoring...");
      cleanup();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="receipts" element={<Receipts />} />
                  <Route path="subscriptions" element={<Subscriptions />} />
                  <Route path="wallet" element={<Wallet />} />
                  <Route path="webhooks" element={<Webhooks />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="/pay/:invoiceId" element={<PaymentLink />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
