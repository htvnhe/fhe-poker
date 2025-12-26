import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { initFHEVM, encryptUint64, encryptUint8, resetFHEVM, decryptUint8, decryptUint8Batch } from '../lib/fhevm';
import { POKER_TABLE_ADDRESS } from '../lib/contract';

const SEPOLIA_CHAIN_ID = 11155111;

export function useFHEVM() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (address && chainId !== SEPOLIA_CHAIN_ID) {
      setWrongNetwork(true);
      setError(new Error('Switch to Sepolia!'));
    } else {
      setWrongNetwork(false);
      if (error?.message === 'Switch to Sepolia!') {
        setError(null);
      }
    }
  }, [address, chainId]);

  // Initialize FHEVM
  useEffect(() => {
    if (!address || isInitialized || isInitializing || wrongNetwork) {
      return;
    }

    const initialize = async () => {
      setIsInitializing(true);
      setError(null);
      setDebugInfo('Starting FHE init...');

      try {
        // Check if SDK is loaded
        if (!window.relayerSDK) {
          setDebugInfo('Waiting for SDK to load...');
          // Wait up to 10 seconds for SDK
          for (let i = 0; i < 100; i++) {
            await new Promise(r => setTimeout(r, 100));
            if (window.relayerSDK) break;
          }
        }

        if (!window.relayerSDK) {
          throw new Error('SDK not loaded from CDN');
        }

        setDebugInfo('SDK loaded, initializing...');
        await initFHEVM(chainId);
        setIsInitialized(true);
        setDebugInfo('FHE Ready!');
        console.log('✅ FHE initialized successfully');
      } catch (err: any) {
        console.error('❌ FHE init failed:', err);
        setDebugInfo(`Error: ${err.message}`);
        resetFHEVM();
        setError(err as Error);

        // Auto retry after 3 seconds (max 3 retries)
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 3000);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [address, chainId, retryCount, wrongNetwork, isInitialized, isInitializing]);

  const switchToSepolia = async () => {
    if (!switchChain) {
      throw new Error('Cannot switch network');
    }
    try {
      await switchChain({ chainId: sepolia.id });
      setWrongNetwork(false);
      setError(null);
      setRetryCount(prev => prev + 1);
    } catch (err) {
      console.error('Switch network failed:', err);
      throw err;
    }
  };

  const retryInitialization = () => {
    setIsInitialized(false);
    setIsInitializing(false);
    setError(null);
    resetFHEVM();
    setRetryCount(prev => prev + 1);
  };

  const encryptBuyIn = async (amount: number) => {
    if (!isInitialized || !address) {
      throw new Error('FHE not ready');
    }
    return encryptUint64(amount, POKER_TABLE_ADDRESS, address);
  };

  const encryptBetAmount = async (amount: number) => {
    if (!isInitialized || !address) {
      throw new Error('FHE not ready');
    }
    return encryptUint64(amount, POKER_TABLE_ADDRESS, address);
  };

  const encryptCard = async (cardValue: number) => {
    if (!isInitialized || !address) {
      throw new Error('FHE not ready');
    }
    return encryptUint8(cardValue, POKER_TABLE_ADDRESS, address);
  };

  const decryptCard = async (handle: string, contractAddr: string, userAddr: string, signer: any) => {
    if (!isInitialized) {
      throw new Error('FHE not ready');
    }
    return decryptUint8(handle, contractAddr, userAddr, signer);
  };

  const decryptCards = async (handles: string[], contractAddr: string, userAddr: string, signer: any) => {
    if (!isInitialized) {
      throw new Error('FHE not ready');
    }
    return decryptUint8Batch(handles, contractAddr, userAddr, signer);
  };

  const decryptBalance = async (handle: string, contractAddr: string, userAddr: string, signer: any) => {
    if (!isInitialized) {
      throw new Error('FHE not ready');
    }
    const instance = await initFHEVM(chainId);
    const { getAddress } = await import('ethers');
    const checksumContractAddr = getAddress(contractAddr);
    const checksumUserAddr = getAddress(userAddr);

    return instance.reencrypt(
      handle,
      checksumContractAddr,
      checksumUserAddr,
      signer.address,
      signer
    );
  };

  return {
    isInitialized,
    isInitializing,
    error,
    wrongNetwork,
    debugInfo,
    encryptBuyIn,
    encryptBetAmount,
    encryptCard,
    decryptCard,
    decryptCards,
    decryptBalance,
    retryInitialization,
    switchToSepolia,
  };
}
