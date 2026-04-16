import {addAuthHeader, handleAuthError} from '../util/jwtUtil';
import axios from 'axios';

// 로컬 개발 환경: Vite 프록시 사용 (상대 경로)
// 프로덕션/Docker 환경: nginx가 80 포트에서 프록시
const API_SERVER_HOST = import.meta.env.PROD ? "http://localhost:80" : "";
// 채팅 서버(분리 서비스)
// - 개발: Vite 프록시를 쓰면 ""(상대경로)로도 동작 가능
// - 운영: chat-service를 별도 도메인/포트로 두는 경우 여기에 명시
const CHAT_SERVER_HOST = import.meta.env.VITE_CHAT_SERVER_HOST
	? import.meta.env.VITE_CHAT_SERVER_HOST
	: (import.meta.env.PROD ? "http://localhost:8090" : "");

/** SockJS 엔드포인트 베이스. 로컬 Vite는 `/chat-ws` → vite.config 프록시로 8090 `/ws` */
export function getChatSockJsUrl() {
	if (CHAT_SERVER_HOST) {
		return `${String(CHAT_SERVER_HOST).replace(/\/$/, "")}/ws`;
	}
	return import.meta.env.PROD ? "http://localhost:8090/ws" : "/chat-ws";
}

/** 네이티브 WebSocket STOMP URL (`/ws/websocket` 대응) */
export function getChatNativeWebSocketUrl() {
	if (CHAT_SERVER_HOST) {
		const wsBase = String(CHAT_SERVER_HOST).replace(/\/$/, "").replace(/^http/, "ws");
		return `${wsBase}/ws/websocket`;
	}
	if (import.meta.env.PROD) {
		return "ws://localhost:8090/ws/websocket";
	}
	const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
	const host = typeof window !== "undefined" ? window.location.host : "localhost:5173";
	return `${protocol}//${host}/chat-ws/websocket`;
}

const axiosInstance = axios.create({
	baseURL: API_SERVER_HOST,
	headers: {
		"Content-Type": "application/json",
	},
});

const chatAxiosInstance = axios.create({
	baseURL: CHAT_SERVER_HOST,
	headers: {
		"Content-Type": "application/json",
	},
});

// export (다른 파일에서 사용할 수 있도록)
export { API_SERVER_HOST, CHAT_SERVER_HOST, chatAxiosInstance };

// 요청 및 응답 인터셉터 등록
axiosInstance.interceptors.request.use(addAuthHeader, (error) =>
		Promise.reject(error),
);

axiosInstance.interceptors.response.use(
		(response) => response,
		handleAuthError, // 응답 에러 처리
);

chatAxiosInstance.interceptors.request.use(addAuthHeader, (error) =>
		Promise.reject(error),
);

chatAxiosInstance.interceptors.response.use(
		(response) => response,
		handleAuthError,
);

export default axiosInstance;
