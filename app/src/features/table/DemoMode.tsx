/**
 * Demo Mode - Simple Poker Game
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
}

// Simple Card Component
function Card({ value, hidden = false }: { value?: number; hidden?: boolean }) {
  if (hidden || !value) {
    return (
      <div className="w-14 h-20 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f, #0d1b2a)',
          border: '2px solid #3b5998',
        }}>
        <span className="text-2xl">🂠</span>
      </div>
    );
  }

  const idx = value - 1;
  const suit = SUITS[Math.floor(idx / 13)];
  const rank = RANKS[idx % 13];
  const isRed = suit === '♥' || suit === '♦';

  return (
    <div className="w-14 h-20 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center border border-gray-300">
      <span className={`text-lg font-bold ${isRed ? 'text-red-500' : 'text-black'}`}>
        {rank}
      </span>
      <span className={`text-2xl ${isRed ? 'text-red-500' : 'text-black'}`}>
        {suit}
      </span>
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
  const [msg, setMsg] = useState('Press START to play!');
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'You', chips: 1000, cards: [], bet: 0, folded: false },
    { id: 1, name: 'Bot 1', chips: 1000, cards: [], bet: 0, folded: false },
    { id: 2, name: 'Bot 2', chips: 1000, cards: [], bet: 0, folded: false },
  ]);

  const BLIND = 20;

  // Shuffle
  const shuffle = () => {
    const d = Array.from({ length: 52 }, (_, i) => i + 1);
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  };

  // Start game
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

  // Next phase
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
      setMsg('River! Your turn.');
    } else if (phase === 'river') {
      // Random winner
      const active = players.filter(p => !p.folded);
      const winner = active[Math.floor(Math.random() * active.length)];
      setPlayers(ps => ps.map(p =>
        p.id === winner.id ? { ...p, chips: p.chips + pot } : p
      ));
      setMsg(`🏆 ${winner.name} wins ${pot} chips!`);
      setPhase('showdown');
    }
  }, [phase, deck, players, pot]);

  // Check betting complete
  const bettingDone = useCallback(() => {
    const active = players.filter(p => !p.folded);
    return active.every(p => p.bet === currentBet);
  }, [players, currentBet]);

  // Player action
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

    // Check if only 1 left
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

  // Bot AI
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
        } else {
          setTurn(next);
        }
        return;
      }

      // Bot decision
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

      // Check winner
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
        else {
          setTurn(0);
          setMsg('Your turn!');
        }
      } else {
        setTurn(next);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [turn, phase, players, currentBet, pot, bettingDone, nextPhase]);

  const isMyTurn = turn === 0 && phase !== 'waiting' && phase !== 'showdown';

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">🎰 Demo Poker</h1>
          <button onClick={onBack} className="px-4 py-2 bg-red-600 text-white rounded-lg">
            Exit
          </button>
        </div>

        {/* Opponents */}
        <div className="flex justify-center gap-8 mb-6">
          {players.slice(1).map(p => (
            <div key={p.id} className={`bg-gray-800 rounded-xl p-4 ${p.folded ? 'opacity-40' : ''} ${turn === p.id ? 'ring-2 ring-yellow-400' : ''}`}>
              <div className="text-center mb-2">
                <span className="text-white font-bold">{p.name}</span>
                <span className="text-yellow-400 ml-2">💰{p.chips}</span>
              </div>
              <div className="flex gap-1 justify-center">
                {p.cards.length > 0 && !p.folded ? (
                  <>
                    <Card hidden />
                    <Card hidden />
                  </>
                ) : null}
              </div>
              {p.bet > 0 && (
                <div className="text-center mt-2 text-yellow-300 text-sm">Bet: {p.bet}</div>
              )}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-green-800 rounded-3xl p-8 mb-6 border-8 border-yellow-900">
          {/* Pot */}
          <div className="text-center mb-4">
            <span className="bg-black/50 text-yellow-400 px-6 py-2 rounded-full text-xl font-bold">
              POT: {pot}
            </span>
          </div>

          {/* Community Cards */}
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-14 h-20 bg-green-700 rounded-lg border-2 border-green-600 flex items-center justify-center">
                {community[i] ? <Card value={community[i]} /> : <span className="text-green-500 text-2xl">?</span>}
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="text-center">
            <span className="text-white text-lg">{msg}</span>
          </div>
        </div>

        {/* YOUR CARDS - Big and Clear */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <div className="text-center mb-4">
            <span className="text-yellow-400 font-bold text-lg">🃏 YOUR CARDS 🃏</span>
            <span className="text-gray-400 ml-4">Chips: <span className="text-yellow-400 font-bold">{players[0].chips}</span></span>
            {players[0].bet > 0 && <span className="text-green-400 ml-4">Bet: {players[0].bet}</span>}
          </div>

          <div className="flex justify-center gap-4">
            {players[0].cards.length > 0 ? (
              <>
                <div className="transform hover:scale-110 transition-transform">
                  <div className="w-24 h-36 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center border-2 border-gray-300">
                    {(() => {
                      const idx = players[0].cards[0] - 1;
                      const suit = SUITS[Math.floor(idx / 13)];
                      const rank = RANKS[idx % 13];
                      const isRed = suit === '♥' || suit === '♦';
                      return (
                        <>
                          <span className={`text-3xl font-bold ${isRed ? 'text-red-500' : 'text-black'}`}>{rank}</span>
                          <span className={`text-5xl ${isRed ? 'text-red-500' : 'text-black'}`}>{suit}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="transform hover:scale-110 transition-transform">
                  <div className="w-24 h-36 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center border-2 border-gray-300">
                    {(() => {
                      const idx = players[0].cards[1] - 1;
                      const suit = SUITS[Math.floor(idx / 13)];
                      const rank = RANKS[idx % 13];
                      const isRed = suit === '♥' || suit === '♦';
                      return (
                        <>
                          <span className={`text-3xl font-bold ${isRed ? 'text-red-500' : 'text-black'}`}>{rank}</span>
                          <span className={`text-5xl ${isRed ? 'text-red-500' : 'text-black'}`}>{suit}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-lg">Press START to get cards</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {phase === 'waiting' && (
            <button onClick={start} className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-xl">
              🎮 START
            </button>
          )}

          {phase === 'showdown' && (
            <button onClick={start} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-xl font-bold rounded-xl">
              🔄 PLAY AGAIN
            </button>
          )}

          {phase !== 'waiting' && phase !== 'showdown' && (
            <>
              <button
                onClick={() => action('fold')}
                disabled={!isMyTurn}
                className={`px-6 py-3 rounded-xl font-bold text-lg ${isMyTurn ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-600 text-gray-400'}`}
              >
                FOLD
              </button>
              <button
                onClick={() => action('call')}
                disabled={!isMyTurn}
                className={`px-6 py-3 rounded-xl font-bold text-lg ${isMyTurn ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-600 text-gray-400'}`}
              >
                CALL {currentBet - players[0].bet > 0 ? currentBet - players[0].bet : ''}
              </button>
              <button
                onClick={() => action('raise')}
                disabled={!isMyTurn || players[0].chips < currentBet + BLIND}
                className={`px-6 py-3 rounded-xl font-bold text-lg ${isMyTurn && players[0].chips >= currentBet + BLIND ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-gray-600 text-gray-400'}`}
              >
                RAISE +{BLIND}
              </button>
            </>
          )}
        </div>

        {!isMyTurn && phase !== 'waiting' && phase !== 'showdown' && (
          <div className="text-center mt-4 text-gray-400">
            Waiting for {players[turn]?.name}...
          </div>
        )}
      </div>
    </div>
  );
}
