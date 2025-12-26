// 扑克牌工具函数

// 花色和点数
const SUITS = ['♠', '♥', '♦', '♣'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

/**
 * 将牌值(0-51)转换为可读字符串
 * @param cardValue 0-51的牌值
 * @returns 如 "♠A", "♥K"
 */
export function cardToString(cardValue: number): string {
  if (cardValue < 0 || cardValue > 51) {
    return '??';
  }
  
  const suit = Math.floor(cardValue / 13);
  const rank = cardValue % 13;
  
  return `${SUITS[suit]}${RANKS[rank]}`;
}

/**
 * 获取牌的颜色
 * @param cardValue 0-51的牌值
 * @returns 'red' 或 'black'
 */
export function getCardColor(cardValue: number): 'red' | 'black' {
  const suit = Math.floor(cardValue / 13);
  // ♥ 和 ♦ 是红色
  return suit === 1 || suit === 2 ? 'red' : 'black';
}

/**
 * 获取游戏状态的中文名称
 */
export function getGameStateName(state: number): string {
  const stateNames = [
    '等待中',
    '翻牌前',
    '翻牌',
    '转牌',
    '河牌',
    '摊牌',
    '已结束',
  ];
  return stateNames[state] || '未知';
}

/**
 * 获取玩家动作的中文名称
 */
export function getActionName(action: number): string {
  const actionNames = [
    '无',
    '弃牌',
    '过牌',
    '跟注',
    '加注',
  ];
  return actionNames[action] || '未知';
}

/**
 * 格式化筹码数量
 */
export function formatChips(amount: number | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
