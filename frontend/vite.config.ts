import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许所有 IP 访问
    port: 5173,
    allowedHosts: [
      'agent-graph.com',
      'www.agent-graph.com',
      'localhost'
    ],
    proxy: {
      // 所有API请求统一通过 /api 前缀代理到后端
      '/api': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
    }
  },
})
