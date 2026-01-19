import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pause, Play, X, Calendar, DollarSign, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

interface MerchantProfile {
  id: string;
}

interface Subscription {
  id: string;
  customer_id: string;
  subscription_name: string;
  amount_btc: number;
  amount_usd: number;
  interval_type: string;
  interval_value: number;
  status: string;
  next_payment_at: string;
  last_payment_at: string;
  created_at: string;
}

const subscriptionSchema = z.object({
  subscriptionName: z.string().min(1, 'Subscription name is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  amountBtc: z.number().min(0.000001, 'Amount must be greater than 0'),
  amountUsd: z.number().optional(),
  intervalType: z.enum(['blocks', 'days', 'weeks', 'months']),
  intervalValue: z.number().min(1, 'Interval must be at least 1'),
});

type SubscriptionForm = z.infer<typeof subscriptionSchema>;

export default function Subscriptions() {
  const { merchantProfile } = useOutletContext<{ merchantProfile: MerchantProfile }>();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscriptionForm>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      subscriptionName: '',
      customerId: '',
      amountBtc: 0,
      intervalType: 'months',
      intervalValue: 1,
    },
  });

  useEffect(() => {
    if (merchantProfile) {
      fetchSubscriptions();
    }
  }, [merchantProfile]);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('merchant_id', merchantProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        return;
      }

      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SubscriptionForm) => {
    setIsSubmitting(true);
    try {
      // Calculate next payment date
      const now = new Date();
      const nextPaymentAt = new Date(now);

      switch (data.intervalType) {
        case 'days':
          nextPaymentAt.setDate(now.getDate() + data.intervalValue);
          break;
        case 'weeks':
          nextPaymentAt.setDate(now.getDate() + (data.intervalValue * 7));
          break;
        case 'months':
          nextPaymentAt.setMonth(now.getMonth() + data.intervalValue);
          break;
        case 'blocks':
          // For blocks, assume 10 minutes per block
          nextPaymentAt.setMinutes(now.getMinutes() + (data.intervalValue * 10));
          break;
      }

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          merchant_id: merchantProfile.id,
          customer_id: data.customerId,
          subscription_name: data.subscriptionName,
          amount_btc: data.amountBtc,
          amount_usd: data.amountUsd,
          interval_type: data.intervalType,
          interval_value: data.intervalValue,
          next_payment_at: nextPaymentAt.toISOString(),
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Subscription created successfully',
      });

      setIsDialogOpen(false);
      form.reset();
      fetchSubscriptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSubscriptionStatus = async (subscriptionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Subscription ${newStatus} successfully`,
      });

      fetchSubscriptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatInterval = (type: string, value: number) => {
    const unit = value === 1 ? type.slice(0, -1) : type;
    return `Every ${value} ${unit}`;
  };

  const getActiveSubscriptionsCount = () => {
    return subscriptions.filter(sub => sub.status === 'active').length;
  };

  const getTotalMonthlyRevenue = () => {
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((total, sub) => {
        // Convert all intervals to monthly equivalent
        let monthlyAmount = sub.amount_btc;
        switch (sub.interval_type) {
          case 'days':
            monthlyAmount = (sub.amount_btc * 30) / sub.interval_value;
            break;
          case 'weeks':
            monthlyAmount = (sub.amount_btc * 4.33) / sub.interval_value;
            break;
          case 'months':
            monthlyAmount = sub.amount_btc / sub.interval_value;
            break;
          case 'blocks':
            // Rough estimate: 1 block = 10 minutes, 30 days = 4320 blocks
            monthlyAmount = (sub.amount_btc * 4320) / sub.interval_value;
            break;
        }
        return total + monthlyAmount;
      }, 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Subscriptions</h2>
          <p className="text-muted-foreground">
            Manage recurring payments and subscriptions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Subscription
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Subscription</DialogTitle>
              <DialogDescription>
                Set up a recurring payment plan for your customer
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="subscriptionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Monthly Premium Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer ID</FormLabel>
                      <FormControl>
                        <Input placeholder="customer@example.com or unique ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amountBtc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (BTC)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="0.001"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amountUsd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="50.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="intervalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interval Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                            <SelectItem value="blocks">Blocks</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="intervalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interval Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? 'Creating...' : 'Create Subscription'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getActiveSubscriptionsCount()}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalMonthlyRevenue().toFixed(6)} BTC</div>
            <p className="text-xs text-muted-foreground">Estimated monthly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>
            Manage your recurring payment subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">
                        {subscription.subscription_name}
                      </TableCell>
                      <TableCell>{subscription.customer_id}</TableCell>
                      <TableCell>
                        <div>
                          <div>{subscription.amount_btc.toFixed(6)} BTC</div>
                          {subscription.amount_usd && (
                            <div className="text-sm text-muted-foreground">
                              ${subscription.amount_usd.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatInterval(subscription.interval_type, subscription.interval_value)}
                      </TableCell>
                      <TableCell>
                        {formatDate(subscription.next_payment_at)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(subscription.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {subscription.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSubscriptionStatus(subscription.id, 'paused')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : subscription.status === 'paused' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSubscriptionStatus(subscription.id, 'active')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : null}

                          {subscription.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSubscriptionStatus(subscription.id, 'cancelled')}
                            >
                              <X className="h-4 w-4" />
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
              <div className="text-muted-foreground mb-4">No subscriptions yet</div>
              <p className="text-sm text-muted-foreground mb-4">
                Create recurring payment plans to generate steady revenue
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}