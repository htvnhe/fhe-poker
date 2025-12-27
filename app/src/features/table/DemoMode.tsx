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

// Beautiful Poker Card Component
function PokerCard({ card, isHidden = false, unknown = false, size = 'normal' }: {
  card?: number;
  isHidden?: boolean;
  unknown?: boolean;
  size?: 'small' | 'normal' | 'large';
}) {
  // Size configurations
  const sizeConfig = {
    small: { w: 'w-12', h: 'h-[72px]', corner: 'text-[10px]', suit: 'text-xs', center: 'text-2xl', pip: 'text-[8px]' },
    normal: { w: 'w-16', h: 'h-24', corner: 'text-xs', suit: 'text-sm', center: 'text-4xl', pip: 'text-[10px]' },
    large: { w: 'w-20', h: 'h-[120px]', corner: 'text-sm', suit: 'text-base', center: 'text-5xl', pip: 'text-xs' },
  };
  const s = sizeConfig[size];

  // Unknown card (community cards not revealed)
  if (unknown) {
    return (
      <div className={`${s.w} ${s.h} relative rounded-xl overflow-hidden opacity-40`}
        style={{
          background: 'linear-gradient(145deg, #f5f5f5, #e0e0e0)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400 font-bold text-3xl">?</span>
        </div>
      </div>
    );
  }

  // Card back (hidden cards)
  if (isHidden || card === undefined) {
    return (
      <div className={`${s.w} ${s.h} relative rounded-xl overflow-hidden transform hover:scale-105 transition-transform cursor-pointer`}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1e3a5f 100%)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '3px solid #2d4a6f',
        }}>
        {/* Diamond pattern */}
        <div className="absolute inset-2 rounded-lg overflow-hidden"
          style={{
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 8px,
                rgba(255,215,0,0.1) 8px,
                rgba(255,215,0,0.1) 9px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 8px,
                rgba(255,215,0,0.1) 8px,
                rgba(255,215,0,0.1) 9px
              )
            `,
          }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #ffd700, #b8860b)',
                boxShadow: '0 2px 10px rgba(255,215,0,0.5)',
              }}>
              <span className="text-xl">♠</span>
            </div>
          </div>
        </div>
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Revealed card
  const cardIndex = card - 1;
  const suitIndex = Math.floor(cardIndex / 13);
  const suit = SUITS[suitIndex];
  const rank = RANKS[cardIndex % 13];
  const isRed = suit === '♥' || suit === '♦';
  const color = isRed ? '#dc2626' : '#1f2937';

  // Get suit symbol for display
  const getSuitSymbol = (s: string) => {
    switch(s) {
      case '♠': return { symbol: '♠', name: 'spade' };
      case '♥': return { symbol: '♥', name: 'heart' };
      case '♦': return { symbol: '♦', name: 'diamond' };
      case '♣': return { symbol: '♣', name: 'club' };
      default: return { symbol: s, name: 'unknown' };
    }
  };
  const suitInfo = getSuitSymbol(suit);

  return (
    <div className={`${s.w} ${s.h} relative rounded-xl overflow-hidden transform hover:scale-105 hover:-translate-y-1 transition-all cursor-pointer`}
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.2)',
        border: '1px solid rgba(0,0,0,0.1)',
      }}>

      {/* Inner border */}
      <div className="absolute inset-1 rounded-lg border border-gray-200 pointer-events-none" />

      {/* Top-left corner */}
      <div className="absolute top-1.5 left-1.5 flex flex-col items-center leading-none">
        <span className={`${s.corner} font-bold`} style={{ color }}>{rank}</span>
        <span className={`${s.pip}`} style={{ color }}>{suit}</span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-1.5 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span className={`${s.corner} font-bold`} style={{ color }}>{rank}</span>
        <span className={`${s.pip}`} style={{ color }}>{suit}</span>
      </div>

      {/* Center suit - large */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${s.center} drop-shadow-sm`} style={{ color }}>{suitInfo.symbol}</span>
      </div>

      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none"
        style={{ clipPath: 'polygon(0 0, 100% 0, 0 50%)' }} />
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

  // Chip stack component
  const ChipStack = ({ amount, color = 'gold' }: { amount: number; color?: string }) => {
    if (amount <= 0) return null;
    const chipColors: Record<string, string> = {
      gold: 'from-yellow-400 to-yellow-600',
      red: 'from-red-400 to-red-600',
      blue: 'from-blue-400 to-blue-600',
      green: 'from-green-400 to-green-600',
    };
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-8 h-2 rounded-full bg-gradient-to-b ${chipColors[color]} border border-white/30`}
              style={{
                marginTop: i === 0 ? 0 : '-4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          ))}
        </div>
        <span className="text-yellow-300 text-xs font-bold mt-1">{amount}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 50%, #0a0a12 100%)',
    }}>
      {/* Casino ambient lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4">
        {/* Header - Casino style */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg" style={{
              background: 'linear-gradient(135deg, #b8860b, #daa520)',
              boxShadow: '0 4px 15px rgba(218,165,32,0.3)',
            }}>
              <span className="text-black font-bold text-lg">♠ STEALTH HOLD'EM ♠</span>
            </div>
            <div className="px-3 py-1 bg-green-600/80 rounded-full">
              <span className="text-white text-sm">Demo Table</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LocaleSwitch />
            <button
              onClick={onBack}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="relative" style={{ height: '650px' }}>
          {/* Poker Table */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
               style={{ width: '800px', height: '400px' }}>
            {/* Wood rim */}
            <div className="absolute inset-0 rounded-[200px]" style={{
              background: 'linear-gradient(145deg, #8B4513, #5D3A1A, #8B4513)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)',
              padding: '12px',
            }}>
              {/* Felt surface */}
              <div className="w-full h-full rounded-[190px] relative overflow-hidden" style={{
                background: 'radial-gradient(ellipse at center, #1a5f3c 0%, #0d4528 60%, #0a3a20 100%)',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)',
              }}>
                {/* Felt texture */}
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }} />

                {/* Table border line */}
                <div className="absolute inset-8 rounded-[150px] border-2 border-yellow-600/30" />

                {/* Center area - Pot & Community Cards */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  {/* Pot display */}
                  <div className="mb-6 flex items-center gap-3 px-6 py-3 rounded-full" style={{
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)',
                    border: '2px solid rgba(218,165,32,0.5)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}>
                    <div className="flex -space-x-1">
                      {[...Array(Math.min(5, Math.ceil(pot / 50)))].map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 border-2 border-yellow-300" style={{
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        }} />
                      ))}
                    </div>
                    <span className="text-yellow-400 font-bold text-2xl drop-shadow-lg">{pot}</span>
                  </div>

                  {/* Community Cards */}
                  <div className="flex gap-3 p-4 rounded-2xl" style={{
                    background: 'rgba(0,0,0,0.3)',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
                  }}>
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const card = communityCards[idx];
                      const isFlop = idx < 3 && phase !== 'waiting' && phase !== 'preflop';
                      const isTurn = idx === 3 && (phase === 'turn' || phase === 'river' || phase === 'showdown' || phase === 'finished');
                      const isRiver = idx === 4 && (phase === 'river' || phase === 'showdown' || phase === 'finished');
                      const shouldShow = isFlop || isTurn || isRiver;

                      return (
                        <div key={idx} className="transform hover:scale-105 transition-transform">
                          {shouldShow && card ? (
                            <PokerCard card={card} />
                          ) : (
                            <PokerCard unknown />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Players around the table */}
          {players.map((player, idx) => {
            // Position players around the oval table - adjusted for card visibility
            const positions: React.CSSProperties[] = [
              { bottom: '0px', left: '50%', transform: 'translateX(-50%)' }, // You - bottom center
              { bottom: '150px', left: '60px' }, // Left bottom
              { top: '100px', left: '60px' }, // Left top
              { top: '0px', left: '50%', transform: 'translateX(-50%)' }, // Top center
            ];

            // Bet chip positions (closer to table center)
            const betPositions: React.CSSProperties[] = [
              { bottom: '220px', left: '50%', transform: 'translateX(-50%)' },
              { bottom: '250px', left: '200px' },
              { top: '200px', left: '200px' },
              { top: '180px', left: '50%', transform: 'translateX(-50%)' },
            ];

            const isActive = currentPlayerIndex === idx && phase !== 'waiting' && phase !== 'finished';

            return (
              <div key={player.id}>
                {/* Bet chips on table */}
                {player.bet > 0 && (
                  <div className="absolute z-20" style={betPositions[idx]}>
                    <ChipStack amount={player.bet} color={idx === 0 ? 'gold' : 'red'} />
                  </div>
                )}

                {/* Player seat */}
                <div className="absolute z-10" style={positions[idx]}>
                  <div className={`relative ${player.folded ? 'opacity-40' : ''}`}>
                    {/* Active player glow */}
                    {isActive && (
                      <div className="absolute -inset-2 rounded-2xl animate-pulse" style={{
                        background: 'radial-gradient(ellipse, rgba(34,197,94,0.4) 0%, transparent 70%)',
                      }} />
                    )}

                    {/* Player card */}
                    <div className={`relative rounded-xl overflow-hidden ${isActive ? 'ring-2 ring-green-400' : ''}`} style={{
                      background: 'linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%)',
                      boxShadow: isActive
                        ? '0 0 30px rgba(34,197,94,0.5), 0 10px 30px rgba(0,0,0,0.5)'
                        : '0 10px 30px rgba(0,0,0,0.5)',
                      minWidth: idx === 0 ? '220px' : '140px',
                    }}>
                      {/* Dealer button */}
                      {player.isDealer && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10" style={{
                          background: 'linear-gradient(135deg, #fff, #ddd)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          border: '2px solid #333',
                        }}>
                          D
                        </div>
                      )}

                      {/* Player info */}
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{
                            background: player.color,
                            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)',
                          }}>
                            {idx === 0 ? '😎' : '🤖'}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{player.name}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400 text-xs">💰</span>
                              <span className="text-yellow-400 text-xs font-mono">{player.chips}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        {player.folded && (
                          <div className="text-center py-1 bg-red-600/30 rounded text-red-400 text-xs font-bold">
                            FOLDED
                          </div>
                        )}
                        {isActive && !player.folded && (
                          <div className="text-center py-1 bg-green-600/30 rounded text-green-400 text-xs font-bold animate-pulse">
                            THINKING...
                          </div>
                        )}
                      </div>

                      {/* Player's hole cards */}
                      {player.cards.length > 0 && !player.folded && (
                        <div className="px-3 pb-3">
                          <div className={`flex justify-center ${idx === 0 ? 'gap-3' : 'gap-1'}`}>
                            {idx === 0 ? (
                              // Show player's cards - LARGE size
                              <>
                                <PokerCard card={player.cards[0]} size="large" />
                                <PokerCard card={player.cards[1]} size="large" />
                              </>
                            ) : (
                              // Hide bot cards
                              <>
                                <PokerCard isHidden size="small" />
                                <PokerCard isHidden size="small" />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Phase indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {['preflop', 'flop', 'turn', 'river'].map((p, i) => (
                <div key={p} className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    phase === p ? 'bg-green-400' :
                    ['preflop', 'flop', 'turn', 'river'].indexOf(phase) > i ? 'bg-green-600' : 'bg-gray-600'
                  }`} />
                  {i < 3 && <div className="w-4 h-0.5 bg-gray-600 mx-1" />}
                </div>
              ))}
              <span className="ml-2 text-white text-sm font-medium uppercase">{phase}</span>
            </div>
          </div>
        </div>

        {/* Message Bar */}
        <div className="text-center py-3 px-6 rounded-xl mb-4" style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <p className="text-white text-lg font-medium">{message}</p>
        </div>

        {/* Action Panel - Casino Style */}
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(180deg, #1f1f2e 0%, #15151f 100%)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {phase === 'waiting' && (
            <button
              onClick={startGame}
              className="w-full py-5 rounded-xl text-xl font-bold transition-all transform hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
              }}
            >
              <span className="text-white drop-shadow-lg">🎮 START GAME</span>
            </button>
          )}

          {phase === 'finished' && (
            <div className="text-center">
              {winner && (
                <div className="mb-6 py-8 rounded-2xl relative overflow-hidden" style={{
                  background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                }}>
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
                  }} />
                  <div className="relative">
                    <span className="text-7xl block mb-2">🏆</span>
                    <p className="text-3xl font-black text-white drop-shadow-lg">{winner.name} WINS!</p>
                    <p className="text-xl text-yellow-100 mt-2">+{pot} chips</p>
                  </div>
                </div>
              )}
              <button
                onClick={startGame}
                className="px-12 py-4 rounded-xl text-lg font-bold transition-all transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
                }}
              >
                <span className="text-white">🔄 PLAY AGAIN</span>
              </button>
            </div>
          )}

          {phase !== 'waiting' && phase !== 'finished' && phase !== 'showdown' && (
            <div className="flex justify-center gap-3">
              {/* Fold Button */}
              <button
                onClick={() => handleAction('fold')}
                disabled={!isMyTurn}
                className="group relative px-6 py-4 rounded-xl font-bold text-lg transition-all"
                style={{
                  background: isMyTurn
                    ? 'linear-gradient(180deg, #dc2626, #b91c1c)'
                    : 'linear-gradient(180deg, #4b5563, #374151)',
                  boxShadow: isMyTurn ? '0 4px 15px rgba(220,38,38,0.3)' : 'none',
                  opacity: isMyTurn ? 1 : 0.5,
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                }}
              >
                <span className="text-white">FOLD</span>
              </button>

              {/* Check Button */}
              <button
                onClick={() => handleAction('check')}
                disabled={!isMyTurn || currentBet > players[0].bet}
                className="px-6 py-4 rounded-xl font-bold text-lg transition-all"
                style={{
                  background: isMyTurn && currentBet <= players[0].bet
                    ? 'linear-gradient(180deg, #4b5563, #374151)'
                    : 'linear-gradient(180deg, #374151, #1f2937)',
                  boxShadow: isMyTurn && currentBet <= players[0].bet ? '0 4px 15px rgba(75,85,99,0.3)' : 'none',
                  opacity: isMyTurn && currentBet <= players[0].bet ? 1 : 0.5,
                  cursor: isMyTurn && currentBet <= players[0].bet ? 'pointer' : 'not-allowed',
                }}
              >
                <span className="text-white">CHECK</span>
              </button>

              {/* Call Button - Primary action */}
              <button
                onClick={() => handleAction('call')}
                disabled={!isMyTurn}
                className="px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
                style={{
                  background: isMyTurn
                    ? 'linear-gradient(180deg, #22c55e, #16a34a)'
                    : 'linear-gradient(180deg, #374151, #1f2937)',
                  boxShadow: isMyTurn ? '0 4px 20px rgba(34,197,94,0.4), 0 0 30px rgba(34,197,94,0.2)' : 'none',
                  opacity: isMyTurn ? 1 : 0.5,
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                }}
              >
                <span className="text-white">
                  CALL {currentBet - players[0].bet > 0 && <span className="ml-1 text-yellow-300">{currentBet - players[0].bet}</span>}
                </span>
              </button>

              {/* Raise Button */}
              <button
                onClick={() => handleAction('raise')}
                disabled={!isMyTurn || players[0].chips < currentBet + bigBlind * 2}
                className="px-6 py-4 rounded-xl font-bold text-lg transition-all"
                style={{
                  background: isMyTurn && players[0].chips >= currentBet + bigBlind * 2
                    ? 'linear-gradient(180deg, #fbbf24, #d97706)'
                    : 'linear-gradient(180deg, #374151, #1f2937)',
                  boxShadow: isMyTurn && players[0].chips >= currentBet + bigBlind * 2 ? '0 4px 15px rgba(251,191,36,0.3)' : 'none',
                  opacity: isMyTurn && players[0].chips >= currentBet + bigBlind * 2 ? 1 : 0.5,
                  cursor: isMyTurn && players[0].chips >= currentBet + bigBlind * 2 ? 'pointer' : 'not-allowed',
                }}
              >
                <span className={isMyTurn && players[0].chips >= currentBet + bigBlind * 2 ? 'text-black' : 'text-white'}>
                  RAISE <span className="font-mono">+{bigBlind * 2}</span>
                </span>
              </button>
            </div>
          )}

          {phase === 'showdown' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full" style={{
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.3)',
              }}>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
                <span className="text-purple-300 text-lg font-medium">Revealing cards...</span>
              </div>
            </div>
          )}

          {!isMyTurn && phase !== 'waiting' && phase !== 'finished' && phase !== 'showdown' && (
            <div className="text-center mt-4">
              <span className="text-gray-400">
                Waiting for <span className="text-white font-medium">{players[currentPlayerIndex]?.name}</span>...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
