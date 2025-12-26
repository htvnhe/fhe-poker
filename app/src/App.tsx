import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { chainConfig } from './config/chain';
import { Landing } from './features/auth/Landing';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={chainConfig}>
      <QueryClientProvider client={queryClient}>
        <Landing />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
