import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  // 루트(.env)로 환경변수를 모아둔 경우에도 front_end에서 정상 로드되게 함
  // (Vite는 VITE_ 접두사만 import.meta.env로 노출)
  envDir: resolve(__dirname, '..', '..'),
  plugins: [react()],
  server: {
    // npm script와 동일하게 고정: 포트가 바뀌면 HMR이 잘못된 포트로 붙을 수 있음
    port: 5173,
    strictPort: true,
    // HMR WebSocket: localhost/127.0.0.1 혼용, IPv6, 방화벽 이슈 시 연결 실패 방지
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
    proxy: {
      /* 채팅 REST는 talktrip-chatting-service(8090). `/api`보다 먼저 등록해야 매칭됨 */
      '/api/chat': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
      /* 통계 API는 talktrip-stats-service(로컬 8082) */
      '/api/stats': {
        // 도커 compose로 stats-service를 올린 경우: 호스트 포트는 18082
        // 필요 시 실행 환경에 맞게 `STATS_API_TARGET=http://localhost:8082`로 덮어쓰기 가능
        target: process.env.STATS_API_TARGET || 'http://localhost:18082',
        changeOrigin: true,
      },
      /* stats-service의 신규 API도 프록시 (admin 구매 통계 페이지에서 사용) */
      '/api/statistics': {
        target: process.env.STATS_API_TARGET || 'http://localhost:18082',
        changeOrigin: true,
      },
      '/api/streams': {
        target: process.env.STATS_API_TARGET || 'http://localhost:18082',
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
