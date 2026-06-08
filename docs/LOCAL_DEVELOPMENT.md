# 로컬 프론트 개발 (Vite 프록시) 트러블슈팅

`npm run dev`로 띄운 `http://localhost:5173`은 API를 **직접 호출하지 않고**, `vite.config.js`의 **`server.proxy`** 를 통해 각 백엔드로 넘깁니다.

상세 라우팅은 `tt/front_end/vite.config.js`를 참고하세요.

---

## 1. 환경 변수로 프록시 대상 맞추기

기본값이 로컬과 다르면 `/api/member/me`, `/api/orders/me` 등이 **연결 거부**되고 브라우저에는 **500**처럼 보일 수 있습니다. Vite 터미널에는 보통 다음이 찍힙니다.

- `http proxy error: /api/member/me`
- `Error: connect ECONNREFUSED 127.0.0.1:18080`

### 모놀리스 (`tt/back_end`) — `/api` (단, 아래 예외 제외)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `MONOLITH_API_TARGET` | `http://127.0.0.1:18080` | 로컬에서 모놀리스가 **8080**이면 반드시 맞출 것 |

**PowerShell 예시**

```powershell
cd "...\talktrip_v2\tt\front_end"
$env:MONOLITH_API_TARGET="http://127.0.0.1:8080"
npm run dev
```

변경 후에는 **`npm run dev`를 다시 시작**해야 적용됩니다.

### 채팅 — `/api/chat`, `/chat-ws`

| 변수 | 기본값 |
|------|--------|
| `CHAT_API_TARGET` | `http://127.0.0.1:8090` |

채팅 서비스를 안 띄웠다면 `ECONNREFUSED ...8090` 로그는 정상적으로 나올 수 있습니다.

### 상품 — `/api/products` → **talktrip-product-service**

| 변수 | 기본값 |
|------|--------|
| `PRODUCT_API_TARGET` | `http://127.0.0.1:18086` |

로컬에서 상품만 `8082` 등 다른 포트면 `PRODUCT_API_TARGET`으로 덮어씁니다.

`/api/products` 프록시는 모놀리스 JWT와 충돌하지 않도록 **`Authorization` / `Refresh-Token` 헤더를 제거**합니다.

### 통계 — `/api/stats`, `/api/statistics`, `/api/streams`

| 변수 | 기본값 |
|------|--------|
| `STATS_API_TARGET` | `http://localhost:18082` |

---

## 2. `npm run dev`가 바로 실패할 때 (포트 충돌)

`vite.config.js`에 **`strictPort: true`** 와 **`port: 5173`** 이 있어서, **이미 5173을 쓰는 프로세스**(이전 Vite 등)가 있으면 두 번째 실행이 실패합니다.

로그에 `error when starting dev server`만 잘리게 나올 수 있습니다.

### 확인

```powershell
netstat -ano | findstr ":5173"
```

### 해결

- 예전 터미널에서 **Ctrl+C**로 Vite 종료  
- 또는 `taskkill /PID <PID> /F`  
- 또는 다른 포트: `npm run dev -- --port 5174`

---

## 3. 증상별 빠른 체크

| 증상 | 우선 확인 |
|------|-----------|
| `/mypage`, 주문/좋아요 등 `/api/*` 만 실패 | `MONOLITH_API_TARGET` 이 실제 모놀리스 포트와 일치하는지 |
| `/api/products` 403 | 모놀리스 토큰이 product-service로 넘어가던 문제 → 프록시에서 헤더 제거됨. **상품 서비스 기동·포트** 확인 |
| `/api/chat` 실패 | `CHAT_API_TARGET` 및 채팅 서비스 기동 여부 |
| Vite 시작 실패 | **5173 점유** 여부 |

---

## 4. 참고: 마이페이지 프로필 API 응답 필드

`GET /api/member/me` 응답은 회원 ID 필드가 **`memberId`가 아니라 `id`** 입니다.  
폼 매핑 시 `MemberController` / `MemberResponseDTO`와 맞추세요.


cd "c:\Users\김옥윤\IdeaProjects\talktrip_v2\tt\front_end"
$env:MONOLITH_API_TARGET="http://127.0.0.1:8080"
npm run dev