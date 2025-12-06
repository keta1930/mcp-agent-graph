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
      '/agent': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:9999',
        changeOrigin: true,
        bypass: (req, res, options) => {
          // 如果是浏览器导航请求(Accept header包含text/html),返回null让Vite处理
          // 这样前端路由 /admin 就可以正常工作
          const proxyReq = req;
          if (proxyReq.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      '/conversations': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/graphs': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/models': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/system': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/prompt': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/tasks': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/export': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/preview': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/system-tools': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/user': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/memory': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
    }
  },
})
