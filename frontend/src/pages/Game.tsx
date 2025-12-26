/**
 * Game Page - Simplified Version
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { contractService } from '../services/ContractService';
import { useFHEVM } from '../hooks/useFHEVM';
import { useGameStore } from '../store/gameStore.tsx';
import { POKER_TABLE_ADDRESS } from '../lib/contract';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

interface GameProps {
  tableId: number;
  onBack: () => void;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function PokerCard({ card, isHidden = false, unknown = false }: { card?: number | null; isHidden?: boolean; unknown?: boolean }) {
  if (unknown) {
    return (
      <div className="w-12 h-16 bg-slate-600 rounded flex items-center justify-center border border-slate-500">
        <span className="text-slate-400">?</span>
      </div>
    );
  }

  if (isHidden || card === null || card === undefined) {
    return (
      <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center border border-slate-600">
        <span className="text-slate-500 text-lg">🂠</span>
      </div>
    );
  }

  const cardIndex = (typeof card === 'bigint' ? Number(card) : Number(card || 0)) - 1;
  const suit = SUITS[Math.floor(cardIndex / 13)];
  const rank = RANKS[cardIndex % 13];
  const isRed = suit === '♥' || suit === '♦';

  return (
    <div className="w-12 h-16 bg-white rounded flex flex-col items-center justify-center shadow">
      <span className={`text-sm font-bold ${isRed ? 'text-red-600' : 'text-slate-800'}`}>{rank}</span>
      <span className={`text-lg ${isRed ? 'text-red-600' : 'text-slate-800'}`}>{suit}</span>
    </div>
  );
}

export function Game({ tableId, onBack }: GameProps) {
  const { t } = useTranslation();
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
          if (loadAttempts < 3) {
            setLoadAttempts(loadAttempts + 1);
          } else {
            setError('Player not in table. Please return to lobby.');
            setLoading(false);
            return;
          }
        } else if (playerTableId !== expectedTableId) {
          setError(`Player is in table ${playerTableId - 1}, not ${tableId}`);
          setLoading(false);
          return;
        } else {
          setLoadAttempts(0);
        }
      } catch {}

      const tableInfo = await contractService.getTableInfo(tableId);
      setTableInfo(tableInfo);

      try {
        const playersData = await contractService.getTableInfoWithPlayers(tableId);
        setPlayersInfo(playersData);
      } catch (err) {
        console.error('Failed to load players:', err);
      }

      try {
        const playerIndex = await contractService.getPlayerIndex(tableId, playerAddress);
        setMyPlayerIndex(playerIndex);
      } catch (err) {
        console.error('Failed to get player index:', err);
      }

      try {
        const cards = await contractService.getPlayerCards(tableId);
        setPlayerCards(cards);

        const hasNewCards = cards.card1 && cards.card2;
        const needsDecryption = decryptedCards.card1 === null || decryptedCards.card2 === null;
        if (hasNewCards && needsDecryption) setPendingDecryption(true);
      } catch {}

      const communityCards = await contractService.getCommunityCards(tableId);
      setCommunityCards(communityCards);

      const gameState = tableInfo ? Number(tableInfo[0]) : 0;
      if (gameState === 6) {
        try {
          const winner = await contractService.getWinner(tableId);
          setWinnerInfo(winner);
        } catch {}
      }

      if (gameState === 5 && myPlayerIndex !== null) {
        try {
          const revealed = await contractService.hasPlayerRevealedCards(tableId, myPlayerIndex);
          setHasRevealedCards(revealed);
        } catch {}
      }

      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [tableId, loadAttempts, decryptedCards, myPlayerIndex, setLoading, setError, setTableInfo, setPlayerCards, setCommunityCards]);

  useEffect(() => {
    if (isInitialLoad) {
      loadGameInfo(true);
      setIsInitialLoad(false);
    } else {
      loadGameInfo(false);
    }
    const interval = setInterval(() => loadGameInfo(false), 1000);
    return () => clearInterval(interval);
  }, [loadGameInfo, isInitialLoad]);

  useEffect(() => {
    const decryptCards = async () => {
      if (decryptedCards.card1 !== null && decryptedCards.card2 !== null) return;
      if (!pendingDecryption || !fhevm.isInitialized || !address) return;
      if (!state.playerCards?.card1 || !state.playerCards?.card2 || isDecrypting) return;

      setIsDecrypting(true);
      setPendingDecryption(false);

      try {
        const signer = await contractService.getSigner();
        const [card1Value, card2Value] = await fhevm.decryptCards(
          [state.playerCards.card1, state.playerCards.card2],
          POKER_TABLE_ADDRESS,
          address,
          signer
        );
        setDecryptedCards({ card1: card1Value, card2: card2Value });
      } catch {
        setPendingDecryption(true);
      } finally {
        setIsDecrypting(false);
      }
    };
    decryptCards();
  }, [fhevm, fhevm.isInitialized, pendingDecryption, address, state.playerCards, isDecrypting, decryptedCards]);

  useEffect(() => {
    const currentGameState = state.tableInfo ? Number(state.tableInfo[0]) : null;
    if (previousGameState === 0 && currentGameState === 1) {
      setDecryptedCards({ card1: null, card2: null });
      setHasRevealedCards(false);
      setPendingDecryption(false);
    }
    if (currentGameState !== null) setPreviousGameState(currentGameState);
  }, [state.tableInfo, previousGameState]);

  const handleStartGame = async () => {
    try {
      setIsStartingGame(true);
      setLoading(true);
      await contractService.startGame(tableId);
      setError(null);
      setTimeout(() => loadGameInfo(), 1000);
    } catch (err) {
      setError((err as Error).message);
      alert('Failed to start: ' + (err as Error).message);
    } finally {
      setIsStartingGame(false);
      setLoading(false);
    }
  };

  const handleLeaveGame = async () => {
    if (!window.confirm('Leave game?')) return;
    try {
      setIsLeavingGame(true);
      setLoading(true);
      await contractService.leaveTable(tableId);
      onBack();
    } catch (err) {
      setError((err as Error).message);
      alert('Failed to leave: ' + (err as Error).message);
    } finally {
      setIsLeavingGame(false);
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    try {
      setActionInProgress(true);
      setLoading(true);
      await contractService.check(tableId);
      setError(null);
      await new Promise(r => setTimeout(r, 500));
      await loadGameInfo();
    } catch (err) {
      setError((err as Error).message);
      alert('Check failed: ' + (err as Error).message);
    } finally {
      setActionInProgress(false);
      setLoading(false);
    }
  };

  const handleCall = async () => {
    try {
      setActionInProgress(true);
      setLoading(true);
      await contractService.call(tableId);
      setError(null);
      await new Promise(r => setTimeout(r, 500));
      await loadGameInfo();
    } catch (err) {
      setError((err as Error).message);
      alert('Call failed: ' + (err as Error).message);
    } finally {
      setActionInProgress(false);
      setLoading(false);
    }
  };

  const handleBet = async () => {
    const amountStr = prompt('Enter bet amount:');
    if (!amountStr) return;

    try {
      setActionInProgress(true);
      setLoading(true);
      const amount = parseInt(amountStr, 10);
      if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

      const encrypted = await fhevm.encryptBetAmount(amount);
      await contractService.bet(tableId, amount, encrypted.encryptedAmount, encrypted.inputProof);
      setError(null);
      await new Promise(r => setTimeout(r, 500));
      await loadGameInfo();
    } catch (err) {
      setError((err as Error).message);
      alert('Bet failed: ' + (err as Error).message);
    } finally {
      setActionInProgress(false);
      setLoading(false);
    }
  };

  const handleFold = async () => {
    try {
      setActionInProgress(true);
      setLoading(true);
      await contractService.fold(tableId);
      setError(null);
      await new Promise(r => setTimeout(r, 500));
      await loadGameInfo();
    } catch (err) {
      setError((err as Error).message);
      alert('Fold failed: ' + (err as Error).message);
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

  const getStateName = (s: number) => {
    const names: { [k: number]: string } = { 0: 'Waiting', 1: 'Pre-Flop', 2: 'Flop', 3: 'Turn', 4: 'River', 5: 'Showdown', 6: 'Ended' };
    return names[s] || 'Unknown';
  };

  if (state.isLoading && !state.tableInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">{t('game.table_number', { number: tableId })}</span>
              <span className="text-emerald-400 text-sm">{getStateName(gameState)}</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={handleLeaveGame}
                disabled={isLeavingGame || state.isLoading}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {isLeavingGame ? t('game.leaving') : t('game.leave_game')}
              </button>
            </div>
          </div>
        </div>

        {/* Game Table */}
        <div className="bg-emerald-900 rounded-xl p-6 mb-4 border-4 border-emerald-800">
          {/* Info Panel */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-800/80 rounded-full px-6 py-2 flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-slate-400">{t('game.pot')}</div>
                <div className="text-yellow-400 font-bold">{pot}</div>
              </div>
              <div className="text-center border-l border-slate-600 pl-6">
                <div className="text-slate-400">{t('lobby.blinds')}</div>
                <div className="text-white">{smallBlind}/{bigBlind}</div>
              </div>
              <div className="text-center border-l border-slate-600 pl-6">
                <div className="text-slate-400">{t('lobby.players')}</div>
                <div className="text-white">{playerCount}/6</div>
              </div>
            </div>
          </div>

          {/* Community Cards */}
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3, 4].map((idx) => {
              const card = state.communityCards?.[idx];
              const isRevealed = card && Number(card) !== 0;
              return isRevealed ? (
                <PokerCard key={idx} card={Number(card)} />
              ) : (
                <PokerCard key={idx} unknown />
              );
            })}
          </div>

          {/* Players */}
          <div className="grid grid-cols-3 gap-4">
            {playersInfo && playersInfo.players.map((player, idx) => {
              const isOccupied = player && player !== '0x0000000000000000000000000000000000000000';
              const isMe = address && player?.toLowerCase() === address.toLowerCase();
              const isCurrentPlayer = idx === playersInfo.currentPlayerIndex;
              const isFolded = playersInfo.playerFolded[idx];
              const bet = Number(playersInfo.playerBets[idx] || 0);
              const isDealer = idx === playersInfo.dealerIndex;

              if (!isOccupied) {
                return (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 text-center border border-dashed border-slate-600">
                    <span className="text-slate-500 text-sm">{t('game.empty_seat')}</span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`rounded-lg p-3 border-2 ${
                    isCurrentPlayer ? 'bg-emerald-800 border-yellow-500' : 'bg-slate-800 border-slate-700'
                  } ${isFolded ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                      {isMe ? t('game.player_status.you') : `${player.slice(0, 6)}...`}
                    </span>
                    {isDealer && <span className="text-xs bg-yellow-600 text-black px-1 rounded">D</span>}
                  </div>
                  {bet > 0 && <div className="text-yellow-400 text-sm">Bet: {bet}</div>}
                  {isFolded && <div className="text-red-400 text-xs">{t('game.player_status.folded')}</div>}
                  {isCurrentPlayer && !isFolded && (
                    <div className="text-yellow-400 text-xs">{t('game.player_status.in_action')}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {state.error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{state.error}</p>
          </div>
        )}

        {/* Action Panel */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          {/* Game Ended */}
          {gameState === 6 && (
            <div className="text-center p-6 bg-yellow-900/30 rounded-lg mb-4">
              <h3 className="text-2xl font-bold text-white mb-2">Game Over</h3>
              {winnerInfo && winnerInfo.winnerIndex !== 255 && (
                <p className="text-yellow-400">
                  Winner: {winnerInfo.winnerAddress.slice(0, 6)}...{winnerInfo.winnerAddress.slice(-4)}
                  {address && winnerInfo.winnerAddress.toLowerCase() === address.toLowerCase() && ' (You!)'}
                </p>
              )}
              <button onClick={onBack} className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded">
                Back to Lobby
              </button>
            </div>
          )}

          {/* Waiting for players */}
          {gameState === 0 && playerCount < 2 && (
            <div className="text-center p-4 bg-blue-900/30 rounded-lg mb-4">
              <p className="text-blue-300">Waiting for players... (need at least 2)</p>
            </div>
          )}

          {/* Start Game */}
          {gameState === 0 && playerCount >= 2 && (
            <div className="text-center p-4 bg-purple-900/30 rounded-lg mb-4">
              {myPlayerIndex !== null && state.tableInfo && myPlayerIndex === Number(state.tableInfo[4]) ? (
                <button
                  onClick={handleStartGame}
                  disabled={isStartingGame || state.isLoading}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                >
                  {isStartingGame ? t('game.starting') : t('game.start_game')}
                </button>
              ) : (
                <p className="text-purple-300">Waiting for dealer to start...</p>
              )}
            </div>
          )}

          {/* Showdown */}
          {gameState === 5 && decryptedCards.card1 !== null && decryptedCards.card2 !== null && !hasRevealedCards && (
            <div className="text-center p-4 bg-purple-900/30 rounded-lg mb-4">
              <p className="text-purple-300 mb-3">{t('game.reveal_cards_desc')}</p>
              <button
                onClick={async () => {
                  try {
                    setActionInProgress(true);
                    await contractService.revealCards(tableId, decryptedCards.card1!, decryptedCards.card2!);
                    setHasRevealedCards(true);
                    await loadGameInfo();
                  } catch (err) {
                    alert('Failed: ' + (err as Error).message);
                    setHasRevealedCards(false);
                  } finally {
                    setActionInProgress(false);
                  }
                }}
                disabled={actionInProgress}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {actionInProgress ? t('game.revealing') : t('game.reveal_cards')}
              </button>
            </div>
          )}

          {gameState === 5 && hasRevealedCards && (
            <div className="text-center p-4 bg-green-900/30 rounded-lg mb-4">
              <p className="text-green-300">{t('game.waiting_others_reveal')}</p>
            </div>
          )}

          {/* Your Hand */}
          <div className="flex justify-center mb-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-2 text-center">{t('game.your_hand')}</div>
              <div className="flex gap-2 justify-center">
                {gameState === 0 ? (
                  <>
                    <PokerCard isHidden />
                    <PokerCard isHidden />
                  </>
                ) : decryptedCards.card1 !== null && decryptedCards.card2 !== null ? (
                  <>
                    <PokerCard card={decryptedCards.card1} />
                    <PokerCard card={decryptedCards.card2} />
                  </>
                ) : isDecrypting ? (
                  <>
                    <div className="w-12 h-16 bg-slate-600 rounded flex items-center justify-center">
                      <span className="text-xs text-slate-400">...</span>
                    </div>
                    <div className="w-12 h-16 bg-slate-600 rounded flex items-center justify-center">
                      <span className="text-xs text-slate-400">...</span>
                    </div>
                  </>
                ) : (
                  <>
                    <PokerCard isHidden />
                    <PokerCard isHidden />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Turn Indicator */}
          {myPlayerIndex !== null && state.tableInfo && gameState !== 0 && gameState !== 5 && gameState !== 6 && (
            <div className="text-center mb-4">
              {myPlayerIndex === Number(state.tableInfo[3]) ? (
                <span className="text-emerald-400 font-medium">{t('game.your_turn_action')}</span>
              ) : (
                <span className="text-slate-400">{t('game.waiting_for_other_players')}</span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {gameState !== 5 && gameState !== 6 && (
            <div className="flex justify-center gap-3">
              {(() => {
                const currentPlayerIndex = state.tableInfo ? Number(state.tableInfo[3]) : null;
                const isMyTurn = myPlayerIndex !== null && currentPlayerIndex !== null && myPlayerIndex === currentPlayerIndex;
                const isDisabled = actionInProgress || state.isLoading || !isMyTurn || gameState === 0 || playerCount < 2;

                return (
                  <>
                    <button
                      onClick={handleFold}
                      disabled={isDisabled}
                      className="bg-red-700 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('game.actions.fold')}
                    </button>
                    <button
                      onClick={handleCheck}
                      disabled={isDisabled}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('game.actions.check')}
                    </button>
                    <button
                      onClick={handleCall}
                      disabled={isDisabled}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('game.actions.call')}
                    </button>
                    <button
                      onClick={handleBet}
                      disabled={isDisabled}
                      className="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('game.actions.raise')}
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
