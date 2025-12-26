import { ethers } from 'ethers';
import { CIPHER_TABLE_ADDRESS, CIPHER_TABLE_ABI } from '../../config/protocol';

const SEPOLIA_CHAIN_ID = 11155111;

/**
 * 检查并切换到 Sepolia 网络
 */
async function ensureSepoliaNetwork() {
  if (!window.ethereum) {
    throw new Error('未检测到钱包，请安装 MetaMask 或其他 Web3 钱包');
  }

  try {
    // 获取当前网络 ID
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainIdHex, 16);

    console.log('当前网络 Chain ID:', currentChainId);

    if (currentChainId !== SEPOLIA_CHAIN_ID) {
      console.log('🔄 正在切换到 Sepolia 网络...');

      try {
        // 尝试切换到 Sepolia
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16) }],
        });
        console.log('✅ 已切换到 Sepolia 网络');
      } catch (switchError: any) {
        // 如果网络不存在，尝试添加
        if (switchError.code === 4902) {
          console.log('🔧 Sepolia 网络不存在，正在添加...');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16),
                chainName: 'Sepolia',
                rpcUrls: ['https://eth-sepolia.public.blastapi.io'],
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          console.log('✅ 已添加 Sepolia 网络');
        } else {
          throw switchError;
        }
      }
    }
  } catch (error) {
    console.error('❌ 网络切换失败:', error);
    throw new Error('无法切换到 Sepolia 网络，请手动在钱包中切换');
  }
}

/**
 * 获取合约实例（使用 ethers.js）
 * 这是与 FHEVM 兼容的正确方式
 */
export async function getPokerTableContract() {
  // 确保连接到 Sepolia 网络
  await ensureSepoliaNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log('🔐 合约配置:', {
    合约地址: CIPHER_TABLE_ADDRESS,
    玩家地址: signerAddress,
    网络: 'Sepolia',
  });

  const contract = new ethers.Contract(
    CIPHER_TABLE_ADDRESS,
    CIPHER_TABLE_ABI as any,
    signer
  );

  return contract;
}

/**
 * 调用 bet 函数（使用 ethers.js）
 * 这是与 FHEVM 兼容的正确方式
 */
export async function callBet(
  tableId: number,
  encryptedData: Uint8Array,
  inputProof: Uint8Array
) {
  const contract = await getPokerTableContract();

  console.log('📞 使用 ethers.js 调用 bet 函数:', {
    tableId,
    encryptedDataLength: encryptedData.length,
    inputProofLength: inputProof.length,
  });

  // 验证参数类型
  console.log('🔄 参数类型检查:');
  console.log('  - encryptedData 类型:', encryptedData.constructor.name, '长度:', encryptedData.length);
  console.log('  - inputProof 类型:', inputProof.constructor.name, '长度:', inputProof.length);

  // ✅ 直接使用 Uint8Array，不需要转换为 Buffer
  // ethers.js v6 原生支持 Uint8Array
  const tx = await contract.bet(tableId, encryptedData, inputProof);

  console.log('✅ 交易已发送:', tx.hash);

  // 等待交易确认
  const receipt = await tx.wait();

  console.log('✅ 交易已确认:', receipt);

  return receipt;
}

/**
 * 调用 joinTable 函数（使用 ethers.js）
 */
export async function callJoinTable(
  tableId: number,
  encryptedBuyIn: Uint8Array,
  inputProof: Uint8Array
) {
  const contract = await getPokerTableContract();

  console.log('📞 使用 ethers.js 调用 joinTable 函数:', {
    tableId,
    encryptedBuyInLength: encryptedBuyIn.length,
    inputProofLength: inputProof.length,
  });

  // 验证参数类型
  console.log('🔄 参数类型检查:');
  console.log('  - encryptedBuyIn 类型:', encryptedBuyIn.constructor.name, '长度:', encryptedBuyIn.length);
  console.log('  - inputProof 类型:', inputProof.constructor.name, '长度:', inputProof.length);

  // ✅ 直接使用 Uint8Array，不需要转换为 Buffer
  // ethers.js v6 原生支持 Uint8Array
  const tx = await contract.joinTable(tableId, encryptedBuyIn, inputProof);

  console.log('✅ 交易已发送:', tx.hash);

  // 等待交易确认
  const receipt = await tx.wait();

  console.log('✅ 交易已确认:', receipt);

  return receipt;
}

/**
 * 调用 leaveTable 函数
 */
export async function callLeaveTable(tableId: number) {
  const contract = await getPokerTableContract();
  const runner = contract.runner;
  const signerAddress = runner && 'getAddress' in runner ? await (runner as any).getAddress() : null;

  console.log('📞 使用 ethers.js 调用 leaveTable 函数:', { tableId, signer: signerAddress });

  // 先检查玩家实际所在的桌号
  try {
    const playerTableId = await contract.playerTable(signerAddress);
    const playerTableIdNum = typeof playerTableId === 'bigint' ? Number(playerTableId) : playerTableId;

    console.log('🔍 玩家所在桌号 (原始):', playerTableId);
    console.log('🔍 玩家所在桌号 (转换后):', playerTableIdNum);
    console.log('🔍 传入的桌号:', tableId);
    console.log('🔍 传入的桌号 + 1:', tableId + 1);

    // 如果玩家不在任何游戏中
    if (playerTableIdNum === 0) {
      throw new Error('玩家不在任何游戏中');
    }

    // 计算玩家实际所在的桌号（playerTable 存储的是 tableId + 1）
    const actualTableId = playerTableIdNum - 1;
    console.log('🔍 玩家实际所在的桌号:', actualTableId);

    // 如果传入的桌号与实际桌号不符，使用实际桌号
    if (actualTableId !== tableId) {
      console.warn(`⚠️ 桌号不匹配！传入: ${tableId}, 实际: ${actualTableId}，将使用实际桌号`);
    }

    // 使用实际的桌号来离开游戏
    const tx = await contract.leaveTable(BigInt(actualTableId));

    console.log('✅ 交易已发送:', tx.hash);

    // 等待交易确认
    const receipt = await tx.wait();

    console.log('✅ 交易已确认:', receipt);

    return receipt;
  } catch (error) {
    console.error('❌ 离开游戏失败:', error);
    throw error;
  }
}

/**
 * 调用 startGame 函数
 */
export async function callStartGame(tableId: number) {
  const contract = await getPokerTableContract();

  console.log('📞 使用 ethers.js 调用 startGame 函数:', { tableId });

  const tx = await contract.startGame(tableId);

  console.log('✅ 交易已发送:', tx.hash);

  // 等待交易确认
  const receipt = await tx.wait();

  console.log('✅ 交易已确认:', receipt);

  return receipt;
}

/**
 * 调用 fold 函数
 */
export async function callFold(tableId: number) {
  const contract = await getPokerTableContract();

  console.log('📞 使用 ethers.js 调用 fold 函数:', { tableId });

  const tx = await contract.fold(tableId);

  console.log('✅ 交易已发送:', tx.hash);

  // 等待交易确认
  const receipt = await tx.wait();

  console.log('✅ 交易已确认:', receipt);

  return receipt;
}

/**
 * 调用 check 函数
 */
export async function callCheck(tableId: number) {
  const contract = await getPokerTableContract();

  console.log('📞 使用 ethers.js 调用 check 函数:', { tableId });

  const tx = await contract.check(tableId);

  console.log('✅ 交易已发送:', tx.hash);

  // 等待交易确认
  const receipt = await tx.wait();

  console.log('✅ 交易已确认:', receipt);

  return receipt;
}

/**
 * 调用 call 函数
 */
export async function callCall(tableId: number) {
  const contract = await getPokerTableContract();

  console.log('📞 使用 ethers.js 调用 call 函数:', { tableId });

  const tx = await contract.call(tableId);

  console.log('✅ 交易已发送:', tx.hash);

  // 等待交易确认
  const receipt = await tx.wait();

  console.log('✅ 交易已确认:', receipt);

  return receipt;
}

/**
 * 读取游戏桌信息
 */
export async function readTableInfo(tableId: number) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(
    CIPHER_TABLE_ADDRESS,
    CIPHER_TABLE_ABI as any,
    provider
  );

  return await contract.getTableInfo(BigInt(tableId));
}

/**
 * 读取公共牌
 */
export async function readCommunityCards(tableId: number) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(
    CIPHER_TABLE_ADDRESS,
    CIPHER_TABLE_ABI as any,
    provider
  );

  return await contract.getCommunityCards(BigInt(tableId));
}

/**
 * 读取玩家手牌
 */
export async function readPlayerCards(tableId: number) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(
    CIPHER_TABLE_ADDRESS,
    CIPHER_TABLE_ABI as any,
    signer
  );

  console.log('📖 读取玩家手牌:', { tableId });

  try {
    const cards = await contract.getPlayerCards(BigInt(tableId));
    console.log('✅ 成功读取玩家手牌:', cards);
    return cards;
  } catch (error) {
    console.error('❌ 读取玩家手牌失败:', error);
    throw error;
  }
}

/**
 * 读取玩家索引
 */
export async function readPlayerIndex(tableId: number, playerAddress: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(
    CIPHER_TABLE_ADDRESS,
    CIPHER_TABLE_ABI as any,
    provider
  );

  return await contract.getPlayerIndex(BigInt(tableId), playerAddress);
}

/**
 * 创建游戏桌
 */
export async function callCreateTable(smallBlind: number, bigBlind: number) {
  const contract = await getPokerTableContract();

  console.log('📞 使用 ethers.js 调用 createTable 函数:', { smallBlind, bigBlind });

  const tx = await contract.createTable(BigInt(smallBlind), BigInt(bigBlind));

  console.log('✅ 交易已发送:', tx.hash);

  // 等待交易确认
  const receipt = await tx.wait();

  console.log('✅ 交易已确认:', receipt);

  return receipt;
}

/**
 * 读取游戏桌数量
 */
export async function readTableCount() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(
    CIPHER_TABLE_ADDRESS,
    CIPHER_TABLE_ABI as any,
    provider
  );

  return await contract.tableCount();
}

