import { useState, useEffect } from "react"
import CounterApp from "./Counter"
import WalletConnectUI from "./WalletConnect"
import { getUniversalConnector } from './walletConfig' // previous config file
import { UniversalConnector } from '@reown/appkit-universal-connector'

function App() {

  const [universalConnector, setUniversalConnector] = useState<UniversalConnector>()
  const [session, setSession] = useState<any>()

  
  // Initialize the Universal Connector on component mount
  useEffect(() => {
    getUniversalConnector().then(setUniversalConnector)
  }, [])

  // Set the session state in case it changes
  useEffect(() => {
    setSession(universalConnector?.provider.session)
  }, [universalConnector?.provider.session])

  return (
    <>
      <WalletConnectUI universalConnector={universalConnector} session={session} setSession={setSession}/>
      <CounterApp />
    </>
  )
}

export default App
