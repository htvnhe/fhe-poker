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
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <span className="text-xl font-bold text-white">FHE Poker</span>
          </div>
          <LanguageSwitcher />
        </header>

        {/* Hero */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              {t('home.title')}
            </h1>
            <p className="text-lg text-blue-400 mb-2">
              {t('home.subtitle')}
            </p>
            <p className="text-slate-400 mb-8">
              Play Texas Hold'em with complete privacy using FHE encryption.
            </p>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-3xl mb-2">🔐</div>
                <h3 className="font-semibold text-white mb-1">Encrypted Cards</h3>
                <p className="text-slate-400 text-sm">Only you can see your cards</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-3xl mb-2">⛓️</div>
                <h3 className="font-semibold text-white mb-1">On-Chain</h3>
                <p className="text-slate-400 text-sm">Provably fair gameplay</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-3xl mb-2">🛡️</div>
                <h3 className="font-semibold text-white mb-1">Anti-Cheat</h3>
                <p className="text-slate-400 text-sm">No front-running possible</p>
              </div>
            </div>

            {/* Connect */}
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              {connectors
                .filter((connector) => ['metaMask', 'io.metamask', 'okx-wallet'].includes(connector.id))
                .map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  🦊 Connect {connector.name}
                </button>
              ))}
            </div>

            <p className="mt-6 text-slate-500 text-sm">
              Powered by Zama FHEVM on Sepolia
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Connected - show menu
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <span className="text-xl font-bold text-white">FHE Poker</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎰</div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {t('home.welcome')}
              </h1>
              <p className="text-slate-400">Ready to play?</p>
            </div>

            {/* Wrong Network */}
            {wrongNetwork && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
                <p className="text-red-400 font-medium mb-2">⚠️ Wrong Network</p>
                <p className="text-red-300 text-sm mb-3">Please switch to Sepolia</p>
                <button
                  onClick={handleSwitchNetwork}
                  disabled={switchingNetwork}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {switchingNetwork ? 'Switching...' : 'Switch to Sepolia'}
                </button>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowLobby(true)}
                disabled={wrongNetwork}
                className={`w-full py-4 rounded-lg font-bold text-lg ${
                  wrongNetwork
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                🎮 {t('lobby.enter')}
              </button>

              <button
                onClick={() => disconnect()}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg"
              >
                {t('common.disconnect')}
              </button>
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-amber-900/30 border border-amber-600/50 rounded-lg">
              <p className="text-amber-400 text-sm">
                💡 Testnet Demo - {t('home.demo_warning')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
