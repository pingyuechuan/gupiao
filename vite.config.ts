import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { ClientRequest } from 'node:http';

const EM_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function emHeaders(proxyReq: ClientRequest) {
  proxyReq.setHeader('Referer', 'https://quote.eastmoney.com/');
  proxyReq.setHeader('User-Agent', EM_UA);
}

function sinaHeaders(proxyReq: ClientRequest) {
  proxyReq.setHeader('Referer', 'https://finance.sina.com.cn');
  proxyReq.setHeader('User-Agent', EM_UA);
}

function thsHeaders(proxyReq: ClientRequest) {
  proxyReq.setHeader('Referer', 'http://stockpage.10jqka.com.cn/');
  proxyReq.setHeader('User-Agent', EM_UA);
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Dev proxy: avoid CORS for public A-share market data APIs.
    // Production should use a backend gateway that forwards these paths.
    proxy: {
      '/em': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/em/, ''),
        configure: (proxy) => proxy.on('proxyReq', emHeaders),
      },
      '/emh': {
        target: 'https://push2his.eastmoney.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/emh/, ''),
        configure: (proxy) => proxy.on('proxyReq', emHeaders),
      },
      '/ems': {
        target: 'https://searchapi.eastmoney.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ems/, ''),
        configure: (proxy) => proxy.on('proxyReq', emHeaders),
      },
      '/sina': {
        target: 'https://hq.sinajs.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sina/, ''),
        configure: (proxy) => proxy.on('proxyReq', sinaHeaders),
      },
      '/tc': {
        target: 'https://qt.gtimg.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tc/, ''),
      },
      // 腾讯 K 线 / 分时（前复权 K 线 + 分时明细），备用数据源
      '/tk': {
        target: 'https://web.ifzq.gtimg.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tk/, ''),
        configure: (proxy) => proxy.on('proxyReq', emHeaders),
      },
      // 新浪分钟 K 线（腾讯/同花顺无稳定分钟端点），备用数据源
      '/sk': {
        target: 'https://quotes.sina.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sk/, ''),
        configure: (proxy) => proxy.on('proxyReq', sinaHeaders),
      },
      '/ths': {
        target: 'http://d.10jqka.com.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ths/, ''),
        configure: (proxy) => proxy.on('proxyReq', thsHeaders),
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          echarts: ['echarts'],
          motion: ['framer-motion'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
