/**
 * 游戏页面 - 重新设计版本
 * 职责：显示游戏状态，处理用户操作
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { contractService } from '../../shared/utils/ProtocolClient';
import { useCipher } from '../cipher/useCipher';
import { useSessionStore } from '../../providers/SessionStore';
import { CIPHER_TABLE_ADDRESS } from '../../config/protocol';
import { LocaleSwitch } from '../../shared/ui/LocaleSwitch';

// 添加脉冲动画样式
const pulseAnimation = `
@keyframes pulse {
  0% { box-shadow: 0 0 0 0px rgba(46, 139, 87, 0.5); }
  100% { box-shadow: 0 0 0 10px rgba(46, 139, 87, 0); }
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseAnimation;
  document.head.appendChild(style);
}

interface GameProps {
  tableId: number;
  onBack: () => void;
}

// 卡牌花色和点数
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// 扑克牌组件 - 支持不同尺寸和未知牌
function PokerCard({ card, isHidden = false, size = 'normal', unknown = false }: { card?: number | null; isHidden?: boolean; size?: 'normal' | 'large'; unknown?: boolean }) {
  // 根据尺寸设置不同的样式 - 参考 demo.html 使用 80px x 112px
  const sizeStyle = size === 'large'
    ? { width: '6rem', height: '8.4rem' }    // 大尺寸：96px x 134px
    : { width: '5rem', height: '7rem' };     // 普通尺寸：80px x 112px

  const textSizes = size === 'large'
    ? { corner: 'text-sm', suit: 'text-xl', center: 'text-5xl', back: 'text-4xl' }
    : { corner: 'text-[0.5rem]', suit: 'text-xs', center: 'text-3xl', back: 'text-3xl' };

  // 未知牌（公共牌未翻开）- 严格参考 demo.html 的设计
  if (unknown) {
    return (
      <div
        style={{
          ...sizeStyle,
          background: 'white',
          boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
          borderRadius: '8px'
        }}
        className="border border-white/15 flex items-center justify-center opacity-30"
      >
        <span className="text-black font-bold text-3xl">?</span>
      </div>
    );
  }

  // 牌背（玩家手牌未翻开）
  if (isHidden || card === null || card === undefined) {
    return (
      <div
        style={{
          ...sizeStyle,
          background: 'white',
          boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
          borderRadius: '8px'
        }}
        className="relative border border-white/15 transform hover:scale-105 transition-transform"
      >
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.1)_3px,rgba(0,0,0,0.1)_6px)]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${textSizes.back} text-gray-400 opacity-50`}>🂠</div>
        </div>
      </div>
    );
  }

  const numIndex = typeof card === 'bigint' ? Number(card) : Number(card || 0);
  // 卡牌索引现在是 1-52，转换为 0-51
  const cardIndex = numIndex - 1;
  const suit = SUITS[Math.floor(cardIndex / 13)];
  const rank = RANKS[cardIndex % 13];
  // 红心和方片是红色，黑桃和梅花是黑色
  const isRed = suit === '♥' || suit === '♦';
  const textColor = isRed ? '#dc2626' : '#1f2937';

  // 简化设计：只在中间显示点数和花色 - 严格参考 demo.html
  return (
    <div
      style={{
        ...sizeStyle,
        background: 'white',
        boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}
      className="flex flex-col items-center justify-center"
    >
      <div className="text-lg font-bold leading-tight" style={{ color: textColor }}>{rank}</div>
      <div className="text-2xl leading-tight" style={{ color: textColor }}>{suit}</div>
    </div>
  );
}

export function TableView({ tableId, onBack }: GameProps) {
  const { t } = useTranslation();
  const { address } = useAccount();
  const fhevm = useCipher();
  const { state, setTableInfo, setPlayerCards, setCommunityCards, setLoading, setError } = useSessionStore();

  const [isLeavingGame, setIsLeavingGame] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [decryptedCards, setDecryptedCards] = useState<{ card1: number | null; card2: number | null }>({
    card1: null,
    card2: null,
  });
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [pendingDecryption, setPendingDecryption] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{ winnerIndex: number; winnerAddress: string } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasRevealedCards, setHasRevealedCards] = useState(false);
  const [previousGameState, setPreviousGameState] = useState<number | null>(null);
  const [playersInfo, setPlayersInfo] = useState<{
    players: string[];
    playerBets: bigint[];
    playerFolded: boolean[];
    currentPlayerIndex: number;
    pot: bigint;
    dealerIndex: number;
  } | null>(null);

  // 加载游戏信息 - 使用 useCallback 以便在其他地方调用
  const loadGameInfo = useCallback(async (showLoading = false) => {
      try {
        // 只在首次加载或明确要求时显示 loading
        if (showLoading) {
          setLoading(true);
        }

        // 确保合约服务已初始化
        await contractService.initialize();

        // 获取当前玩家地址
        const playerAddress = await contractService.getPlayerAddress();

        // 检查玩家是否在游戏中
        try {
          const playerTableId = await contractService.getPlayerTable(playerAddress);
          const expectedTableId = tableId + 1; // 合约中存储的是 tableId + 1

          if (playerTableId === 0) {
            // 前3次尝试时，不立即返回，可能是网络延迟
            if (loadAttempts < 3) {
              setLoadAttempts(loadAttempts + 1);
            } else {
              setError('玩家未加入游戏桌。请返回大厅重新加入。');
              setLoading(false);
              return;
            }
          } else if (playerTableId !== expectedTableId) {
            const actualTableId = playerTableId - 1;
            setError(`玩家在桌子 ${actualTableId} 中，不是当前桌子 ${tableId}`);
            setLoading(false);
            return;
          } else {
            setLoadAttempts(0); // 重置计数器
          }
        } catch {
          // 继续加载，可能是网络问题
        }

        // 加载游戏桌信息
        const tableInfo = await contractService.getTableInfo(tableId);
        setTableInfo(tableInfo);

        // 🔍 调试日志：打印游戏状态和当前玩家
        console.log('📊 游戏状态更新:', {
          gameState: Number(tableInfo[0]),
          playerCount: Number(tableInfo[1]),
          activePlayers: Number(tableInfo[2]),
          currentPlayerIndex: Number(tableInfo[3]),
          dealerIndex: Number(tableInfo[4]),
          timestamp: new Date().toISOString()
        });

        // 加载游戏桌完整信息（包括玩家和奖池）
        try {
          const playersData = await contractService.getTableInfoWithPlayers(tableId);
          setPlayersInfo(playersData);
        } catch (err) {
          console.error('❌ 无法加载玩家信息:', err);
        }

        // 获取当前玩家的座位索引
        try {
          const playerIndex = await contractService.getPlayerIndex(tableId, playerAddress);
          setMyPlayerIndex(playerIndex);

          // 🔍 调试日志：打印玩家索引和轮次判断
          const currentPlayerIndex = Number(tableInfo[3]);
          const isMyTurn = playerIndex === currentPlayerIndex;
          console.log('👤 玩家轮次检查:', {
            myPlayerIndex: playerIndex,
            currentPlayerIndex: currentPlayerIndex,
            isMyTurn: isMyTurn,
            myAddress: playerAddress
          });
        } catch (err) {
          console.error('❌ 无法获取玩家座位索引:', err);
          setError('无法获取玩家座位信息，请刷新页面重试');
        }

        // 加载玩家手牌(加密的 handle)
        try {
          const cards = await contractService.getPlayerCards(tableId);
          setPlayerCards(cards);

          // 检查是否有新的手牌需要解密
          // 如果手牌 handle 存在，且当前没有解密值或解密值为空，则标记需要解密
          const hasNewCards = cards.card1 && cards.card2;
          const needsDecryption = decryptedCards.card1 === null || decryptedCards.card2 === null;

          if (hasNewCards && needsDecryption) {
            setPendingDecryption(true);
          }
        } catch (err) {
          console.error('❌ 无法读取手牌:', err);
          // 不中断加载，继续加载其他信息
        }

        // 加载公共牌
        const communityCards = await contractService.getCommunityCards(tableId);
        setCommunityCards(communityCards);

        // 如果游戏已结束,加载获胜者信息
        const gameState = tableInfo ? Number(tableInfo[0]) : 0;
        if (gameState === 6) {
          try {
            const winner = await contractService.getWinner(tableId);
            setWinnerInfo(winner);
          } catch {
            // 忽略获胜者信息加载失败
          }
        }

        // 如果在 Showdown 阶段，检查玩家是否已经公开手牌
        if (gameState === 5 && myPlayerIndex !== null) {
          try {
            const revealed = await contractService.hasPlayerRevealedCards(tableId, myPlayerIndex);
            setHasRevealedCards(revealed);
          } catch (err) {
            console.warn('⚠️ 无法检查手牌公开状态:', err);
          }
        }

        setError(null);
      } catch (err) {
        console.error('❌ 加载游戏信息失败:', err);
        setError((err as Error).message);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
  }, [tableId, loadAttempts, decryptedCards, myPlayerIndex, setLoading, setError, setTableInfo, setPlayerCards, setCommunityCards]);

  // 定时轮询游戏信息
  useEffect(() => {
    // 首次加载显示 loading
    if (isInitialLoad) {
      loadGameInfo(true);
      setIsInitialLoad(false);
    } else {
      loadGameInfo(false);
    }

    // 轮询时不显示 loading
    const interval = setInterval(() => loadGameInfo(false), 1000);
    return () => clearInterval(interval);
  }, [loadGameInfo, isInitialLoad]);

  // 当 FHEVM 初始化完成且有待解密的手牌时，执行解密
  useEffect(() => {
    const unsealCards = async () => {
      // 如果已经解密成功，不再重复解密
      if (decryptedCards.card1 !== null && decryptedCards.card2 !== null) {
        return;
      }

      if (!pendingDecryption) {
        return;
      }

      if (!fhevm.isReady) {
        return;
      }

      if (!address) {
        return;
      }

      if (!state.playerCards || !state.playerCards.card1 || !state.playerCards.card2) {
        return;
      }

      if (isDecrypting) {
        return;
      }

      setIsDecrypting(true);
      setPendingDecryption(false);

      try {
        const signer = await contractService.getSigner();

        // 批量解密两张牌,只需要签名一次!
        const [card1Value, card2Value] = await fhevm.unsealCards(
          [state.playerCards.card1, state.playerCards.card2],
          CIPHER_TABLE_ADDRESS,
          address,
          signer
        );

        setDecryptedCards({ card1: card1Value, card2: card2Value });
      } catch (decryptErr) {
        console.error('❌ 解密手牌失败:', decryptErr);
        // 解密失败后，允许重试
        setPendingDecryption(true);
      } finally {
        setIsDecrypting(false);
      }
    };

    unsealCards();
  }, [fhevm, fhevm.isReady, pendingDecryption, address, state.playerCards, isDecrypting, decryptedCards]);

  // 监听游戏状态变化，当游戏开始时重置解密状态
  useEffect(() => {
    const currentGameState = state.tableInfo ? Number(state.tableInfo[0]) : null;

    // 如果游戏状态从 Waiting(0) 变为 PreFlop(1)，说明游戏刚开始，需要重置解密状态
    if (previousGameState === 0 && currentGameState === 1) {
      setDecryptedCards({ card1: null, card2: null });
      setHasRevealedCards(false);
      setPendingDecryption(false); // 先重置，等待 loadGameInfo 重新设置
    }

    // 更新上一次的游戏状态
    if (currentGameState !== null) {
      setPreviousGameState(currentGameState);
    }
  }, [state.tableInfo, previousGameState]);

  const handleStartGame = async () => {
    try {
      setIsStartingGame(true);
      setLoading(true);

      await contractService.startGame(tableId);
      setError(null);

      // 重新加载游戏信息，而不是刷新整个页面
      setTimeout(() => {
        loadGameInfo();
      }, 1000);
    } catch (err) {
      setError((err as Error).message);
      alert('开始游戏失败: ' + (err as Error).message);
    } finally {
      setIsStartingGame(false);
      setLoading(false);
    }
  };

  const handleLeaveGame = async () => {
    if (!window.confirm('确定要离开游戏吗？')) {
      return;
    }

    try {
      setIsLeavingGame(true);
      setLoading(true);

      await contractService.leaveTable(tableId);
      onBack();
    } catch (err) {
      setError((err as Error).message);
      alert('离开失败: ' + (err as Error).message);
    } finally {
      setIsLeavingGame(false);
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    try {
      setActionInProgress(true);
      setLoading(true);

      // 检查游戏状态
      const tableInfo = await contractService.getTableInfo(tableId);
      if (tableInfo.state === 0) {
        throw new Error('游戏还未开始，请等待游戏开始');
      }
      if (tableInfo.state === 6) {
        throw new Error('游戏已结束，请创建新游戏');
      }

      console.log('✅ 玩家执行过牌操作，当前玩家索引:', Number(tableInfo[3]));
      await contractService.check(tableId);
      console.log('✅ 过牌交易已确认');
      setError(null);

      // 等待一小段时间确保区块链状态已更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 立即刷新游戏状态
      console.log('🔄 立即刷新游戏状态...');
      await loadGameInfo();
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      alert('过牌失败: ' + errorMsg);
    } finally {
      setActionInProgress(false);
      setLoading(false);
    }
  };

  const handleCall = async () => {
    try {
      setActionInProgress(true);
      setLoading(true);

      // 检查游戏状态
      const tableInfo = await contractService.getTableInfo(tableId);

      if (tableInfo.state === 0) {
        throw new Error('游戏还未开始，请等待游戏开始');
      }

      if (tableInfo.state === 6) {
        throw new Error('游戏已结束，请创建新游戏');
      }

      console.log('✅ 玩家执行跟注操作，当前玩家索引:', Number(tableInfo[3]));
      await contractService.call(tableId);
      console.log('✅ 跟注交易已确认');
      setError(null);

      // 等待一小段时间确保区块链状态已更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 立即刷新游戏状态
      console.log('🔄 立即刷新游戏状态...');
      await loadGameInfo();
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      alert('跟注失败: ' + errorMsg);
    } finally {
      setActionInProgress(false);
      setLoading(false);
    }
  };

  const handleBet = async () => {
    const amountStr = prompt('请输入下注金额:');
    if (!amountStr) return;

    try {
      setActionInProgress(true);
      setLoading(true);

      const amount = parseInt(amountStr, 10);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('请输入有效的金额');
      }

      // 检查玩家是否在游戏中
      const playerAddress = address;
      if (!playerAddress) {
        throw new Error('未连接钱包');
      }

      // 重新加载游戏信息，确保状态是最新的
      const tableInfo = await contractService.getTableInfo(tableId);

      if (tableInfo.state === 0) {
        throw new Error('游戏还未开始，请等待游戏开始');
      }

      if (tableInfo.state === 6) {
        throw new Error('游戏已结束，请创建新游戏');
      }

      // 加密下注金额
      const encrypted = await fhevm.sealBet(amount);

      // 调用合约
      await contractService.bet(tableId, amount, encrypted.encryptedAmount, encrypted.inputProof);

      setError(null);

      // 等待一小段时间确保区块链状态已更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 立即刷新游戏状态
      await loadGameInfo();
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      alert('下注失败: ' + errorMsg);
    } finally {
      setActionInProgress(false);
      setLoading(false);
    }
  };

  const handleFold = async () => {
    try {
      setActionInProgress(true);
      setLoading(true);

      // 检查游戏状态
      const tableInfo = await contractService.getTableInfo(tableId);
      if (tableInfo.state === 0) {
        throw new Error('游戏还未开始，请等待游戏开始');
      }
      if (tableInfo.state === 6) {
        throw new Error('游戏已结束，请创建新游戏');
      }

      await contractService.fold(tableId);
      setError(null);

      // 等待一小段时间确保区块链状态已更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 立即刷新游戏状态
      await loadGameInfo();
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      alert('弃牌失败: ' + errorMsg);
    } finally {
      setActionInProgress(false);
      setLoading(false);
    }
  };

  const gameState = state.tableInfo ? Number(state.tableInfo[0]) : 0;
  const playerCount = state.tableInfo ? Number(state.tableInfo[1]) : 0;
  const smallBlind = state.tableInfo ? Number(state.tableInfo[8]) : 0;
  const bigBlind = state.tableInfo ? Number(state.tableInfo[9]) : 0;
  const pot = playersInfo ? Number(playersInfo.pot) : 0;

  // 加载状态
  if (state.isLoading && !state.tableInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-800 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">加载游戏中...</h2>
          <p className="text-gray-600">正在获取游戏信息，请稍候</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #0d2818 0%, #1a472a 50%, #0a5f38 100%)' }}>
      <div className="max-w-7xl mx-auto">
        {/* 头部信息栏 - 只保留桌号 */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-2xl p-4 mb-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="font-bold px-4 py-2 rounded-lg shadow-lg" style={{ color: 'white' }}>
                {t('game.table_number', { number: tableId })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LocaleSwitch />
              <button
                onClick={handleLeaveGame}
                disabled={isLeavingGame || state.isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all"
              >
                {isLeavingGame ? t('game.leaving') : `🚪 ${t('game.leave_game')}`}
              </button>
            </div>
          </div>
        </div>

        {/* 扑克桌主区域 - 使用绝对定位，参考 demo.html */}
        <div className="relative h-[700px] overflow-hidden">
          {/* 牌桌 - 椭圆形，居中 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
               style={{ width: '800px', height: '400px' }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '8px solid #000',
              background: '#0d6832',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)'
            }}></div>

            {/* 中央游戏区 - 奖池和公共牌 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
              {/* 奖池信息面板 - 圆角矩形卡片 */}
              <div className="backdrop-blur-md py-2.5 px-4 border-2 border-white/30 mb-4 shadow-xl"
                   style={{
                     background: 'rgba(58, 107, 198, 0.3)',
                     width: '360px',
                     borderRadius: '32px'
                   }}>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col items-center justify-center px-2 flex-1">
                    <p className="text-xs text-white mb-1">{t('game.pot')}</p>
                    <p className="text-lg font-bold" style={{
                      background: 'linear-gradient(to right, #ecc94b, #d4af37)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>{pot}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2 border-l border-r border-white/30 flex-1">
                    <p className="text-xs text-white mb-1">{t('lobby.blinds')}</p>
                    <p className="text-sm font-bold text-white">{smallBlind}/{bigBlind}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2 flex-1">
                    <p className="text-xs text-white mb-1">{t('lobby.players')}</p>
                    <p className="text-sm font-bold text-white">{playerCount}/6</p>
                  </div>
                </div>
              </div>

              {/* 公共牌区域 - 参考 demo.html 的圆角容器 */}
              <div className="flex justify-center space-x-3"
                   style={{
                     background: 'rgba(13, 104, 50, 0.8)',
                     padding: '12px 20px',
                     borderRadius: '100px',
                     border: '2px solid rgba(0,0,0,0.3)',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                   }}>
                {[0, 1, 2, 3, 4].map((idx) => {
                  const card = state.communityCards?.[idx];
                  const isRevealed = card !== undefined && card !== null && Number(card) !== 0;
                  const rotations = [-2, 1, -1, 2, -3]; // 轻微旋转效果
                  return (
                    <div key={idx} style={{ transform: `rotate(${rotations[idx]}deg)` }}>
                      {isRevealed ? (
                        <PokerCard card={Number(card)} />
                      ) : (
                        <PokerCard card={0} unknown={true} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 玩家座位 - 在牌桌外面，参考 demo.html 的布局 */}
          {playersInfo && (() => {
              const players = playersInfo.players || [];
              const playerBets = playersInfo.playerBets || [];
              const playerFolded = playersInfo.playerFolded || [];
              const currentPlayerIndex = playersInfo.currentPlayerIndex;
              const dealerIndex = playersInfo.dealerIndex;

              // 座位位置配置 (6个座位环绕桌子) - 紧贴桌子边缘
              // 位置顺序：底部中间(0) -> 左下(1) -> 左上(2) -> 顶部中间(3) -> 右上(4) -> 右下(5)
              const seatPositions = [
                { bottom: '60px', left: '50%', transform: 'translateX(-50%)' },   // 0: 底部中间 (当前玩家)
                { bottom: '180px', left: '140px' },                                // 1: 左下
                { top: '35%', left: '120px', transform: 'translateY(-50%)' },     // 2: 左上
                { top: '40px', left: '50%', transform: 'translateX(-50%)' },      // 3: 顶部中间
                { top: '35%', right: '120px', transform: 'translateY(-50%)' },    // 4: 右上
                { bottom: '180px', right: '140px' },                               // 5: 右下
              ];

              // 为每个玩家生成随机纯色（基于地址）
              const getPlayerColor = (playerAddress: string) => {
                const colors = [
                  '#3b82f6', // 蓝
                  '#10b981', // 绿
                  '#f59e0b', // 橙
                  '#ef4444', // 红
                  '#8b5cf6', // 紫
                  '#06b6d4', // 青
                ];
                const hash = playerAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                return colors[hash % colors.length];
              };

              // 找到当前玩家的索引
              const myActualIndex = players.findIndex(p => address && p && p.toLowerCase() === address.toLowerCase());

              return seatPositions.map((pos, displayIdx) => {
                // 计算实际玩家索引：将当前玩家映射到底部中间位置
                const actualIdx = myActualIndex >= 0 ? (displayIdx + myActualIndex) % 6 : displayIdx;

                const player = players[actualIdx];
                const isOccupied = player && player !== '0x0000000000000000000000000000000000000000';
                const isCurrentPlayer = actualIdx === currentPlayerIndex;
                const isDealer = actualIdx === dealerIndex;
                const isFolded = playerFolded[actualIdx];
                const bet = playerBets[actualIdx] ? Number(playerBets[actualIdx]) : 0;
                const isMe = address && player && player.toLowerCase() === address.toLowerCase();

                return (
                  <div
                    key={displayIdx}
                    className="absolute"
                    style={pos}
                  >
                    {isOccupied ? (
                      <div className="relative">
                        {/* 玩家信息卡片 - 纯色背景的圆角矩形 */}
                        {(() => {
                          const playerColor = getPlayerColor(player);
                          return (
                            <div
                              className={`p-3 min-w-[140px] ${
                                isCurrentPlayer ? 'shadow-[0_0_20px_rgba(212,175,55,0.6)]' : 'shadow-lg'
                              }`}
                              style={{
                                backgroundColor: playerColor,
                                border: isCurrentPlayer ? '3px solid #d4af37' : '3px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '32px'
                              }}
                            >
                              <div className="flex flex-col items-center">
                                {/* 头像 - 圆角矩形 */}
                                <div className="overflow-hidden bg-white/20 p-2" style={{ borderRadius: '20px' }}>
                                  <div className="w-12 h-12 bg-white/30 flex items-center justify-center backdrop-blur-sm" style={{ borderRadius: '16px' }}>
                                    <span className="text-white font-bold text-2xl drop-shadow-lg">
                                      {isMe ? '👤' : '👨'}
                                    </span>
                                  </div>
                                </div>

                                {/* 玩家名称 */}
                                <p className="text-sm text-center mt-2 font-bold drop-shadow-md" style={{ color: 'white' }}>
                                  {isMe ? t('game.player_status.you') : `${player.slice(0, 6)}...${player.slice(-4)}`}
                                </p>

                                {/* 庄家标记 - 移到卡片内部 */}
                                {isDealer && (
                                  <div className="mt-1 text-xs font-bold flex items-center gap-1" style={{ color: '#000' }}>
                                    🎯 {t('game.dealer')}
                                  </div>
                                )}

                                {/* 筹码显示 - 只在有下注时显示 */}
                                {bet > 0 && (
                                  <div className="flex mt-2">
                                    <div className="px-3 py-1 rounded-full flex items-center justify-center font-bold text-sm shadow-lg bg-black/30 backdrop-blur-sm">
                                      <span className="text-yellow-300">{bet}</span>
                                    </div>
                                  </div>
                                )}

                                {/* 状态指示 */}
                                {isFolded && (
                                  <div className="mt-2 text-xs text-red-300 font-bold bg-black/30 px-2 py-1 rounded-full">
                                    {t('game.player_status.folded')}
                                  </div>
                                )}
                                {isCurrentPlayer && !isFolded && (
                                  <div className="mt-2 text-xs text-yellow-300 font-bold bg-black/30 px-2 py-1 rounded-full flex items-center gap-1">
                                    ⏰ {t('game.player_status.in_action')}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="bg-[#242c47]/50 p-4 border-2 border-dashed border-white/20 min-w-[140px]" style={{ borderRadius: '32px' }}>
                        <div className="text-sm text-center" style={{ color: 'white' }}>{t('game.empty_seat')}</div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}

        </div>

        {/* 错误提示 */}
        {state.error && (
          <div className="mt-4 bg-red-900 bg-opacity-90 border-l-4 border-red-500 text-red-100 p-4 rounded-lg shadow-lg">
            <p className="font-bold">❌ 错误</p>
            <p className="text-sm mt-1">{state.error}</p>
          </div>
        )}

        {/* 游戏操作面板 */}
        <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl p-6 border-2 border-slate-700">

          {/* 游戏结束 - 显示获胜信息 */}
          {gameState === 6 && (
            <div className="mb-6 p-8 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 rounded-2xl shadow-2xl border-4 border-yellow-400">
              <div className="text-center">
                <div className="text-8xl mb-4 animate-bounce">🏆</div>
                <h4 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">游戏结束!</h4>
                {winnerInfo && winnerInfo.winnerIndex !== 255 ? (
                  <div>
                    {address && winnerInfo.winnerAddress.toLowerCase() === address.toLowerCase() ? (
                      <>
                        <p className="text-3xl font-bold text-green-900 mb-3 animate-pulse">🎉 恭喜你获胜!</p>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 inline-block">
                          <p className="text-white font-mono">
                            {winnerInfo.winnerAddress.slice(0, 6)}...{winnerInfo.winnerAddress.slice(-4)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-white mb-3">游戏结束</p>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 inline-block">
                          <p className="text-sm text-yellow-100 mb-1">获胜者</p>
                          <p className="text-white font-mono">
                            {winnerInfo.winnerAddress.slice(0, 6)}...{winnerInfo.winnerAddress.slice(-4)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-white">正在加载获胜者信息...</p>
                )}
                <button
                  onClick={onBack}
                  className="mt-6 bg-white hover:bg-gray-100 text-yellow-600 font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                >
                  🏠 返回大厅
                </button>
              </div>
            </div>
          )}

          {/* 等待玩家加入提示 - 仅在游戏等待状态且玩家数 < 2 时显示 */}
          {gameState === 0 && playerCount < 2 && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-xl border-2 border-blue-400">
              <div className="text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-white font-semibold text-lg mb-2">等待其他玩家加入...</p>
                <p className="text-blue-100 text-sm">至少需要 2 名玩家才能开始游戏</p>
              </div>
            </div>
          )}

          {/* 开始游戏按钮 - 仅在游戏等待状态且玩家数 >= 2 时显示 */}
          {gameState === 0 && playerCount >= 2 && (
            <div className="mb-6 p-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-xl border-2 border-purple-400">
              {(() => {
                const dealerIndex = state.tableInfo ? Number(state.tableInfo[4]) : null; // ✅ 修复：dealerIndex 是索引 4
                const isDealer = myPlayerIndex !== null && dealerIndex !== null && myPlayerIndex === dealerIndex;

                if (isDealer) {
                  return (
                    <>
                      <p className="text-white font-semibold mb-4 text-center text-lg">✅ 准备就绪！</p>
                      <button
                        onClick={handleStartGame}
                        disabled={isStartingGame || state.isLoading}
                        className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-400 text-purple-600 font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all text-lg"
                      >
                        {isStartingGame ? `⏳ ${t('game.starting')}` : `🎮 ${t('game.start_game')}`}
                      </button>
                    </>
                  );
                } else {
                  const dealerAddress = playersInfo && dealerIndex !== null ? playersInfo.players[dealerIndex] : null;
                  const dealerDisplay = dealerAddress ? `${dealerAddress.slice(0, 6)}...${dealerAddress.slice(-4)}` : '庄家';
                  return (
                    <p className="text-white font-semibold text-center text-lg">⏳ 等待 {dealerDisplay} 开始游戏...</p>
                  );
                }
              })()}
            </div>
          )}

          {/* Showdown 阶段 - 公开手牌 */}
          {gameState === 5 && decryptedCards.card1 !== null && decryptedCards.card2 !== null && !hasRevealedCards && (
            <div className="mb-6 p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-xl border-2 border-purple-400">
              <h4 className="text-2xl font-bold text-white mb-3 text-center">🎴 {t('game.showdown_phase')}</h4>
              <p className="text-purple-100 mb-4 text-center">{t('game.reveal_cards_desc')}</p>
              <button
                onClick={async () => {
                  try {
                    setActionInProgress(true);
                    await contractService.revealCards(tableId, decryptedCards.card1!, decryptedCards.card2!);
                    setHasRevealedCards(true); // 立即更新状态，避免重复点击
                    await loadGameInfo();
                  } catch (err) {
                    console.error('❌ 公开手牌失败:', err);
                    alert('公开手牌失败: ' + (err as Error).message);
                    setHasRevealedCards(false); // 如果失败，重置状态
                  } finally {
                    setActionInProgress(false);
                  }
                }}
                disabled={actionInProgress}
                className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-400 text-purple-600 font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
              >
                {actionInProgress ? `⏳ ${t('game.revealing')}` : `🃏 ${t('game.reveal_cards')}`}
              </button>
            </div>
          )}

          {/* Showdown 阶段 - 已公开手牌提示 */}
          {gameState === 5 && hasRevealedCards && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-xl border-2 border-green-400">
              <h4 className="text-2xl font-bold text-white mb-2 text-center">✅ {t('game.cards_revealed')}</h4>
              <p className="text-green-100 text-center">{t('game.waiting_others_reveal')}</p>
            </div>
          )}

          {/* 轮流提示 */}
          {/* 你的手牌 - 显示在最上方 */}
          <div className="mb-6 flex justify-center">
            <div className="bg-[#242c47] backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/5">
              <div className="text-[#e8e8e8] text-lg font-semibold mb-4 text-center">🎴 {t('game.your_hand')}</div>
              <div className="flex gap-4 justify-center">
                {gameState === 0 ? (
                  // 游戏未开始，显示牌背
                  <>
                    <PokerCard isHidden />
                    <PokerCard isHidden />
                  </>
                ) : decryptedCards.card1 !== null && decryptedCards.card2 !== null ? (
                  // 已解密，显示明牌
                  <>
                    <PokerCard card={decryptedCards.card1} />
                    <PokerCard card={decryptedCards.card2} />
                  </>
                ) : isDecrypting ? (
                  // 解密中
                  <>
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center animate-pulse shadow-lg">
                      <div className="text-gray-500 text-xs">{t('game.decrypting')}</div>
                    </div>
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center animate-pulse shadow-lg">
                      <div className="text-gray-500 text-xs">{t('game.decrypting')}</div>
                    </div>
                  </>
                ) : state.playerCards ? (
                  // 有加密手牌，显示牌背
                  <>
                    <PokerCard isHidden />
                    <PokerCard isHidden />
                  </>
                ) : (
                  // 其他情况（不应该出现）
                  <>
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center shadow-lg">
                      <div className="text-gray-400 text-xs">{t('game.waiting')}</div>
                    </div>
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center shadow-lg">
                      <div className="text-gray-400 text-xs">{t('game.waiting')}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 轮到你了提示 */}
          {myPlayerIndex !== null && state.tableInfo && gameState !== 0 && gameState !== 5 && gameState !== 6 && (
            <div className="mb-6">
              {(() => {
                const currentPlayerIndex = Number(state.tableInfo[3]);
                return myPlayerIndex === currentPlayerIndex ? (
                  <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg border-2 border-green-400 animate-pulse">
                    <p className="text-white font-bold text-center text-lg">✅ {t('game.your_turn_action')}</p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-700 bg-opacity-50 rounded-xl border-2 border-slate-600">
                    <p className="text-slate-300 text-center">⏳ {t('game.waiting_for_other_players')}</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 游戏操作按钮 - 严格参考 demo.html 的设计 */}
          {gameState !== 5 && gameState !== 6 && (
            <div className="flex justify-center px-8">
              <div className="flex justify-between w-full max-w-[800px]">
                {(() => {
                  const currentPlayerIndex = state.tableInfo ? Number(state.tableInfo[3]) : null;
                  const isMyTurn = myPlayerIndex !== null && currentPlayerIndex !== null && myPlayerIndex === currentPlayerIndex;
                  // 当游戏未开始或玩家数量不足时，禁用所有按钮
                  const isDisabled = actionInProgress || state.isLoading || !isMyTurn || gameState === 0 || playerCount < 2;
                  // TODO: currentBet 需要从其他地方获取，getTableInfo 不返回这个值
                  const currentBet = 0; // 暂时设为 0

                  return (
                    <>
                      {/* 弃牌按钮 - 严格参考 demo.html，始终显示彩色 */}
                      <button
                        onClick={handleFold}
                        disabled={isDisabled}
                        style={{
                          width: '150px',
                          height: '64px',
                          background: '#c53030',
                          borderRadius: '12px',
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                        className="flex flex-col items-center justify-center transition-all hover:bg-[#d34343]"
                        title={!isMyTurn ? t('game.not_your_turn') : ''}
                      >
                        <span className="text-[#e8e8e8] font-semibold text-lg">
                          {actionInProgress ? t('game.processing') : t('game.actions.fold')}
                        </span>
                      </button>

                      {/* 过牌按钮 - 严格参考 demo.html，始终显示彩色 */}
                      <button
                        onClick={handleCheck}
                        disabled={isDisabled}
                        style={{
                          width: '150px',
                          height: '64px',
                          background: '#2d3757',
                          borderRadius: '12px',
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                        className="flex flex-col items-center justify-center transition-all hover:bg-[#3a4670]"
                        title={!isMyTurn ? t('game.not_your_turn') : ''}
                      >
                        <span className="text-[#e8e8e8] font-semibold text-lg">
                          {actionInProgress ? t('game.processing') : t('game.actions.check')}
                        </span>
                      </button>

                      {/* 跟注按钮 - 带脉冲动画，严格参考 demo.html */}
                      <button
                        onClick={handleCall}
                        disabled={isDisabled}
                        style={{
                          width: '180px',
                          height: '64px',
                          background: '#2e8b57',
                          borderRadius: '12px',
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          animation: isMyTurn && !isDisabled ? 'pulse 1.5s infinite' : 'none'
                        }}
                        className="flex flex-col items-center justify-center transition-all hover:bg-[#369a64]"
                        title={!isMyTurn ? t('game.not_your_turn') : ''}
                      >
                        <span className="text-[#e8e8e8] font-semibold text-lg">
                          {actionInProgress ? t('game.processing') : t('game.actions.call')}
                        </span>
                        {currentBet > 0 && (
                          <span className="text-sm" style={{
                            background: 'linear-gradient(to right, #ecc94b, #d4af37)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}>
                            {currentBet}
                          </span>
                        )}
                      </button>

                      {/* 加注按钮 - 金色渐变，严格参考 demo.html */}
                      <button
                        onClick={handleBet}
                        disabled={isDisabled}
                        style={{
                          width: '150px',
                          height: '64px',
                          background: 'linear-gradient(to right, #d4af37, #c19b30)',
                          borderRadius: '12px',
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                        className="flex flex-col items-center justify-center transition-all hover:opacity-90"
                        title={!isMyTurn ? t('game.not_your_turn') : ''}
                      >
                        <span className="text-black font-semibold text-lg">
                          {actionInProgress ? t('game.processing') : t('game.actions.raise')}
                        </span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

