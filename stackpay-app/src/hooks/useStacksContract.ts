import { useCallback } from "react";
import { request } from "@stacks/connect";
import {
  cvToHex,
  fetchCallReadOnlyFunction,
  type ClarityValue,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { useWallet } from "../contexts/WalletContext";

interface CallContractParams {
  functionName: string;
  functionArgs?: ClarityValue[];
}

// Contract details
export const CONTRACT_ADDRESS = "ST1H7G0B7BBM991P2KA77R0XHDRNYCWH8H92TT4QN";
const ARCH_CONTRACT_NAME = "architecturee";
const PROC_CONTRACT_NAME = "processorrr";
const PROC_CONTRACT = `${CONTRACT_ADDRESS}.${PROC_CONTRACT_NAME}`;
const ARCH_CONTRACT = `${CONTRACT_ADDRESS}.${ARCH_CONTRACT_NAME}`;
const NETWORK = STACKS_TESTNET;

export function useStacksContract() {
  const { account } = useWallet();

  const callArchContract = useCallback(
    async ({ functionName, functionArgs }: CallContractParams) => {
      try {
        console.log("functionName", functionName);
        console.log("functionArgs", functionArgs);
        const response = await request("stx_callContract", {
          contract: ARCH_CONTRACT,
          functionName,
          functionArgs,
          network: "testnet",
          postConditionMode: "allow",
        });

        console.log("Transaction ID:", response);
        return response;
      } catch (error) {
        console.error("Contract call failed:", error);
        throw error;
      }
    },
    [],
  );

  const callProcContract = useCallback(
    async ({ functionName, functionArgs }: CallContractParams) => {
      try {
        console.log("functionName", functionName);
        console.log("functionArgs", functionArgs);
        const response = await request("stx_callContract", {
          contract: PROC_CONTRACT,
          functionName,
          functionArgs,
          network: "testnet",
          postConditionMode: "allow",
        });

        console.log("Transaction ID:", response);
        return response;
      } catch (error) {
        console.error("Contract call failed:", error);
        throw error;
      }
    },
    [],
  );

  const readArchContract = useCallback(
    async (
      functionName: string,
      functionArgs: ClarityValue[] = [],
      senderAddress = "ST1H7G0B7BBM991P2KA77R0XHDRNYCWH8H92TT4QN",
    ) => {
      try {
        const options = {
          contractAddress: CONTRACT_ADDRESS,
          contractName: ARCH_CONTRACT_NAME,
          functionName,
          functionArgs,
          network: NETWORK,
          senderAddress,
        };

        const result = await fetchCallReadOnlyFunction(options);
        // console.log("Contract call result:", result);
        return result;
      } catch (error) {
        console.error("Contract call failed:", error);
        throw error;
      }
    },
    [],
  );

  const readProcContract = useCallback(
    async (
      functionName: string,
      functionArgs: ClarityValue[] = [],
      senderAddress = "ST1H7G0B7BBM991P2KA77R0XHDRNYCWH8H92TT4QN",
    ) => {
      try {
        const options = {
          contractAddress: CONTRACT_ADDRESS,
          contractName: PROC_CONTRACT_NAME,
          functionName,
          functionArgs,
          network: NETWORK,
          senderAddress,
        };

        const result = await fetchCallReadOnlyFunction(options);
        console.log("Contract call result:", result);
        return result;
      } catch (error) {
        console.error("Contract call failed:", error);
        throw error;
      }
    },
    [],
  );

  return {
    callArchContract,
    callProcContract,
    readArchContract,
    readProcContract,
    isConnected: !!account,
    contractAddress: CONTRACT_ADDRESS,
    ARCH_CONTRACT_NAME,
    PROC_CONTRACT_NAME,
  };
}

// export async function readProcContract(
//   functionName: string,
//   functionArgs: ClarityValue[] = [],
//   senderAddress = "ST1H7G0B7BBM991P2KA77R0XHDRNYCWH8H92TT4QN",
// ) {
//   try {
//     const url = `https://api.testnet.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${PROC_CONTRACT_NAME}/${functionName}`;

//     // Convert Clarity values to hex before sending
//     const argsHex = functionArgs.map((arg) => cvToHex(arg));

//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-api-key": "61d3a35d919a96ef2efe51c3e3d40540", // attach API key if present
//       },
//       body: JSON.stringify({
//         sender: senderAddress,
//         arguments: argsHex, // must be hex strings like "0x010000..."
//       }),
//     });

//     if (!response.ok) {
//       const err = await response.text();
//       throw new Error(`Hiro API error: ${err}`);
//     }

//     const result = await response.json();
//     console.log("Contract call result:", result);
//     return result;
//   } catch (error) {
//     console.error("Contract call failed:", error);
//     throw error;
//   }
// }
