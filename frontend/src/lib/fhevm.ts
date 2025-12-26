import { createInstance, SepoliaConfig, initSDK } from '@zama-fhe/relayer-sdk/web';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/web';

// Declare window type
declare global {
  interface Window {
    ethereum?: any;
  }
}

let fhevmInstance: FhevmInstance | null = null;

/**
 * Initialize FHEVM instance
 */
export async function initFHEVM(): Promise<FhevmInstance> {
  console.log('🔍 Cross-Origin Isolated:', window.crossOriginIsolated);

  if (fhevmInstance) {
    console.log('✅ FHEVM already initialized');
    return fhevmInstance;
  }

  try {
    // Check wallet
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask');
    }
    console.log('✅ Wallet detected');

    // Initialize WASM first
    console.log('⏳ Initializing SDK (loading WASM)...');
    await initSDK();
    console.log('✅ SDK initialized');

    // Create instance with FIXED relayer URL
    console.log('⏳ Creating FHEVM instance...');
    console.log('📋 Original relayerUrl:', SepoliaConfig.relayerUrl);

    // Use CORRECT contract addresses from Zama docs (SDK has outdated ones!)
    const config = {
      // FHEVM Host chain contracts (Sepolia)
      aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
      kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
      inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
      // Gateway chain contracts
      verifyingContractAddressDecryption: SepoliaConfig.verifyingContractAddressDecryption,
      verifyingContractAddressInputVerification: SepoliaConfig.verifyingContractAddressInputVerification,
      chainId: 11155111, // Sepolia
      gatewayChainId: SepoliaConfig.gatewayChainId,
      network: window.ethereum,
      // FIXED: Use correct relayer URL
      relayerUrl: 'https://relayer.testnet.zama.org',
    };
    console.log('📋 Using relayerUrl:', config.relayerUrl);

    const instance = await createInstance(config);
    console.log('✅ FHEVM instance created');

    fhevmInstance = instance;
    return fhevmInstance;
  } catch (error) {
    console.error('❌ FHEVM init failed:', error);
    throw error;
  }
}

/**
 * Encrypt uint64 value
 */
export async function encryptUint64(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
) {
  console.log('🔐 encryptUint64 called with:', { value, contractAddress, userAddress });

  const instance = await initFHEVM();
  console.log('✅ Got FHEVM instance');

  const { getAddress } = await import('ethers');
  const checksumContractAddr = getAddress(contractAddress);
  const checksumUserAddr = getAddress(userAddress);
  console.log('📋 Addresses:', { checksumContractAddr, checksumUserAddr });

  console.log('⏳ Creating encrypted input...');
  const input = instance.createEncryptedInput(checksumContractAddr, checksumUserAddr);
  console.log('⏳ Adding value:', BigInt(value).toString());
  input.add64(BigInt(value));
  console.log('⏳ Encrypting (calling relayer)...');
  const encryptedInput = await input.encrypt();
  console.log('✅ Encryption complete');

  const dataToUse = encryptedInput.handles?.[0];
  const proofToUse = encryptedInput.inputProof;

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
 * Encrypt uint8 value
 */
export async function encryptUint8(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
) {
  const instance = await initFHEVM();

  const { getAddress } = await import('ethers');
  const checksumContractAddr = getAddress(contractAddress);
  const checksumUserAddr = getAddress(userAddress);

  const input = instance.createEncryptedInput(checksumContractAddr, checksumUserAddr);
  input.add8(Number(value));
  const encryptedInput = await input.encrypt();

  const dataToUse = encryptedInput.handles?.[0];
  const proofToUse = encryptedInput.inputProof;

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
 * Get FHEVM instance
 */
export function getFHEVMInstance(): FhevmInstance | null {
  return fhevmInstance;
}

/**
 * Reset FHEVM instance
 */
export function resetFHEVM() {
  fhevmInstance = null;
}

/**
 * Decrypt euint8 value (for cards)
 */
export async function decryptUint8(
  handle: string,
  contractAddress: string,
  userAddress: string,
  signer: any
): Promise<number> {
  const instance = await initFHEVM();

  const keypair = instance.generateKeypair();

  const handleContractPairs = [
    {
      handle: handle,
      contractAddress: contractAddress,
    },
  ];

  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10';
  const contractAddresses = [contractAddress];

  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays,
  );

  const signature = await signer.signTypedData(
    eip712.domain,
    {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    eip712.message,
  );

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

  const decryptedValue = (result as any)[handle];
  return Number(decryptedValue);
}

/**
 * Batch decrypt euint8 values
 */
export async function decryptUint8Batch(
  handles: string[],
  contractAddress: string,
  userAddress: string,
  signer: any
): Promise<number[]> {
  const instance = await initFHEVM();

  const keypair = instance.generateKeypair();

  const handleContractPairs = handles.map(handle => ({
    handle: handle,
    contractAddress: contractAddress,
  }));

  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10';
  const contractAddresses = [contractAddress];

  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays,
  );

  const signature = await signer.signTypedData(
    eip712.domain,
    {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    eip712.message,
  );

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

  const decryptedValues = handles.map(handle => {
    const value = (result as any)[handle];
    return Number(value);
  });

  return decryptedValues;
}
