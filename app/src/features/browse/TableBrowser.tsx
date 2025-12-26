/**
 * 游戏大厅 - 重新设计版本
 * 职责：显示游戏桌列表，处理用户交互
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { contractService } from '../../shared/utils/ProtocolClient';
import { useCipher } from '../cipher/useCipher';
import { useSessionStore } from '../../providers/SessionStore';
import { LocaleSwitch } from '../../shared/ui/LocaleSwitch';

interface LobbyProps {
  onSelectTable: (tableId: number) => void;
}

export function TableBrowser({ onSelectTable }: LobbyProps) {
  const { t, i18n } = useTranslation();
  const fhevm = useCipher();
  const { state, setLoading, setError } = useSessionStore();

  const [tableCount, setTableCount] = useState(0);
  const [tables, setTables] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [smallBlind, setSmallBlind] = useState('10');
  const [bigBlind, setBigBlind] = useState('20');

  // 加载游戏桌列表函数 - 提取到外部以便在创建后调用
  const loadTables = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      await contractService.initialize();

      const count = await contractService.getTableCount();
      setTableCount(count);

      // 加载每个游戏桌的信息
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
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // 定时轮询游戏桌列表
  useEffect(() => {
    // 首次加载显示 loading
    loadTables(true);
    // 定时轮询不显示 loading，避免频繁闪烁
    const interval = setInterval(() => loadTables(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTable = async () => {
    if (!smallBlind || !bigBlind) {
      alert('请输入盲注金额');
      return;
    }

    try {
      setLoading(true);
      await contractService.createTable(Number(smallBlind), Number(bigBlind));

      // 重新加载游戏桌列表 - 不显示 loading（因为外层已经在显示）
      await loadTables(false);

      // 成功后关闭表单并重置输入
      setShowCreateForm(false);
      setSmallBlind('10');
      setBigBlind('20');
    } catch (err) {
      setError((err as Error).message);
      alert('创建失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* 头部 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('lobby.title')}</h1>
            <p className="text-emerald-400">{tableCount} {t('lobby.tables_count')}</p>
          </div>
          {/* 右侧按钮组 */}
          <div className="flex items-center gap-4">
            <LocaleSwitch />
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {showCreateForm ? t('common.cancel') : t('lobby.create_table')}
            </button>
          </div>
        </div>

        {/* 创建桌子弹窗 */}
        {showCreateForm && createPortal(
          <>
            {/* 半透明遮罩层 */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(2px)',
                zIndex: 9998
              }}
              onClick={() => !state.isLoading && setShowCreateForm(false)}
            />

            {/* 弹窗内容 */}
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                maxWidth: '90vw',
                width: '400px',
                backgroundColor: '#047857',
                boxSizing: 'border-box',
                borderRadius: '20px',
                overflow: 'hidden'
              }}
              className="shadow-2xl animate-scaleIn border-2 border-emerald-600"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '24px' }}>
                <h3 className="text-xl font-bold text-white mb-5 text-center">
                  🎰 {t('lobby.create_new_table')}
                </h3>

                <div className="mb-4" style={{ boxSizing: 'border-box' }}>
                  <label className="block text-sm font-semibold text-emerald-200 mb-2">
                    💵 {t('lobby.small_blind')}
                  </label>
                  <input
                    type="number"
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(e.target.value)}
                    disabled={state.isLoading}
                    style={{
                      boxSizing: 'border-box',
                      width: '100%',
                      backgroundColor: '#064e3b',
                      color: 'white'
                    }}
                    className="border-2 border-emerald-600 focus:border-emerald-400 focus:outline-none rounded-lg px-3 py-2 text-base font-semibold disabled:opacity-50"
                    placeholder="10"
                  />
                </div>

                <div className="mb-5" style={{ boxSizing: 'border-box' }}>
                  <label className="block text-sm font-semibold text-emerald-200 mb-2">
                    💰 {t('lobby.big_blind')}
                  </label>
                  <input
                    type="number"
                    value={bigBlind}
                    onChange={(e) => setBigBlind(e.target.value)}
                    disabled={state.isLoading}
                    style={{
                      boxSizing: 'border-box',
                      width: '100%',
                      backgroundColor: '#064e3b',
                      color: 'white'
                    }}
                    className="border-2 border-emerald-600 focus:border-emerald-400 focus:outline-none rounded-lg px-3 py-2 text-base font-semibold disabled:opacity-50"
                    placeholder="20"
                  />
                </div>

                <div className="flex gap-3" style={{ boxSizing: 'border-box' }}>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    disabled={state.isLoading}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-colors border border-emerald-600"
                    style={{ boxSizing: 'border-box' }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleCreateTable}
                    disabled={state.isLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-lg"
                    style={{ boxSizing: 'border-box' }}
                  >
                    {state.isLoading ? t('lobby.creating') : t('lobby.create')}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        {/* 网络错误提示 */}
        {fhevm.wrongNetwork && (
          <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-lg p-5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 font-bold mb-2 text-lg">⚠️ {t('errors.wrong_network')}</p>
                <p className="text-yellow-200 text-sm">
                  {i18n.language === 'zh-CN'
                    ? '当前网络不正确，本游戏需要连接到 Sepolia 测试网'
                    : 'Wrong network detected. This game requires Sepolia testnet'}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fhevm.switchToSepolia();
                  } catch (err) {
                    console.error('切换网络失败:', err);
                  }
                }}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold transition-colors whitespace-nowrap shadow-lg"
              >
                🔄 {t('errors.switch_to_sepolia')}
              </button>
            </div>
          </div>
        )}

        {/* FHEVM 错误提示 */}
        {fhevm.error && !fhevm.wrongNetwork && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-300 font-semibold mb-1">⚠️ {t('errors.fhevm_connection_error')}</p>
                <p className="text-red-200 text-sm">{fhevm.error.message}</p>
                {fhevm.error.message.includes('backend connection') && (
                  <p className="text-yellow-300 text-sm mt-2">
                    💡 {t('errors.relayer_unavailable')}
                  </p>
                )}
                {fhevm.error.message.includes('could not decode') && (
                  <div className="mt-2">
                    <p className="text-yellow-300 text-sm font-semibold">
                      💡 {t('errors.contract_not_deployed')}
                    </p>
                    <p className="text-yellow-200 text-xs mt-1">
                      {t('errors.contract_error_hint')}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={fhevm.retry}
                disabled={fhevm.isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition-colors whitespace-nowrap"
              >
                {fhevm.isLoading ? t('errors.fhevm_retrying') : `🔄 ${t('errors.fhevm_retry')}`}
              </button>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {state.error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
            <p className="text-red-300">{state.error}</p>
          </div>
        )}

        {/* 游戏桌列表 - 响应式卡片网格 */}
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          style={{
            gap: '24px',
            display: 'grid',
          }}
        >
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
            <div className="col-span-full text-center py-16">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-emerald-400 text-xl font-semibold">{t('lobby.no_tables')}</p>
              <p className="text-emerald-600 mt-2">{t('lobby.create_first_table')}</p>
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
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState('1000');
  const [isJoining, setIsJoining] = useState(false);
  const [playerTableId, setPlayerTableId] = useState<number | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const state = Number(info[0]);
  const playerCount = Number(info[1]);
  const smallBlind = Number(info[8]);
  const bigBlind = Number(info[9]);

  // 检查玩家是否已经在这个桌子中
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
        console.warn('⚠️ 无法检查玩家状态:', err);
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

    // 检查玩家是否已经在这个桌子中
    const expectedTableId = tableId + 1;
    if (playerTableId === expectedTableId) {
      onSelect(tableId);
      return;
    }

    // 否则显示加入对话框
    setShowJoinDialog(true);
  };

  const handleConfirmJoin = async () => {
    if (!address) {
      alert(t('common.please_connect_wallet'));
      return;
    }

    if (!buyInAmount || Number(buyInAmount) <= 0) {
      alert(t('lobby.invalid_buy_in'));
      return;
    }

    try {
      setIsJoining(true);

      // Initialize FHEVM and encrypt directly (bypass hook state check)
      console.log('⏳ Initializing FHEVM and encrypting...');
      const { initEncryption, seal64 } = await import('../cipher/encryption');
      const { CIPHER_TABLE_ADDRESS } = await import('../../config/protocol');

      await initEncryption();
      console.log('✅ FHEVM ready');

      // Encrypt buy-in amount
      const encrypted = await seal64(Number(buyInAmount), CIPHER_TABLE_ADDRESS, address);
      console.log('✅ Buy-in encrypted');

      // 调用合约加入游戏
      const { callJoinTable } = await import('../../shared/utils/contractClient');
      await callJoinTable(tableId, encrypted.encryptedAmount, encrypted.inputProof);

      setShowJoinDialog(false);
      setBuyInAmount('1000');

      // 加入成功后，立即跳转到游戏页面
      onSelect(tableId);
    } catch (error) {
      console.error('❌ 加入失败:', error);
      alert(t('lobby.join_failed', { error: (error as Error).message }));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <div
        className="overflow-hidden transition-all duration-300 hover:scale-105"
        style={{
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.3)',
          border: '1px solid rgba(16, 185, 129, 0.5)',
        }}
      >
        {/* 卡片头部 - 带状态指示器 */}
        <div
          className="px-5 py-4"
          style={{
            backgroundColor: 'rgba(6, 78, 59, 0.6)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="rounded-full p-2"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.3)',
                }}
              >
                <span style={{ fontSize: '24px' }}>🎮</span>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>{t('lobby.table_number', { number: tableId })}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="rounded-full"
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: state === 0 ? '#4ade80' : state === 6 ? '#6b7280' : '#60a5fa',
                      animation: state !== 6 ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                    }}
                  ></div>
                  <span style={{ color: '#6ee7b7', fontSize: '14px', fontWeight: '500' }}>{getStateName(state)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 卡片内容 */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            {/* 玩家数 */}
            <div
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{
                backgroundColor: 'rgba(6, 78, 59, 0.4)',
                marginBottom: '12px',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '18px' }}>👥</span>
                <span style={{ color: '#6ee7b7', fontSize: '14px', fontWeight: '500' }}>{t('lobby.players')}</span>
              </div>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>{playerCount} / 6</span>
            </div>

            {/* 盲注 */}
            <div
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{
                backgroundColor: 'rgba(6, 78, 59, 0.4)',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '18px' }}>💰</span>
                <span style={{ color: '#6ee7b7', fontSize: '14px', fontWeight: '500' }}>{t('lobby.blinds')}</span>
              </div>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>{smallBlind} / {bigBlind}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <button
            onClick={handleJoinClick}
            disabled={checkingStatus || (state !== 0 && playerTableId !== tableId + 1)}
            className={`w-full py-3 rounded-xl font-bold text-base transition-all duration-200 ${
              checkingStatus
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : playerTableId === tableId + 1
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/50'
                : state !== 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/50'
            }`}
          >
            {checkingStatus
              ? `⏳ ${t('lobby.checking')}`
              : playerTableId === tableId + 1
              ? `🚀 ${t('lobby.enter_game')}`
              : state !== 0
              ? `🔒 ${t('lobby.game_in_progress')}`
              : `✨ ${t('lobby.join')}`}
          </button>
        </div>
      </div>

      {/* 加入游戏对话框 - 带遮罩的小弹窗 */}
      {showJoinDialog && createPortal(
        <>
          {/* 半透明遮罩层 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(2px)',
              zIndex: 9998
            }}
            onClick={() => !isJoining && setShowJoinDialog(false)}
          />

          {/* 弹窗内容 */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              maxWidth: '90vw',
              width: '360px',
              backgroundColor: '#047857',
              boxSizing: 'border-box',
              borderRadius: '20px',
              overflow: 'hidden'
            }}
            className="shadow-2xl animate-scaleIn border-2 border-emerald-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px' }}>
              <h3 className="text-xl font-bold text-white mb-5 text-center">
                🎮 {t('lobby.join_table_title', { tableId })}
              </h3>

              <div className="mb-5" style={{ boxSizing: 'border-box' }}>
                <label className="block text-sm font-semibold text-emerald-200 mb-2">
                  💰 {t('lobby.buy_in_amount')}
                </label>
                <input
                  type="number"
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(e.target.value)}
                  disabled={isJoining}
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    backgroundColor: '#064e3b',
                    color: 'white'
                  }}
                  className="border-2 border-emerald-600 focus:border-emerald-400 focus:outline-none rounded-lg px-3 py-2 text-base font-semibold disabled:opacity-50"
                  placeholder="1000"
                />
                <p className="text-xs text-emerald-300 mt-2">
                  {t('lobby.min_buy_in', { amount: bigBlind * 10 })}
                </p>
              </div>

              <div className="flex gap-3" style={{ boxSizing: 'border-box' }}>
                <button
                  onClick={() => setShowJoinDialog(false)}
                  disabled={isJoining}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-colors border border-emerald-600"
                  style={{ boxSizing: 'border-box' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmJoin}
                  disabled={isJoining}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-lg"
                  style={{ boxSizing: 'border-box' }}
                >
                  {isJoining ? t('lobby.joining') : t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

