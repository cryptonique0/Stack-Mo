"use client";

import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  Shield,
  Zap,
  Wallet,
  Loader2,
} from "lucide-react";

export default function OnboardingModal({
  onClose,
  onModeSelect,
  onProfileComplete,
}) {
  const [step, setStep] = useState(1);

  // Privy hooks
  const { login, authenticated, ready, connectWallet, user, logout } =
    usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subscriptionCount: "",
    monthlySpend: "",
    budgetLimit: "",
    budgetAlert: true,
    notifications: {
      billingReminders: true,
      weeklyReports: false,
      recommendations: true,
    },
  });

  // Auto-populate email from Privy user
  useEffect(() => {
    if (user?.email?.address && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email.address }));
    }
  }, [user, formData.email]);

  // Auto-advance to step 2 when wallet connects
  useEffect(() => {
    if (authenticated && walletsReady && wallets.length > 0 && step === 1) {
      console.log("[Onboarding] Wallet connected, advancing to step 2");
      setStep(2);
    }
  }, [authenticated, walletsReady, wallets.length, step]);

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleWalletConnect = async () => {
    if (!ready) {
      console.error("[Privy] SDK not ready");
      return;
    }

    try {
      console.log("[Privy] Opening wallet connection...");
      await connectWallet();
    } catch (error) {
      console.error("[Privy] Wallet connection failed:", error);
    }
  };

  const handleEmailLogin = async () => {
    if (!ready) {
      console.error("[Privy] SDK not ready");
      return;
    }

    try {
      console.log("[Privy] Opening email login...");
      await login();
    } catch (error) {
      console.error("[Privy] Email login failed:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log("[Privy] Disconnecting wallet...");
      await logout();
      setStep(1);
    } catch (error) {
      console.error("[Privy] Disconnect failed:", error);
    }
  };

  const handleModeSelection = (mode: "individual" | "enterprise") => {
    console.log("[Onboarding] Selected mode:", mode);

    // Save profile data
    const profileData = {
      name: formData.name,
      email: formData.email,
      walletAddress: connectedWallet?.address,
      walletType: connectedWallet?.walletClientType,
      subscriptionCount: formData.subscriptionCount,
      monthlySpend: formData.monthlySpend,
      budgetLimit: formData.budgetLimit,
      budgetAlert: formData.budgetAlert,
      notifications: formData.notifications,
      mode: mode,
    };

    // Pass profile data to parent
    onProfileComplete?.(profileData);
    onModeSelect?.(mode);
    onClose?.();
  };

  const connectedWallet = wallets[0];

  const isStep2Valid = () => {
    return (
      formData.name &&
      formData.email &&
      formData.subscriptionCount &&
      formData.monthlySpend
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Left Side - Branding */}
        <div className="w-2/5 bg-gradient-to-br from-[#1E2A35] to-[#2A3F4F] text-white p-8 flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Subsync</h1>
            <div className="w-12 h-1 bg-[#FFD166] rounded-full"></div>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-4 leading-tight">
              {step === 1 && "Connect Your\nWallet"}
              {step === 2 && "Tell Us\nAbout Yourself"}
              {step === 3 && "Customize Your\nExperience"}
              {step === 4 && "Choose Your\nPlan"}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {step === 1 &&
                "Connect your Web3 wallet or sign in with email to track your on-chain subscriptions automatically."}
              {step === 2 &&
                "Help us understand your subscription usage so we can provide better insights."}
              {step === 3 &&
                "Set up notifications and budget alerts to stay on top of your spending."}
              {step === 4 && "Select the plan that works best for your needs."}
            </p>

            {step >= 2 && connectedWallet && (
              <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#FFD166]" />
                    <span className="font-medium text-sm">Connected</span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-gray-300 hover:text-white transition-colors underline"
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-300">
                  {connectedWallet.address.slice(0, 6)}...
                  {connectedWallet.address.slice(-4)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {connectedWallet.walletClientType === "privy"
                    ? "Embedded Wallet"
                    : connectedWallet.walletClientType === "metamask"
                      ? "MetaMask"
                      : connectedWallet.walletClientType === "coinbase_wallet"
                        ? "Coinbase Wallet"
                        : "External Wallet"}
                </p>
              </div>
            )}
          </div>

          <div className="text-gray-400 text-xs">
            ©️ 2025 Subsync. All rights reserved.
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="w-3/5 p-8 flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <span className="text-sm text-gray-500">Step {step} of 4</span>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4].map((dot) => (
                <div
                  key={dot}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    dot <= step ? "bg-gray-900" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 1 && "Connect to Get Started"}
              {step === 2 && "Tell Us About Yourself"}
              {step === 3 && "Customize Your Experience"}
              {step === 4 && "Choose Your Plan"}
            </h3>
            <p className="text-gray-600 text-sm">
              {step === 1 &&
                "Connect your wallet to automatically track subscriptions"}
              {step === 2 && "Help us personalize your subscription management"}
              {step === 3 && "Set up alerts and preferences for your dashboard"}
              {step === 4 && "Select the plan that works best for you"}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {step === 1 && (
              <div className="space-y-3">
                {!ready && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading Privy...</p>
                  </div>
                )}

                {ready && !authenticated && (
                  <>
                    <button
                      onClick={handleWalletConnect}
                      className="w-full p-5 rounded-xl border-2 border-gray-900 bg-gray-900 text-white hover:bg-gray-800 transition-all text-left group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-base font-semibold">
                          Connect Web3 Wallet
                        </h4>
                        <Wallet className="w-6 h-6 opacity-90" />
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        Use MetaMask, Coinbase Wallet, or any Web3 wallet to
                        connect
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Instant</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Secure</span>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleEmailLogin}
                      className="w-full p-5 rounded-xl border-2 border-gray-300 bg-white hover:border-gray-400 transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-base font-semibold text-gray-900">
                          Continue with Email
                        </h4>
                        <Mail className="w-6 h-6 text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Create an embedded wallet using your email address
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" />
                          <span>No wallet needed</span>
                        </div>
                      </div>
                    </button>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">🔒 Secure:</span> We
                        only read on-chain data. Your private keys stay in your
                        wallet.
                      </p>
                    </div>
                  </>
                )}

                {authenticated && wallets.length > 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Wallet Connected!
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">
                      {wallets[0].address.slice(0, 8)}...
                      {wallets[0].address.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Redirecting to next step...
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How many subscriptions do you currently have?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "1-5 subscriptions",
                      "6-10 subscriptions",
                      "11-20 subscriptions",
                      "20+ subscriptions",
                    ].map((option) => (
                      <button
                        key={option}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            subscriptionCount: option,
                          })
                        }
                        className={`p-3 rounded-lg border-2 font-medium text-sm transition-all ${
                          formData.subscriptionCount === option
                            ? "border-gray-900 bg-gray-50 text-gray-900"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approximate monthly spend on all subscriptions
                  </label>
                  <input
                    type="text"
                    value={formData.monthlySpend}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlySpend: e.target.value })
                    }
                    placeholder="e.g., $200"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    This helps us provide better insights
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Connected Wallet
                  </h4>
                  {connectedWallet && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <Wallet className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-mono text-gray-900">
                          {connectedWallet.address.slice(0, 6)}...
                          {connectedWallet.address.slice(-4)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {connectedWallet.walletClientType === "privy"
                            ? "Embedded Wallet"
                            : "External Wallet"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <button
                          onClick={handleDisconnect}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="bg-white p-5 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">🔔</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      Notification Preferences
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.billingReminders}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              billingReminders: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Billing reminders
                        </span>
                        <p className="text-xs text-gray-500">
                          Get notified before renewals
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.weeklyReports}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              weeklyReports: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Weekly reports
                        </span>
                        <p className="text-xs text-gray-500">
                          Summary of your spending
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.recommendations}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              recommendations: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Cost-saving recommendations
                        </span>
                        <p className="text-xs text-gray-500">
                          Smart tips to reduce spending
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">💰</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      Budget Settings
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly budget limit (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.budgetLimit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            budgetLimit: e.target.value,
                          })
                        }
                        placeholder="e.g., $150"
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                      />
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.budgetAlert}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            budgetAlert: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Alert me at 80% of budget
                        </span>
                        <p className="text-xs text-gray-500">
                          Get notified before you exceed your limit
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">💡 Tip:</span> You can
                    change these settings anytime from your dashboard.
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <button
                  onClick={() => handleModeSelection("individual")}
                  className="w-full p-5 border-2 border-gray-300 rounded-xl hover:border-[#FFD166] hover:bg-[#FFD166]/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#FFD166] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                      👤
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-1">
                        Individual Plan
                      </h5>
                      <p className="text-sm text-gray-600 mb-2">
                        Perfect for tracking your personal subscriptions
                      </p>
                      <p className="text-sm font-semibold text-[#007A5C]">
                        $5/month
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0" />
                  </div>
                </button>

                <button
                  onClick={() => handleModeSelection("enterprise")}
                  className="w-full p-5 border-2 border-gray-300 rounded-xl hover:border-[#FFD166] hover:bg-[#FFD166]/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#1E2A35] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                      🏢
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-1">
                        Enterprise Plan
                      </h5>
                      <p className="text-sm text-gray-600 mb-2">
                        For teams managing multiple subscriptions
                      </p>
                      <p className="text-sm font-semibold text-[#007A5C]">
                        $60/month
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0" />
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            {step === 2 && (
              <button
                onClick={handleNext}
                disabled={!isStep2Valid()}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-full py-2.5 text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            )}

            {step === 1 && authenticated && wallets.length === 0 && (
              <p className="text-sm text-center text-gray-500">
                Waiting for wallet connection...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
