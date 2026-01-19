"use client";

import { useCallback } from "react";
import { useX402Fetch, useWallets } from "@privy-io/react-auth";

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

/**
 * useMakePaymentFn
 *
 * Returns a stable `makePayment` function that can be injected into non-React classes
 * (for example, an AgentPaymentService). The function uses Privy's `wrapFetchWithPayment`
 * to automatically handle x402 402 responses, prompt the user for an authorization signature,
 * attach the X-PAYMENT header, and retry the request.
 *
 * Signature:
 *   const makePayment = useMakePaymentFn();
 *   await makePayment(endpoint, maxValue?);
 *
 * - endpoint: the x402-enabled resource URL to call (GET by default)
 * - maxValue: optional BigInt max authorization value (in token smallest unit, e.g. USDC with 6 decimals)
 *
 * The hook intentionally does not perform UI concerns (toasts, modals); it only returns a structured result.
 */
export default function useMakePaymentFn() {
  const { wrapFetchWithPayment } = useX402Fetch();
  const { wallets } = useWallets();

  const makePayment = useCallback(
    async (endpoint: string, maxValue?: bigint): Promise<MakePaymentResult> => {
      if (!endpoint) {
        return { success: false, error: "endpoint_required" };
      }

      // Use the first connected wallet if available; omit walletAddress to let the hook pick default
      const walletAddress = wallets?.[0]?.address;

      try {
        const fetchWithPayment = wrapFetchWithPayment({
          ...(walletAddress ? { walletAddress } : {}),
          fetch,
          ...(maxValue !== undefined ? { maxValue } : {}),
        });

        const response = await fetchWithPayment(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response) {
          return { success: false, error: "no_response_from_fetch", status: undefined };
        }

        // If server responded with a non-OK status after the payment flow, return failure
        if (!response.ok) {
          // Try to extract any body for debugging
          let bodyText: string | undefined;
          try {
            bodyText = await response.text();
          } catch (e) {
            bodyText = undefined;
          }
          return {
            success: false,
            status: response.status,
            error: `non_ok_response${bodyText ? `: ${bodyText}` : ""}`,
          };
        }

        // Parse JSON when appropriate, otherwise return text
        const contentType = response.headers.get("content-type") ?? "";
        let data: any = undefined;
        try {
          if (contentType.includes("application/json")) {
            data = await response.json();
          } else {
            data = await response.text();
          }
        } catch (err) {
          // parsing failed, but the request succeeded — return empty data and log
          // eslint-disable-next-line no-console
          console.warn("makePayment: failed to parse response body", err);
          data = undefined;
        }

        // Optionally extract X-PAYMENT or similar headers set by facilitator/server for audit
        const paymentHeader = response.headers.get("x-payment") ?? response.headers.get("X-PAYMENT") ?? undefined;

        return {
          success: true,
          status: response.status,
          data,
          paymentHeader,
        };
      } catch (err: any) {
        // Do not surface UI changes here; provide structured error for caller
        const message = err?.message ?? String(err);
        // eslint-disable-next-line no-console
        console.error("useMakePaymentFn.makePayment error:", err);
        return { success: false, error: message };
      }
    },
    [wrapFetchWithPayment, wallets],
  );

  return makePayment;
}
