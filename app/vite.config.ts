import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Some browser bundles expect Node's global
    global: 'globalThis',
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es'
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    middlewareMode: false,
    proxy: {
      '/relayer': {
        target: 'https://relayer.testnet.zama.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/relayer/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // 添加必要的请求头来绕过 Cloudflare WAF
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
            proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
            proxyReq.setHeader('Cache-Control', 'no-cache');
            proxyReq.setHeader('Pragma', 'no-cache');
            proxyReq.setHeader('Sec-Fetch-Dest', 'empty');
            proxyReq.setHeader('Sec-Fetch-Mode', 'cors');
            proxyReq.setHeader('Sec-Fetch-Site', 'same-site');
            proxyReq.setHeader('Referer', 'https://relayer.testnet.zama.cloud/');
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Upgrade-Insecure-Requests', '1');
            // 移除 Origin 头，让 Relayer 不会因为 CORS 而拒绝
            proxyReq.removeHeader('origin');
            console.log(`[Proxy] ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            // 添加 CORS 头到响应
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
            console.log(`[Proxy Response] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
        },
      },
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    exclude: [
      '@zama-fhe/relayer-sdk',
      'tfhe',
      'tkms',
      'node-tfhe',
      'node-tkms',
      'keccak'
    ],
  },
})
