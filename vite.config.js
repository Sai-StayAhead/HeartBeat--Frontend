import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,

    allowedHosts: true,

    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/clients': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/bots': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/bot-runs': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/dashboard': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/departments': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/notifications': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/client-management': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/action-items': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/client-message': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/messages': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      // WebSocket
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})