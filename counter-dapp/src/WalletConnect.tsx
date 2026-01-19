export default function WalletConnectUI({ universalConnector, session, setSession }: any) {


    // get the session from the universal connector
    const handleConnect = async () => {
        if (!universalConnector) {
            return
        }

        const { session: providerSession } = await universalConnector.connect()
        setSession(providerSession)
    };

    // disconnect the universal connector
    const handleDisconnect = async () => {
        if (!universalConnector) {
            return
        }
        await universalConnector.disconnect()
        setSession(null)
    };

    return (
        <div>
            {/* <button onClick={handleConnect}>Open WalletConnect modal</button>
            <button onClick={handleDisconnect}>Disconnect</button> */}

            <button onClick={handleConnect}>
                {session ? 'Re‑connect Wallet' : 'Connect Wallet'}
            </button>
            {session && (
                <button onClick={handleDisconnect}>
                    Disconnect Wallet
                </button>
            )}
            {session && <div>Connected to: {session.accounts.join(', ')}</div>}
        </div>
    );
}
