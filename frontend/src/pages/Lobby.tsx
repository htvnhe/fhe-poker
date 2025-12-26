/**
 * Game Lobby - Improved UI
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { contractService } from '../services/ContractService';
import { useFHEVM } from '../hooks/useFHEVM';
import { useGameStore } from '../store/gameStore.tsx';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

interface LobbyProps {
  onSelectTable: (tableId: number) => void;
  onBack?: () => void;
}

export function Lobby({ onSelectTable, onBack }: LobbyProps) {
  const { t } = useTranslation();
  const { address } = useAccount();
  const fhevm = useFHEVM();
  const { state, setLoading, setError } = useGameStore();

  const [tableCount, setTableCount] = useState(0);
  const [tables, setTables] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [smallBlind, setSmallBlind] = useState('10');
  const [bigBlind, setBigBlind] = useState('20');
  const [isCreating, setIsCreating] = useState(false);

  const loadTables = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      await contractService.initialize();

      const count = await contractService.getTableCount();
      setTableCount(count);

      const tableList = [];
      for (let i = 0; i < count; i++) {
        const info = await contractService.getTableInfo(i);
        tableList.push({ id: i, info });
      }
      setTables(tableList);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadTables(true);
    const interval = setInterval(() => loadTables(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTable = async () => {
    if (!smallBlind || !bigBlind) {
      alert('Please enter blind amounts');
      return;
    }

    try {
      setIsCreating(true);
      await contractService.createTable(Number(smallBlind), Number(bigBlind));
      await loadTables(false);
      setShowCreateForm(false);
      setSmallBlind('10');
      setBigBlind('20');
    } catch (err) {
      alert('Failed to create: ' + (err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-800">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <span className="text-xl">←</span>
              <span>Back</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl">
              🃏
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('lobby.title')}</h1>
              <p className="text-emerald-400 text-sm">{tableCount} tables available</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-white text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              showCreateForm
                ? 'bg-gray-700 text-gray-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
            }`}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create New Table'}
          </button>
          <button
            onClick={() => loadTables(true)}
            disabled={state.isLoading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors border border-gray-700"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Create Table Form */}
        {showCreateForm && (
          <div className="bg-gray-800/70 backdrop-blur rounded-2xl p-6 mb-8 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6">Create New Table</h3>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Small Blind</label>
                <input
                  type="number"
                  value={smallBlind}
                  onChange={(e) => setSmallBlind(e.target.value)}
                  disabled={isCreating}
                  className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Big Blind</label>
                <input
                  type="number"
                  value={bigBlind}
                  onChange={(e) => setBigBlind(e.target.value)}
                  disabled={isCreating}
                  className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="20"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCreateTable}
                  disabled={isCreating}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Network Warning */}
        {fhevm.wrongNetwork && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-400 font-medium">Wrong Network</p>
                <p className="text-red-400/70 text-sm">Please switch to Sepolia testnet to play</p>
              </div>
              <button
                onClick={() => fhevm.switchToSepolia()}
                className="bg-red-500 hover:bg-red-400 text-white px-6 py-2 rounded-xl font-medium"
              >
                Switch Network
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {state.isLoading && tables.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-bounce">🎰</div>
            <p className="text-gray-400">Loading tables...</p>
          </div>
        )}

        {/* Empty State */}
        {!state.isLoading && tables.length === 0 && (
          <div className="text-center py-20 bg-gray-800/30 rounded-3xl border border-gray-700">
            <div className="text-6xl mb-6">🎲</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Tables Yet</h3>
            <p className="text-gray-400 mb-6">Be the first to create a table and start playing!</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium transition-colors"
            >
              + Create First Table
            </button>
          </div>
        )}

        {/* Table Grid */}
        {tables.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map((table) => (
              <TableCard
                key={table.id}
                tableId={table.id}
                info={table.info}
                onSelect={onSelectTable}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface TableCardProps {
  tableId: number;
  info: any[];
  onSelect: (tableId: number) => void;
}

function TableCard({ tableId, info, onSelect }: TableCardProps) {
  const { t } = useTranslation();
  const { address } = useAccount();
  const fhevm = useFHEVM();
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState('1000');
  const [isJoining, setIsJoining] = useState(false);
  const [playerTableId, setPlayerTableId] = useState<number | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const gameState = Number(info[0]);
  const playerCount = Number(info[1]);
  const smallBlind = Number(info[8]);
  const bigBlind = Number(info[9]);

  useEffect(() => {
    const checkPlayerStatus = async () => {
      if (!address) {
        setCheckingStatus(false);
        return;
      }
      try {
        const playerTableNum = await contractService.getPlayerTable(address);
        setPlayerTableId(Number(playerTableNum));
      } catch (err) {
        console.warn('Cannot check player status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkPlayerStatus();
  }, [address, tableId]);

  const getStateInfo = (state: number) => {
    const states: { [key: number]: { label: string; color: string; icon: string } } = {
      0: { label: 'Waiting', color: 'text-yellow-400 bg-yellow-400/10', icon: '⏳' },
      1: { label: 'Pre-Flop', color: 'text-blue-400 bg-blue-400/10', icon: '🃏' },
      2: { label: 'Flop', color: 'text-purple-400 bg-purple-400/10', icon: '🎴' },
      3: { label: 'Turn', color: 'text-orange-400 bg-orange-400/10', icon: '🎴' },
      4: { label: 'River', color: 'text-red-400 bg-red-400/10', icon: '🎴' },
      5: { label: 'Showdown', color: 'text-pink-400 bg-pink-400/10', icon: '👀' },
      6: { label: 'Ended', color: 'text-gray-400 bg-gray-400/10', icon: '🏁' },
    };
    return states[state] || states[0];
  };

  const stateInfo = getStateInfo(gameState);
  const isMyTable = playerTableId === tableId + 1;
  const canJoin = gameState === 0 && playerCount < 6;

  const handleJoinClick = () => {
    if (!address) {
      alert('Please connect wallet first');
      return;
    }
    if (isMyTable) {
      onSelect(tableId);
      return;
    }
    setShowJoinDialog(true);
  };

  const handleConfirmJoin = async () => {
    if (!address || !fhevm.isInitialized) return;
    if (!buyInAmount || Number(buyInAmount) <= 0) {
      alert('Please enter a valid buy-in amount');
      return;
    }

    try {
      setIsJoining(true);
      const encrypted = await fhevm.encryptBuyIn(Number(buyInAmount));
      const { callJoinTable } = await import('../lib/ethers-contract');
      await callJoinTable(tableId, encrypted.encryptedAmount, encrypted.inputProof);
      setShowJoinDialog(false);
      setBuyInAmount('1000');
      onSelect(tableId);
    } catch (error) {
      alert('Failed to join: ' + (error as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <div className={`bg-gray-800/70 backdrop-blur rounded-2xl border transition-all hover:scale-[1.02] ${
        isMyTable ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-gray-700 hover:border-gray-600'
      }`}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎰</span>
              <span className="text-lg font-bold text-white">Table #{tableId}</span>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${stateInfo.color}`}>
              {stateInfo.icon} {stateInfo.label}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-2">
                <span>👥</span> Players
              </span>
              <span className="text-white font-medium">
                {playerCount}/6
                <span className="ml-2 text-xs text-gray-500">
                  {6 - playerCount > 0 ? `(${6 - playerCount} seats open)` : '(Full)'}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-2">
                <span>💰</span> Blinds
              </span>
              <span className="text-emerald-400 font-medium">{smallBlind}/{bigBlind}</span>
            </div>
          </div>

          {/* Progress bar for players */}
          <div className="mb-5">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(playerCount / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleJoinClick}
            disabled={checkingStatus || (!canJoin && !isMyTable)}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              checkingStatus
                ? 'bg-gray-700 text-gray-500'
                : isMyTable
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : canJoin
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {checkingStatus
              ? '...'
              : isMyTable
              ? '🎮 Enter Game'
              : canJoin
              ? '🚪 Join Table'
              : gameState === 6
              ? 'Game Ended'
              : 'In Progress'}
          </button>
        </div>
      </div>

      {/* Join Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎰</div>
              <h3 className="text-xl font-bold text-white">Join Table #{tableId}</h3>
              <p className="text-gray-400 text-sm mt-1">Blinds: {smallBlind}/{bigBlind}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Buy-in Amount (chips)</label>
              <input
                type="number"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(e.target.value)}
                disabled={isJoining}
                className="w-full bg-gray-900 text-white text-lg rounded-xl px-4 py-4 border border-gray-700 focus:border-emerald-500 focus:outline-none text-center font-bold"
                placeholder="1000"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Minimum: {bigBlind * 10} chips (10x big blind)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinDialog(false)}
                disabled={isJoining}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                disabled={isJoining}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
