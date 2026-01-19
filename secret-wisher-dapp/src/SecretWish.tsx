import { useState, useEffect } from 'react';
import { connect, disconnect, isConnected } from '@stacks/connect';
import { useContract } from './hooks/useContract';
import { Cl } from '@stacks/transactions';

type Wish = {
    id: number;
    text: string;
    author: string;
    timestamp: number;
    isGranted: boolean;
    grantedBy: string | null;
};

const SecretWisher = () => {
    const [account, setAccount] = useState('');
    const authenticated = isConnected();
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [newWish, setNewWish] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState('');

    const { callContract, readContract } = useContract();
    useEffect(() => {
        const fetchAllWishes = async () => {
            setIsLoading(true);
            try {
                const noOfWishes = await readContract("get-total-wishes");
                // @ts-expect-error value type
                const totalWishes = Number(await noOfWishes.value);
                console.log('totalWishes', totalWishes);

                // 2. Fetch all wishes
                const wishPromises = [];
                for (let i = 1; i <= totalWishes; i++) {
                    const wish = await readContract("get-wish-text", [Cl.uint(i)]);
                    // @ts-expect-error value type
                    wishPromises.push(await wish.value.value);
                }
                const wishResults = await Promise.all(wishPromises);
                console.log('wishResults', wishResults);

                // 3. Map results to your Wish type (adjust parsing as needed)
                const wishesArray = wishResults.map((result: string, idx: number) => ({
                    id: idx + 1,
                    text: result,
                    author: account,
                    timestamp: 0,
                    isGranted: false,
                    grantedBy: null,
                }));

                setWishes(wishesArray);
            } catch (error) {
                console.error('Failed to fetch wishes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllWishes();
    }, [readContract, account]);


    // // Mock data for initial wishes
    // const mockWishes: Wish[] = [
    //     {
    //         id: 1,
    //         text: "I wish for world peace and understanding among all people",
    //         author: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    //         timestamp: Date.now() - 3600000,
    //         isGranted: false,
    //         grantedBy: null
    //     },
    //     {
    //         id: 2,
    //         text: "I wish to find my true passion in life and pursue it fearlessly",
    //         author: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
    //         timestamp: Date.now() - 7200000,
    //         isGranted: true,
    //         grantedBy: "SP1K1A1PMGW2ZJCNF46NWZWHG8TS1D23EGH1KNK60"
    //     }
    // ];

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(''), 3000);
    };

    const connectWallet = async () => {
        setIsLoading(true);
        try {
            const response = await connect();
            // const stxAddress = response.addresses.find(addr => addr.addressType === 'stacks')?.address // for xverse
            // const stxAddress = response.addresses.find(addr => addr.symbol === 'STX')?.address; // for leather
            const stxAddress = response.addresses[2].address;
            console.log('Connected to wallet:', stxAddress);
            setAccount(stxAddress || '');
            showNotification('Wallet connected successfully!');
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            showNotification('Failed to connect wallet');
        } finally {
            setIsLoading(false);
        }
    };

    const disconnectWallet = () => {
        try {
            disconnect();
            showNotification('Wallet disconnected');
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    };

    // const fetchWishes = useCallback(async () => {
    //     setIsLoading(true);
    //     try {
    //         // Simulate API call
    //         await new Promise(resolve => setTimeout(resolve, 500));
    //         setWishes([...mockWishes]);
    //     } catch (error) {
    //         console.error('Failed to fetch wishes:', error);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // }, []);

    // useEffect(() => {
    //     fetchWishes();

    //     // Auto-refresh wishes every 30 seconds
    //     const interval = setInterval(fetchWishes, 30000);
    //     return () => clearInterval(interval);
    // }, [fetchWishes]);

    const submitWish = async () => {
        if (!newWish.trim() || !authenticated) return;

        setIsSubmitting(true);
        try {
            // Simulate blockchain transaction
            await new Promise(resolve => setTimeout(resolve, 2000));

            const wish: Wish = {
                id: Date.now(),
                text: newWish.trim(),
                author: account,
                timestamp: Date.now(),
                isGranted: false,
                grantedBy: null
            };

            const response = await callContract({
                functionName: 'make-wish',
                functionArgs: [
                    Cl.stringUtf8(wish.text),
                ],
            });

            console.log(`Transaction submitted: ${response}`);

            setWishes(prev => [wish, ...prev]);
            setNewWish('');
            showNotification('Wish submitted successfully! ✨');
        } catch (error) {
            console.error('Failed to submit wish:', error);
            showNotification('Failed to submit wish');
        } finally {
            setIsSubmitting(false);
        }
    };

    const grantWish = async (wishId: number) => {
        if (!authenticated) return;

        try {
            // Simulate blockchain transaction
            await new Promise(resolve => setTimeout(resolve, 1500));

            setWishes(prev => prev.map(wish =>
                wish.id === wishId
                    ? { ...wish, isGranted: true, grantedBy: account }
                    : wish
            ));

            showNotification('Wish granted! ✨');
        } catch (error) {
            console.error('Failed to grant wish:', error);
            showNotification('Failed to grant wish');
        }
    };

    const formatAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="min-h-screen w-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800">
            {/* Notification */}
            {notification && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-0">
                    {notification}
                </div>
            )}

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="text-center mt-5 mb-12">
                    <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        Secret Wisher
                    </h1>
                    <p className="text-xl text-white/90 mb-8">
                        Share your deepest wishes anonymously and help grant others' dreams
                    </p>

                    {!authenticated ? (
                        <button
                            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 
                         text-white font-semibold py-3 px-8 rounded-full shadow-lg 
                         transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
                            onClick={connectWallet}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Connecting...
                                </div>
                            ) : 'Connect Stacks Wallet'}
                        </button>
                    ) : (
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 inline-block">
                            <button
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600
                           text-white font-semibold py-3 px-6 rounded-full shadow-lg
                           transform hover:scale-105 transition-all duration-300"
                                onClick={disconnectWallet}
                            >
                                {account ? formatAddress(account) : 'Connected'} - Disconnect
                            </button>
                        </div>
                    )}
                </div>

                {/* Add Wish Section */}
                {authenticated && (
                    <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-8 mb-12 border border-white/20">
                        <h2 className="text-2xl font-bold text-white text-center mb-6">Make a Secret Wish</h2>
                        <textarea
                            className="w-full bg-white/10 border border-white/30 rounded-2xl p-4 text-white 
                         placeholder-white/60 resize-none focus:outline-none focus:ring-2 
                         focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                            placeholder="Share your deepest wish... it will be anonymous but your wallet address will be visible for transparency"
                            value={newWish}
                            onChange={(e) => setNewWish(e.target.value)}
                            maxLength={500}
                            rows={4}
                        />
                        <div className="flex justify-between items-center mt-4">
                            <span className="text-white/60 text-sm">{newWish.length}/500</span>
                            <button
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700
                           text-white font-semibold py-3 px-8 rounded-full shadow-lg
                           transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
                                onClick={submitWish}
                                disabled={!newWish.trim() || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Submitting...
                                    </div>
                                ) : 'Submit Secret Wish'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Connection Status Debug (Remove in production) */}
                <div className="text-center mb-4 text-white/70 text-sm">
                    Status: {authenticated ? `Connected (${formatAddress(account)})` : 'Not Connected'}
                </div>

                {/* Wishes List */}
                <div className="space-y-6">
                    {isLoading && wishes.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                            <p className="text-white text-lg">Loading wishes...</p>
                        </div>
                    ) : wishes.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-white/70 text-xl">No wishes yet. Be the first to make a secret wish!</p>
                        </div>
                    ) : (
                        wishes.map(wish => (
                            <div key={wish.id} className="bg-white/15 backdrop-blur-lg rounded-3xl p-8 border border-white/20 
                                          transform hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl
                                          relative overflow-hidden">
                                {/* Gradient border top */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400"></div>

                                <p className="text-white text-xl leading-relaxed mb-6 italic">
                                    "{wish.text}"
                                </p>

                                <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                                    <div className="flex items-center space-x-4">
                                        <span className="text-white/70 text-sm">
                                            By {formatAddress(wish.author)} • {formatTime(wish.timestamp)}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${wish.isGranted
                                            ? 'bg-green-500/20 text-green-300'
                                            : 'bg-yellow-500/20 text-yellow-300'
                                            }`}>
                                            {wish.isGranted ? '✨ Granted' : '⏳ Pending'}
                                        </span>
                                    </div>
                                </div>

                                {wish.isGranted && wish.grantedBy && (
                                    <p className="text-green-300 text-sm mb-4">
                                        Granted by {formatAddress(wish.grantedBy)} ✨
                                    </p>
                                )}

                                {!wish.isGranted && authenticated && wish.author !== account && (
                                    <button
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700
                               text-white font-semibold py-2 px-6 rounded-full shadow-lg
                               transform hover:scale-105 transition-all duration-300"
                                        onClick={() => grantWish(wish.id)}
                                    >
                                        Grant This Wish ✨
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecretWisher;