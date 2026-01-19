import type { AppKitNetwork } from '@reown/appkit/networks'
import type { InferredCaipNetwork } from '@reown/appkit-common'
import { UniversalConnector } from '@reown/appkit-universal-connector'

// Get projectId from https://dashboard.walletconnect.com
export const projectId = import.meta.env.VITE_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined. Please set your project ID from the WalletConnect Dashboard.')
}

// you can configure your own network
const stacksTestnet: InferredCaipNetwork = {
  id: 'stacks-testnet',
  chainNamespace: 'stacks' as const,
  caipNetworkId: 'stacks:1',
  name: 'Stacks Testnet',
  nativeCurrency: { name: 'STX', symbol: 'STX', decimals: 6 },
  rpcUrls: { default: { http: ['https://stacks-node-api.testnet.stacks.co'] } } // Example Stacks testnet RPC URL
}

export const networks = [stacksTestnet] as [AppKitNetwork, ...AppKitNetwork[]]

export async function getUniversalConnector() {
  const universalConnector = await UniversalConnector.init({
    projectId,
    metadata: {
      name: 'Universal Connector',
      description: 'Universal Connector',
      url: 'https://www.walletconnect.com',
      icons: ['https://www.walletconnect.com/icon.png']
    },
    networks: [
      {
        methods: ['stx_signMessage', 'stx_signTransaction', 'stx_getAccounts', 'stx_getAddresses', 'stx_callContract', 'stx_deployContract', 'sendTransfer', 'getAddresses'],
        chains: [stacksTestnet as InferredCaipNetwork],
        events: ['stx_chainChanged', 'stx_accountsChanged'],
        namespace: 'stacks'
      }
    ]
  })

  return universalConnector
}