/**
 * SYNCRO - subscriptionEndpoints
 *
 * A simple mapping from known subscription keys to x402-enabled endpoints and plan metadata.
 * Use this for resolving which endpoint to call when attempting an x402 payment flow.
 *
 * Notes:
 * - These endpoints are examples/placeholders. Replace them with the real service endpoints
 *   for production (or use a proxy route in your own backend that implements x402).
 * - The `monthlyPlan.endpoint` is the URL the client (or agent) will call to request the
 *   resource; if the resource requires payment it should respond with HTTP 402 and
 *   the payment details in a consistent format (e.g., header `x-payment-required` or JSON).
 */

export type SubscriptionPlan = {
  name: string;
  // Primary x402-enabled endpoint for this service (returns 402 when payment required)
  paymentEndpoint: string;
  // Optional per-plan endpoints (monthly, yearly, tiers)
  monthlyPlan?: {
    cost: string; // human-readable cost (e.g., "29.99")
    endpoint: string;
  };
  yearlyPlan?: {
    cost: string;
    endpoint: string;
  };
  // Optional: accepted token and network hint for convenience (not authoritative)
  token?: string; // token contract address (USDC) for the expected network
  chain?: string; // e.g., 'polygon', 'base', 'solana'
  // Optional merchant/recipient address for convenience/testing
  recipient?: string;
  // Any provider-specific metadata
  metadata?: Record<string, any>;
};

export const subscriptionEndpoints: {
  subscriptions: Record<string, SubscriptionPlan>;
  test?: SubscriptionPlan;
} = {
  subscriptions: {
    // Examples of third-party services (placeholders)
    midjourney: {
      name: "Midjourney",
      paymentEndpoint: "https://api.midjourney.com/v1/x402/subscribe",
      monthlyPlan: {
        cost: "30.00",
        endpoint: "https://api.midjourney.com/v1/x402/monthly",
      },
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // example: USDC (Ethereum mainnet)
      chain: "ethereum",
    },

    chatgpt: {
      name: "ChatGPT Pro",
      paymentEndpoint: "https://api.openai.com/v1/x402/subscribe",
      monthlyPlan: {
        cost: "20.00",
        endpoint: "https://api.openai.com/v1/x402/pro-monthly",
      },
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chain: "ethereum",
    },

    claude: {
      name: "Anthropic Claude",
      paymentEndpoint: "https://api.anthropic.com/v1/x402/subscription",
      monthlyPlan: {
        cost: "25.00",
        endpoint: "https://api.anthropic.com/v1/x402/monthly",
      },
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chain: "ethereum",
    },

    notion: {
      name: "Notion",
      paymentEndpoint: "https://api.notion.com/v1/x402/billing/pay",
      monthlyPlan: {
        cost: "8.00",
        endpoint: "https://api.notion.com/v1/x402/monthly",
      },
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chain: "ethereum",
    },

    figma: {
      name: "Figma",
      paymentEndpoint: "https://api.figma.com/v1/x402/subscription/renew",
      monthlyPlan: {
        cost: "12.00",
        endpoint: "https://api.figma.com/v1/x402/monthly",
      },
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chain: "ethereum",
    },

    netflix: {
      name: "Netflix",
      paymentEndpoint: "https://api.netflix.com/x402/subscription",
      monthlyPlan: {
        cost: "15.49",
        endpoint: "https://api.netflix.com/x402/premium",
      },
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chain: "ethereum",
    },

    // Add your own custom services here:
    custom: {
      name: "Custom Service",
      paymentEndpoint: "https://your-service.com/x402/subscribe",
      monthlyPlan: {
        cost: "9.99",
        endpoint: "https://your-service.com/x402/monthly",
      },
      token: "0x0000000000000000000000000000000000000000",
      chain: "polygon",
    },
  },

  // Local test service for development: points to a local mock x402 route
  test: {
    name: "Test Service (Local)",
    paymentEndpoint: "http://localhost:3000/api/x402/test",
    monthlyPlan: {
      cost: "0.01",
      endpoint: "http://localhost:3000/api/x402/test",
    },
    token: "0x0000000000000000000000000000000000000000",
    chain: "local",
    recipient: "0x0000000000000000000000000000000000000000",
    metadata: {
      note: "Local mock x402 endpoint for development and integration tests.",
    },
  },
};

export default subscriptionEndpoints;
