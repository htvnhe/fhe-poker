import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lobby } from './Lobby';
import { Game } from './Game';
import { GameProvider } from '../store/gameStore.tsx';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

const SEPOLIA_CHAIN_ID = 11155111;

export function Home() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showLobby, setShowLobby] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  useEffect(() => {
    if (isConnected && chainId !== SEPOLIA_CHAIN_ID) {
      setWrongNetwork(true);
    } else {
      setWrongNetwork(false);
    }
  }, [isConnected, chainId]);

  const handleSwitchNetwork = async () => {
    if (!window.ethereum) {
      alert('Wallet not detected');
      return;
    }
    setSwitchingNetwork(true);
    try {
      if (switchChain) {
        await switchChain({ chainId: SEPOLIA_CHAIN_ID });
      }
    } catch (error) {
      console.error('Failed to switch:', error);
    } finally {
      setSwitchingNetwork(false);
    }
  };

  // In game
  if (selectedTableId !== null) {
    return (
      <GameProvider>
        <Game tableId={selectedTableId} onBack={() => setSelectedTableId(null)} />
      </GameProvider>
    );
  }

  // In lobby
  if (showLobby) {
    return (
      <GameProvider>
        <Lobby onSelectTable={(tableId) => setSelectedTableId(tableId)} onBack={() => setShowLobby(false)} />
      </GameProvider>
    );
  }

  // Not connected - show landing page
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900">
        {/* Header */}
        <header className="flex justify-between items-center p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl">
              🃏
            </div>
            <span className="text-xl font-bold text-white">FHE Poker</span>
          </div>
          <LanguageSwitcher />
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('home.title')}
            </h1>
            <p className="text-xl md:text-2xl text-emerald-300 mb-4">
              {t('home.subtitle')}
            </p>
            <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
              Play Texas Hold'em with complete privacy. Your cards are encrypted on-chain using Fully Homomorphic Encryption.
            </p>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700 hover:border-emerald-600 transition-colors">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-lg font-semibold text-white mb-2">Encrypted Cards</h3>
                <p className="text-gray-400 text-sm">Your hole cards are encrypted using FHE. Only you can see them.</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700 hover:border-emerald-600 transition-colors">
                <div className="text-4xl mb-4">⛓️</div>
                <h3 className="text-lg font-semibold text-white mb-2">Fully On-Chain</h3>
                <p className="text-gray-400 text-sm">All game logic runs on smart contracts. Provably fair.</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700 hover:border-emerald-600 transition-colors">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-lg font-semibold text-white mb-2">Anti-Cheat</h3>
                <p className="text-gray-400 text-sm">Async decryption ensures fair play. No front-running.</p>
              </div>
            </div>

            {/* Connect Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {connectors
                .filter((connector) => ['metaMask', 'io.metamask', 'okx-wallet'].includes(connector.id))
                .map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all hover:scale-105 shadow-lg shadow-emerald-600/20"
                >
                  <span>🦊</span>
                  Connect {connector.name}
                </button>
              ))}
            </div>

            <p className="mt-8 text-gray-500 text-sm">
              Powered by <span className="text-emerald-400">Zama FHEVM</span> on Sepolia Testnet
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Connected - show main menu
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl">
            🃏
          </div>
          <span className="text-xl font-bold text-white">FHE Poker</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-lg mx-auto">
          {/* Welcome Card */}
          <div className="bg-gray-800/70 backdrop-blur rounded-3xl p-8 border border-gray-700 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
                🎰
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {t('home.welcome')}
              </h1>
              <p className="text-gray-400">Ready to play some poker?</p>
            </div>

            {/* Wrong Network Warning */}
            {wrongNetwork && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-red-400 font-medium">Wrong Network</p>
                    <p className="text-red-400/70 text-sm">Please switch to Sepolia testnet</p>
                  </div>
                </div>
                <button
                  onClick={handleSwitchNetwork}
                  disabled={switchingNetwork}
                  className="w-full bg-red-500 hover:bg-red-400 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {switchingNetwork ? 'Switching...' : 'Switch to Sepolia'}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => setShowLobby(true)}
                disabled={wrongNetwork}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  wrongNetwork
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-600/30 hover:scale-[1.02]'
                }`}
              >
                🎮 {t('lobby.enter')}
              </button>

              <button
                onClick={() => disconnect()}
                className="w-full bg-gray-700/50 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-colors border border-gray-600"
              >
                {t('common.disconnect')}
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="text-yellow-400 font-medium text-sm">Testnet Demo</p>
                  <p className="text-yellow-400/70 text-xs mt-1">{t('home.demo_warning')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
