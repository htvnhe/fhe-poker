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

  // 检查网络
  useEffect(() => {
    if (isConnected && chainId !== SEPOLIA_CHAIN_ID) {
      setWrongNetwork(true);
    } else {
      setWrongNetwork(false);
    }
  }, [isConnected, chainId]);

  const handleSwitchNetwork = async () => {
    if (!window.ethereum) {
      alert('未检测到钱包');
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
          console.error('添加网络失败:', addError);
          alert('添加 Sepolia 网络失败，请手动在钱包中添加');
        }
      } else {
        console.error('切换网络失败:', error);
        alert('切换网络失败，请手动在钱包中切换到 Sepolia');
      }
    } finally {
      setSwitchingNetwork(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* 语言切换器 - 固定在右上角 */}
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
          <LanguageSwitcher />
        </div>

        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* 主卡片 */}
          <div className="glass-effect rounded-2xl shadow-2xl p-8 border-2 border-white/20 backdrop-blur-xl">
            {/* Logo和标题 */}
            <div className="text-center mb-8 space-y-4">
              {/* 扑克牌图标 */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gold-gradient shadow-lg mb-4 animate-float">
                <span className="text-4xl">🎴</span>
              </div>

              <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent mb-2 tracking-tight">
                {t('home.title')}
              </h1>
              <p className="text-white/80 text-lg font-medium">
                {t('home.subtitle')}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>{t('home.description')}</span>
              </div>
            </div>

            {/* 特性展示 */}
            <div className="space-y-3 mb-6">
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl p-4 backdrop-blur-sm">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <span>{t('home.features.privacy.title')}</span>
                </h3>
                <ul className="space-y-2 text-sm text-white/90">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">●</span>
                    <span>🔐 {t('home.features.privacy.description')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">●</span>
                    <span>⚖️ {t('home.features.fairness.description')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">●</span>
                    <span>🌐 {t('home.features.decentralized.description')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 连接按钮 */}
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
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 transform"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative flex items-center justify-center gap-3">
                    <span className="text-2xl">🦊</span>
                    <span>{t('common.connect_wallet')} {connector.name}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="mt-6 text-center">
              <p className="text-xs text-white/50 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                <span>请确保连接到 Sepolia 测试网</span>
              </p>
            </div>
          </div>

          {/* 底部装饰文字 */}
          <div className="mt-6 text-center text-white/40 text-sm">
            <p>Powered by Zama FHEVM</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedTableId !== null) {
    return (
      <GameProvider>
        <Game tableId={selectedTableId} onBack={() => setSelectedTableId(null)} />
      </GameProvider>
    );
  }

  if (showLobby) {
    return (
      <GameProvider>
        <Lobby onSelectTable={(tableId) => setSelectedTableId(tableId)} />
      </GameProvider>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 语言切换器 - 固定在右上角 */}
      <div style={{ position: 'fixed', top: '1.5rem', right: '2rem', zIndex: 9999 }}>
        <LanguageSwitcher />
      </div>

      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-effect rounded-2xl shadow-2xl p-8 border-2 border-white/20 backdrop-blur-xl">
          {/* 头部 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gold-gradient shadow-lg mb-4">
              <span className="text-3xl">👤</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              {t('home.welcome')}
            </h1>
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-sm text-white/90 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          </div>

          {/* 网络错误警告 */}
          {wrongNetwork && (
            <div className="mb-6 p-5 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-400/50 rounded-xl backdrop-blur-sm animate-pulse">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-200 mb-2">
                    错误的网络！
                  </p>
                  <p className="text-xs text-red-100/80 mb-3 leading-relaxed">
                    当前网络: Chain ID {chainId}
                    <br />
                    请切换到 Sepolia 测试网络 (Chain ID: {SEPOLIA_CHAIN_ID})
                  </p>
                  <button
                    onClick={handleSwitchNetwork}
                    disabled={switchingNetwork}
                    className={`w-full font-bold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm ${
                      switchingNetwork
                        ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    }`}
                  >
                    {switchingNetwork ? '⏳ 切换中...' : '🔄 切换到 Sepolia'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-4">
            <button
              onClick={() => setShowLobby(true)}
              disabled={wrongNetwork}
              className={`w-full group relative overflow-hidden font-bold py-5 px-6 rounded-xl transition-all duration-300 shadow-lg ${
                wrongNetwork
                  ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:shadow-2xl hover:scale-105'
              }`}
            >
              {!wrongNetwork && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              )}
              <span className="relative flex items-center justify-center gap-3">
                <span className="text-2xl">🎮</span>
                <span>{t('lobby.enter')}</span>
              </span>
            </button>

            <button
              onClick={() => disconnect()}
              className="w-full group relative overflow-hidden bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/40"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🚪</span>
                <span>{t('common.disconnect')}</span>
              </span>
            </button>
          </div>

          {/* 底部提示 */}
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-yellow-100/90 leading-relaxed">
                {t('home.demo_warning')}
              </p>
            </div>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="mt-6 text-center text-white/40 text-sm">
          <p>Powered by Zama FHEVM</p>
        </div>
      </div>
    </div>
  );
}
