import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import axiosInstance, { chatAxiosInstance, getChatSockJsUrl } from './api/mainApi';
import { Client } from '@stomp/stompjs';

const FloatingChatIcon = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const loginState = useSelector((state) => state.loginSlice);
  const { accessToken, role } = loginState;
  const isLogin = !!accessToken; // accessToken이 있으면 로그인된 것으로 간주
  const isAdminRole = role === 'A' || role === 'A' || role === 'ADMIN' || role === 'admin' || role === 1;
  const isAdminUser = isLogin && isAdminRole;
  const stompClientRef = useRef(null);
  const subscriptionsRef = useRef(new Set());
  const lastLoggedUnreadCountRef = useRef(null);
  const unreadFetchSeqRef = useRef(0);
  /** cleanup에서 deactivate() 호출 시 true — 채팅 페이지 이동 등 정상 종료와 비정상 끊김 로그 구분 */
  const intentionalDisconnectRef = useRef(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const isDebugEnabled = (() => {
    try {
      return import.meta.env.DEV && window?.localStorage?.getItem('DEBUG_CHAT_ICON') === '1';
    } catch (_) {
      return false;
    }
  })();

  const debugLog = (...args) => {
    if (!isDebugEnabled) return;
    console.log(...args);
  };

  const getDotSize = (count) => {
    if (!count || count <= 0) return 0;
    if (count >= 100) return 32; // px (조금 키움)
    if (count >= 50) return 26;
    if (count >= 10) return 20;
    return 14;
  };

  const getDotOffset = () => -0; // 아주 조금 바깥쪽으로 배치

  // 현재 경로에 따라 채팅 링크 결정
  const getChatLink = () => {
    if (location.pathname.startsWith('/admin')) {
      return '/admin/chat'; // 관리자 페이지에서는 관리자 채팅
    } else {
      return '/chat'; // 사용자 페이지에서는 일반 채팅
    }
  };

  // 현재 경로에 따라 제목 결정
  const getChatTitle = () => {
    if (location.pathname.startsWith('/admin')) {
      return '채팅 관리'; // 관리자용 제목
    } else {
      return '채팅 상담'; // 사용자용 제목
    }
  };

  // 안 읽은 메시지 개수 가져오기
  const fetchUnreadCount = async () => {
    try {
      const seq = ++unreadFetchSeqRef.current;
      const ts = new Date().toLocaleTimeString();
      debugLog(`=== 안 읽은 메시지 개수 API 호출 (#${seq}) [${ts}] path=${location.pathname} ===`);
      const userId = loginState?.id;
      if (!userId) {
        debugLog('로그인 사용자 ID가 없어 미읽음 수 조회를 건너뜁니다.');
        setUnreadCount(0);
        return;
      }

      // ChatPage와 동일한 기준으로 "미읽음"을 계산하기 위해 채팅방 목록에서 notReadMessageCount를 합산
      // (countALLUnreadMessages 엔드포인트와 결과가 달라질 수 있어 기준을 통일)
      let cursor = null;
      let hasNext = true;
      let safety = 0;
      let totalUnread = 0;

      while (hasNext && safety < 10) {
        safety += 1;
        const params = new URLSearchParams();
        params.append('limit', '200');
        if (cursor) params.append('cursor', cursor);

        const response = await chatAxiosInstance.get(`/api/chat/me/chatRooms?${params.toString()}`);
        const data = response?.data;
        debugLog('채팅방 목록 응답(미읽음 계산용):', data);

        if (data && Array.isArray(data.items)) {
          // SliceResponse 형태
          const items = data.items;
          cursor = data.nextCursor ?? null;
          hasNext = Boolean(data.hasNext);

          for (const room of items) {
            const raw =
              room?.notReadMessageCount ??
              room?.unreadCount ??
              room?.not_read_message_count ??
              room?.unread_count ??
              room?.notReadCount ??
              room?.unReadMessageCount ??
              0;
            const n = Number(raw ?? 0);
            if (Number.isFinite(n) && n > 0) totalUnread += n;
          }
        } else if (Array.isArray(data)) {
          // 배열 형태(구형)
          hasNext = false;
          for (const room of data) {
            const raw =
              room?.notReadMessageCount ??
              room?.unreadCount ??
              room?.not_read_message_count ??
              room?.unread_count ??
              room?.notReadCount ??
              room?.unReadMessageCount ??
              0;
            const n = Number(raw ?? 0);
            if (Number.isFinite(n) && n > 0) totalUnread += n;
          }
        } else {
          // 예상치 못한 응답
          hasNext = false;
        }
      }

      const nextCount = Number.isFinite(totalUnread) && totalUnread >= 0 ? totalUnread : 0;
      setUnreadCount(nextCount);
      if (lastLoggedUnreadCountRef.current !== nextCount) {
        console.log(
          `안 읽은 메시지 개수: ${nextCount} (path=${location.pathname}, at=${new Date().toLocaleTimeString()})`,
        );
        lastLoggedUnreadCountRef.current = nextCount;
      }
    } catch (error) {
      console.error('안 읽은 메시지 개수 가져오기 실패:', error);
      console.error('에러 상세:', error.response?.data);
      console.error('에러 상태:', error.response?.status);
      // 에러 발생 시 기본값 사용
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const isChatPage = location.pathname.startsWith('/chat') || location.pathname.startsWith('/admin/chat');
    if (!isLogin) return; // 비로그인 시 연결하지 않음

    let isMounted = true;

    const initWebSocket = async () => {
      intentionalDisconnectRef.current = false;
      try {
        const SockJS = (await import('sockjs-client')).default;
        // 개발 환경: Vite proxy 사용 (상대 경로), 프로덕션: API_SERVER_HOST 사용
        const wsUrl = getChatSockJsUrl();
        const socket = new SockJS(wsUrl, null, {
          transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
        });

        const makeConnectHeaders = () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {});

        const client = new Client({
          webSocketFactory: () => socket,
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          connectHeaders: makeConnectHeaders(),
          beforeConnect: () => {
            client.connectHeaders = makeConnectHeaders();
          },
          debug: (msg) => debugLog('STOMP ICON DEBUG:', msg),
        });

        client.onConnect = async () => {
          if (!isMounted) return;
          console.log('✅ FloatingChatIcon WebSocket 연결 성공');
          stompClientRef.current = client;
          setIsWebSocketConnected(true);

          // WebSocket 연결만 하고 채팅방 구독은 하지 않음
          // 채팅방 구독은 실제 채팅 페이지에서 처리
        };  

        client.onStompError = (frame) => {
          console.error('❌ FloatingChatIcon STOMP 에러:', frame);
          setIsWebSocketConnected(false);
        };

        client.onDisconnect = () => {
          setIsWebSocketConnected(false);
          if (intentionalDisconnectRef.current) {
            intentionalDisconnectRef.current = false;
            console.debug(
              'FloatingChatIcon: WebSocket 정리됨 (채팅 화면 이동·로그아웃·다른 페이지로 전환 시 정상)',
            );
            return;
          }
          console.warn('FloatingChatIcon: WebSocket 연결이 예기치 않게 끊어졌습니다. STOMP가 재연결을 시도할 수 있습니다.');
        };

        client.activate();
      } catch (e) {
        console.error('❌ FloatingChatIcon WebSocket 초기화 실패:', e);
      }
    };

    // 채팅 페이지가 아닐 때만 연결 시작
    if (!isChatPage) {
      initWebSocket();
    }

    return () => {
      isMounted = false;
      // 구독 해제
      subscriptionsRef.current.forEach((subscription) => {
        try {
          subscription.unsubscribe();
        } catch (e) {
          // ignore
        }
      });
      subscriptionsRef.current.clear();

      // 클라이언트 비활성화 (채팅 링크 클릭 → /chat 이동 시 컴포넌트 언마운트되며 여기서 끊김 = 정상)
      if (stompClientRef.current) {
        try {
          intentionalDisconnectRef.current = true;
          stompClientRef.current.deactivate();
        } catch (e) {
          intentionalDisconnectRef.current = false;
          // ignore
        }
      }
      setIsWebSocketConnected(false);
    };
  }, [isLogin, accessToken, location.pathname]);

  // 미읽음 수는 라우트 변경/주기적으로 최신화 (배지 계속 켜짐 방지)
  useEffect(() => {
    if (!isLogin) {
      setUnreadCount(0);
      return;
    }
    // 라우트가 바뀔 때마다 즉시 한번 갱신
    fetchUnreadCount();

    // 백그라운드에서 주기적으로 갱신 (읽음 처리/서버 상태 반영)
    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isLogin, accessToken, location.pathname]);

  // 비로그인 또는 chat/admin/chat 페이지에서는 아이콘 숨김
  if (!isLogin || location.pathname.startsWith('/chat') || location.pathname.startsWith('/admin/chat')) {
    return null;
  }

  return (
    <Link
      to={getChatLink()}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
      title={getChatTitle()}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      {Number(unreadCount) > 0 && (
        <span
          className="absolute bg-red-500 rounded-full animate-pulse"
          style={{
            width: `${getDotSize(unreadCount)}px`,
            height: `${getDotSize(unreadCount)}px`,
            top: `${getDotOffset(unreadCount)}px`,
            right: `${getDotOffset(unreadCount)}px`,
          }}
          title={`${unreadCount}`}
        />
      )}
    </Link>
  );
};

export default FloatingChatIcon; 