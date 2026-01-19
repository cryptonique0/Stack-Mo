import { formatTokenAmount } from "./blockchain";

/**
 * Types of events that can trigger webhooks
 */
export type WebhookEventType =
  | "invoice.created"      // When a new invoice is created
  | "invoice.paid"         // When payment is received
  | "invoice.expired"      // When invoice expires
  | "transaction.pending"  // When transaction is seen on network
  | "transaction.confirmed" // When transaction has required confirmations
  | "transaction.failed"   // When transaction fails or is invalid
  | "webhook.test"        // Test event type

/**
 * Common properties for all webhook events
 */
interface BaseWebhookPayload {
  id: string;           // Unique webhook event ID
  event: WebhookEventType;
  timestamp: string;    // ISO datetime
  merchant_id: string;  // ID of the merchant receiving this webhook
  live: boolean;        // Whether this is a live or test event
}

/**
 * Payload for invoice-related webhook events
 */
interface InvoiceWebhookPayload extends BaseWebhookPayload {
  event: "invoice.created" | "invoice.paid" | "invoice.expired";
  data: {
    invoice_id: string;
    amount: string;         // Amount in sBTC
    amount_satoshis: string; // Amount in satoshis
    currency: string;      // sBTC or STX
    status: string;
    description: string;
    payment_address: string;
    expires_at: string;    // ISO datetime
    created_at: string;    // ISO datetime
    paid_at?: string;      // ISO datetime, only for paid events
    metadata?: string;     // Optional metadata provided during creation
  };
}

/**
 * Payload for transaction-related webhook events
 */
interface TransactionWebhookPayload extends BaseWebhookPayload {
  event: "transaction.pending" | "transaction.confirmed" | "transaction.failed";
  data: {
    invoice_id: string;
    transaction_hash: string;
    amount: string;         // Amount in sBTC
    amount_satoshis: string; // Amount in satoshis
    confirmations: number;
    required_confirmations: number;
    status: string;
    block_height?: number;  // Block number where tx was confirmed
    error?: string;        // Only present for failed transactions
  };
}

/**
 * Payload for test webhook events
 */
interface TestWebhookPayload extends BaseWebhookPayload {
  event: "webhook.test";
  data: {
    test: true;
    timestamp: string;
    message: string;
  };
}

/**
 * Union type of all possible webhook payloads
 */
export type WebhookPayload =
  | InvoiceWebhookPayload
  | TransactionWebhookPayload
  | TestWebhookPayload;

/**
 * Entry in webhook delivery logs
 */
export interface WebhookLog {
  id: string;
  merchant_id: string;
  webhook_url: string;
  event_type: WebhookEventType;
  payload: WebhookPayload;
  response_status: number;
  response_body: string;
  attempts: number;
  success: boolean;
  created_at: string;
  last_attempt_at: string;
}

/**
 * Creates a test webhook payload
 */
export function createTestWebhookPayload(merchantId: string): TestWebhookPayload {
  return {
    id: `whtest_${Date.now()}`,
    event: "webhook.test",
    timestamp: new Date().toISOString(),
    merchant_id: merchantId,
    live: false,
    data: {
      test: true,
      timestamp: new Date().toISOString(),
      message: "This is a test webhook from StackPay",
    },
  };
}

/**
 * Creates an invoice webhook payload
 */
export function createInvoiceWebhookPayload(
  event: "invoice.created" | "invoice.paid" | "invoice.expired",
  data: {
    invoice_id: string;
    amount: bigint;
    currency: string;
    status: string;
    description: string;
    payment_address: string;
    expires_at: Date;
    created_at: Date;
    paid_at?: Date;
    metadata?: string;
    merchant_id: string;
  }
): InvoiceWebhookPayload {
  return {
    id: `wh_${Date.now()}`,
    event,
    timestamp: new Date().toISOString(),
    merchant_id: data.merchant_id,
    live: true,
    data: {
      invoice_id: data.invoice_id,
      amount: formatTokenAmount(data.amount, data.currency),
      amount_satoshis: data.amount.toString(),
      currency: data.currency,
      status: data.status,
      description: data.description,
      payment_address: data.payment_address,
      expires_at: data.expires_at.toISOString(),
      created_at: data.created_at.toISOString(),
      paid_at: data.paid_at?.toISOString(),
      metadata: data.metadata,
    },
  };
}

/**
 * Creates a transaction webhook payload
 */
export function createTransactionWebhookPayload(
  event: "transaction.pending" | "transaction.confirmed" | "transaction.failed",
  data: {
    invoice_id: string;
    transaction_hash: string;
    amount: bigint;
    confirmations: number;
    required_confirmations: number;
    status: string;
    block_height?: number;
    error?: string;
    merchant_id: string;
  }
): TransactionWebhookPayload {
  return {
    id: `wh_${Date.now()}`,
    event,
    timestamp: new Date().toISOString(),
    merchant_id: data.merchant_id,
    live: true,
    data: {
      invoice_id: data.invoice_id,
      transaction_hash: data.transaction_hash,
      amount: formatTokenAmount(data.amount, "sBTC"),
      amount_satoshis: data.amount.toString(),
      confirmations: data.confirmations,
      required_confirmations: data.required_confirmations,
      status: data.status,
      block_height: data.block_height,
      error: data.error,
    },
  };
}

/**
 * Validates a webhook URL
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !!parsed.hostname;
  } catch {
    return false;
  }
}
