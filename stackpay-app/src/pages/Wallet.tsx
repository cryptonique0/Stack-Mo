import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useStacksContract } from "@/hooks/useStacksContract";
import { Cl } from "@stacks/transactions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { CopyButton } from "@/components/CopyButton";
import {
  Wallet as WalletIcon,
  Bitcoin,
  ArrowLeft,
  Loader2,
  ArrowUpCircle,
  AlertCircle,
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useWalletData } from "@/hooks/useWalletData";

export default function Wallet() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { account, isConnected, connectWallet, disconnectWallet } = useWallet();
  const {
    stxBalance,
    sbtcBalance,
    isLoading: balancesLoading,
    error: balancesError,
  } = useWalletData();

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [openWithdrawDialog, setOpenWithdrawDialog] = useState(false);
  const { callProcContract } = useStacksContract();

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(withdrawAmount);
    const maxAmount = Number(sbtcBalance);

    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (amount > maxAmount) {
      toast({
        title: "Insufficient Balance",
        description: "Amount exceeds available balance.",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      // Convert to micro-sBTC (1 sBTC = 1,000,000 micro-sBTC)
      const amountInMicroSbtc = Math.floor(amount * 1000000);

      const response = await callProcContract({
        functionName: "withdraw",
        functionArgs: [
          Cl.stringAscii("sBTC"),
          Cl.uint(amountInMicroSbtc),
          Cl.contractPrincipal(
            "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT",
            "sbtc-token",
          ),
        ],
      });

      if (response.txid) {
        toast({
          title: "Withdrawal Initiated",
          description: `Successfully initiated withdrawal of ${amount} sBTC. Transaction ID: ${response.txid}`,
        });
        setWithdrawAmount("");
        setOpenWithdrawDialog(false);
      } else {
        throw new Error("No transaction ID returned");
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during withdrawal.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading || balancesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="bg-primary p-2 rounded-lg">
                <WalletIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Wallet</h1>
                <p className="text-sm text-muted-foreground">
                  Connect your wallet to get started
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <WalletIcon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your Stacks wallet to view balances and manage funds.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={connectWallet} size="lg" className="w-full">
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex justify-between mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="bg-primary p-2 rounded-lg">
              <WalletIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Wallet</h1>
              <p className="text-sm text-muted-foreground">
                Manage your wallet and view balances
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" disabled={true}>
              Withdraw STX
            </Button>
            <Dialog
              open={openWithdrawDialog}
              onOpenChange={setOpenWithdrawDialog}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={Number(sbtcBalance) <= 0}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Withdraw sBTC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-md:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ArrowUpCircle className="h-5 w-5 text-primary" />
                    Withdraw sBTC
                  </DialogTitle>
                  <DialogDescription>
                    Enter the amount of sBTC to withdraw. Available balance:{" "}
                    {sbtcBalance} sBTC
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount (sBTC)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="withdraw-amount"
                        type="number"
                        step="0.000001"
                        min="0"
                        max={Number(sbtcBalance)}
                        placeholder="0.000000"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        disabled={isWithdrawing}
                      />
                      <Button
                        variant="outline"
                        onClick={() => setWithdrawAmount(sbtcBalance)}
                        disabled={isWithdrawing}
                      >
                        Max
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      A 1% platform fee will be deducted from your withdrawal
                      amount to support StackPay operations. For example,
                      withdrawing 1 sBTC will result in 0.99 sBTC transferred to
                      your wallet.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOpenWithdrawDialog(false);
                      setWithdrawAmount("");
                    }}
                    disabled={isWithdrawing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || !withdrawAmount}
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Withdraw"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5 text-orange-500" />
                    Stacks Wallet
                  </CardTitle>
                  <CardDescription>
                    Your connected Stacks wallet
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    Connected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectWallet}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">sBTC Balance</p>
                  <p className="text-2xl font-bold">{sbtcBalance} sBTC</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">STX Balance</p>
                  <p className="text-2xl font-bold">{stxBalance} STX</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Wallet Address</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">
                      Your Stacks Address
                    </p>
                    <CopyButton text={account || ""} />
                  </div>
                  <p className="font-mono text-sm break-all bg-background p-2 rounded border">
                    {account}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">QR Code</h3>
                <div className="bg-white p-4 rounded-lg border flex flex-col items-center">
                  <QRCodeDisplay value={account || ""} size={200} />
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Share this QR code to receive payments
                  </p>
                </div>
              </div>
              {balancesError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-sm text-red-700">
                    Error loading balances: {balancesError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
