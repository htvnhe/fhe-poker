/**
 * 游戏状态管理
 * 使用简单的 Context + Hook 模式
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface GameState {
  // 当前游戏桌
  currentTableId: number | null;
  
  // 玩家信息
  playerAddress: string | null;
  playerTableId: number | null;
  
  // 游戏信息
  tableInfo: any | null;
  playerCards: any | null;
  communityCards: number[] | null;
  
  // UI 状态
  isLoading: boolean;
  error: string | null;
}

export interface GameContextType {
  state: GameState;
  
  // 游戏操作
  setCurrentTableId: (tableId: number | null) => void;
  setPlayerAddress: (address: string | null) => void;
  setPlayerTableId: (tableId: number | null) => void;
  setTableInfo: (info: any) => void;
  setPlayerCards: (cards: any) => void;
  setCommunityCards: (cards: number[]) => void;
  
  // 状态操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 重置
  reset: () => void;
}

const initialState: GameState = {
  currentTableId: null,
  playerAddress: null,
  playerTableId: null,
  tableInfo: null,
  playerCards: null,
  communityCards: null,
  isLoading: false,
  error: null,
};

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);

  const setCurrentTableId = useCallback((tableId: number | null) => {
    setState(prev => ({ ...prev, currentTableId: tableId }));
  }, []);

  const setPlayerAddress = useCallback((address: string | null) => {
    setState(prev => ({ ...prev, playerAddress: address }));
  }, []);

  const setPlayerTableId = useCallback((tableId: number | null) => {
    setState(prev => ({ ...prev, playerTableId: tableId }));
  }, []);

  const setTableInfo = useCallback((info: any) => {
    setState(prev => ({ ...prev, tableInfo: info }));
  }, []);

  const setPlayerCards = useCallback((cards: any) => {
    setState(prev => ({ ...prev, playerCards: cards }));
  }, []);

  const setCommunityCards = useCallback((cards: number[]) => {
    setState(prev => ({ ...prev, communityCards: cards }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const value: GameContextType = {
    state,
    setCurrentTableId,
    setPlayerAddress,
    setPlayerTableId,
    setTableInfo,
    setPlayerCards,
    setCommunityCards,
    setLoading,
    setError,
    reset,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameStore() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameStore 必须在 GameProvider 内使用');
  }
  return context;
}

