/**
 * SYNCRO - AgentPaymentService.ts
 *
 * Lightweight agent that coordinates x402 payments by calling an injected `makePaymentFn`.
 * This is a stub / starting point — extend with real integrations, database persistence,
 * and facilitator-specific verification in production.
 *
 * Usage:
 *  const agent = new AgentPaymentService(makePaymentFn, config);
 *  await agent.paySubscription(subscription);
 *
 * Notes:
 * - `makePaymentFn` is expected to be provided by a React hook (e.g. `useMakePaymentFn`)
 *   that internally uses Privy's `wrapFetchWithPayment`. It must have the signature:
 *     async function makePayment(endpoint: string, maxValue?: bigint): MakePaymentResult
 *
 * - This class intentionally avoids calling React hooks. Create it in a component and
 *   inject the hook-produced `makePaymentFn`.
 */

export type MakePaymentResult =
  | {
      success: true;
      status: number;
      data?: any;
      paymentHeader?: string;
    }
  | {
      success: false;
      status?: number;
      error: string;
    };

export type AgentConfig = {
  fraudDetection?: boolean;
  monthlyBudget?: string; // stringified number for simple config, e.g. "200.00"
  alertOnLargeCharge?: boolean;
  largeChargeThreshold?: string; // stringified number
  autoApprove?: boolean;
  sendReminders?: boolean;
  // any additional configuration keys
  [key: string]: any;
};

export type SubscriptionInfo = {
  id?: string | number;
  name: string;
  cost: string; // human-friendly e.g. "9.99"
  paymentEndpoint?: string;
  metadata?: Record<string, any>;
};

export type TransactionRecord = {
  id?: string;
  service: string;
  amount: string;
  timestamp: number;
  endpoint?: string;
  status: "success" | "failed" | "pending";
  paymentHeader?: string | null;
  response?: any;
};

export type AgentResult =
  | { success: true; data?: any }
  | { success: false; reason?: string; error?: string };

/**
 * AgentPaymentService
 *
 * Basic responsibilities:
 * - Accept an injected `makePaymentFn` that performs x402 flows
 * - Resolve the correct endpoint for a subscription
 * - Run security checks (budget, approvals, duplicate detection)
 * - Call makePaymentFn and record transaction history and notifications locally
 */
export class AgentPaymentService {
  private makePaymentFn: (endpoint: string, maxValue?: bigint) => Promise<MakePaymentResult>;
  private agentConfig: AgentConfig;
  private transactionHistory: TransactionRecord[] = [];

  constructor(
    makePaymentFn: (endpoint: string, maxValue?: bigint) => Promise<MakePaymentResult>,
    config?: AgentConfig,
  ) {
    if (!makePaymentFn) {
      throw new Error("AgentPaymentService requires a makePaymentFn to be provided");
    }
    this.makePaymentFn = makePaymentFn;
    this.agentConfig = {
      fraudDetection: true,
      monthlyBudget: "1000.00",
      alertOnLargeCharge: true,
      largeChargeThreshold: "100.00",
      autoApprove: true,
      sendReminders: true,
      ...(config ?? {}),
    };
    this.loadTransactionHistory();
  }

  /**
   * Public: pay for a subscription. Orchestrates endpoint resolution, checks and payment.
   */
  async paySubscription(subscription: SubscriptionInfo): Promise<AgentResult> {
    try {
      const endpoint = this.getEndpointForSubscription(subscription);
      if (!endpoint) {
        return { success: false, reason: "no_endpoint", error: `No endpoint for ${subscription.name}` };
      }

      const amount = subscription.cost;
      return await this.processPayment(endpoint, amount, subscription);
    } catch (err: any) {
      this.sendAlert("Agent error", { error: err?.message ?? String(err) });
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /**
   * Resolve which endpoint to call for a subscription.
   * Default: use subscription.paymentEndpoint if provided.
   * Override this method if you have a central mapping for known services.
   */
  protected getEndpointForSubscription(subscription: SubscriptionInfo): string | null {
    if (subscription.paymentEndpoint) return subscription.paymentEndpoint;
    // Fallback: perhaps service name is a URL in metadata
    const endpointFromMeta = subscription.metadata?.endpoint;
    if (typeof endpointFromMeta === "string" && endpointFromMeta.length > 0) return endpointFromMeta;
    return null;
  }

  /**
   * Main processor: runs checks and invokes the injected makePaymentFn.
   */
  protected async processPayment(endpoint: string, amount: string, serviceInfo: SubscriptionInfo): Promise<AgentResult> {
    // Run security checks
    const checks = await this.runSecurityChecks(endpoint, amount, serviceInfo);
    if (!checks.passed) {
      return { success: false, reason: checks.reason };
    }

    try {
      // Convert amount (string dollars) to token smallest unit heuristic
      // NOTE: This is naive: assumes USDC-like 6 decimals. In production, map per-token decimals.
      const maxValue = this.amountToTokenUnits(amount, 6);

      const result = await this.makePaymentFn(endpoint, maxValue);

      if (result.success) {
        // store a success transaction
        this.recordTransaction({
          service: serviceInfo.name,
          amount,
          timestamp: Date.now(),
          endpoint,
          status: "success",
          paymentHeader: result.paymentHeader ?? null,
          response: result.data ?? null,
        });
        return { success: true, data: result.data };
      } else {
        // store a failed transaction
        this.recordTransaction({
          service: serviceInfo.name,
          amount,
          timestamp: Date.now(),
          endpoint,
          status: "failed",
          paymentHeader: null,
          response: { error: result.error, status: result.status },
        });
        return { success: false, reason: result.error ?? "payment_failed", error: result.error ?? undefined };
      }
    } catch (error: any) {
      this.sendAlert("Payment error", { error: error?.message ?? String(error), serviceInfo });
      this.recordTransaction({
        service: serviceInfo.name,
        amount,
        timestamp: Date.now(),
        endpoint,
        status: "failed",
        paymentHeader: null,
        response: { error: error?.message ?? String(error) },
      });
      return { success: false, error: error?.message ?? String(error) };
    }
  }

  /**
   * Orchestrate fraud / budget / approval checks.
   */
  private async runSecurityChecks(endpoint: string, amount: string, serviceInfo: SubscriptionInfo): Promise<{ passed: boolean; reason?: string }> {
    // Fraud detection
    if (this.agentConfig.fraudDetection) {
      const isFraud = await this.detectFraud(endpoint, amount, serviceInfo);
      if (isFraud) {
        this.sendAlert("Fraudulent charge blocked", serviceInfo);
        return { passed: false, reason: "fraud_detected" };
      }
    }

    // Budget check
    const currentSpend = this.getCurrentMonthSpend();
    const budget = parseFloat(this.agentConfig.monthlyBudget ?? "0");
    if (currentSpend + parseFloat(amount) > budget) {
      this.sendAlert("Budget limit reached", { amount, currentSpend });
      return { passed: false, reason: "budget_exceeded" };
    }

    // Large charge approval
    const threshold = parseFloat(this.agentConfig.largeChargeThreshold ?? "0");
    if (this.agentConfig.alertOnLargeCharge && parseFloat(amount) > threshold) {
      const approved = await this.requestApproval(serviceInfo, amount);
      if (!approved) {
        return { passed: false, reason: "approval_denied" };
      }
    }

    // Auto-approve or request approval if configured
    if (!this.agentConfig.autoApprove) {
      const approved = await this.requestApproval(serviceInfo, amount);
      if (!approved) {
        return { passed: false, reason: "approval_denied" };
      }
    }

    return { passed: true };
  }

  /**
   * Basic duplicate/recent transaction detection.
   */
  private async detectFraud(endpoint: string, amount: string, serviceInfo: SubscriptionInfo): Promise<boolean> {
    const recentTxs = this.transactionHistory.filter((tx) => Date.now() - tx.timestamp < 5 * 60 * 1000);
    const duplicate = recentTxs.find((tx) => tx.endpoint === endpoint && tx.amount === amount);
    if (duplicate) {
      // duplicate found within short window -> treat as fraud/duplicate
      return true;
    }
    return false;
  }

  /**
   * Get total spend for the current month from local transaction history.
   */
  private getCurrentMonthSpend(): number {
    const currentMonth = new Date().getMonth();
    return this.transactionHistory
      .filter((tx) => new Date(tx.timestamp).getMonth() === currentMonth && tx.status === "success")
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  }

  /**
   * Simulate an approval workflow. In production, this would surface a UI action to the user,
   * send an email, or use an admin approval flow. For now, push a notification and auto-approve
   * (unless your config disables auto-approve).
   */
  private async requestApproval(serviceInfo: SubscriptionInfo, amount: string): Promise<boolean> {
    this.storeNotification({
      type: "approval_request",
      service: serviceInfo.name,
      amount,
      timestamp: Date.now(),
      status: "pending",
    });
    // For the stub we auto-approve based on config.
    return true;
  }

  /**
   * Store a high-severity alert notification (local only for now).
   */
  private sendAlert(title: string, details: any) {
    this.storeNotification({
      type: "security_alert",
      title,
      details,
      timestamp: Date.now(),
      severity: "high",
    });
  }

  /**
   * Load transaction history from localStorage (client-only).
   */
  private loadTransactionHistory() {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        this.transactionHistory = [];
        return;
      }
      const stored = window.localStorage.getItem("agent_transactions");
      this.transactionHistory = stored ? JSON.parse(stored) : [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Failed to load transaction history:", err);
      this.transactionHistory = [];
    }
  }

  private recordTransaction(transaction: TransactionRecord) {
    this.transactionHistory.push(transaction);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("agent_transactions", JSON.stringify(this.transactionHistory));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Failed to persist transaction:", err);
    }
  }

  private storeNotification(notification: any) {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      const notifications = JSON.parse(window.localStorage.getItem("agent_notifications") || "[]");
      notifications.unshift(notification);
      if (notifications.length > 100) notifications.length = 100;
      window.localStorage.setItem("agent_notifications", JSON.stringify(notifications));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Failed to store notification:", err);
    }
  }

  // Public getters
  getTransactionHistory(): TransactionRecord[] {
    return this.transactionHistory;
  }

  getNotifications(): any[] {
    try {
      if (typeof window === "undefined" || !window.localStorage) return [];
      return JSON.parse(window.localStorage.getItem("agent_notifications") || "[]");
    } catch (err) {
      return [];
    }
  }

  /**
   * Send reminder for a subscription payment (local notification).
   */
  async sendReminder(subscription: SubscriptionInfo) {
    if (!this.agentConfig.sendReminders) return;
    this.storeNotification({
      type: "payment_reminder",
      subscription: subscription.name,
      amount: subscription.cost,
      timestamp: Date.now(),
    });
  }

  /**
   * Utility: convert decimal-dollar string to integer token units (naive).
   * Assumes a token with `decimals` decimals (e.g. USDC: 6).
   */
  protected amountToTokenUnits(amount: string, decimals = 6): bigint {
    const parsed = parseFloat(amount || "0");
    if (isNaN(parsed) || parsed <= 0) return BigInt(0);
    const units = Math.round(parsed * Math.pow(10, decimals));
    return BigInt(units);
  }
}

export default AgentPaymentService;
