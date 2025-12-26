/**
 * Game Lobby - Simplified Version
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
}

export function Lobby({ onSelectTable }: LobbyProps) {
  const { t } = useTranslation();
  const fhevm = useFHEVM();
  const { state, setLoading, setError } = useGameStore();

  const [tableCount, setTableCount] = useState(0);
  const [tables, setTables] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [smallBlind, setSmallBlind] = useState('10');
  const [bigBlind, setBigBlind] = useState('20');

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
      setLoading(true);
      await contractService.createTable(Number(smallBlind), Number(bigBlind));
      await loadTables(false);
      setShowCreateForm(false);
      setSmallBlind('10');
      setBigBlind('20');
    } catch (err) {
      setError((err as Error).message);
      alert('Failed to create: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('lobby.title')}</h1>
            <p className="text-emerald-400 text-sm">{tableCount} {t('lobby.tables_count')}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {showCreateForm ? t('common.cancel') : t('lobby.create_table')}
            </button>
          </div>
        </div>

        {/* Create Table Form */}
        {showCreateForm && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
            <h3 className="text-white font-medium mb-4">{t('lobby.create_new_table')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('lobby.small_blind')}</label>
                <input
                  type="number"
                  value={smallBlind}
                  onChange={(e) => setSmallBlind(e.target.value)}
                  disabled={state.isLoading}
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('lobby.big_blind')}</label>
                <input
                  type="number"
                  value={bigBlind}
                  onChange={(e) => setBigBlind(e.target.value)}
                  disabled={state.isLoading}
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
                  placeholder="20"
                />
              </div>
            </div>
            <button
              onClick={handleCreateTable}
              disabled={state.isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {state.isLoading ? t('lobby.creating') : t('lobby.create')}
            </button>
          </div>
        )}

        {/* Network Warning */}
        {fhevm.wrongNetwork && (
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 mb-6">
            <p className="text-yellow-300 text-sm mb-2">{t('errors.wrong_network')}</p>
            <button
              onClick={() => fhevm.switchToSepolia()}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm"
            >
              {t('errors.switch_to_sepolia')}
            </button>
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm">{state.error}</p>
          </div>
        )}

        {/* Table Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.length > 0 ? (
            tables.map((table) => (
              <TableCard
                key={table.id}
                tableId={table.id}
                info={table.info}
                onSelect={onSelectTable}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-400">{t('lobby.no_tables')}</p>
              <p className="text-slate-500 text-sm mt-1">{t('lobby.create_first_table')}</p>
            </div>
          )}
        </div>
      </div>
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

  const state = Number(info[0]);
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

  const getStateName = (state: number): string => {
    const stateKeys: { [key: number]: string } = {
      0: 'game.states.waiting',
      1: 'game.states.pre_flop',
      2: 'game.states.flop',
      3: 'game.states.turn',
      4: 'game.states.river',
      5: 'game.states.showdown',
      6: 'game.states.ended',
    };
    return t(stateKeys[state] || 'game.states.waiting');
  };

  const handleJoinClick = () => {
    if (!address) {
      alert(t('common.please_connect_wallet'));
      return;
    }
    const expectedTableId = tableId + 1;
    if (playerTableId === expectedTableId) {
      onSelect(tableId);
      return;
    }
    setShowJoinDialog(true);
  };

  const handleConfirmJoin = async () => {
    if (!address || !fhevm.isInitialized) return;
    if (!buyInAmount || Number(buyInAmount) <= 0) {
      alert(t('lobby.invalid_buy_in'));
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
      alert(t('lobby.join_failed', { error: (error as Error).message }));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium">{t('lobby.table_number', { number: tableId })}</span>
            <span className="text-xs text-emerald-400">{getStateName(state)}</span>
          </div>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-slate-400">{t('lobby.players')}</span>
              <span className="text-white">{playerCount}/6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t('lobby.blinds')}</span>
              <span className="text-white">{smallBlind}/{bigBlind}</span>
            </div>
          </div>

          <button
            onClick={handleJoinClick}
            disabled={checkingStatus || (state !== 0 && playerTableId !== tableId + 1)}
            className={`w-full py-2 rounded text-sm font-medium transition-colors ${
              checkingStatus
                ? 'bg-slate-600 text-slate-400'
                : playerTableId === tableId + 1
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : state !== 0
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {checkingStatus
              ? t('lobby.checking')
              : playerTableId === tableId + 1
              ? t('lobby.enter_game')
              : state !== 0
              ? t('lobby.game_in_progress')
              : t('lobby.join')}
          </button>
        </div>
      </div>

      {/* Join Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-80 border border-slate-700">
            <h3 className="text-white font-medium mb-4">{t('lobby.join_table_title', { tableId })}</h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">{t('lobby.buy_in_amount')}</label>
              <input
                type="number"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(e.target.value)}
                disabled={isJoining}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
                placeholder="1000"
              />
              <p className="text-xs text-slate-500 mt-1">{t('lobby.min_buy_in', { amount: bigBlind * 10 })}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinDialog(false)}
                disabled={isJoining}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmJoin}
                disabled={isJoining}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded text-sm disabled:opacity-50"
              >
                {isJoining ? t('lobby.joining') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
