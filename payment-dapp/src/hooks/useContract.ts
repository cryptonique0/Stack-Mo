import { useCallback } from 'react';
import { request } from '@stacks/connect';
import {
    fetchCallReadOnlyFunction,
    type ClarityValue,
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

interface CallContractParams {
    functionName: string;
    functionArgs?: ClarityValue[];
}

const archContract = 'ST3CMM6R79V7ZPATPXY4SKN5DKK7N4XRAS83GNV80.architecturee';
const archContractName = 'architecturee';
const procContract = 'ST3CMM6R79V7ZPATPXY4SKN5DKK7N4XRAS83GNV80.processorr2';
const contractAddress = 'ST3CMM6R79V7ZPATPXY4SKN5DKK7N4XRAS83GNV80';
const procContractName = 'processorr2';
const network = STACKS_TESTNET;

export function useContract() {
    const callArchContract = useCallback(
        async ({ functionName, functionArgs }: CallContractParams) => {
            try {
                console.log('functionName', functionName);
                console.log('functionArgs', functionArgs);
                const response = await request('stx_callContract', {
                    contract: archContract,
                    functionName,
                    functionArgs,
                    network: "testnet",
                    postConditionMode: 'allow'
                });

                console.log('Transaction ID:', response);
                return response;
            } catch (error) {
                console.error('Contract call failed:', error);
                throw error;
            }
        },
        []
    );

    const callProcContract = useCallback(
        async ({ functionName, functionArgs }: CallContractParams) => {
            try {
                console.log('functionName', functionName);
                console.log('functionArgs', functionArgs);
                const response = await request('stx_callContract', {
                    contract: procContract,
                    functionName,
                    functionArgs,
                    network: "testnet",
                    postConditionMode: 'allow'
                });

                console.log('Transaction ID:', response);
                return response;
            } catch (error) {
                console.error('Contract call failed:', error);
                throw error;
            }
        },
        []
    );

    const readArchContract = useCallback(
        async (
            functionName: string,
            functionArgs: ClarityValue[] = [],
            senderAddress = 'ST3CMM6R79V7ZPATPXY4SKN5DKK7N4XRAS83GNV80'
        ) => {
            try {
                const options = {
                    contractAddress,
                    contractName: archContractName,
                    functionName,
                    functionArgs,
                    network,
                    senderAddress,
                };

                const result = await fetchCallReadOnlyFunction(options);
                console.log('Contract call result:', result);
                return result;
            } catch (error) {
                console.error('Contract call failed:', error);
                throw error;
            }
        },
        []
    );

    const readProcContract = useCallback(
        async (
            functionName: string,
            functionArgs: ClarityValue[] = [],
            senderAddress = 'ST3CMM6R79V7ZPATPXY4SKN5DKK7N4XRAS83GNV80'
        ) => {
            try {
                const options = {
                    contractAddress,
                    contractName: procContractName,
                    functionName,
                    functionArgs,
                    network,
                    senderAddress,
                };

                const result = await fetchCallReadOnlyFunction(options);
                console.log('Contract call result:', result);
                return result;
            } catch (error) {
                console.error('Contract call failed:', error);
                throw error;
            }
        },
        []
    );

    return { callArchContract, callProcContract, readArchContract, readProcContract };
}