import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

/** Windows 등에서 `localhost` → `::1` 과 Java 리스닝 주소가 어긋나면 프록시가 `socket hang up` 낼 수 있어 IPv4 고정 권장 */
// Windows에서 Docker Desktop/WSL이 8080을 점유하는 경우가 흔해 기본 포트를 18080으로 둡니다.
// 필요 시 MONOLITH_API_TARGET 로 실행 환경에 맞게 덮어쓰세요.
const monolithTarget = process.env.MONOLITH_API_TARGET || 'http://127.0.0.1:18080'
const chatTarget = process.env.CHAT_API_TARGET || 'http://127.0.0.1:8090'
/**
 * 상품 카탈로그 → talktrip-product-service.
 * - `tt/docker-compose.yml`: 호스트 **18086** → 컨테이너 8082 (기본값과 맞춤)
 * - 로컬에서만 `./gradlew bootRun`(8082) 쓰면: `PRODUCT_API_TARGET=http://127.0.0.1:8082`
 * - `tt/back_end/docker-compose.yml` 만 쓰면 상품 포트가 다를 수 있음 → PRODUCT_API_TARGET 로 맞추기
 */
const productApiTarget = process.env.PRODUCT_API_TARGET || 'http://127.0.0.1:18086'
const trendingApiTarget = process.env.TRENDING_API_TARGET || 'http://127.0.0.1:18083'

// https://vite.dev/config/
export default defineConfig({
  // 루트(.env)로 환경변수를 모아둔 경우에도 front_end에서 정상 로드되게 함
  // (Vite는 VITE_ 접두사만 import.meta.env로 노출)
  envDir: resolve(__dirname, '..', '..'),
  plugins: [
    react(),
    {
      name: 'talktrip-log-product-proxy',
      configureServer() {
        console.info(`\n[talktrip] /api/products → ${productApiTarget}  (바꾸려면 PRODUCT_API_TARGET)\n`)
      },
    },
  ],
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
      /**
       * 좋아요 API는 모놀리스(tt/back_end)의 LikeController에 있음.
       * `/api/products/**`를 product-service로 보내는 규칙보다 먼저 등록해 404를 방지.
       */
      '^/api/products/.+/like$': {
        target: monolithTarget,
        changeOrigin: true,
        timeout: 120_000,
      },
      /*
       * 상품 카탈로그는 talktrip-product-service 로만 보냄.
       * 또한 product-service는 모놀리스 JWT를 검증하지 않을 수 있으니(또는 시크릿이 다르니)
       * 프론트가 붙이는 Authorization/Refresh-Token 헤더는 제거해서 403을 방지합니다.
       */
      '^/api/products': {
        target: productApiTarget,
        changeOrigin: true,
        timeout: 120_000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('authorization')
            proxyReq.removeHeader('Authorization')
            proxyReq.removeHeader('refresh-token')
            proxyReq.removeHeader('Refresh-Token')
          })
          proxy.on('error', () => {})
        },
      },
      /* 채팅 REST는 talktrip-chatting-service(8090). `/api`보다 먼저 등록해야 매칭됨 */
      '/api/chat': {
        target: chatTarget,
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
      /* Redis ZSET 트렌딩 조회 — talktrip-trending-service(18083) */
      '/api/trending': {
        target: trendingApiTarget,
        changeOrigin: true,
      },
      '/api': {
        target: monolithTarget,
        changeOrigin: true,
        timeout: 120_000,
      },
      /* 채팅 STOMP만 8090 — 주문 알림 등 모놀리스 `/ws`는 아래 `/ws` 프록시 유지 */
      '/chat-ws': {
        target: chatTarget,
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
        target: monolithTarget,
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
