import { http, createConfig } from 'wagmi';
import { sepolia, localhost } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// 扩展 Window 接口以支持 OKX 钱包
declare global {
  interface Window {
    okxwallet?: typeof window.ethereum;
  }
}

export const config = createConfig({
  chains: [localhost, sepolia],
  connectors: [
    metaMask(),
    injected({
      target() {
        return {
          id: 'okx-wallet',
          name: 'OKX Wallet',
          provider: typeof window !== 'undefined' && window.okxwallet
            ? window.okxwallet
            : undefined,
        };
      },
    }),
  ],
  transports: {
    [localhost.id]: http(),
    [sepolia.id]: http(),
  },
});
