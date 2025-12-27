/**
 * Demo Mode - Polished Poker Game
 */

import { useState, useEffect, useCallback } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

type Phase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

interface Player {
  id: number;
  name: string;
  chips: number;
  cards: number[];
  bet: number;
  folded: boolean;
  avatar: string;
}

// Premium Card Component
function Card({ value, hidden = false, size = 'normal' }: { value?: number; hidden?: boolean; size?: 'small' | 'normal' | 'large' | 'xlarge' }) {
  const sizes = {
    small: { w: 'w-14', h: 'h-20', rank: 'text-base', suit: 'text-xl', corner: 'text-xs' },
    normal: { w: 'w-24', h: 'h-36', rank: 'text-3xl', suit: 'text-5xl', corner: 'text-sm' },
    large: { w: 'w-32', h: 'h-48', rank: 'text-5xl', suit: 'text-7xl', corner: 'text-lg' },
    xlarge: { w: 'w-40', h: 'h-56', rank: 'text-6xl', suit: 'text-8xl', corner: 'text-xl' },
  };
  const s = sizes[size];

  if (hidden || !value) {
    return (
      <div className={`${s.w} ${s.h} rounded-xl flex items-center justify-center relative overflow-hidden`}
        style={{
          background: 'linear-gradient(145deg, #1a365d, #0d1b2a)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          border: '2px solid #2d4a6f',
        }}>
        <div className="absolute inset-1 rounded-lg opacity-20"
          style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)',
          }} />
        <span className="text-3xl opacity-60">🂠</span>
      </div>
    );
  }

  const idx = value - 1;
  const suit = SUITS[Math.floor(idx / 13)];
  const rank = RANKS[idx % 13];
  const isRed = suit === '♥' || suit === '♦';

  return (
    <div className={`${s.w} ${s.h} rounded-xl flex flex-col items-center justify-center relative overflow-hidden transition-transform hover:scale-105`}
      style={{
        background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
        border: '1px solid #ddd',
      }}>
      {/* Corner pip */}
      <div className="absolute top-2 left-2 flex flex-col items-center leading-tight">
        <span className={`${s.corner} font-bold ${isRed ? 'text-red-500' : 'text-gray-800'}`}>{rank}</span>
        <span className={`${s.corner} ${isRed ? 'text-red-500' : 'text-gray-800'}`}>{suit}</span>
      </div>
      {/* Center */}
      <span className={`${s.rank} font-bold ${isRed ? 'text-red-500' : 'text-gray-800'}`}>{rank}</span>
      <span className={`${s.suit} ${isRed ? 'text-red-500' : 'text-gray-800'}`}>{suit}</span>
      {/* Shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

// Chip Stack
function ChipStack({ amount }: { amount: number }) {
  return (
    <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{
      background: 'linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))',
    }}>
      <div className="flex -space-x-1">
        {[...Array(Math.min(3, Math.ceil(amount / 30)))].map((_, i) => (
          <div key={i} className="w-4 h-4 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 border border-yellow-300" />
        ))}
      </div>
      <span className="text-yellow-400 font-bold text-sm">{amount}</span>
    </div>
  );
}

export function DemoMode({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('waiting');
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [turn, setTurn] = useState(0);
  const [community, setCommunity] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [msg, setMsg] = useState('Press START to begin!');
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'You', chips: 1000, cards: [], bet: 0, folded: false, avatar: '😎' },
    { id: 1, name: 'Alice', chips: 1000, cards: [], bet: 0, folded: false, avatar: '👩' },
    { id: 2, name: 'Bob', chips: 1000, cards: [], bet: 0, folded: false, avatar: '👨' },
  ]);

  const BLIND = 20;

  const shuffle = () => {
    const d = Array.from({ length: 52 }, (_, i) => i + 1);
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  };

  const start = () => {
    const d = shuffle();
    const newPlayers = players.map((p, i) => ({
      ...p,
      cards: [d[i * 2], d[i * 2 + 1]],
      bet: i === 1 ? BLIND / 2 : i === 2 ? BLIND : 0,
      chips: (p.chips <= 0 ? 1000 : p.chips) - (i === 1 ? BLIND / 2 : i === 2 ? BLIND : 0),
      folded: false,
    }));
    setPlayers(newPlayers);
    setDeck(d.slice(6));
    setCommunity([]);
    setPot(BLIND + BLIND / 2);
    setCurrentBet(BLIND);
    setTurn(0);
    setPhase('preflop');
    setMsg('Your turn! Choose action.');
  };

  const nextPhase = useCallback(() => {
    const newPlayers = players.map(p => ({ ...p, bet: 0 }));
    setPlayers(newPlayers);
    setCurrentBet(0);
    setTurn(0);

    if (phase === 'preflop') {
      setCommunity([deck[0], deck[1], deck[2]]);
      setDeck(d => d.slice(3));
      setPhase('flop');
      setMsg('Flop! Your turn.');
    } else if (phase === 'flop') {
      setCommunity(c => [...c, deck[0]]);
      setDeck(d => d.slice(1));
      setPhase('turn');
      setMsg('Turn! Your turn.');
    } else if (phase === 'turn') {
      setCommunity(c => [...c, deck[0]]);
      setDeck(d => d.slice(1));
      setPhase('river');
      setMsg('River! Final round.');
    } else if (phase === 'river') {
      const active = players.filter(p => !p.folded);
      const winner = active[Math.floor(Math.random() * active.length)];
      setPlayers(ps => ps.map(p =>
        p.id === winner.id ? { ...p, chips: p.chips + pot } : p
      ));
      setMsg(`🏆 ${winner.name} wins ${pot} chips!`);
      setPhase('showdown');
    }
  }, [phase, deck, players, pot]);

  const bettingDone = useCallback(() => {
    const active = players.filter(p => !p.folded);
    return active.every(p => p.bet === currentBet);
  }, [players, currentBet]);

  const action = (type: 'fold' | 'call' | 'raise') => {
    if (turn !== 0 || phase === 'waiting' || phase === 'showdown') return;

    const p = { ...players[0] };
    if (type === 'fold') {
      p.folded = true;
      setMsg('You folded.');
    } else if (type === 'call') {
      const amt = currentBet - p.bet;
      p.chips -= amt;
      p.bet = currentBet;
      setPot(pot + amt);
      setMsg('You called.');
    } else if (type === 'raise') {
      const amt = currentBet + BLIND - p.bet;
      p.chips -= amt;
      p.bet = currentBet + BLIND;
      setCurrentBet(currentBet + BLIND);
      setPot(pot + amt);
      setMsg('You raised!');
    }

    const newPlayers = [...players];
    newPlayers[0] = p;
    setPlayers(newPlayers);

    const active = newPlayers.filter(p => !p.folded);
    if (active.length === 1) {
      setPlayers(ps => ps.map(x =>
        x.id === active[0].id ? { ...x, chips: x.chips + pot } : x
      ));
      setMsg(`🏆 ${active[0].name} wins!`);
      setPhase('showdown');
      return;
    }
    setTurn(1);
  };

  useEffect(() => {
    if (phase === 'waiting' || phase === 'showdown') return;
    if (turn === 0) return;

    const timer = setTimeout(() => {
      const p = { ...players[turn] };
      if (p.folded) {
        const next = (turn + 1) % 3;
        if (next === 0) {
          if (bettingDone()) nextPhase();
          else setTurn(0);
        } else setTurn(next);
        return;
      }

      const rand = Math.random();
      if (rand < 0.2 && currentBet > p.bet) {
        p.folded = true;
        setMsg(`${p.name} folds.`);
      } else {
        const amt = currentBet - p.bet;
        p.chips -= amt;
        p.bet = currentBet;
        setPot(pot + amt);
        setMsg(`${p.name} calls.`);
      }

      const newPlayers = [...players];
      newPlayers[turn] = p;
      setPlayers(newPlayers);

      const active = newPlayers.filter(x => !x.folded);
      if (active.length === 1) {
        setPlayers(ps => ps.map(x =>
          x.id === active[0].id ? { ...x, chips: x.chips + pot } : x
        ));
        setMsg(`🏆 ${active[0].name} wins!`);
        setPhase('showdown');
        return;
      }

      const next = (turn + 1) % 3;
      if (next === 0) {
        if (bettingDone()) nextPhase();
        else { setTurn(0); setMsg('Your turn!'); }
      } else setTurn(next);
    }, 800);

    return () => clearTimeout(timer);
  }, [turn, phase, players, currentBet, pot, bettingDone, nextPhase]);

  const isMyTurn = turn === 0 && phase !== 'waiting' && phase !== 'showdown';

  return (
    <div className="min-h-screen p-4" style={{
      background: 'radial-gradient(ellipse at top, #1a3a2a 0%, #0d1f17 50%, #050a08 100%)',
    }}>
      <div className="max-w-4xl mx-auto">

        {/* Header with Balance on left */}
        <div className="flex justify-between items-center mb-4 px-2">
          {/* Left: Balance */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))',
              border: '1px solid rgba(234,179,8,0.3)',
            }}>
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-xs text-white/60">Your Balance</p>
                <p className="text-xl font-bold text-yellow-400">{players[0].chips}</p>
              </div>
            </div>
            {isMyTurn && (
              <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/50 animate-pulse">
                <span className="text-green-400 font-bold">YOUR TURN</span>
              </div>
            )}
          </div>

          {/* Center: Logo */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎰</span>
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
              STEALTH POKER
            </span>
          </div>

          {/* Right: Exit */}
          <button onClick={onBack} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            ✕ Exit
          </button>
        </div>

        {/* Opponents */}
        <div className="flex justify-center gap-6 mb-4">
          {players.slice(1).map(p => (
            <div key={p.id}
              className={`rounded-2xl p-4 transition-all ${p.folded ? 'opacity-40 scale-95' : ''}`}
              style={{
                background: turn === p.id
                  ? 'linear-gradient(180deg, rgba(234,179,8,0.2), rgba(234,179,8,0.1))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                border: turn === p.id ? '2px solid rgba(234,179,8,0.5)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: turn === p.id ? '0 0 20px rgba(234,179,8,0.3)' : 'none',
              }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{ background: 'linear-gradient(135deg, #4a5568, #2d3748)' }}>
                  {p.avatar}
                </div>
                <div>
                  <p className="text-white font-semibold">{p.name}</p>
                  <p className="text-yellow-400 text-sm">💰 {p.chips}</p>
                </div>
              </div>

              <div className="flex gap-1 justify-center">
                {p.cards.length > 0 && !p.folded && (
                  <>
                    <Card hidden size="small" />
                    <Card hidden size="small" />
                  </>
                )}
              </div>

              {p.bet > 0 && (
                <div className="mt-2 flex justify-center">
                  <ChipStack amount={p.bet} />
                </div>
              )}

              {p.folded && (
                <div className="mt-2 text-center text-red-400 text-sm font-bold">FOLDED</div>
              )}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-3xl p-6 mb-4 relative overflow-hidden" style={{
          background: 'radial-gradient(ellipse at center, #1d5a3c 0%, #0f3d27 70%, #0a2a1a 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 10px 40px rgba(0,0,0,0.5)',
          border: '8px solid #3d2914',
        }}>
          {/* Felt texture */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />

          {/* Pot */}
          <div className="relative text-center mb-4">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full" style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))',
              border: '1px solid rgba(234,179,8,0.3)',
            }}>
              <div className="flex -space-x-1">
                {[...Array(Math.min(5, Math.ceil(pot / 40)))].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 border border-yellow-300" />
                ))}
              </div>
              <span className="text-yellow-400 font-bold text-xl">POT: {pot}</span>
            </div>
          </div>

          {/* Community Cards */}
          <div className="relative flex justify-center gap-2 mb-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="relative">
                {community[i] ? (
                  <Card value={community[i]} size="normal" />
                ) : (
                  <div className="w-24 h-36 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '2px dashed rgba(255,255,255,0.2)',
                    }}>
                    <span className="text-white/30 text-2xl">?</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Phase indicator */}
          <div className="flex justify-center gap-1 mb-3">
            {['preflop', 'flop', 'turn', 'river'].map((p, i) => (
              <div key={p} className="flex items-center">
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  phase === p ? 'bg-green-400 shadow-lg shadow-green-400/50' :
                  ['preflop', 'flop', 'turn', 'river'].indexOf(phase) > i || phase === 'showdown' ? 'bg-green-600' : 'bg-gray-600'
                }`} />
                {i < 3 && <div className="w-6 h-0.5 bg-gray-600 mx-0.5" />}
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="text-center">
            <span className={`text-lg font-medium ${phase === 'showdown' && msg.includes('🏆') ? 'text-yellow-400' : 'text-white'}`}>
              {msg}
            </span>
          </div>
        </div>

        {/* YOUR CARDS - Bigger */}
        <div className="rounded-2xl p-6 mb-4" style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                😎
              </div>
              <div>
                <p className="text-white font-bold text-xl">Your Hand</p>
                {players[0].bet > 0 && (
                  <p className="text-yellow-400 text-sm">Bet: {players[0].bet}</p>
                )}
              </div>
            </div>
            {players[0].bet > 0 && <ChipStack amount={players[0].bet} />}
          </div>

          <div className="flex justify-center gap-6">
            {players[0].cards.length > 0 ? (
              <>
                <Card value={players[0].cards[0]} size="large" />
                <Card value={players[0].cards[1]} size="large" />
              </>
            ) : (
              <div className="text-gray-400 py-8">Press START to deal cards</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {phase === 'waiting' && (
            <button onClick={start} className="px-10 py-4 rounded-xl text-xl font-bold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(180deg, #22c55e, #16a34a)',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
              }}>
              <span className="text-white">🎮 START GAME</span>
            </button>
          )}

          {phase === 'showdown' && (
            <button onClick={start} className="px-10 py-4 rounded-xl text-xl font-bold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(180deg, #8b5cf6, #7c3aed)',
                boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
              }}>
              <span className="text-white">🔄 PLAY AGAIN</span>
            </button>
          )}

          {phase !== 'waiting' && phase !== 'showdown' && (
            <>
              <button
                onClick={() => action('fold')}
                disabled={!isMyTurn}
                className="px-6 py-3 rounded-xl font-bold text-lg transition-all"
                style={{
                  background: isMyTurn ? 'linear-gradient(180deg, #dc2626, #b91c1c)' : '#374151',
                  boxShadow: isMyTurn ? '0 4px 15px rgba(220,38,38,0.3)' : 'none',
                  opacity: isMyTurn ? 1 : 0.5,
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                }}>
                <span className="text-white">FOLD</span>
              </button>

              <button
                onClick={() => action('call')}
                disabled={!isMyTurn}
                className="px-8 py-3 rounded-xl font-bold text-lg transition-all"
                style={{
                  background: isMyTurn ? 'linear-gradient(180deg, #22c55e, #16a34a)' : '#374151',
                  boxShadow: isMyTurn ? '0 4px 20px rgba(34,197,94,0.4)' : 'none',
                  opacity: isMyTurn ? 1 : 0.5,
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                }}>
                <span className="text-white">
                  CALL {currentBet - players[0].bet > 0 ? <span className="text-yellow-300 ml-1">{currentBet - players[0].bet}</span> : ''}
                </span>
              </button>

              <button
                onClick={() => action('raise')}
                disabled={!isMyTurn || players[0].chips < currentBet + BLIND}
                className="px-6 py-3 rounded-xl font-bold text-lg transition-all"
                style={{
                  background: isMyTurn && players[0].chips >= currentBet + BLIND
                    ? 'linear-gradient(180deg, #eab308, #ca8a04)'
                    : '#374151',
                  boxShadow: isMyTurn && players[0].chips >= currentBet + BLIND
                    ? '0 4px 15px rgba(234,179,8,0.3)'
                    : 'none',
                  opacity: isMyTurn && players[0].chips >= currentBet + BLIND ? 1 : 0.5,
                  cursor: isMyTurn && players[0].chips >= currentBet + BLIND ? 'pointer' : 'not-allowed',
                }}>
                <span className={isMyTurn && players[0].chips >= currentBet + BLIND ? 'text-black' : 'text-white'}>
                  RAISE +{BLIND}
                </span>
              </button>
            </>
          )}
        </div>

        {!isMyTurn && phase !== 'waiting' && phase !== 'showdown' && (
          <div className="text-center mt-4">
            <span className="text-gray-400">
              Waiting for <span className="text-white font-medium">{players[turn]?.name}</span>
              <span className="animate-pulse ml-1">...</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
