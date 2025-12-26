import { createInstance, SepoliaConfig, initSDK } from '@zama-fhe/relayer-sdk/web';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/web';

declare global {
  interface Window {
    ethereum?: any;
  }
}

let cipherInstance: FhevmInstance | null = null;

export async function initEncryption(): Promise<FhevmInstance> {
  console.log('[Cipher] Cross-Origin Isolated:', window.crossOriginIsolated);

  if (cipherInstance) {
    console.log('[Cipher] Already initialized');
    return cipherInstance;
  }

  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected');
    }
    console.log('[Cipher] Wallet detected');

    console.log('[Cipher] Loading WASM...');
    await initSDK();
    console.log('[Cipher] WASM loaded');

    console.log('[Cipher] Creating instance...');

    const config = {
      aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
      kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
      inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
      verifyingContractAddressDecryption: SepoliaConfig.verifyingContractAddressDecryption,
      verifyingContractAddressInputVerification: SepoliaConfig.verifyingContractAddressInputVerification,
      chainId: 11155111,
      gatewayChainId: SepoliaConfig.gatewayChainId,
      network: window.ethereum,
      relayerUrl: 'https://relayer.testnet.zama.org',
    };

    const instance = await createInstance(config);
    console.log('[Cipher] Instance created');

    cipherInstance = instance;
    return cipherInstance;
  } catch (error) {
    console.error('[Cipher] Init failed:', error);
    throw error;
  }
}

export async function seal64(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
) {
  const instance = await initEncryption();

  const { getAddress } = await import('ethers');
  const checksumContract = getAddress(contractAddress);
  const checksumUser = getAddress(userAddress);

  const input = instance.createEncryptedInput(checksumContract, checksumUser);
  input.add64(BigInt(value));
  const sealed = await input.encrypt();

  const handle = sealed.handles?.[0];
  const proof = sealed.inputProof;

  if (!handle || !(handle instanceof Uint8Array)) {
    throw new Error('Invalid sealed data');
  }

  if (!proof || !(proof instanceof Uint8Array)) {
    throw new Error('Invalid proof data');
  }

  return {
    encryptedAmount: handle,
    inputProof: proof,
  };
}

export async function seal8(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
) {
  const instance = await initEncryption();

  const { getAddress } = await import('ethers');
  const checksumContract = getAddress(contractAddress);
  const checksumUser = getAddress(userAddress);

  const input = instance.createEncryptedInput(checksumContract, checksumUser);
  input.add8(Number(value));
  const sealed = await input.encrypt();

  const handle = sealed.handles?.[0];
  const proof = sealed.inputProof;

  if (!handle || !(handle instanceof Uint8Array)) {
    throw new Error('Invalid sealed data');
  }

  if (!proof || !(proof instanceof Uint8Array)) {
    throw new Error('Invalid proof data');
  }

  return {
    encryptedAmount: handle,
    inputProof: proof,
  };
}

export function getCipherInstance(): FhevmInstance | null {
  return cipherInstance;
}

export function resetEncryption() {
  cipherInstance = null;
}

export async function unseal8(
  handle: string,
  contractAddress: string,
  userAddress: string,
  signer: any
): Promise<number> {
  const instance = await initEncryption();

  const keypair = instance.generateKeypair();

  const handlePairs = [
    {
      handle: handle,
      contractAddress: contractAddress,
    },
  ];

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const duration = '10';
  const contracts = [contractAddress];

  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contracts,
    timestamp,
    duration,
  );

  const sig = await signer.signTypedData(
    eip712.domain,
    {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    eip712.message,
  );

  const result = await instance.userDecrypt(
    handlePairs,
    keypair.privateKey,
    keypair.publicKey,
    sig.replace('0x', ''),
    contracts,
    userAddress,
    timestamp,
    duration,
  );

  const decrypted = (result as any)[handle];
  return Number(decrypted);
}

export async function unseal8Batch(
  handles: string[],
  contractAddress: string,
  userAddress: string,
  signer: any
): Promise<number[]> {
  const instance = await initEncryption();

  const keypair = instance.generateKeypair();

  const handlePairs = handles.map(h => ({
    handle: h,
    contractAddress: contractAddress,
  }));

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const duration = '10';
  const contracts = [contractAddress];

  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contracts,
    timestamp,
    duration,
  );

  const sig = await signer.signTypedData(
    eip712.domain,
    {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    eip712.message,
  );

  const result = await instance.userDecrypt(
    handlePairs,
    keypair.privateKey,
    keypair.publicKey,
    sig.replace('0x', ''),
    contracts,
    userAddress,
    timestamp,
    duration,
  );

  return handles.map(h => Number((result as any)[h]));
}
