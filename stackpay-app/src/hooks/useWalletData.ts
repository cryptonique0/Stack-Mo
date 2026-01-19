import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useStacksContract } from "@/hooks/useStacksContract";
import { Cl, ClarityValue } from "@stacks/transactions";

interface WalletBalances {
  stxBalance: string;
  sbtcBalance: string;
  isLoading: boolean;
  error: string | null;
}

export function useWalletData(): WalletBalances {
  const { account, isConnected } = useWallet();
  const { readProcContract } = useStacksContract();
  const [balances, setBalances] = useState<WalletBalances>({
    stxBalance: "0",
    sbtcBalance: "0",
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !account) return;

      setBalances((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Call contract for STX balance
        const stxBalanceRes: ClarityValue = await readProcContract(
          "get-balance",
          [Cl.principal(account), Cl.stringAscii("STX")],
        );

        // Call contract for sBTC balance
        const sbtcBalanceRes: ClarityValue = await readProcContract(
          "get-balance",
          [Cl.principal(account), Cl.stringAscii("sBTC")],
        );

        // Helper to extract balance from (optional { amount: uint, ... })
        const unwrapBalance = (res: ClarityValue): string => {
          if (
            res.type === "some" &&
            res.value?.value?.amount?.value !== undefined
          ) {
            return res.value.value.amount.value.toString();
          }
          return "0";
        };

        const stxBalance = unwrapBalance(stxBalanceRes);
        const sbtcBalance = unwrapBalance(sbtcBalanceRes);

        setBalances({
          stxBalance,
          sbtcBalance,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching wallet balances:", error);
        setBalances((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch balances",
        }));
      }
    };

    fetchBalances();

    const intervalId = setInterval(fetchBalances, 30000); // refresh every 30s
    return () => clearInterval(intervalId);
  }, [account, isConnected, readProcContract]);

  return {
    stxBalance: formatTokenAmount(balances.stxBalance, "STX"),
    sbtcBalance: formatTokenAmount(balances.sbtcBalance, "sBTC"),
    isLoading: balances.isLoading,
    error: balances.error,
  };
}

function formatTokenAmount(
  amount: bigint | number | string,
  symbol: string,
): string {
  let decimals: number;

  switch (symbol.toLowerCase()) {
    case "stx":
      decimals = 1000000; // microstacks
      break;
    case "sbtc":
      decimals = 100000000; // satoshis
      break;
    default:
      decimals = 1; // fallback
  }

  const normalized = Number(amount) / decimals;

  return normalized.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

export function parseTokenAmount(
  amount: number | string,
  symbol: string,
): bigint {
  let decimals: number;

  switch (symbol.toLowerCase()) {
    case "stx":
      decimals = 1_000_000; // microstacks
      break;
    case "sbtc":
      decimals = 100_000_000; // satoshis
      break;
    default:
      decimals = 1;
  }

  return BigInt(Math.floor(Number(amount) * decimals));
}
