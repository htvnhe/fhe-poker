/**
 * Game Page - Clean UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { contractService } from '../services/ContractService';
import { useFHEVM } from '../hooks/useFHEVM';
import { useGameStore } from '../store/gameStore.tsx';
import { POKER_TABLE_ADDRESS } from '../lib/contract';

interface GameProps {
  tableId: number;
  onBack: () => void;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function PokerCard({ card, isHidden = false, size = 'md' }: { card?: number | null; isHidden?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-sm',
    md: 'w-12 h-16 text-base',
    lg: 'w-16 h-22 text-lg'
  };

  if (isHidden || card === null || card === undefined || card === 0) {
    return (
      <div className={`${sizeClasses[size]} bg-blue-900 rounded-lg flex items-center justify-center border-2 border-blue-700`}>
        <span className="text-blue-400">🂠</span>
      </div>
    );
  }

  const cardIndex = (typeof card === 'bigint' ? Number(card) : Number(card || 0)) - 1;
  const suit = SUITS[Math.floor(cardIndex / 13)];
  const rank = RANKS[cardIndex % 13];
  const isRed = suit === '♥' || suit === '♦';

  return (
    <div className={`${sizeClasses[size]} bg-white rounded-lg flex flex-col items-center justify-center shadow-md border border-gray-300`}>
      <span className={`font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{rank}</span>
      <span className={`${isRed ? 'text-red-600' : 'text-gray-900'}`}>{suit}</span>
    </div>
  );
}

export function Game({ tableId, onBack }: GameProps) {
  useTranslation();
  const { address } = useAccount();
  const fhevm = useFHEVM();
  const { state, setTableInfo, setPlayerCards, setCommunityCards, setLoading, setError } = useGameStore();

  const [isLeavingGame, setIsLeavingGame] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [decryptedCards, setDecryptedCards] = useState<{ card1: number | null; card2: number | null }>({ card1: null, card2: null });
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [pendingDecryption, setPendingDecryption] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{ winnerIndex: number; winnerAddress: string } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasRevealedCards, setHasRevealedCards] = useState(false);
  const [previousGameState, setPreviousGameState] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [showBetModal, setShowBetModal] = useState(false);
  const [playersInfo, setPlayersInfo] = useState<{
    players: string[];
    playerBets: bigint[];
    playerFolded: boolean[];
    currentPlayerIndex: number;
    pot: bigint;
    dealerIndex: number;
  } | null>(null);

  const loadGameInfo = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      await contractService.initialize();
      const playerAddress = await contractService.getPlayerAddress();

      try {
        const playerTableId = await contractService.getPlayerTable(playerAddress);
        const expectedTableId = tableId + 1;
        if (playerTableId === 0) {
          if (loadAttempts < 3) setLoadAttempts(loadAttempts + 1);
          else { setError('Player not in table.'); setLoading(false); return; }
        } else if (playerTableId !== expectedTableId) {
          setError(`Wrong table`); setLoading(false); return;
        } else { setLoadAttempts(0); }
      } catch {}

      const tableInfo = await contractService.getTableInfo(tableId);
      setTableInfo(tableInfo);

      try {
        const playersData = await contractService.getTableInfoWithPlayers(tableId);
        setPlayersInfo(playersData);
      } catch {}

      try {
        const playerIndex = await contractService.getPlayerIndex(tableId, playerAddress);
        setMyPlayerIndex(playerIndex);
      } catch {}

      try {
        const cards = await contractService.getPlayerCards(tableId);
        setPlayerCards(cards);
        if (cards.card1 && cards.card2 && (decryptedCards.card1 === null || decryptedCards.card2 === null)) {
          setPendingDecryption(true);
        }
      } catch {}

      const communityCards = await contractService.getCommunityCards(tableId);
      setCommunityCards(communityCards);

      const gameState = tableInfo ? Number(tableInfo[0]) : 0;
      if (gameState === 6) {
        try { const winner = await contractService.getWinner(tableId); setWinnerInfo(winner); } catch {}
      }
      if (gameState === 5 && myPlayerIndex !== null) {
        try { const revealed = await contractService.hasPlayerRevealedCards(tableId, myPlayerIndex); setHasRevealedCards(revealed); } catch {}
      }
      setError(null);
    } catch (err) { setError((err as Error).message); }
    finally { if (showLoading) setLoading(false); }
  }, [tableId, loadAttempts, decryptedCards, myPlayerIndex, setLoading, setError, setTableInfo, setPlayerCards, setCommunityCards]);

  useEffect(() => {
    if (isInitialLoad) { loadGameInfo(true); setIsInitialLoad(false); }
    else { loadGameInfo(false); }
    const interval = setInterval(() => loadGameInfo(false), 1000);
    return () => clearInterval(interval);
  }, [loadGameInfo, isInitialLoad]);

  useEffect(() => {
    const decryptCards = async () => {
      if (decryptedCards.card1 !== null && decryptedCards.card2 !== null) return;
      if (!pendingDecryption || !fhevm.isInitialized || !address) return;
      if (!state.playerCards?.card1 || !state.playerCards?.card2 || isDecrypting) return;
      setIsDecrypting(true); setPendingDecryption(false);
      try {
        const signer = await contractService.getSigner();
        const [card1Value, card2Value] = await fhevm.decryptCards([state.playerCards.card1, state.playerCards.card2], POKER_TABLE_ADDRESS, address, signer);
        setDecryptedCards({ card1: card1Value, card2: card2Value });
      } catch { setPendingDecryption(true); }
      finally { setIsDecrypting(false); }
    };
    decryptCards();
  }, [fhevm, fhevm.isInitialized, pendingDecryption, address, state.playerCards, isDecrypting, decryptedCards]);

  useEffect(() => {
    const currentGameState = state.tableInfo ? Number(state.tableInfo[0]) : null;
    if (previousGameState === 0 && currentGameState === 1) {
      setDecryptedCards({ card1: null, card2: null }); setHasRevealedCards(false); setPendingDecryption(false);
    }
    if (currentGameState !== null) setPreviousGameState(currentGameState);
  }, [state.tableInfo, previousGameState]);

  const handleAction = async (action: string) => {
    try {
      setActionInProgress(true);
      if (action === 'fold') await contractService.fold(tableId);
      else if (action === 'check') await contractService.check(tableId);
      else if (action === 'call') await contractService.call(tableId);
      await new Promise(r => setTimeout(r, 500));
      await loadGameInfo();
    } catch (err) { alert(`${action} failed: ${(err as Error).message}`); }
    finally { setActionInProgress(false); }
  };

  const handleBet = async () => {
    if (!betAmount || Number(betAmount) <= 0) { alert('Enter valid amount'); return; }
    try {
      setActionInProgress(true);
      const encrypted = await fhevm.encryptBetAmount(Number(betAmount));
      await contractService.bet(tableId, Number(betAmount), encrypted.encryptedAmount, encrypted.inputProof);
      setShowBetModal(false); setBetAmount('');
      await loadGameInfo();
    } catch (err) { alert(`Bet failed: ${(err as Error).message}`); }
    finally { setActionInProgress(false); }
  };

  const handleStartGame = async () => {
    try { setIsStartingGame(true); await contractService.startGame(tableId); setTimeout(() => loadGameInfo(), 1000); }
    catch (err) { alert('Failed to start: ' + (err as Error).message); }
    finally { setIsStartingGame(false); }
  };

  const handleLeaveGame = async () => {
    if (!window.confirm('Leave game?')) return;
    try { setIsLeavingGame(true); await contractService.leaveTable(tableId); onBack(); }
    catch (err) { alert('Failed to leave: ' + (err as Error).message); }
    finally { setIsLeavingGame(false); }
  };

  const handleRevealCards = async () => {
    try {
      setActionInProgress(true);
      await contractService.revealCards(tableId, decryptedCards.card1!, decryptedCards.card2!);
      setHasRevealedCards(true);
      await loadGameInfo();
    } catch (err) { alert('Failed: ' + (err as Error).message); }
    finally { setActionInProgress(false); }
  };

  const gameState = state.tableInfo ? Number(state.tableInfo[0]) : 0;
  const playerCount = state.tableInfo ? Number(state.tableInfo[1]) : 0;
  const smallBlind = state.tableInfo ? Number(state.tableInfo[8]) : 0;
  const bigBlind = state.tableInfo ? Number(state.tableInfo[9]) : 0;
  const pot = playersInfo ? Number(playersInfo.pot) : 0;
  const currentPlayerIndex = state.tableInfo ? Number(state.tableInfo[3]) : null;
  const isMyTurn = myPlayerIndex !== null && currentPlayerIndex !== null && myPlayerIndex === currentPlayerIndex;
  const isDisabled = actionInProgress || !isMyTurn || gameState === 0 || gameState === 5 || gameState === 6;

  const getStateLabel = (s: number) => {
    const labels: { [k: number]: string } = {
      0: 'Waiting', 1: 'Pre-Flop', 2: 'Flop', 3: 'Turn', 4: 'River', 5: 'Showdown', 6: 'Game Over'
    };
    return labels[s] || 'Waiting';
  };

  if (state.isLoading && !state.tableInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🃏</div>
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700">
            ← Lobby
          </button>
          <span className="text-lg font-bold text-white">Table #{tableId}</span>
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">{getStateLabel(gameState)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          <button
            onClick={handleLeaveGame}
            disabled={isLeavingGame}
            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            {isLeavingGame ? 'Leaving...' : 'Leave'}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {/* Poker Table */}
        <div className="bg-green-800 rounded-3xl p-6 mb-4 border-4 border-amber-800" style={{ minHeight: '300px' }}>
          {/* Table Info */}
          <div className="flex justify-center gap-6 mb-4">
            <div className="bg-black/40 rounded-lg px-4 py-2 text-center">
              <div className="text-slate-400 text-xs">POT</div>
              <div className="text-yellow-400 font-bold">{pot}</div>
            </div>
            <div className="bg-black/40 rounded-lg px-4 py-2 text-center">
              <div className="text-slate-400 text-xs">BLINDS</div>
              <div className="text-white">{smallBlind}/{bigBlind}</div>
            </div>
            <div className="bg-black/40 rounded-lg px-4 py-2 text-center">
              <div className="text-slate-400 text-xs">PLAYERS</div>
              <div className="text-white">{playerCount}/6</div>
            </div>
          </div>

          {/* Community Cards */}
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2, 3, 4].map((idx) => {
              const card = state.communityCards?.[idx];
              const isRevealed = card && Number(card) !== 0;
              return <PokerCard key={idx} card={isRevealed ? Number(card) : 0} isHidden={!isRevealed} size="lg" />;
            })}
          </div>

          {/* Players */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {playersInfo && playersInfo.players.map((player, idx) => {
              const isOccupied = player && player !== '0x0000000000000000000000000000000000000000';
              const isMe = address && player?.toLowerCase() === address.toLowerCase();
              const isCurrentPlayer = idx === playersInfo.currentPlayerIndex;
              const isFolded = playersInfo.playerFolded[idx];
              const bet = Number(playersInfo.playerBets[idx] || 0);
              const isDealer = idx === playersInfo.dealerIndex;

              if (!isOccupied) {
                return (
                  <div key={idx} className="bg-black/20 rounded-lg p-2 text-center border border-dashed border-slate-600">
                    <div className="text-slate-500 text-xs">Seat {idx + 1}</div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`rounded-lg p-2 text-center ${
                    isCurrentPlayer ? 'bg-yellow-500/30 border-2 border-yellow-500' : 'bg-black/30 border border-slate-600'
                  } ${isFolded ? 'opacity-40' : ''}`}
                >
                  <div className={`text-xs font-medium truncate ${isMe ? 'text-green-400' : 'text-white'}`}>
                    {isMe ? 'YOU' : `${player.slice(0, 4)}..`}
                  </div>
                  <div className="flex justify-center gap-1 mt-1">
                    {isDealer && <span className="bg-yellow-500 text-black text-xs px-1 rounded">D</span>}
                    {isCurrentPlayer && !isFolded && <span className="bg-green-500 text-white text-xs px-1 rounded">●</span>}
                  </div>
                  {bet > 0 && <div className="text-yellow-400 text-xs">{bet}</div>}
                  {isFolded && <div className="text-red-400 text-xs">Folded</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Your Hand & Actions */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-slate-400 text-sm mb-2">Your Hand</div>
                <div className="flex gap-2">
                  {gameState === 0 ? (
                    <><PokerCard isHidden size="lg" /><PokerCard isHidden size="lg" /></>
                  ) : decryptedCards.card1 !== null && decryptedCards.card2 !== null ? (
                    <><PokerCard card={decryptedCards.card1} size="lg" /><PokerCard card={decryptedCards.card2} size="lg" /></>
                  ) : isDecrypting ? (
                    <div className="flex gap-2">
                      <div className="w-16 h-22 bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">🔐</div>
                      <div className="w-16 h-22 bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">🔐</div>
                    </div>
                  ) : (
                    <><PokerCard isHidden size="lg" /><PokerCard isHidden size="lg" /></>
                  )}
                </div>
              </div>

              {gameState > 0 && gameState < 5 && (
                <div className="text-center px-4 border-l border-slate-600">
                  {isMyTurn ? (
                    <div className="bg-green-900/50 border border-green-500 rounded-lg px-4 py-2">
                      <div className="text-green-400 font-bold">Your Turn!</div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm">Waiting...</div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {gameState > 0 && gameState < 5 && (
              <div className="flex gap-2">
                <button onClick={() => handleAction('fold')} disabled={isDisabled}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-medium">
                  Fold
                </button>
                <button onClick={() => handleAction('check')} disabled={isDisabled}
                  className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-medium">
                  Check
                </button>
                <button onClick={() => handleAction('call')} disabled={isDisabled}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-medium">
                  Call
                </button>
                <button onClick={() => setShowBetModal(true)} disabled={isDisabled}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-black px-4 py-2 rounded-lg font-medium">
                  Raise
                </button>
              </div>
            )}
          </div>
        </div>

        {/* State Messages */}
        {gameState === 0 && playerCount < 2 && (
          <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 text-center">
            <div className="text-blue-300">⏳ Waiting for players... (need 2+)</div>
          </div>
        )}

        {gameState === 0 && playerCount >= 2 && (
          <div className="bg-purple-900/50 border border-purple-600 rounded-lg p-4 text-center">
            {myPlayerIndex !== null && state.tableInfo && myPlayerIndex === Number(state.tableInfo[4]) ? (
              <button onClick={handleStartGame} disabled={isStartingGame}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50">
                {isStartingGame ? 'Starting...' : '🎮 Start Game'}
              </button>
            ) : (
              <div className="text-purple-300">Waiting for dealer to start...</div>
            )}
          </div>
        )}

        {gameState === 5 && !hasRevealedCards && decryptedCards.card1 !== null && (
          <div className="bg-pink-900/50 border border-pink-600 rounded-lg p-4 text-center">
            <button onClick={handleRevealCards} disabled={actionInProgress}
              className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">
              {actionInProgress ? 'Revealing...' : '👀 Reveal Cards'}
            </button>
          </div>
        )}

        {gameState === 5 && hasRevealedCards && (
          <div className="bg-green-900/50 border border-green-600 rounded-lg p-4 text-center">
            <div className="text-green-300">✓ Cards revealed! Waiting for others...</div>
          </div>
        )}

        {gameState === 6 && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
            {winnerInfo && winnerInfo.winnerIndex !== 255 && (
              <p className="text-yellow-400 mb-4">
                Winner: {winnerInfo.winnerAddress.slice(0, 6)}...{winnerInfo.winnerAddress.slice(-4)}
                {address && winnerInfo.winnerAddress.toLowerCase() === address.toLowerCase() && ' (You! 🎉)'}
              </p>
            )}
            <button onClick={onBack} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">
              Back to Lobby
            </button>
          </div>
        )}
      </main>

      {/* Bet Modal */}
      {showBetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-5 w-full max-w-sm border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Raise Amount</h3>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full bg-slate-900 text-white rounded-lg px-3 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none text-center text-lg mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowBetModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg">Cancel</button>
              <button onClick={handleBet} disabled={actionInProgress} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-2.5 rounded-lg font-medium disabled:opacity-50">
                {actionInProgress ? 'Raising...' : 'Raise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
