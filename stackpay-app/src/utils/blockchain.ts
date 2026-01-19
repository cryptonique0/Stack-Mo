import {
  stringUtf8CV,
  stringAsciiCV,
  noneCV,
  someCV,
  bufferCV,
  principalCV,
  uintCV,
  ClarityValue,
  contractPrincipalCVFromStandard,
  StandardPrincipalCV,
  PrincipalCV,
  contractPrincipalCV,
} from "@stacks/transactions";

// Types
export interface RegisterMerchantParams {
  webhook?: string;
  // apiKeyHash: Uint8Array<ArrayBufferLike>;
}

export interface CreateInvoiceParams {
  recipient: string;
  amount: number;
  currency: string;
  expiresInBlocks: number;
  description: string;
  metadata: string;
  webhook?: string;
}

export interface WithdrawParams {
  currency: string;
  amount: number;
  tokenPrincipal: string;
  tokenContractName: string;
}

export interface Invoice {
  id: string;
  amount: bigint;
  email: string;
  description: string;
  currency: string;
  createdAt: number;
  expiresAt: number;
  merchant: string;
  metadata: string;
  recipient: string;
  status: "pending" | "paid" | "expired";
  paidAt: number;
  webhookUrl: string;
  paymentAddress: string;
  paymentLink: string;
}

// Function to create API key hash (simplified - in production use proper hashing)
export const createApiKeyHash = (apiKey: string): Uint8Array => {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hash = new Uint8Array(32);

  // Simple hash - in production, use crypto.subtle.digest('SHA-256', data)
  for (let i = 0; i < data.length && i < 32; i++) {
    hash[i] = data[i];
  }

  return hash;
};

// Contract function argument preparation
export const prepareRegisterMerchantArgs = (
  params: RegisterMerchantParams,
): ClarityValue[] => {
  return [
    params.webhook ? someCV(stringAsciiCV(params.webhook)) : noneCV(),
    // bufferCV(params.apiKeyHash),
  ];
};

export const prepareCreateInvoiceArgs = (
  params: CreateInvoiceParams,
): ClarityValue[] => {
  return [
    principalCV(params.recipient),
    uintCV(params.amount),
    stringAsciiCV(params.currency),
    uintCV(params.expiresInBlocks),
    stringUtf8CV(params.description),
    stringUtf8CV(params.metadata),
    params.webhook ? someCV(stringAsciiCV(params.webhook)) : noneCV(),
  ];
};

export const prepareSetProcessorArgs = (
  processorAddress: string,
): ClarityValue[] => {
  return [principalCV(processorAddress)];
};

export const prepareSetPlatformFeeRecipientArgs = (
  recipientAddress: string,
): ClarityValue[] => {
  return [principalCV(recipientAddress)];
};

export const withdrawFunds = (params: WithdrawParams): ClarityValue[] => {
  return [
    uintCV(Math.floor(params.amount * 100000000)), // amount in satoshis
    // uintCV(params.amount),
    stringAsciiCV(params.currency),
    contractPrincipalCV(params.tokenPrincipal, params.tokenContractName),
  ];
};

// Response handling
export interface ContractResponse {
  txid: string;
}

export const handleContractResponse = (response: any): ContractResponse => {
  if (!response?.txid) {
    throw new Error("No transaction ID returned from contract call");
  }
  return {
    txid: response.txid,
  };
};

// Error handling
export const handleContractError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
};

// Transaction status
export const getTxStatus = async (txId: string): Promise<string> => {
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/extended/v1/tx/${txId}`,
    );
    const data = await response.json();
    return data.tx_status;
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    throw error;
  }
};

// Token formatting utilities
export function formatTokenAmount(
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

// Constants for contract calls
export const DEFAULT_EXPIRES_IN_BLOCKS = 144; // ~24 hours
export const DEFAULT_CURRENCY = "sBTC";
