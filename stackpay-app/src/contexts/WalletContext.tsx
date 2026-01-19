import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { connect, disconnect } from "@stacks/connect";
// import axios from 'axios';

interface WalletContextType {
  account: string;
  isConnected: boolean;
  isLoading: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const storedAccount = localStorage.getItem("walletAccount");
        if (storedAccount) {
          setAccount(storedAccount);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkConnection();
  }, []);

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      const response = await connect();
      // Using index 2 for consistency with the provided code
      const stxAddress = response.addresses[2].address;

      setAccount(stxAddress);
      setIsConnected(true);
      localStorage.setItem("walletAccount", stxAddress);

      // Sync with backend
      // try {
      //     await axios.post('/api/wallet/connect', { address: stxAddress });
      // } catch (error) {
      //     console.error('Failed to sync wallet with backend:', error);
      // }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    try {
      disconnect();
      setAccount("");
      setIsConnected(false);
      localStorage.removeItem("walletAccount");

      // Sync with backend
      // try {
      //     axios.post('/api/wallet/disconnect', { address: account });
      // } catch (error) {
      //     console.error('Failed to sync wallet disconnect with backend:', error);
      // }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnected,
        isLoading,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
