import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      /* 채팅 REST는 talktrip-chatting-service(8090). `/api`보다 먼저 등록해야 매칭됨 */
      '/api/chat': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      /* 채팅 STOMP만 8090 — 주문 알림 등 모놀리스 `/ws`는 아래 `/ws` 프록시 유지 */
      '/chat-ws': {
        target: 'http://localhost:8090',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chat-ws/, '/ws'),
        configure: (proxy) => {
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            try {
              socket.setTimeout(0);
            } catch (_) {}
            socket.on('error', () => {});
          });
          proxy.on('error', () => {});
        },
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            /* Node 기본 소켓 타임아웃으로 장시간 유휴 WS가 끊기는 경우 완화 */
            try {
              socket.setTimeout(0);
            } catch (_) {}
            socket.on('error', () => {
              /* 백엔드(8080) 미기동·재시작 시 ECONNRESET — Vite 터미널 스팸 방지 */
            });
          });
          proxy.on('error', () => {});
        },
      },
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['sockjs-client']
  },
})
