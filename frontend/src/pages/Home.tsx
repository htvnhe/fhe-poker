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
      } else {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16) }],
        });
      }
    } catch (error) {
      if ((error as { code?: number }).code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16),
                chainName: 'Sepolia',
                rpcUrls: ['https://eth-sepolia.public.blastapi.io'],
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    } finally {
      setSwitchingNetwork(false);
    }
  };

  // Not connected - show connect screen
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="fixed top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                {t('home.title')}
              </h1>
              <p className="text-slate-400">
                {t('home.subtitle')}
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <ul className="space-y-2 text-sm text-slate-300">
                <li>{t('home.features.privacy.description')}</li>
                <li>{t('home.features.fairness.description')}</li>
                <li>{t('home.features.decentralized.description')}</li>
              </ul>
            </div>

            <div className="space-y-3">
              {connectors
                .filter((connector) => {
                  const allowedIds = ['metaMask', 'io.metamask', 'okx-wallet'];
                  return allowedIds.includes(connector.id);
                })
                .map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {t('common.connect_wallet')} {connector.name}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Powered by Zama FHEVM
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <Lobby onSelectTable={(tableId) => setSelectedTableId(tableId)} />
      </GameProvider>
    );
  }

  // Connected - show main menu
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {t('home.welcome')}
            </h1>
            <p className="text-sm text-slate-400 font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>

          {wrongNetwork && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-sm text-red-300 mb-2">
                Wrong network. Please switch to Sepolia.
              </p>
              <button
                onClick={handleSwitchNetwork}
                disabled={switchingNetwork}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm"
              >
                {switchingNetwork ? 'Switching...' : 'Switch to Sepolia'}
              </button>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setShowLobby(true)}
              disabled={wrongNetwork}
              className={`w-full py-4 rounded-lg font-semibold transition-colors ${
                wrongNetwork
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {t('lobby.enter')}
            </button>

            <button
              onClick={() => disconnect()}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
            >
              {t('common.disconnect')}
            </button>
          </div>

          <div className="mt-6 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
            <p className="text-xs text-yellow-200">
              {t('home.demo_warning')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
