import { useState, useEffect } from "react";
import { connect, disconnect, isConnected } from "@stacks/connect";
import { useContract } from "./hooks/useContract";
// import { Cl } from "@stacks/transactions";

const CounterApp = () => {
  const authenticated = isConnected();
  const [account, setAccount] = useState("");
  const [counter, setCounter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState("");

  const { callContract, readContract } = useContract();

  /* -----------------------------
   * Helpers
   * ---------------------------- */
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  const formatAddress = (address: string) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  /* -----------------------------
   * Wallet
   * ---------------------------- */
  const connectWallet = async () => {
    setIsLoading(true);
    try {
      const response = await connect();
      const stxAddress = response.addresses[2].address;
      setAccount(stxAddress);
      showNotification("Wallet connected");
    } catch (err) {
      console.error(err);
      showNotification("Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    showNotification("Wallet disconnected");
    setAccount("");
  };

  /* -----------------------------
   * Read Counter
   * ---------------------------- */
  const fetchCounter = async () => {
    try {
      const result = await readContract("get-counter");
      // @ts-expect-error clarity response
      setCounter(Number(result.value));
    } catch (err) {
      console.error("Failed to fetch counter:", err);
    }
  };

  useEffect(() => {
    fetchCounter();
  }, [readContract]);

  /* -----------------------------
   * Write Actions
   * ---------------------------- */
  const increment = async () => {
    if (!authenticated) return;
    setIsSubmitting(true);
    try {
      await callContract({ functionName: "increment" });
      showNotification("Counter incremented");
      fetchCounter();
    } catch (err) {
      console.error(err);
      showNotification("Increment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const decrement = async () => {
    if (!authenticated) return;
    setIsSubmitting(true);
    try {
      await callContract({ functionName: "decrement" });
      showNotification("Counter decremented");
      fetchCounter();
    } catch (err) {
      console.error(err);
      showNotification("Decrement failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCounter = async () => {
    if (!authenticated) return;
    setIsSubmitting(true);
    try {
      await callContract({ functionName: "reset-counter" });
      showNotification("Counter reset");
      fetchCounter();
    } catch (err) {
      console.error(err);
      showNotification("Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -----------------------------
   * UI
   * ---------------------------- */
  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-indigo-700 to-purple-800">
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {notification}
        </div>
      )}

      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          On-Chain Counter
        </h1>

        {!authenticated ? (
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow-lg"
          >
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <div className="mb-8">
            <button
              onClick={disconnectWallet}
              className="bg-white/10 text-white px-6 py-2 rounded-full"
            >
              {formatAddress(account)} · Disconnect
            </button>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-10 border border-white/20">
          <p className="text-white/80 mb-2">Current Counter</p>
          <div className="text-7xl font-bold text-white mb-8">
            {counter ?? "--"}
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={increment}
              disabled={!authenticated || isSubmitting}
              className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold"
            >
              Increment
            </button>

            <button
              onClick={decrement}
              disabled={!authenticated || isSubmitting}
              className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-semibold"
            >
              Decrement
            </button>

            <button
              onClick={resetCounter}
              disabled={!authenticated || isSubmitting}
              className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold"
            >
              Reset Counter
            </button>

            <button
              onClick={fetchCounter}
              className="bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl font-semibold"
            >
              Get Counter
            </button>
          </div>
        </div>

        <p className="text-white/60 mt-6 text-sm">
          Status: {authenticated ? "Connected" : "Not connected"}
        </p>
      </div>
    </div>
  );
};

export default CounterApp;
