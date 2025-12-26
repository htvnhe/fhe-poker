/**
 * 合约交互服务层
 * 统一管理所有与智能合约的交互
 * 避免分散的函数调用，提供清晰的API
 */

import { ethers } from 'ethers';
import { POKER_TABLE_ADDRESS, POKER_TABLE_ABI } from '../lib/contract';

/**
 * 解析合约错误
 */
function parseContractError(error: any): string {
  console.error('🔍 解析错误:', {
    message: error.message,
    code: error.code,
    reason: error.reason,
    data: error.data,
  });

  // 检查是否是自定义错误
  if (error.data && error.data.startsWith('0x')) {
    const selector = error.data.slice(0, 10);
    console.log('❌ 自定义错误选择器:', selector);

    // 根据选择器返回错误信息
    const errorMap: { [key: string]: string } = {
      '0xcb566600': '游戏桌已满',
      '0x340b9515': '游戏桌不存在',
      '0x43050d96': '玩家不在游戏中',
      '0xc56fb253': '玩家已在游戏中',
      '0xbaf3f0f7': '游戏状态无效',
      '0xe60c8f58': '不是你的回合',
      '0xf4d678b8': '余额不足',
      '0x9de3d441': '下注金额无效',
      '0x9e7aef8f': '操作超时',
      '0xd5fa87ab': '玩家数不足',
      '0xb6dfe10c': '玩家索引无效',
      '0x9593abaf': '加密数据无效',
      '0xe3e94326': '证明数据无效',
      '0x9de3392c': '加密金额无效',
      '0x7567ae05': '证明验证失败',
      '0x7667640c': '手牌已经公开过了',
      '0x9cbe8b8a': '卡牌值无效',
    };

    if (errorMap[selector]) {
      return `合约错误: ${errorMap[selector]} (${selector})`;
    }
  }

  // 检查是否是 require 错误信息
  if (error.reason) {
    return `合约错误: ${error.reason}`;
  }

  // 检查是否是标准错误
  if (error.message) {
    return `错误: ${error.message}`;
  }

  return '未知错误';
}

export class ContractService {
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;
  private provider: ethers.BrowserProvider | null = null;

  /**
   * 初始化合约服务
   */
  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask 未安装');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(
      POKER_TABLE_ADDRESS,
      POKER_TABLE_ABI as any,
      this.signer
    );
  }

  /**
   * 获取玩家地址
   */
  async getPlayerAddress(): Promise<string> {
    if (!this.signer) throw new Error('Signer 未初始化');
    return await this.signer.getAddress();
  }

  /**
   * 创建游戏桌
   */
  async createTable(smallBlind: number, bigBlind: number): Promise<number> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const tx = await this.contract.createTable(smallBlind, bigBlind);
    const receipt = await tx.wait();

    return receipt;
  }

  /**
   * 加入游戏桌
   */
  async joinTable(
    tableId: number,
    encryptedBuyIn: Uint8Array,
    inputProof: Uint8Array
  ): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const tx = await this.contract.joinTable(tableId, encryptedBuyIn, inputProof);
    await tx.wait();
  }

  /**
   * 离开游戏桌
   */
  async leaveTable(tableId: number): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const tx = await this.contract.leaveTable(tableId);
    await tx.wait();
  }

  /**
   * 开始游戏
   */
  async startGame(tableId: number): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const tx = await this.contract.startGame(tableId);
    await tx.wait();
  }

  /**
   * 下注
   */
  async bet(
    tableId: number,
    amount: number,
    encryptedAmount: Uint8Array,
    inputProof: Uint8Array
  ): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    try {
      // 验证参数
      if (!encryptedAmount) {
        throw new Error('encryptedAmount 不能为空');
      }
      if (!inputProof) {
        throw new Error('inputProof 不能为空');
      }

      // 验证 encryptedAmount 是 Uint8Array 且长度为 32
      if (!(encryptedAmount instanceof Uint8Array)) {
        console.error('❌ 错误：encryptedAmount 不是 Uint8Array，类型:', typeof encryptedAmount);
        throw new Error(`Invalid encryptedAmount type: expected Uint8Array, got ${typeof encryptedAmount}`);
      }

      if (encryptedAmount.length !== 32) {
        console.error('❌ 错误：encryptedAmount 长度不是 32 字节！长度:', encryptedAmount.length);
        throw new Error(`Invalid encryptedAmount length: ${encryptedAmount.length}, expected 32`);
      }

      // 验证 inputProof 是 Uint8Array
      if (!(inputProof instanceof Uint8Array)) {
        console.error('❌ 错误：inputProof 不是 Uint8Array，类型:', typeof inputProof);
        throw new Error(`Invalid inputProof type: expected Uint8Array, got ${typeof inputProof}`);
      }

      if (inputProof.length === 0) {
        console.error('❌ 错误：inputProof 为空');
        throw new Error('inputProof cannot be empty');
      }

      const tx = await this.contract.bet(tableId, amount, encryptedAmount, inputProof);
      await tx.wait();
    } catch (error: any) {
      const parsedError = parseContractError(error);
      console.error('❌ 下注失败:', parsedError);
      console.error('原始错误:', error);

      // 创建一个新的错误对象，包含解析后的错误信息
      const betError = new Error(parsedError);
      throw betError;
    }
  }

  /**
   * 弃牌
   */
  async fold(tableId: number): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    try {
      const tx = await this.contract.fold(tableId);
      await tx.wait();
    } catch (error: any) {
      console.error('❌ 弃牌失败:', error);
      throw error;
    }
  }

  /**
   * 过牌
   */
  async check(tableId: number): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    try {
      const tx = await this.contract.check(tableId);
      await tx.wait();
    } catch (error: any) {
      console.error('❌ 过牌失败:', error);
      throw error;
    }
  }

  /**
   * 跟注
   */
  async call(tableId: number): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    try {
      // 验证玩家是否在游戏中
      const playerAddress = await this.signer?.getAddress();
      const playerTableId = await this.contract.playerTable(playerAddress);

      if (Number(playerTableId) !== tableId + 1) {
        throw new Error('玩家不在游戏中');
      }

      const tx = await this.contract.call(tableId);
      await tx.wait();
    } catch (error: any) {
      const parsedError = parseContractError(error);
      console.error('❌ 跟注失败:', parsedError);

      const callError = new Error(parsedError);
      throw callError;
    }
  }

  /**
   * 读取游戏桌信息
   */
  async getTableInfo(tableId: number): Promise<any> {
    if (!this.contract) throw new Error('Contract 未初始化');

    return await this.contract.getTableInfo(tableId);
  }

  /**
   * 读取游戏桌完整信息（包括玩家和奖池）
   */
  async getTableInfoWithPlayers(tableId: number): Promise<{
    players: string[];
    playerBets: bigint[];
    playerFolded: boolean[];
    currentPlayerIndex: number;
    pot: bigint;
    dealerIndex: number;
  }> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const result = await this.contract.getTableInfoWithPlayers(tableId);
    return {
      players: result[0],
      playerBets: result[1],
      playerFolded: result[2],
      currentPlayerIndex: Number(result[3]),
      pot: result[4],
      dealerIndex: Number(result[5]),
    };
  }

  /**
   * 读取游戏桌数量
   */
  async getTableCount(): Promise<number> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const count = await this.contract.tableCount();
    return Number(count);
  }

  /**
   * 读取玩家所在的桌号
   */
  async getPlayerTable(playerAddress: string): Promise<number> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const tableId = await this.contract.playerTable(playerAddress);
    return Number(tableId);
  }

  /**
   * 读取玩家手牌(返回加密的 handle)
   */
  async getPlayerCards(tableId: number): Promise<{ card1: string; card2: string }> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const result = await this.contract.getPlayerCards(tableId);

    // result 是一个包含两个 euint8 的数组
    // euint8 在 ethers.js 中会被转换为 bytes32 字符串
    return {
      card1: result[0] || result.card1,
      card2: result[1] || result.card2,
    };
  }

  /**
   * 获取 Signer 对象(用于签名解密请求)
   */
  async getSigner(): Promise<ethers.Signer> {
    if (!this.signer) throw new Error('Signer 未初始化');
    return this.signer;
  }

  /**
   * 读取公共牌
   */
  async getCommunityCards(tableId: number): Promise<number[]> {
    if (!this.contract) throw new Error('Contract 未初始化');

    return await this.contract.getCommunityCards(tableId);
  }

  /**
   * 获取玩家在游戏桌中的座位索引
   */
  async getPlayerIndex(tableId: number, playerAddress: string): Promise<number> {
    if (!this.contract) throw new Error('Contract 未初始化');

    try {
      const index = await this.contract.getPlayerIndex(tableId, playerAddress);
      const playerIndex = Number(index);
      return playerIndex;
    } catch (err) {
      console.error('❌ 获取玩家座位索引失败:', err);
      throw err;
    }
  }

  /**
   * 公开手牌 (Showdown 阶段)
   */
  async revealCards(tableId: number, card1: number, card2: number): Promise<void> {
    if (!this.contract) throw new Error('Contract 未初始化');

    try {
      const tx = await this.contract.revealCards(tableId, card1, card2);
      await tx.wait();
    } catch (error: any) {
      console.error('❌ 公开手牌失败:', error);
      throw error;
    }
  }

  /**
   * 检查玩家是否已公开手牌
   */
  async hasPlayerRevealedCards(tableId: number, playerIndex: number): Promise<boolean> {
    if (!this.contract) throw new Error('Contract 未初始化');

    return await this.contract.hasPlayerRevealedCards(tableId, playerIndex);
  }

  /**
   * 获取玩家公开的手牌
   */
  async getRevealedCards(tableId: number, playerIndex: number): Promise<{ card1: number; card2: number }> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const result = await this.contract.getRevealedCards(tableId, playerIndex);
    return {
      card1: Number(result[0]),
      card2: Number(result[1]),
    };
  }

  /**
   * 获取获胜者信息
   */
  async getWinner(tableId: number): Promise<{ winnerIndex: number; winnerAddress: string }> {
    if (!this.contract) throw new Error('Contract 未初始化');

    const result = await this.contract.getWinner(tableId);
    return {
      winnerIndex: Number(result[0]),
      winnerAddress: result[1],
    };
  }
}

// 导出单例
export const contractService = new ContractService();

