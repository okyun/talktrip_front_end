import axiosInstance, {API_SERVER_HOST} from '../api/mainApi';
import {getCookie, setCookie} from './cookieUtil';

// fetch 요청용 인증 헤더 추가 함수
export const getAuthHeaders = () => {
	const member = getCookie("member");
	const headers = {
		'Content-Type': 'application/json',
	};
	
	if (member && member.accessToken) {
		headers.Authorization = `Bearer ${member.accessToken}`;
	}
	
	if (member && member.refreshToken) {
		headers["Refresh-Token"] = member.refreshToken;
	}
	
	return headers;
};

export const refreshJWT = async () => {
	const member = getCookie("member");
	if (!member) {
		console.warn("Refresh token is missing. Skipping token refresh.");
		return null;
	}

	const { accessToken, refreshToken } = member;

	try {
		// accessToken 남은 유효 시간 확인
		const decodedToken = JSON.parse(atob(accessToken.split(".")[1]));
		const now = Math.floor(Date.now() / 1000); // 현재 시간 (초 단위)
		const exp = decodedToken.exp; // 토큰 만료 시간

		if (exp - now > 600) {
			// 남은 시간이 10분 이상이면 Refresh 요청하지 않음
			return null;
		}


		const res = await axiosInstance.post(
				`/api/member/refresh`,
				{},
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Refresh-Token": refreshToken,
					},
					withCredentials: true,
				},
		);

		// 응답 데이터 검증
		if (!res.data || !res.data.accessToken || !res.data.refreshToken || !res.data.maxAge) {
			console.error("Invalid response format during token refresh:", res.data);
			return null;
		}

		// 새 accessToken과 refreshToken 쿠키에 저장
		setCookie(
				"member",
				{
					accessToken: res.data.accessToken,
					refreshToken: res.data.refreshToken,
				},
				{
					path: "/",
					maxAge: res.data.maxAge, // 새로 갱신된 만료 시간
				},
		);

		console.log("JWT successfully refreshed:", res.data.accessToken);
		return res.data; // 갱신된 토큰 반환
	} catch (err) {
		console.error("Failed to refresh JWT:", err);
		return null; // 오류 발생 시 null 반환
	}
};

/* Axios 요청 인터셉터 */
export const addAuthHeader = (config) => {
	const member = getCookie("member"); // 쿠키에서 "member" 값 가져오기
	if (member) {
		try {
			const { accessToken, refreshToken } = member; // accessToken과 refreshToken 추출

			// accessToken이 존재할 경우 Authorization 헤더 추가
			if (accessToken) {
				config.headers.Authorization = `Bearer ${accessToken}`;
			}

			// refreshToken이 존재할 경우 Refresh-Token 헤더 추가
			if (refreshToken) {
				config.headers["Refresh-Token"] = refreshToken;
			}

			// 헤더 확인 로그
			// console.log("Headers added:", config.headers);
		} catch (error) {
			console.error("Failed to parse member cookie:", error);
		}
	}
	return config; // 수정된 config 반환
};

/* Axios 응답 인터셉터 */
export const handleAuthError = async (err) => {
	const originalRequest = err.config;

	// 401 에러 발생 시 토큰 갱신 로직 실행
	if (err.response && err.response.status === 401 && !originalRequest._retry) {
		originalRequest._retry = true; // 무한 루프 방지

		try {
			// 새 토큰 갱신
			const tokenResponse = await refreshJWT();

			if (tokenResponse && tokenResponse.accessToken) {
				originalRequest.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;
				console.log("Retrying original request with new access token...");
				const url = String(originalRequest.url || "");
				if (url.includes("/api/chat")) {
					const { chatAxiosInstance } = await import("../api/mainApi");
					return chatAxiosInstance(originalRequest);
				}
				return axiosInstance(originalRequest);
			}
		} catch (refreshError) {
			console.error("Failed to refresh token:", refreshError);
			return Promise.reject(refreshError); // 갱신 실패 시 오류 반환
		}
	}

	return Promise.reject(err); // 다른 오류는 그대로 반환
};

export default { addAuthHeader, handleAuthError, getAuthHeaders };