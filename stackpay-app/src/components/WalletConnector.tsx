import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/CopyButton";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import {
  Wallet,
  Plus,
  ExternalLink,
  Shield,
  CheckCircle,
  AlertCircle,
  Copy,
  Key,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { connect, disconnect, isConnected } from "@stacks/connect";

interface WalletConnectorProps {
  merchantId: string;
  onWalletConnected: (address: string) => void;
}

export function WalletConnector({
  merchantId,
  onWalletConnected,
}: WalletConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [connectionMethod, setConnectionMethod] = useState<
    "hiro" | "manual" | null
  >(null);
  const { toast } = useToast();

  const connectHiroWallet = async () => {
    setIsConnecting(true);
    try {
      const response = await connect();

      // Try different address extraction methods for different wallets
      let stxAddress = "";

      // For Xverse wallet
      const xverseAddress = response.addresses.find(
        (addr) => addr.addressType === "stacks",
      )?.address;

      // For Leather wallet
      const leatherAddress = response.addresses.find(
        (addr) => addr.symbol === "STX",
      )?.address;

      // Fallback to index 2 (original method)
      const fallbackAddress = response.addresses[2]?.address;

      stxAddress = xverseAddress || leatherAddress || fallbackAddress || "";

      if (!stxAddress) {
        throw new Error("Could not retrieve wallet address");
      }

      console.log("Connected to wallet:", stxAddress);

      await saveWallet(stxAddress, "stacks");
      setWalletAddress(stxAddress);
      onWalletConnected(stxAddress);

      toast({
        title: "Wallet Connected",
        description: "Hiro wallet connected successfully",
      });
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    try {
      disconnect();
      setWalletAddress("");
      toast({
        title: "Wallet Disconnected",
        description: "Wallet disconnected successfully",
      });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Disconnect Error",
        description: "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  const generateWallet = async () => {
    // Disabled for now - to be implemented later
    toast({
      title: "Coming Soon",
      description: "Wallet generation feature will be available soon",
      variant: "default",
    });
  };

  const connectManualWallet = async () => {
    // Disabled for now - to be implemented later
    toast({
      title: "Coming Soon",
      description: "Manual wallet connection will be available soon",
      variant: "default",
    });
  };

  const saveWallet = async (address: string, type: string) => {
    const { error } = await supabase.from("wallets").insert({
      merchant_id: merchantId,
      wallet_address: address,
      wallet_type: type,
      is_active: true,
    });

    if (error) throw error;
  };

  if (walletAddress) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Wallet Connected</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={disconnectWallet}>
              Disconnect
            </Button>
          </div>
          <CardDescription className="text-green-700">
            Your sBTC wallet is ready to receive payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Wallet Address</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-background/80 px-2 py-1 rounded text-sm font-mono flex-1">
                {walletAddress}
              </code>
              <CopyButton text={walletAddress} />
            </div>
          </div>

          <div className="flex items-center justify-center">
            <QRCodeDisplay value={walletAddress} size={150} />
          </div>

          <div className="flex items-center gap-2 text-sm text-green-700">
            <Shield className="h-4 w-4" />
            <span>Secured with Stacks blockchain</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Connect Your sBTC Wallet</h3>
        <p className="text-muted-foreground">
          Choose how you'd like to set up your wallet to receive payments
        </p>
      </div>

      <div className="grid gap-4">
        {/* Hiro Wallet Connection */}
        <Card
          className={`cursor-pointer transition-colors ${
            connectionMethod === "hiro"
              ? "ring-2 ring-primary"
              : "hover:bg-muted/50"
          }`}
          onClick={() => setConnectionMethod("hiro")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Connect Hiro Wallet
                  </CardTitle>
                  <CardDescription>
                    Use your existing Hiro wallet
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary">Recommended</Badge>
            </div>
          </CardHeader>
          {connectionMethod === "hiro" && (
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Secure connection via browser extension</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Maintain full control of your keys</span>
                </div>
                <Button
                  onClick={connectHiroWallet}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? "Connecting..." : "Connect Hiro Wallet"}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Generate New Wallet */}
        <Card
          className={`cursor-pointer transition-colors ${
            connectionMethod === "manual"
              ? "ring-2 ring-primary"
              : "hover:bg-muted/50"
          } opacity-60`}
          onClick={() => setConnectionMethod("manual")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Generate New Wallet
                  </CardTitle>
                  <CardDescription>
                    Create a new sBTC wallet address
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </CardHeader>
          {connectionMethod === "manual" && (
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Important</p>
                      <p className="text-yellow-700">
                        You'll need to back up your private keys separately for
                        security.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="manual-address">
                    Or enter existing address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="manual-address"
                      placeholder="SP1..."
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      className="font-mono text-sm"
                      disabled
                    />
                    <Button
                      onClick={connectManualWallet}
                      disabled={true}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={generateWallet}
                  disabled={true}
                  className="w-full"
                  variant="outline"
                >
                  Generate New Wallet
                  <Key className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
