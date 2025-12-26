import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { initEncryption, seal64, seal8, resetEncryption, unseal8, unseal8Batch } from './encryption';
import { CIPHER_TABLE_ADDRESS } from '../../config/protocol';

const SEPOLIA_CHAIN_ID = 11155111;

export function useCipher() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    if (address && chainId !== SEPOLIA_CHAIN_ID) {
      setWrongNetwork(true);
      setError(new Error('Switch network to Sepolia!'));
    } else {
      setWrongNetwork(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    if (!address || isReady || isLoading || wrongNetwork) {
      return;
    }

    const setup = async () => {
      setIsLoading(true);
      setError(null);

      const timeoutId = setTimeout(() => {
        resetEncryption();
        setIsLoading(false);
        setError(new Error('Encryption init timeout'));
      }, 30000);

      try {
        await initEncryption();
        clearTimeout(timeoutId);
        setIsReady(true);
      } catch (err) {
        clearTimeout(timeoutId);
        resetEncryption();
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    setup();
  }, [address, chainId, retryCount, wrongNetwork]);

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
      console.error('Network switch failed:', err);
      throw err;
    }
  };

  const retry = () => {
    setIsReady(false);
    setIsLoading(false);
    setError(null);
    resetEncryption();
    setRetryCount(prev => prev + 1);
  };

  const sealBuyIn = async (amount: number) => {
    if (!isReady || !address) {
      throw new Error('Encryption not ready');
    }
    return seal64(amount, CIPHER_TABLE_ADDRESS, address);
  };

  const sealBet = async (amount: number) => {
    if (!isReady || !address) {
      throw new Error('Encryption not ready');
    }
    return seal64(amount, CIPHER_TABLE_ADDRESS, address);
  };

  const sealCard = async (cardValue: number) => {
    if (!isReady || !address) {
      throw new Error('Encryption not ready');
    }
    return seal8(cardValue, CIPHER_TABLE_ADDRESS, address);
  };

  const unsealCard = async (handle: string, contractAddr: string, userAddr: string, signer: any) => {
    if (!isReady) {
      throw new Error('Encryption not ready');
    }
    return unseal8(handle, contractAddr, userAddr, signer);
  };

  const unsealCards = async (handles: string[], contractAddr: string, userAddr: string, signer: any) => {
    if (!isReady) {
      throw new Error('Encryption not ready');
    }
    return unseal8Batch(handles, contractAddr, userAddr, signer);
  };

  const unsealBalance = async (_handle: string, _contractAddr: string, _userAddr: string, _signer: any) => {
    console.warn('unsealBalance not implemented');
    return 0n;
  };

  return {
    isReady,
    isLoading,
    error,
    wrongNetwork,
    sealBuyIn,
    sealBet,
    sealCard,
    unsealCard,
    unsealCards,
    unsealBalance,
    retry,
    switchToSepolia,
  };
}
