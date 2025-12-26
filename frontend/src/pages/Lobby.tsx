/**
 * Game Lobby - Clean UI
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { contractService } from '../services/ContractService';
import { callCreateTable } from '../lib/ethers-contract';
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
      await callCreateTable(Number(smallBlind), Number(bigBlind));
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
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white px-3 py-1 rounded hover:bg-slate-700"
            >
              ← Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <div>
              <h1 className="text-lg font-bold text-white">{t('lobby.title')}</h1>
              <p className="text-blue-400 text-sm">{tableCount} tables</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-4 py-2 rounded-lg font-medium ${
              showCreateForm
                ? 'bg-slate-700 text-slate-300'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create Table'}
          </button>
          <button
            onClick={() => loadTables(true)}
            disabled={state.isLoading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            🔄 Refresh
          </button>

          {/* FHE Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            fhevm.isInitialized
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : fhevm.isInitializing
                ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                : 'bg-red-900/50 text-red-400 border border-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              fhevm.isInitialized ? 'bg-green-400' : fhevm.isInitializing ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
            }`}></div>
            <span>{fhevm.isInitialized ? 'FHE Ready' : fhevm.isInitializing ? 'FHE Loading...' : 'FHE Error'}</span>
            {fhevm.debugInfo && <span className="text-xs opacity-70">({fhevm.debugInfo})</span>}
          </div>
          {!fhevm.isInitialized && !fhevm.isInitializing && (
            <button
              onClick={() => fhevm.retryInitialization()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
            >
              Retry FHE
            </button>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Create New Table</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Small Blind</label>
                <input
                  type="number"
                  value={smallBlind}
                  onChange={(e) => setSmallBlind(e.target.value)}
                  disabled={isCreating}
                  className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Big Blind</label>
                <input
                  type="number"
                  value={bigBlind}
                  onChange={(e) => setBigBlind(e.target.value)}
                  disabled={isCreating}
                  className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="20"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCreateTable}
                  disabled={isCreating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wrong Network */}
        {fhevm.wrongNetwork && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-400 font-medium">Wrong Network</p>
                <p className="text-red-300 text-sm">Switch to Sepolia to play</p>
              </div>
              <button
                onClick={() => fhevm.switchToSepolia()}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg"
              >
                Switch
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {state.isLoading && tables.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎰</div>
            <p className="text-slate-400">Loading tables...</p>
          </div>
        )}

        {/* Empty */}
        {!state.isLoading && tables.length === 0 && (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-5xl mb-4">🎲</div>
            <h3 className="text-xl font-bold text-white mb-2">No Tables</h3>
            <p className="text-slate-400 mb-4">Create the first table!</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg"
            >
              + Create Table
            </button>
          </div>
        )}

        {/* Tables Grid */}
        {tables.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  useTranslation();
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

  const getStateLabel = (state: number) => {
    const labels: { [key: number]: string } = {
      0: '⏳ Waiting',
      1: '🃏 Pre-Flop',
      2: '🎴 Flop',
      3: '🎴 Turn',
      4: '🎴 River',
      5: '👀 Showdown',
      6: '🏁 Ended',
    };
    return labels[state] || '⏳ Waiting';
  };

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
    if (!address) {
      alert('Please connect wallet first');
      return;
    }
    if (!fhevm.isInitialized) {
      alert('FHE is loading... Please wait and try again.');
      return;
    }
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
      <div className={`bg-slate-800 rounded-lg border p-4 ${
        isMyTable ? 'border-green-500' : 'border-slate-700 hover:border-slate-500'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-white">Table #{tableId}</span>
          <span className="text-sm text-slate-400">{getStateLabel(gameState)}</span>
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Players</span>
            <span className="text-white">{playerCount}/6</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Blinds</span>
            <span className="text-blue-400">{smallBlind}/{bigBlind}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="h-1.5 bg-slate-700 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(playerCount / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Button */}
        <button
          onClick={handleJoinClick}
          disabled={checkingStatus || (!canJoin && !isMyTable)}
          className={`w-full py-2.5 rounded-lg font-medium ${
            checkingStatus
              ? 'bg-slate-700 text-slate-500'
              : isMyTable
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : canJoin
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {checkingStatus
            ? '...'
            : isMyTable
            ? '🎮 Enter'
            : canJoin
            ? '🚪 Join'
            : gameState === 6
            ? 'Ended'
            : 'In Progress'}
        </button>
      </div>

      {/* Join Modal */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-5 w-full max-w-sm border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-1">Join Table #{tableId}</h3>
            <p className="text-slate-400 text-sm mb-4">Blinds: {smallBlind}/{bigBlind}</p>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Buy-in Amount</label>
              <input
                type="number"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(e.target.value)}
                disabled={isJoining}
                className="w-full bg-slate-900 text-white rounded-lg px-3 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none text-center text-lg"
                placeholder="1000"
              />
              <p className="text-xs text-slate-500 mt-1 text-center">
                Min: {bigBlind * 10} chips
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinDialog(false)}
                disabled={isJoining}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                disabled={isJoining}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
