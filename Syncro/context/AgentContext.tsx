"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import useMakePaymentFn from "@/hooks/useMakePaymentFn";
import AgentPaymentService, {
  AgentConfig,
  AgentResult,
  SubscriptionInfo,
} from "@/lib/agent/AgentPaymentService";

/**
 * AgentContext
 *
 * Provides a single AgentPaymentService instance (client-side) bound to a makePayment function
 * produced by `useMakePaymentFn`. Consumers may call `agent.paySubscription(...)` or use the
 * `makePayment` function directly.
 *
 * Notes:
 * - The AgentPaymentService must NOT call React hooks. We construct it here in a React component
 *   and inject the hook-crafted `makePaymentFn`.
 * - This provider is client-only (`"use client"`). It relies on localStorage for transaction
 *   persistence inside the agent; server-side rendering won't initialize the agent.
 */

/* Context value shape */
type AgentContextValue = {
  agent: AgentPaymentService | null;
  makePayment: (endpoint: string, maxValue?: bigint) => Promise<any> | null;
};

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: Partial<AgentConfig>;
}) {
  // hook that builds the makePayment function using Privy's wrapFetchWithPayment
  const makePaymentFn = useMakePaymentFn();

  // Create agent only once per makePaymentFn (useMemo)
  const agent = useMemo(() => {
    if (!makePaymentFn) return null;
    try {
      return new AgentPaymentService(makePaymentFn, config || {});
    } catch (err) {
      // If something goes wrong constructing the agent, log and return null
      // eslint-disable-next-line no-console
      console.error("Failed to create AgentPaymentService:", err);
      return null;
    }
    // Intentionally include makePaymentFn and config in deps so agent recreates if these change.
  }, [makePaymentFn, JSON.stringify(config || {})]);

  const contextValue: AgentContextValue = useMemo(
    () => ({
      agent,
      makePayment: makePaymentFn ?? (() => null),
    }),
    [agent, makePaymentFn],
  );

  return <AgentContext.Provider value={contextValue}>{children}</AgentContext.Provider>;
}

/**
 * useAgent - convenience hook for consuming AgentContext
 *
 * Returns:
 *  { agent, makePayment }
 *
 * Throws if used outside AgentProvider.
 */
export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return ctx;
}

/**
 * Small helper to allow calling paySubscription directly from components without dealing
 * with the agent instance. It returns the AgentResult structure from the AgentPaymentService.
 */
export async function paySubscriptionViaAgent(
  agent: AgentPaymentService | null,
  subscription: SubscriptionInfo,
): Promise<AgentResult> {
  if (!agent) {
    return { success: false, reason: "no_agent", error: "Agent not initialized" };
  }
  try {
    return await agent.paySubscription(subscription);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("paySubscriptionViaAgent error:", err);
    return { success: false, error: err?.message ?? String(err) };
  }
}

export default AgentContext;
