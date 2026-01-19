import { NextRequest, NextResponse } from "next/server";

/**
 * Mock x402 test route
 *
 * How it behaves:
 * - If the request does NOT include an X-PAYMENT header, it returns 402 Payment Required
 *   with a `x-payment-required` header (JSON encoded) that contains the payment parameters.
 * - If the request includes an X-PAYMENT header, the route logs it (server-side) and
 *   returns a successful JSON payload representing premium content.
 *
 * This is for local development and integration testing of the client-side x402 flow.
 * Replace token/recipient/amount values with values appropriate to your test environment.
 */

export async function GET(request: NextRequest) {
  // Accept both lowercase and uppercase header names for convenience
  const paymentHeader =
    request.headers.get("x-payment") || request.headers.get("X-PAYMENT") || null;

  // If no payment header present, return a 402 with payment instructions
  if (!paymentHeader) {
    const paymentRequirements = {
      // amount in token smallest units (example: 10000 = 0.01 USDC when USDC has 6 decimals)
      amount: "10000",
      // Example USDC address (change to the token address for your testnet/network)
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      // Recipient / merchant address (placeholder)
      recipient: "0x0000000000000000000000000000000000000000",
      // Helpful hint for the client about the intended network
      chain: "polygon",
      // Expiration timestamp (ms since epoch)
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    return new NextResponse(
      JSON.stringify({
        error: "Payment required",
        message: "This resource requires payment via x402. Include an X-PAYMENT header and retry.",
      }),
      {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          // The client can read this header to build the authorization payload
          "x-payment-required": JSON.stringify(paymentRequirements),
        },
      }
    );
  }

  // If we get here, the client included an X-PAYMENT header.
  // In production you'd validate the contents: verify the EIP-712 signature,
  // check the authorization matches the required amount/recipient/expiry, and
  // confirm settlement via a facilitator or onchain transaction.
  // For local testing we simply log and accept any provided header.
  // eslint-disable-next-line no-console
  console.log("[x402 test] Received X-PAYMENT header:", paymentHeader);

  // Return premium content (mock)
  return NextResponse.json({
    success: true,
    message: "Payment accepted. Here is your premium content.",
    data: {
      subscription: "Test Service",
      status: "active",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
}
