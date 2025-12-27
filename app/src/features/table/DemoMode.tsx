/**
 * Demo Mode - Single Player Poker Demo
 * Allows users to experience the game without smart contracts
 */

import { useState, useEffect, useCallback } from 'react';
import { LocaleSwitch } from '../../shared/ui/LocaleSwitch';

// Card suits and ranks
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Game phases
type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

interface Player {
  id: number;
  name: string;
  chips: number;
  cards: number[];
  bet: number;
  folded: boolean;
  isBot: boolean;
  isDealer: boolean;
  avatar: string;
  color: string;
}

// Poker Card Component
function PokerCard({ card, isHidden = false, unknown = false }: { card?: number; isHidden?: boolean; unknown?: boolean }) {
  if (unknown) {
    return (
      <div className="w-16 h-24 bg-white rounded-lg shadow-lg flex items-center justify-center opacity-30 border border-gray-300">
        <span className="text-black font-bold text-2xl">?</span>
      </div>
    );
  }

  if (isHidden || card === undefined) {
    return (
      <div className="w-16 h-24 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg shadow-lg flex items-center justify-center border-2 border-blue-600">
        <span className="text-4xl opacity-50">🂠</span>
      </div>
    );
  }

  const cardIndex = card - 1;
  const suit = SUITS[Math.floor(cardIndex / 13)];
  const rank = RANKS[cardIndex % 13];
  const isRed = suit === '♥' || suit === '♦';

  return (
    <div className="w-16 h-24 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center border border-gray-200">
      <span className={`text-lg font-bold ${isRed ? 'text-red-600' : 'text-gray-800'}`}>{rank}</span>
      <span className={`text-2xl ${isRed ? 'text-red-600' : 'text-gray-800'}`}>{suit}</span>
    </div>
  );
}

interface DemoModeProps {
  onBack: () => void;
}

export function DemoMode({ onBack }: DemoModeProps) {

  // Game state
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [communityCards, setCommunityCards] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [message, setMessage] = useState('Click "Start Game" to begin!');
  const [winner, setWinner] = useState<Player | null>(null);

  // Players (you + 3 bots)
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'You', chips: 1000, cards: [], bet: 0, folded: false, isBot: false, isDealer: true, avatar: '👤', color: '#3b82f6' },
    { id: 1, name: 'Bot Alice', chips: 1000, cards: [], bet: 0, folded: false, isBot: true, isDealer: false, avatar: '🤖', color: '#10b981' },
    { id: 2, name: 'Bot Bob', chips: 1000, cards: [], bet: 0, folded: false, isBot: true, isDealer: false, avatar: '🤖', color: '#f59e0b' },
    { id: 3, name: 'Bot Charlie', chips: 1000, cards: [], bet: 0, folded: false, isBot: true, isDealer: false, avatar: '🤖', color: '#ef4444' },
  ]);

  const smallBlind = 10;
  const bigBlind = 20;

  // Shuffle deck
  const shuffleDeck = useCallback(() => {
    const newDeck = Array.from({ length: 52 }, (_, i) => i + 1);
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  }, []);

  // Start new game
  const startGame = useCallback(() => {
    const newDeck = shuffleDeck();
    setDeck(newDeck);

    // Reset players
    const resetPlayers: Player[] = players.map((p) => ({
      ...p,
      cards: [] as number[],
      bet: 0,
      folded: false,
      chips: p.chips <= 0 ? 1000 : p.chips, // Refill if broke
    }));

    // Deal cards
    let deckIndex = 0;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < resetPlayers.length; j++) {
        resetPlayers[j].cards.push(newDeck[deckIndex++]);
      }
    }

    // Post blinds
    resetPlayers[1].bet = smallBlind;
    resetPlayers[1].chips -= smallBlind;
    resetPlayers[2].bet = bigBlind;
    resetPlayers[2].chips -= bigBlind;

    setPlayers(resetPlayers);
    setDeck(newDeck.slice(deckIndex));
    setPot(smallBlind + bigBlind);
    setCurrentBet(bigBlind);
    setCurrentPlayerIndex(3 % resetPlayers.length); // UTG position
    setCommunityCards([]);
    setPhase('preflop');
    setWinner(null);
    setMessage('Your turn! Choose an action.');
  }, [players, shuffleDeck, smallBlind, bigBlind]);

  // Get active players
  const getActivePlayers = useCallback(() => {
    return players.filter(p => !p.folded && p.chips > 0);
  }, [players]);

  // Check if betting round is complete
  const isBettingRoundComplete = useCallback(() => {
    const activePlayers = getActivePlayers();
    if (activePlayers.length <= 1) return true;

    const maxBet = Math.max(...activePlayers.map(p => p.bet));
    return activePlayers.every(p => p.bet === maxBet || p.chips === 0);
  }, [getActivePlayers]);

  // Move to next phase
  const nextPhase = useCallback(() => {
    const currentDeck = [...deck];

    // Reset bets for new round
    const resetPlayers = players.map(p => ({ ...p, bet: 0 }));
    setPlayers(resetPlayers);
    setCurrentBet(0);

    switch (phase) {
      case 'preflop':
        // Deal flop (3 cards)
        setCommunityCards([currentDeck[0], currentDeck[1], currentDeck[2]]);
        setDeck(currentDeck.slice(3));
        setPhase('flop');
        setMessage('Flop dealt! Your turn.');
        break;
      case 'flop':
        // Deal turn (1 card)
        setCommunityCards(prev => [...prev, currentDeck[0]]);
        setDeck(currentDeck.slice(1));
        setPhase('turn');
        setMessage('Turn dealt! Your turn.');
        break;
      case 'turn':
        // Deal river (1 card)
        setCommunityCards(prev => [...prev, currentDeck[0]]);
        setDeck(currentDeck.slice(1));
        setPhase('river');
        setMessage('River dealt! Your turn.');
        break;
      case 'river':
        // Showdown
        setPhase('showdown');
        determineWinner();
        break;
    }

    // Reset to first active player
    const firstActive = resetPlayers.findIndex(p => !p.folded);
    setCurrentPlayerIndex(firstActive >= 0 ? firstActive : 0);
  }, [deck, phase, players]);

  // Determine winner (simplified - random for demo)
  const determineWinner = useCallback(() => {
    const activePlayers = getActivePlayers();
    if (activePlayers.length === 0) return;

    // For demo, pick random winner among active players
    const winnerIdx = Math.floor(Math.random() * activePlayers.length);
    const gameWinner = activePlayers[winnerIdx];

    // Award pot
    const updatedPlayers = players.map(p =>
      p.id === gameWinner.id ? { ...p, chips: p.chips + pot } : p
    );
    setPlayers(updatedPlayers);
    setWinner(gameWinner);
    setPhase('finished');
    setMessage(`${gameWinner.name} wins ${pot} chips!`);
  }, [getActivePlayers, players, pot]);

  // Find next active player
  const findNextPlayer = useCallback((fromIndex: number) => {
    let next = (fromIndex + 1) % players.length;
    let count = 0;
    while (count < players.length) {
      if (!players[next].folded) return next;
      next = (next + 1) % players.length;
      count++;
    }
    return -1;
  }, [players]);

  // Player action
  const handleAction = useCallback((action: 'fold' | 'check' | 'call' | 'raise') => {
    if (phase === 'waiting' || phase === 'showdown' || phase === 'finished') return;
    if (currentPlayerIndex !== 0) return; // Not player's turn

    const updatedPlayers = [...players];
    const player = updatedPlayers[0];

    switch (action) {
      case 'fold':
        player.folded = true;
        setMessage('You folded.');
        break;
      case 'check':
        if (currentBet > player.bet) {
          setMessage('Cannot check - must call or fold!');
          return;
        }
        setMessage('You checked.');
        break;
      case 'call':
        const callAmount = currentBet - player.bet;
        if (callAmount > player.chips) {
          // All-in
          setPot(prev => prev + player.chips);
          player.bet += player.chips;
          player.chips = 0;
        } else {
          player.chips -= callAmount;
          player.bet = currentBet;
          setPot(prev => prev + callAmount);
        }
        setMessage(`You called ${callAmount}.`);
        break;
      case 'raise':
        const raiseAmount = bigBlind * 2;
        const totalBet = currentBet + raiseAmount;
        const needed = totalBet - player.bet;
        if (needed > player.chips) {
          setMessage('Not enough chips to raise!');
          return;
        }
        player.chips -= needed;
        player.bet = totalBet;
        setPot(prev => prev + needed);
        setCurrentBet(totalBet);
        setMessage(`You raised to ${totalBet}.`);
        break;
    }

    setPlayers(updatedPlayers);

    // Check if only one player left
    const activePlayers = updatedPlayers.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      const lastPlayer = activePlayers[0];
      const finalPlayers = updatedPlayers.map(p =>
        p.id === lastPlayer.id ? { ...p, chips: p.chips + pot } : p
      );
      setPlayers(finalPlayers);
      setWinner(lastPlayer);
      setPhase('finished');
      setMessage(`${lastPlayer.name} wins ${pot} chips! (Everyone else folded)`);
      return;
    }

    // Move to next player
    const nextIdx = findNextPlayer(0);
    setCurrentPlayerIndex(nextIdx);
  }, [phase, currentPlayerIndex, players, currentBet, pot, bigBlind, findNextPlayer]);

  // Bot AI (simple)
  useEffect(() => {
    if (phase === 'waiting' || phase === 'showdown' || phase === 'finished') return;
    if (currentPlayerIndex === 0) return; // Player's turn

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.folded) {
      const next = findNextPlayer(currentPlayerIndex);
      if (next === 0 || next === -1) {
        // Back to player or no active players
        if (isBettingRoundComplete()) {
          nextPhase();
        } else {
          setCurrentPlayerIndex(0);
        }
      } else {
        setCurrentPlayerIndex(next);
      }
      return;
    }

    // Bot decision with delay
    const timer = setTimeout(() => {
      const updatedPlayers = [...players];
      const bot = updatedPlayers[currentPlayerIndex];

      // Simple AI: 70% call, 20% fold, 10% raise
      const rand = Math.random();

      if (rand < 0.1 && bot.chips > currentBet * 2) {
        // Raise
        const raiseAmount = bigBlind;
        const totalBet = currentBet + raiseAmount;
        const needed = totalBet - bot.bet;
        bot.chips -= needed;
        bot.bet = totalBet;
        setPot(prev => prev + needed);
        setCurrentBet(totalBet);
        setMessage(`${bot.name} raises to ${totalBet}!`);
      } else if (rand < 0.3 && currentBet > bot.bet) {
        // Fold
        bot.folded = true;
        setMessage(`${bot.name} folds.`);
      } else {
        // Call/Check
        const callAmount = currentBet - bot.bet;
        if (callAmount > 0) {
          if (callAmount >= bot.chips) {
            setPot(prev => prev + bot.chips);
            bot.bet += bot.chips;
            bot.chips = 0;
            setMessage(`${bot.name} goes all-in!`);
          } else {
            bot.chips -= callAmount;
            bot.bet = currentBet;
            setPot(prev => prev + callAmount);
            setMessage(`${bot.name} calls.`);
          }
        } else {
          setMessage(`${bot.name} checks.`);
        }
      }

      setPlayers(updatedPlayers);

      // Check if only one player left
      const activePlayers = updatedPlayers.filter(p => !p.folded);
      if (activePlayers.length === 1) {
        const lastPlayer = activePlayers[0];
        const finalPlayers = updatedPlayers.map(p =>
          p.id === lastPlayer.id ? { ...p, chips: p.chips + pot } : p
        );
        setPlayers(finalPlayers);
        setWinner(lastPlayer);
        setPhase('finished');
        setMessage(`${lastPlayer.name} wins ${pot} chips!`);
        return;
      }

      // Find next player
      const next = findNextPlayer(currentPlayerIndex);

      if (next === 0) {
        // Back to human player
        if (isBettingRoundComplete()) {
          nextPhase();
        } else {
          setCurrentPlayerIndex(0);
          setMessage('Your turn!');
        }
      } else if (next === -1) {
        // No active players
        nextPhase();
      } else {
        setCurrentPlayerIndex(next);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentPlayerIndex, players, phase, currentBet, pot, bigBlind, findNextPlayer, isBettingRoundComplete, nextPhase]);

  const isMyTurn = currentPlayerIndex === 0 && phase !== 'waiting' && phase !== 'showdown' && phase !== 'finished';

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #0d2818 0%, #1a472a 50%, #0a5f38 100%)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-2xl p-4 mb-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-yellow-400">🎮 Demo Mode</span>
              <span className="text-sm text-gray-400">Single Player Practice</span>
            </div>
            <div className="flex items-center gap-4">
              <LocaleSwitch />
              <button
                onClick={onBack}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all"
              >
                🚪 Exit Demo
              </button>
            </div>
          </div>
        </div>

        {/* Game Table */}
        <div className="relative h-[500px] overflow-hidden">
          {/* Table */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
               style={{ width: '700px', height: '350px' }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '8px solid #000',
              background: '#0d6832',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)'
            }}></div>

            {/* Center - Pot and Community Cards */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
              {/* Pot */}
              <div className="bg-black/40 backdrop-blur-sm px-6 py-2 rounded-full mb-4 border border-yellow-500/50">
                <span className="text-yellow-400 font-bold text-xl">Pot: {pot}</span>
              </div>

              {/* Community Cards */}
              <div className="flex gap-2 p-3 bg-black/30 rounded-full">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const card = communityCards[idx];
                  return card ? (
                    <PokerCard key={idx} card={card} />
                  ) : (
                    <PokerCard key={idx} unknown />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Players */}
          {players.map((player, idx) => {
            const positions = [
              { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
              { top: '50%', left: '50px', transform: 'translateY(-50%)' },
              { top: '20px', left: '50%', transform: 'translateX(-50%)' },
              { top: '50%', right: '50px', transform: 'translateY(-50%)' },
            ];

            return (
              <div key={player.id} className="absolute" style={positions[idx]}>
                <div
                  className={`p-3 rounded-2xl min-w-[140px] ${
                    currentPlayerIndex === idx && phase !== 'waiting' && phase !== 'finished'
                      ? 'ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(212,175,55,0.6)]'
                      : ''
                  } ${player.folded ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: player.color }}
                >
                  <div className="flex flex-col items-center">
                    {/* Avatar */}
                    <div className="text-3xl mb-1">{player.avatar}</div>

                    {/* Name */}
                    <p className="text-white font-bold text-sm">{player.name}</p>

                    {/* Chips */}
                    <p className="text-yellow-300 text-xs">{player.chips} chips</p>

                    {/* Bet */}
                    {player.bet > 0 && (
                      <div className="mt-1 bg-black/50 px-2 py-0.5 rounded-full">
                        <span className="text-yellow-400 text-xs font-bold">Bet: {player.bet}</span>
                      </div>
                    )}

                    {/* Status */}
                    {player.folded && (
                      <span className="text-red-300 text-xs mt-1">FOLDED</span>
                    )}

                    {/* Cards - Only show player's cards */}
                    {idx === 0 && player.cards.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        <PokerCard card={player.cards[0]} />
                        <PokerCard card={player.cards[1]} />
                      </div>
                    )}

                    {/* Bot cards - hidden */}
                    {idx !== 0 && player.cards.length > 0 && !player.folded && (
                      <div className="flex gap-1 mt-2">
                        <PokerCard isHidden />
                        <PokerCard isHidden />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4 text-center">
          <p className="text-white text-lg">{message}</p>
          <p className="text-gray-400 text-sm mt-1">
            Phase: {phase.toUpperCase()} | Current Bet: {currentBet}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl p-6 border-2 border-slate-700">
          {phase === 'waiting' && (
            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all"
            >
              🎮 Start Game
            </button>
          )}

          {phase === 'finished' && (
            <div className="text-center">
              {winner && (
                <div className="mb-4 p-6 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl">
                  <span className="text-6xl">🏆</span>
                  <p className="text-2xl font-bold text-white mt-2">{winner.name} Wins!</p>
                  <p className="text-yellow-100">Won {pot} chips</p>
                </div>
              )}
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all"
              >
                🔄 Play Again
              </button>
            </div>
          )}

          {phase !== 'waiting' && phase !== 'finished' && phase !== 'showdown' && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleAction('fold')}
                disabled={!isMyTurn}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  isMyTurn
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Fold
              </button>
              <button
                onClick={() => handleAction('check')}
                disabled={!isMyTurn || currentBet > players[0].bet}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  isMyTurn && currentBet <= players[0].bet
                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Check
              </button>
              <button
                onClick={() => handleAction('call')}
                disabled={!isMyTurn}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  isMyTurn
                    ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Call {currentBet - players[0].bet > 0 ? currentBet - players[0].bet : ''}
              </button>
              <button
                onClick={() => handleAction('raise')}
                disabled={!isMyTurn || players[0].chips < currentBet + bigBlind * 2}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  isMyTurn && players[0].chips >= currentBet + bigBlind * 2
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Raise +{bigBlind * 2}
              </button>
            </div>
          )}

          {phase === 'showdown' && (
            <div className="text-center">
              <p className="text-white text-xl mb-4">Showdown! Revealing cards...</p>
            </div>
          )}

          {!isMyTurn && phase !== 'waiting' && phase !== 'finished' && phase !== 'showdown' && (
            <p className="text-center text-gray-400 mt-4">Waiting for {players[currentPlayerIndex]?.name}...</p>
          )}
        </div>
      </div>
    </div>
  );
}
