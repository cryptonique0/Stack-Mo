import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Building, Globe, FileText, Sparkles } from 'lucide-react';

const businessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessCategory: z.string().min(1, 'Please select a business category'),
  country: z.string().min(1, 'Please select your country'),
  businessWebsite: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type BusinessProfileForm = z.infer<typeof businessProfileSchema>;

const businessCategories = [
  { value: 'retail', label: 'Retail' },
  { value: 'saas', label: 'SaaS' },
  { value: 'freelance_services', label: 'Freelance Services' },
  { value: 'ngo', label: 'NGO' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'e_commerce', label: 'E-commerce' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'other', label: 'Other' },
];

const countries = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'AU', label: 'Australia' },
  { value: 'IN', label: 'India' },
  { value: 'SG', label: 'Singapore' },
  { value: 'other', label: 'Other' },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<BusinessProfileForm>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: '',
      businessCategory: '',
      country: '',
      businessWebsite: '',
    },
  });

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const onSubmit = async (data: BusinessProfileForm) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('merchant_profiles')
        .insert({
          user_id: user.id,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          business_name: data.businessName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any   
          business_category: data.businessCategory as any,
          country: data.country,
          business_website: data.businessWebsite || null,
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setStep(3); // Success step

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any   
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <Progress value={progress} className="mb-4" />
          <p className="text-sm text-muted-foreground text-center">
            Step {step} of 3
          </p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl">Welcome to StackPay!</CardTitle>
              <CardDescription className="text-lg">
                Let's set up your business account in just a few steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setStep(2)} className="w-full" size="lg">
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Business Profile Setup</CardTitle>
              <CardDescription>
                Tell us about your business to customize your experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your business name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your business category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
                            {businessCategories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country/Region</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
                            {countries.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Website (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-business.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={form.handleSubmit(onSubmit)}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Setting up...' : 'Finish Setup'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}


        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-3xl text-green-600">🎉 Success!</CardTitle>
              <CardDescription className="text-lg">
                Your business account is ready! Welcome to StackPay.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Redirecting you to your dashboard...
              </p>
              <Button onClick={() => navigate('/dashboard')} className="w-full" size="lg">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}