import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  WebhookEventType,
  WebhookLog,
  createTestWebhookPayload,
  isValidWebhookUrl,
} from "@/utils/webhooks";
import {
  Globe,
  TestTube,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MerchantProfile {
  id: string;
  webhook_url: string;
}

// WebhookLog type imported from @/utils/webhooks

export default function Webhooks() {
  const { merchantProfile } = useOutletContext<{
    merchantProfile: MerchantProfile;
  }>();
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (merchantProfile) {
      setWebhookUrl(merchantProfile.webhook_url || "");
      fetchWebhookLogs();
    }
  }, [merchantProfile]);

  const fetchWebhookLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .eq("merchant_id", merchantProfile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching webhook logs:", error);
        return;
      }

      setWebhookLogs(data || []);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateWebhookUrl = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("merchant_profiles")
        .update({ webhook_url: webhookUrl })
        .eq("id", merchantProfile.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Webhook URL updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please save a webhook URL first",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      if (!isValidWebhookUrl(webhookUrl)) {
        toast({
          title: "Invalid Webhook URL",
          description: "Please enter a valid HTTPS webhook URL",
          variant: "destructive",
        });
        return;
      }

      // Create a test webhook payload
      const testPayload = createTestWebhookPayload(merchantProfile.id);

      // Simulate webhook delivery
      const success = Math.random() > 0.3; // 70% success rate for demo
      const responseStatus = success ? 200 : 500;

      const { error } = await supabase.from("webhook_logs").insert({
        merchant_id: merchantProfile.id,
        webhook_url: webhookUrl,
        event_type: "webhook.test",
        payload: testPayload,
        response_status: responseStatus,
        response_body: success ? "OK" : "Internal Server Error",
        success: success,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: success ? "Success" : "Warning",
        description: success
          ? "Test webhook sent successfully"
          : "Test webhook failed - check your endpoint",
        variant: success ? "default" : "destructive",
      });

      fetchWebhookLogs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const retryWebhook = async (logId: string) => {
    try {
      // In a real app, this would retry the actual webhook
      toast({
        title: "Retrying",
        description: "Webhook retry initiated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (success: boolean, status: number) => {
    if (success) {
      return <Badge className="bg-green-100 text-green-800">Success</Badge>;
    } else if (status >= 400 && status < 500) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">Client Error</Badge>
      );
    } else {
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSuccessRate = () => {
    if (webhookLogs.length === 0) return 0;
    const successCount = webhookLogs.filter((log) => log.success).length;
    return Math.round((successCount / webhookLogs.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Webhooks</h2>
        <p className="text-muted-foreground">
          Configure webhooks to receive real-time payment notifications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Webhook Configuration</CardTitle>
            </div>
            <CardDescription>
              Set up your endpoint to receive payment events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-api.com/webhooks/stackpay"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your endpoint must accept POST requests and return a 200 status
                code
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={updateWebhookUrl}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? "Updating..." : "Save URL"}
              </Button>
              <Button
                variant="outline"
                onClick={testWebhook}
                disabled={isTesting || !webhookUrl.trim()}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? "Testing..." : "Test"}
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Webhook Events</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>invoice.paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>invoice.expired</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>transaction.confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>subscription.payment_due</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Statistics</CardTitle>
            <CardDescription>
              Monitor your webhook delivery performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{webhookLogs.length}</div>
                <div className="text-sm text-muted-foreground">
                  Total Attempts
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{getSuccessRate()}%</div>
                <div className="text-sm text-muted-foreground">
                  Success Rate
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Example Payload</h4>
              <Textarea
                readOnly
                value={JSON.stringify(
                  {
                    event: "invoice.paid",
                    timestamp: "2024-01-15T10:30:00Z",
                    data: {
                      invoice_id: "inv_1234567890",
                      amount_btc: "0.001000",
                      amount_usd: "42.50",
                      transaction_hash: "0x1234...abcd",
                      customer_name: "John Doe",
                    },
                  },
                  null,
                  2,
                )}
                className="font-mono text-xs"
                rows={8}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Logs</CardTitle>
              <CardDescription>
                Recent webhook delivery attempts and responses
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchWebhookLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhookLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Attempt</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.event_type}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.success, log.response_status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {log.response_status}
                          </span>
                          {log.response_body && (
                            <span className="text-muted-foreground text-sm truncate max-w-[100px]">
                              {log.response_body}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {log.attempts > 1 && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span>{log.attempts}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(log.last_attempt_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // View webhook details
                              toast({
                                title: "Webhook Details",
                                description: "Detailed view would open here",
                              });
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!log.success && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryWebhook(log.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                No webhook logs yet
              </div>
              <p className="text-sm text-muted-foreground">
                Webhook delivery logs will appear here once you start receiving
                payments
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
