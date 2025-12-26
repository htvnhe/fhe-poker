type FhevmInstance = any;

// 声明 window 类型
declare global {
  interface Window {
    ethereum?: any;
    relayerSDK?: any;  // UMD CDN 脚本暴露为 relayerSDK
  }
}

let fhevmInstance: FhevmInstance | null = null;

// 等待 UMD SDK 加载完成
async function waitForSDK(maxWaitTime: number = 30000): Promise<any> {
  const startTime = Date.now();

  while (!window.relayerSDK) {
    const elapsed = Date.now() - startTime;

    if (elapsed > maxWaitTime) {
      throw new Error('Relayer SDK 加载超时（30秒）。请检查 CDN 脚本是否在 index.html 中正确加载');
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return window.relayerSDK;
}

/**
 * 初始化FHEVM实例
 * @param chainId 链ID (11155111 for Sepolia, 31337 for localhost)
 */
export async function initFHEVM(_chainId: number = 11155111): Promise<FhevmInstance> {
  // Skip cross-origin check - let it try anyway
  if (fhevmInstance) {
    return fhevmInstance;
  }

  try {
    // 检查钱包
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('未检测到钱包，请安装并连接 MetaMask/OKX 钱包');
    }

    // 等待 UMD SDK 加载完成
    const sdk = await waitForSDK();

    try {
      await sdk.initSDK(); // Load needed WASM
    } catch (sdkError) {
      console.error('❌ SDK 初始化失败:', sdkError);
      // 不抛出错误，继续执行
    }

    // 创建配置对象，添加 window.ethereum
    const config = {
      ...sdk.SepoliaConfig,
      network: window.ethereum,
      // 确保使用正确的 relayer URL
      relayerUrl: 'https://relayer.testnet.zama.cloud',
    };

    // 创建实例
    const instance = await sdk.createInstance(config);

    // 只有完全成功才赋值
    fhevmInstance = instance;

    return fhevmInstance;
  } catch (error) {
    console.error('❌ FHEVM初始化失败:', error);
    throw error;
  }
}

/**
 * 加密uint64数值
 */
export async function encryptUint64(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
) {
  const instance = await initFHEVM();

  // 导入 ethers 来处理地址格式
  const { getAddress } = await import('ethers');

  // 使用校验和地址格式
  const checksumContractAddr = getAddress(contractAddress);
  const checksumUserAddr = getAddress(userAddress);

  const input = instance.createEncryptedInput(checksumContractAddr, checksumUserAddr);
  input.add64(BigInt(value));
  const encryptedInput = await input.encrypt();

  const dataToUse = encryptedInput.handles?.[0];
  const proofToUse = encryptedInput.inputProof;

  // 验证数据有效性
  if (!dataToUse || !(dataToUse instanceof Uint8Array)) {
    throw new Error('Invalid encrypted data: encryptedAmount must be Uint8Array');
  }

  if (!proofToUse || !(proofToUse instanceof Uint8Array)) {
    throw new Error('Invalid encrypted data: inputProof must be Uint8Array');
  }

  return {
    encryptedAmount: dataToUse,
    inputProof: proofToUse,
  };
}

/**
 * 加密uint8数值
 */
export async function encryptUint8(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
) {
  const instance = await initFHEVM();

  // 导入 ethers 来处理地址格式
  const { getAddress } = await import('ethers');

  // 使用校验和地址格式
  const checksumContractAddr = getAddress(contractAddress);
  const checksumUserAddr = getAddress(userAddress);

  const input = instance.createEncryptedInput(checksumContractAddr, checksumUserAddr);
  input.add8(Number(value));
  const encryptedInput = await input.encrypt();

  const dataToUse = encryptedInput.handles?.[0];
  const proofToUse = encryptedInput.inputProof;

  // 验证数据有效性
  if (!dataToUse || !(dataToUse instanceof Uint8Array)) {
    throw new Error('Invalid encrypted data: encryptedAmount must be Uint8Array');
  }

  if (!proofToUse || !(proofToUse instanceof Uint8Array)) {
    throw new Error('Invalid encrypted data: inputProof must be Uint8Array');
  }

  return {
    encryptedAmount: dataToUse,
    inputProof: proofToUse,
  };
}

/**
 * 获取FHEVM实例 (如果需要直接访问)
 */
export function getFHEVMInstance(): FhevmInstance | null {
  return fhevmInstance;
}

/**
 * 重置FHEVM实例
 */
export function resetFHEVM() {
  fhevmInstance = null;
}

/**
 * 解密 euint8 值(用于手牌)
 * @param handle 加密值的 handle (bytes32)
 * @param contractAddress 合约地址
 * @param userAddress 用户地址
 * @param signer ethers Signer 对象
 * @returns 解密后的数值
 */
export async function decryptUint8(
  handle: string,
  contractAddress: string,
  userAddress: string,
  signer: any
): Promise<number> {
  const instance = await initFHEVM();

  // 生成临时密钥对
  const keypair = instance.generateKeypair();

  // 准备解密请求
  const handleContractPairs = [
    {
      handle: handle,
      contractAddress: contractAddress,
    },
  ];

  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10'; // 10天有效期
  const contractAddresses = [contractAddress];

  // 创建 EIP-712 签名数据
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays,
  );

  // 用户签名授权解密
  const signature = await signer.signTypedData(
    eip712.domain,
    {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    eip712.message,
  );

  // 调用 Relayer 进行解密
  const result = await instance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace('0x', ''),
    contractAddresses,
    userAddress,
    startTimeStamp,
    durationDays,
  );

  // 返回解密后的值
  const decryptedValue = result[handle];

  return Number(decryptedValue);
}

/**
 * 批量解密多个 euint8 值 (只需签名一次)
 * @param handles 要解密的 handle 数组
 * @param contractAddress 合约地址
 * @param userAddress 用户地址
 * @param signer ethers Signer 对象
 * @returns 解密后的数值数组
 */
export async function decryptUint8Batch(
  handles: string[],
  contractAddress: string,
  userAddress: string,
  signer: any
): Promise<number[]> {
  const instance = await initFHEVM();

  // 生成临时密钥对
  const keypair = instance.generateKeypair();

  // 准备解密请求 - 批量处理
  const handleContractPairs = handles.map(handle => ({
    handle: handle,
    contractAddress: contractAddress,
  }));

  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10'; // 10天有效期
  const contractAddresses = [contractAddress];

  // 创建 EIP-712 签名数据
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays,
  );

  // 用户签名授权解密 (只签名一次!)
  const signature = await signer.signTypedData(
    eip712.domain,
    {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    eip712.message,
  );

  // 调用 Relayer 进行批量解密
  const result = await instance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace('0x', ''),
    contractAddresses,
    userAddress,
    startTimeStamp,
    durationDays,
  );

  // 返回解密后的值数组
  const decryptedValues = handles.map(handle => {
    const value = result[handle];
    return Number(value);
  });

  return decryptedValues;
}
