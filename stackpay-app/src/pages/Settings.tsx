import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useStacksContract } from "@/hooks/useStacksContract";
import { useWalletData } from "@/hooks/useWalletData";
import {
  createApiKeyHash,
  prepareRegisterMerchantArgs,
  prepareSetProcessorArgs,
  prepareSetPlatformFeeRecipientArgs,
} from "@/utils/blockchain";
import {
  Settings as SettingsIcon,
  ArrowLeft,
  Webhook,
  User,
  Building,
  Save,
  Wallet,
  Link2,
  DollarSign,
  AlertTriangle,
  Key,
  Plus,
  Copy,
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MerchantSettings } from "@/types/merchant";
import { Badge } from "@/components/ui/badge";

interface MerchantProfile {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  business_category: string;
  country: string;
  business_website?: string;
  webhook_url?: string;
}

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { account, isConnected, connectWallet, disconnectWallet } = useWallet();
  const { callArchContract } = useStacksContract();
  const {
    stxBalance,
    sbtcBalance,
    isLoading: balancesLoading,
  } = useWalletData();

  const [merchantProfile, setMerchantProfile] =
    useState<MerchantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSettingProcessor, setIsSettingProcessor] = useState(false);
  const [isSettingFeeRecipient, setIsSettingFeeRecipient] = useState(false);
  const [merchantSettings, setMerchantSettings] = useState<MerchantSettings>({
    processorAddress: "",
    feeRecipientAddress: "",
    apiKey: "",
    webhookUrl: "",
  });
  const [apiKeys, setApiKeys] = useState([]);
  const [autoPayoutMode, setAutoPayoutMode] = useState<
    "instant" | "weekly" | "threshold"
  >("instant");
  const [thresholdAmount, setThresholdAmount] = useState<number>(0.01);

  const { register, handleSubmit, setValue, watch } =
    useForm<MerchantProfile>();

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
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          navigate("/onboarding");
          return;
        }
        throw error;
      }

      setMerchantProfile(profile);
      Object.keys(profile).forEach((key) => {
        setValue(key as keyof MerchantProfile, profile[key]);
      });
    } catch (error) {
      console.error("Error fetching merchant profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async () => {
    const webhookUrl = watch("webhook_url");
    if (!webhookUrl) {
      toast({
        title: "No Webhook URL",
        description: "Please enter a webhook URL first",
        variant: "destructive",
      });
      return;
    }

    try {
      const testPayload = {
        event: "webhook.test",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook from StackPay",
        },
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast({
          title: "Webhook Test Successful",
          description: "Your webhook endpoint is working correctly",
        });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: `HTTP ${response.status}: ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Webhook Test Failed",
        description: "Could not reach your webhook endpoint",
        variant: "destructive",
      });
    }
  };

  const registerMerchant = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    // if (!merchantSettings.apiKey) {
    //   toast({
    //     title: "API Key required",
    //     description: "Please enter an API key",
    //     variant: "destructive",
    //   });
    //   return;
    // }
    setIsRegistering(true);
    try {
      const apiKeyHash = createApiKeyHash(merchantSettings.apiKey);
      const args = prepareRegisterMerchantArgs({
        webhook: merchantSettings.webhookUrl || undefined,
        // apiKeyHash,
      });
      const response = await callArchContract({
        functionName: "register-merchant",
        functionArgs: args,
      });
      if (response.txid) {
        toast({
          title: "Registration successful",
          description: `Transaction ID: ${response.txid}`,
        });
      } else {
        toast({
          title: "Registration failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const setProcessor = async () => {
    if (!merchantSettings.processorAddress) {
      toast({
        title: "Address required",
        description: "Please enter a processor address",
        variant: "destructive",
      });
      return;
    }
    setIsSettingProcessor(true);
    try {
      const args = prepareSetProcessorArgs(merchantSettings.processorAddress);
      const response = await callArchContract({
        functionName: "set-processor",
        functionArgs: args,
      });
      toast({
        title: "Processor set successfully",
        description: `Transaction ID: ${response.txid}`,
      });
    } catch (error) {
      toast({
        title: "Failed to set processor",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSettingProcessor(false);
    }
  };

  const setFeeRecipient = async () => {
    if (!merchantSettings.feeRecipientAddress) {
      toast({
        title: "Address required",
        description: "Please enter a fee recipient address",
        variant: "destructive",
      });
      return;
    }
    setIsSettingFeeRecipient(true);
    try {
      const args = prepareSetPlatformFeeRecipientArgs(
        merchantSettings.feeRecipientAddress,
      );
      const response = await callArchContract({
        functionName: "set-platform-fee-recipient",
        functionArgs: args,
      });
      toast({
        title: "Fee recipient set successfully",
        description: `Transaction ID: ${response.txid}`,
      });
    } catch (error) {
      toast({
        title: "Failed to set fee recipient",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSettingFeeRecipient(false);
    }
  };

  const saveProfile = async (data: MerchantProfile) => {
    if (!merchantProfile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("merchant_profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          business_name: data.business_name,
          business_website: data.business_website,
          webhook_url: data.webhook_url,
        })
        .eq("id", merchantProfile.id);

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully",
      });

      setMerchantProfile({ ...merchantProfile, ...data });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

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
              <SettingsIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your account and business preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit(saveProfile)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      {...register("first_name", { required: true })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      {...register("last_name", { required: true })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed from here. Contact support if
                    needed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>Update your business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    {...register("business_name", { required: true })}
                    placeholder="Acme Corp"
                  />
                </div>

                <div>
                  <Label htmlFor="business_website">
                    Business Website (Optional)
                  </Label>
                  <Input
                    id="business_website"
                    type="url"
                    {...register("business_website")}
                    placeholder="https://www.example.com"
                  />
                </div>

                <div>
                  <Label>Business Category</Label>
                  <Input
                    value={merchantProfile?.business_category || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Business category cannot be changed. Contact support if
                    needed.
                  </p>
                </div>

                <div>
                  <Label>Country</Label>
                  <Input
                    value={merchantProfile?.country || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Country cannot be changed. Contact support if needed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Merchant Registration
                </CardTitle>
                <CardDescription>
                  Register as a merchant to start accepting payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/*<div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={merchantSettings.apiKey}
                    onChange={(e) =>
                      setMerchantSettings((prev) => ({
                        ...prev,
                        apiKey: e.target.value,
                      }))
                    }
                    placeholder="Enter your API key"
                  />
                </div>*/}
                <div>
                  <Label>Webhook URL (Optional)</Label>
                  <Input
                    type="url"
                    value={merchantSettings.webhookUrl}
                    onChange={(e) =>
                      setMerchantSettings((prev) => ({
                        ...prev,
                        webhookUrl: e.target.value,
                      }))
                    }
                    placeholder="https://your-api.com/webhook"
                  />
                </div>
                <Button
                  type="button"
                  onClick={registerMerchant}
                  disabled={isRegistering}
                >
                  {isRegistering ? "Registering..." : "Register as Merchant"}
                </Button>
              </CardContent>
            </Card>

            {/* Payout Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Auto-Payout Settings
                </CardTitle>
                <CardDescription>
                  Configure automatic withdrawal preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Payout Method</Label>
                  <Select
                    value={autoPayoutMode}
                    onValueChange={(
                      value: "instant" | "weekly" | "threshold",
                    ) => setAutoPayoutMode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="threshold">Threshold</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose when to automatically withdraw funds
                  </p>
                </div>

                {autoPayoutMode === "threshold" && (
                  <div>
                    <Label htmlFor="threshold">Threshold Amount (BTC)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      step="0.00000001"
                      value={thresholdAmount}
                      onChange={(e) =>
                        setThresholdAmount(Number(e.target.value))
                      }
                      placeholder="0.01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically withdraw when balance reaches this amount
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Label>Network Mode</Label>
                  <Select
                    value={"testnet"}
                    // onValueChange={(value) =>
                    //   setValue(value)
                    // }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="testnet">Testnet</SelectItem>
                      <SelectItem value="mainnet">Mainnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee Recipient Address</Label>
                  <Input
                    value={merchantSettings.feeRecipientAddress}
                    onChange={(e) =>
                      setMerchantSettings((prev) => ({
                        ...prev,
                        feeRecipientAddress: e.target.value,
                      }))
                    }
                    placeholder="ST..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Address to receive platform fees (leave blank for default)
                  </p>
                  <Button
                    className="mt-2"
                    onClick={setFeeRecipient}
                    disabled={isSettingFeeRecipient}
                  >
                    {isSettingFeeRecipient ? "Setting..." : "Set Fee Recipient"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/*Set processor*/}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Contract Settings
                </CardTitle>
                <CardDescription>
                  Configure processor and fee recipient addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Processor Address</Label>
                  <Input
                    value={merchantSettings.processorAddress}
                    onChange={(e) =>
                      setMerchantSettings((prev) => ({
                        ...prev,
                        processorAddress: e.target.value,
                      }))
                    }
                    placeholder="ST..."
                  />
                  <Button
                    type="button"
                    className="mt-2"
                    onClick={setProcessor}
                    disabled={isSettingProcessor}
                  >
                    {isSettingProcessor ? "Setting..." : "Set Processor"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Settings
                </CardTitle>
                <CardDescription>
                  Manage your connected Stacks wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Connected Wallet</Label>
                  {isConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm">{account}</code>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            STX Balance
                          </p>
                          <p className="font-medium">{stxBalance} STX</p>
                        </div>
                        <div className="p-2 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            sBTC Balance
                          </p>
                          <p className="font-medium">{sbtcBalance} sBTC</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={disconnectWallet}>
                        Disconnect Wallet
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        No wallet connected
                      </p>
                      <Button onClick={connectWallet}>
                        {balancesLoading ? "Connecting..." : "Connect Wallet"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks
                </CardTitle>
                <CardDescription>
                  Configure webhook notifications for payment events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    {...register("webhook_url")}
                    placeholder="https://api.yoursite.com/webhooks/stackpay"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll send POST requests to this URL when payments are
                    received
                  </p>
                </div>

                <Button type="button" variant="outline" onClick={testWebhook}>
                  Test Webhook
                </Button>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Webhook Events</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • <code>invoice.paid</code> - When an invoice is paid
                    </li>
                    <li>
                      • <code>invoice.expired</code> - When an invoice expires
                    </li>
                    <li>
                      • <code>payment.confirmed</code> - When payment is
                      confirmed on blockchain
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* API Keys */}
            {/*<Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage API keys for accessing StackPay programmatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">Active API Keys</h4>
                    <p className="text-sm text-muted-foreground">
                      Use these keys to integrate with StackPay API
                    </p>
                  </div>
                  <Button onClick={generateApiKey} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Key
                  </Button>
                </div>

                <div className="space-y-2">
                  {apiKeys.length > 0 ? (
                    apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{key.key_name}</span>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {key.api_key.substring(0, 12)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyApiKey(key.api_key)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created{" "}
                            {new Date(key.created_at).toLocaleDateString()}
                            {key.last_used_at &&
                              ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeApiKey(key.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No API keys generated yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>*/}

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
