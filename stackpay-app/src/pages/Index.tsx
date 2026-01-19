import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Bitcoin, Shield, TrendingUp, Zap, Globe, Users } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg">
                <Bitcoin className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">StackPay</span>
            </div>
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
            Accept Bitcoin payments
            <span className="block text-primary">with confidence</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The most secure and efficient way to accept Bitcoin payments on the Stacks blockchain.
            Built for modern businesses who want to embrace the future of money.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
              Start Accepting Bitcoin
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why choose StackPay?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to accept Bitcoin payments securely and efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Enterprise Security</CardTitle>
              <CardDescription>
                Bank-grade security with multi-signature wallets and escrow protection for every transaction.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Real-time Tracking</CardTitle>
              <CardDescription>
                Monitor all your transactions in real-time with detailed analytics and reporting dashboards.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription>
                Built on Stacks blockchain for fast confirmations and low transaction fees.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Global Reach</CardTitle>
              <CardDescription>
                Accept payments from customers worldwide without the hassle of traditional payment processors.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Easy Integration</CardTitle>
              <CardDescription>
                Simple APIs and webhooks to integrate Bitcoin payments into your existing workflow.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Bitcoin className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Bitcoin Native</CardTitle>
              <CardDescription>
                Purpose-built for Bitcoin with support for the latest Stacks smart contract features.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to start accepting Bitcoin?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of businesses already using StackPay to accept Bitcoin payments.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Create Your Account
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded">
                <Bitcoin className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">StackPay</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 StackPay. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
