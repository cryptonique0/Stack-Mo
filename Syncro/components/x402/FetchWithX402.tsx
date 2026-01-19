"use client";

import React, { useState, useCallback } from "react";
import { useX402Fetch, useWallets, usePrivy } from "@privy-io/react-auth";

interface FetchWithX402Props {
  endpoint: string;
  label?: string;
  maxValue?: bigint;
}

export default function FetchWithX402({
  endpoint = "/api/x402/test",
  label = "Fetch Premium Content",
  maxValue,
}: FetchWithX402Props) {
  const { wallets } = useWallets();
  const { connectWallet } = usePrivy();
  const { wrapFetchWithPayment } = useX402Fetch();

  const [loading, setLoading] = useState(false);

  const getWalletAddress = useCallback(async () => {
    const existing = wallets?.[0]?.address;
    if (existing) return existing;

    try {
      await connectWallet?.();
      return wallets?.[0]?.address ?? null;
    } catch (err) {
      console.error("Wallet connection failed:", err);
      return null;
    }
  }, [wallets, connectWallet]);

  const handleClick = useCallback(async () => {
    const address = await getWalletAddress();
    if (!address) {
      console.warn("No wallet selected or connection failed.");
      return;
    }

    setLoading(true);

    try {
      const fetchWithPayment = wrapFetchWithPayment({
        walletAddress: address,
        fetch,
        ...(maxValue !== undefined ? { maxValue } : {}),
      });

      const response = await fetchWithPayment(endpoint, { method: "GET" });
      const result = await response.json();

      console.log("Payment result:", result);
      return result;
    } catch (err) {
      console.error("x402 fetch error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, maxValue, wrapFetchWithPayment, getWalletAddress]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#FFD166] text-[#1E2A35] hover:bg-[#FFD166]/90 disabled:opacity-60"
    >
      {loading ? "Processing..." : label}
    </button>
  );
}
