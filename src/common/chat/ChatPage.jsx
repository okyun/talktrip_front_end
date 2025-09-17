// src/common/chat/ChatPage.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation, useMatch } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosInstance, { API_SERVER_HOST } from '../api/mainApi';  // mainApi의 axiosInstance 사용
import ChatRoom from './ChatRoom';
import ChatRoomItem from './ChatRoomItem';
import { Client } from '@stomp/stompjs';
import { getCookie } from '../util/cookieUtil';
import { 
  saveFailedMessage, 
  getFailedMessagesByRoom, 
  removeFailedMessage, 
  updateFailedMessage,
  incrementRetryCount,
  cleanupOldFailedMessages 
} from '../util/failedMessageUtil';

// 더미 채팅방 목록 (더 많은 데이터 추가)
const dummyRooms = [
  { id: 'room1', title: '고객 A님 문의', lastMessage: '안녕하세요!', updatedAt: '2024-06-10', notReadMessageCount: 2 },
  
];

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const adminMatch = useMatch('/admin/chat/:roomId');
  const userMatch = useMatch('/chat/:roomId');
  const nestedRoomId = adminMatch?.params?.roomId || userMatch?.params?.roomId || null;
  const effectiveRoomId = nestedRoomId || roomId || null;
  const loginState = useSelector((state) => state.loginSlice);
  const { accessToken, role } = loginState;
  const currentUserEmail = loginState?.email || getCookie('member')?.email || '';
  const normalizeEmail = (v) => String(v || '').trim().toLowerCase();
  const emailsEqual = (a, b) => normalizeEmail(a) === normalizeEmail(b);
  const isLogin = !!accessToken; // accessToken이 있으면 로그인된 것으로 간주
  const isAdminRole = role === 'A' || role === 'A' || role === 'ADMIN' || role === 'admin' || role === 1;
  const isAdminUser = isLogin && isAdminRole;
  const [rooms, setRooms] = useState([]);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false); // WebSocket 연결 상태
  const [failedMessages, setFailedMessages] = useState([]); // 실패한 메시지들
  const [currentRoomInfo, setCurrentRoomInfo] = useState(null); // 현재 선택된 채팅방 정보
  
  // 무한 스크롤 관련 상태
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const stompClientRef = useRef(null);
  const subscriptionsRef = useRef(new Set());
  const isSubscriptionSetupRef = useRef(false); // 구독 설정 완료 플래그
  const chatRoomUpdateCallbackRef = useRef(null); // ChatRoom 업데이트 콜백
  const sendMessageCallbackRef = useRef(null); // ChatRoom에서 메시지 전송 요청 콜백

  const formatDate = (dateInput) => {
    if (!dateInput) return '';
    
    try {
      let date;
      
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (Array.isArray(dateInput)) {
        const [year, month, day, hours = 0, minutes = 0, seconds = 0] = dateInput;
        date = new Date(year, month - 1, day, hours, minutes, seconds);
      } else if (typeof dateInput === 'string' && dateInput.includes(',')) {
        const parts = dateInput.split(',').map(part => parseInt(part.trim()));
        const [year, month, day, hours = 0, minutes = 0, seconds = 0] = parts;
        date = new Date(year, month - 1, day, hours, minutes, seconds);
      } else if (typeof dateInput === 'number') {
        const timestamp = dateInput.toString().length === 10 ? dateInput * 1000 : dateInput;
        date = new Date(timestamp);
      } else if (typeof dateInput === 'string' && /^\d+$/.test(dateInput)) {
        const timestamp = parseInt(dateInput);
        const finalTimestamp = dateInput.length === 10 ? timestamp * 1000 : timestamp;
        date = new Date(finalTimestamp);
      } else {
        date = new Date(dateInput);
      }
      
      if (isNaN(date.getTime())) {
        return String(dateInput);
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      return String(dateInput);
    }
  };

  // 실패한 메시지 초기화 및 정리
  useEffect(() => {
    // 페이지 로드 시 오래된 실패한 메시지 정리
    cleanupOldFailedMessages();
    
    // 현재 방의 실패한 메시지들 로드
    if (effectiveRoomId) {
      const roomFailedMessages = getFailedMessagesByRoom(effectiveRoomId);
      setFailedMessages(roomFailedMessages);
      console.log('📋 현재 방의 실패한 메시지들 로드:', roomFailedMessages);
    }
  }, [effectiveRoomId]);

  // 채팅방이 변경될 때 currentRoomInfo 초기화
  useEffect(() => {
    if (effectiveRoomId) {
      setCurrentRoomInfo(null);
      console.log(`🔄 채팅방 변경 감지 - ${effectiveRoomId}로 currentRoomInfo 초기화`);
    }
  }, [effectiveRoomId]);

  // 웹소켓 연결 및 구독 설정
  useEffect(() => {
    console.log('🔄 WebSocket 초기화 시작');
    
    const initWebSocket = async () => {
      try {
        // 네이티브 WebSocket을 사용해 SockJS info(401) 없이 바로 연결
        const wsBase = API_SERVER_HOST.replace(/\/$/, '').replace(/^http/, 'ws');
        const brokerWsUrl = `${wsBase}/ws/websocket`;
        console.log('🔄 WebSocket 생성 중... URL:', brokerWsUrl);
        const socketFactory = () => {
          const socket = new WebSocket(brokerWsUrl);
        socket.onopen = () => {
            console.log('✅ WebSocket 연결 성공');
        };
        socket.onclose = (event) => {
            console.log('❌ WebSocket 연결 닫힘:', event.code, event.reason);
        };
        socket.onerror = (error) => {
            console.error('❌ WebSocket 에러:', error);
        };
          return socket;
        };
        console.log('✅ WebSocket 팩토리 준비 완료');
        
        console.log('🔄 STOMP 클라이언트 생성 중...');
        const getAccessToken = () => {
          try {
            const localToken = window.localStorage?.getItem('accessToken');
            if (localToken) return localToken;
          } catch (_) {}
          if (accessToken) return accessToken;
          const member = getCookie('member');
          if (member && member.accessToken) return member.accessToken;
          return null;
        };

        const makeConnectHeaders = () => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        };

        const client = new Client({
          webSocketFactory: socketFactory,
          // brokerURL를 사용하지 않고 webSocketFactory로 직접 WebSocket 사용
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          connectHeaders: makeConnectHeaders(),
          beforeConnect: () => {
            client.connectHeaders = makeConnectHeaders();
          },
          debug: (msg) => console.log('STOMP DEBUG:', msg),
        });
        console.log('✅ STOMP 클라이언트 생성 완료');

        client.onConnect = () => {
          console.log('✅ ChatPage WebSocket 연결 성공');
          console.log('✅ 클라이언트 연결 상태:', client.connected);
          stompClientRef.current = client;
          setIsWebSocketConnected(true); // 연결 상태 업데이트
          console.log('✅ isWebSocketConnected 상태 업데이트됨: true');
        };

        client.onStompError = (frame) => {
          console.error('❌ ChatPage STOMP 에러:', frame);
          console.error('❌ 에러 프레임 상세:', frame.headers);
          console.error('❌ 에러 바디:', frame.body);
          setIsWebSocketConnected(false); // 에러 시 연결 상태 false
          console.log('❌ isWebSocketConnected 상태 업데이트됨: false (에러)');
        };

        client.onDisconnect = () => {
          console.log('❌ ChatPage WebSocket 연결 해제');
          setIsWebSocketConnected(false); // 연결 해제 시 상태 false
          console.log('❌ isWebSocketConnected 상태 업데이트됨: false (연결해제)');
        };

        console.log('🔄 STOMP 클라이언트 활성화 중...');
        client.activate();
        console.log('✅ STOMP 클라이언트 활성화 완료 (연결 대기 중)');
      } catch (error) {
        console.error('❌ ChatPage WebSocket 초기화 실패:', error);
        console.error('❌ 초기화 실패 상세:', error.stack);
        setIsWebSocketConnected(false);
        console.log('❌ isWebSocketConnected 상태 업데이트됨: false (초기화실패)');
      }
    };

    initWebSocket();

    return () => {
      // 기존 구독들 해제
      subscriptionsRef.current.forEach(subscription => {
        try {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
          }
        } catch (error) {
          console.error('❌ 구독 해제 실패:', error);
        }
      });
      subscriptionsRef.current.clear();
      
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
      
      setIsWebSocketConnected(false); // cleanup 시 연결 상태 false
    };
  }, []);

  // 메시지를 받았을 때 채팅방 목록 새로고침 (간소화)
  const updateSingleRoom = async (roomId) => {
    try {
      console.log(`🔄 채팅방 ${roomId} 업데이트 - 전체 목록 새로고침`);
      // 전체 채팅방 목록을 새로고침
      fetchChatRooms();
    } catch (error) {
      console.error(`❌ 채팅방 ${roomId} 업데이트 실패:`, error);
    }
  };

  // ChatRoom에서 요청한 메시지 전송 처리
  const handleSendMessage = (messageDto) => {
    console.log('📨 ChatPage에서 ChatMessageRequestDto 전송 처리:', messageDto);
    console.log('📨 필수 필드 확인:', {
      roomId: messageDto.roomId,
      message: messageDto.message,
      //sender: messageDto.sender
    });
    console.log('🔍 WebSocket 연결 상태:', isWebSocketConnected);
    console.log('🔍 stompClient 존재 여부:', !!stompClientRef.current);
    console.log('🔍 stompClient 연결 상태:', stompClientRef.current?.connected);
    console.log('🔍 stompClient 활성화 상태:', stompClientRef.current?.active);
    console.log('🔍 stompClient 상태 상세:', stompClientRef.current?.state);
    
    // 연결 상태 재확인
    if (stompClientRef.current) {
      console.log('🔍 STOMP 클라이언트 상세 정보:');
      console.log('  - connected:', stompClientRef.current.connected);
      console.log('  - active:', stompClientRef.current.active);
      console.log('  - state:', stompClientRef.current.state);
      console.log('  - 웹소켓 readyState:', stompClientRef.current.webSocket?.readyState);
    }
    
    if (isWebSocketConnected && stompClientRef.current && stompClientRef.current.connected) {
      try {
        //cmd: SEND 프레임 전송 ,실제 SEND 프레임 전송은 ChatPage.jsx에서 이뤄집니다:
        console.log('📨 ChatPage WebSocket 전송 시도:', messageDto);
        console.log('📨 전송 destination: /app/chat/message');
        console.log('📨 전송 body:', JSON.stringify(messageDto));
        // cmd: SEND 프레임 전송
        stompClientRef.current.publish({
          destination: "/app/chat/message",
          body: JSON.stringify(messageDto),
          headers: { 'content-type': 'application/json' },
        });
        
        console.log('✅ ChatPage WebSocket 메시지 전송 완료');
        
        // 메시지 전송 후 즉시 채팅방 목록 업데이트 및 정렬
        setRooms(prev => {
          const now = new Date();
          const nowTime = now.getTime();
          
          const updated = prev.map(room => {
            if (String(room.id) === String(messageDto.roomId) || String(room.roomId) === String(messageDto.roomId)) {
              console.log('🔄 메시지 전송으로 채팅방 업데이트:', {
                roomId: room.id,
                message: messageDto.message,
                newTime: nowTime
              });
              
              return {
                ...room,
                lastMessage: messageDto.message,
                updatedAt: formatDate(now),
                _sortTime: nowTime, // 정렬용 타임스탬프 추가
              };
            }
            return room;
          });
          
          // _sortTime 기준으로 내림차순 정렬 (최신순)
          const sorted = updated.sort((a, b) => {
            const timeA = a._sortTime || new Date(a.updatedAt).getTime();
            const timeB = b._sortTime || new Date(b.updatedAt).getTime();
            return timeB - timeA;
          });
          
          console.log('📊 정렬된 채팅방 목록:', sorted.map(r => ({
            id: r.id,
            title: r.title,
            lastMessage: r.lastMessage,
            updatedAt: r.updatedAt,
            _sortTime: r._sortTime
          })));
          
          return sorted;
        });
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ ChatPage WebSocket 전송 실패:', error);
        console.error('❌ 전송 실패 상세:', error.stack);
        
        // 클라이언트 측 전송 실패 시 즉시 실패 메시지 저장
        const failedMessageId = saveFailedMessage(messageDto, error.message || '클라이언트 전송 실패');
        if (failedMessageId && String(messageDto.roomId) === String(effectiveRoomId)) {
          const updatedFailedMessages = getFailedMessagesByRoom(effectiveRoomId);
          setFailedMessages(updatedFailedMessages);
        }
        
        return { success: false, error };
      }
    } else {
      console.warn('⚠️ ChatPage WebSocket이 연결되지 않아서 전송 실패');
      console.warn('⚠️ 연결 상태 분석:');
      console.warn('  - isWebSocketConnected:', isWebSocketConnected);
      console.warn('  - stompClient 존재:', !!stompClientRef.current);
      console.warn('  - stompClient.connected:', stompClientRef.current?.connected);
      console.warn('  - stompClient.active:', stompClientRef.current?.active);
      console.warn('  - stompClient.state:', stompClientRef.current?.state);
      
      // WebSocket 연결 실패 시 즉시 실패 메시지 저장
      const failedMessageId = saveFailedMessage(messageDto, 'WebSocket 연결 없음');
      if (failedMessageId && String(messageDto.roomId) === String(effectiveRoomId)) {
        const updatedFailedMessages = getFailedMessagesByRoom(effectiveRoomId);
        setFailedMessages(updatedFailedMessages);
      }
      
      // 재연결 시도
      if (stompClientRef.current && !stompClientRef.current.connected && stompClientRef.current.active) {
        console.log('🔄 WebSocket 재연결 시도...');
        try {
          stompClientRef.current.activate();
        } catch (reconnectError) {
          console.error('❌ 재연결 실패:', reconnectError);
        }
      }
      
      return { success: false, error: 'WebSocket not connected' };
    }
  };

  // 실패한 메시지 재전송 함수
  const handleRetryMessage = (failedMessageId, roomId, message) => {
    // 새로운 인자로 받은 정보를 우선 사용, 없으면 기존 방식으로 찾기
    let failedMessage;
    if (roomId && message) {
      failedMessage = failedMessages.find(msg => 
        msg.id === failedMessageId || 
        (msg.roomId === roomId && msg.message === message)
      );
    } else {
      failedMessage = failedMessages.find(msg => msg.id === failedMessageId);
    }
    
    if (!failedMessage) {
      console.error('❌ 재전송할 메시지를 찾을 수 없음:', failedMessageId, roomId, message);
      return;
    }

    // 재전송 횟수 확인 (3회 이상이면 포기)
    if ((failedMessage.retryCount || 0) >= 3) {
      console.warn('⚠️ 재전송 횟수 초과:', failedMessage);
      updateFailedMessage(failedMessageId, { status: 'abandoned' });
      return;
    }

    console.log('🔄 메시지 재전송 시도:', failedMessage);
    
    // 상태를 재전송 중으로 변경
    updateFailedMessage(failedMessageId, { status: 'retrying' });
    setFailedMessages(getFailedMessagesByRoom(effectiveRoomId));

    // 원본 메시지 데이터로 재전송
    const messageDto = {
      roomId: failedMessage.roomId,
      message: failedMessage.message,
      sender: failedMessage.sender
    };

    const result = handleSendMessage(messageDto);
    
    if (result && result.success) {
      // 재전송 성공 시 실패 목록에서 제거
      removeFailedMessage(failedMessageId);
      setFailedMessages(getFailedMessagesByRoom(effectiveRoomId));
      console.log('✅ 메시지 재전송 성공:', failedMessageId);
    } else {
      // 재전송 실패 시 가만히 둠 (에러 큐에서 처리됨)
      console.log('🔄 재전송 실패 - 에러 큐에서 처리 대기:', failedMessageId);
    }
  };

  // 실패한 메시지 삭제 (포기)
  const handleAbandonMessage = (failedMessageId) => {
    // 쿠키에서 완전히 삭제
    removeFailedMessage(failedMessageId);
    
    // UI에서도 즉시 제거
    setFailedMessages(getFailedMessagesByRoom(effectiveRoomId));
    
    console.log('🗑️ 실패한 메시지 완전 삭제 (쿠키 + UI):', failedMessageId);
  };

  // ChatRoom에서 받은 채팅방 정보로 rooms 업데이트
  const handleRoomInfoUpdate = (roomInfo) => {
    console.log('📥 ChatRoom에서 받은 채팅방 정보:', roomInfo);
    
    if (roomInfo && roomInfo.id) {
      // 현재 선택된 채팅방 정보 업데이트
      setCurrentRoomInfo(roomInfo);
      
      // rooms 목록도 업데이트 (정렬하지 않음 - 클릭 시에는 순서 유지)
      setRooms(prev => prev.map(room => {
        // roomId나 id로 매칭
        if (String(room.id) === String(roomInfo.id) || 
            String(room.roomId) === String(roomInfo.id) ||
            String(room.id) === String(roomInfo.roomId)) {
          
          console.log('🔄 채팅방 정보 업데이트 (정렬 없음):', {
            기존: { id: room.id, title: room.title },
            새로운: { id: roomInfo.id, title: roomInfo.title }
          });
          
          const updateTime = roomInfo.updatedAt ? new Date(roomInfo.updatedAt) : new Date();
          
          return {
            ...room,
            title: (roomInfo.title && roomInfo.title.trim() !== '') ? roomInfo.title : room.title,
            lastMessage: roomInfo.lastMessage || room.lastMessage,
            updatedAt: formatDate(updateTime),
            _sortTime: updateTime.getTime(), // 정렬용 타임스탬프는 유지하되 정렬은 하지 않음
            notReadMessageCount: roomInfo.notReadMessageCount || room.notReadMessageCount || 0
          };
        }
        return room;
      }));
    }
  };

  // 웹소켓 구독 설정 함수 (WebSocket 연결 완료 후 실행)
  const setupWebSocketSubscriptions = useCallback(() => {
    if (!stompClientRef.current) {
      console.log('⚠️ WebSocket 클라이언트가 없어서 구독 설정 건너뜀');
      return;
    }

    if (!isWebSocketConnected) {
      console.log('⚠️ WebSocket이 연결되지 않아서 구독 설정 건너뜀');
      return;
    }

    console.log('🔄 웹소켓 구독 설정 시작');
    console.log('🔄 현재 rooms 길이:', rooms.length);
    console.log('🔄 rooms 상세:', rooms.map(r => ({ id: r.id, roomId: r.roomId, title: r.title })));
    console.log('🔄 WebSocket 연결 상태:', isWebSocketConnected);
    console.log('🔄 STOMP 클라이언트 상태:', stompClientRef.current?.connected);
    
    // 기존 구독들 해제
    console.log('🔄 기존 구독 해제 시작, 현재 구독 수:', subscriptionsRef.current.size);
    subscriptionsRef.current.forEach(subscription => {
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
          console.log('✅ 구독 해제 완료');
        }
      } catch (error) {
        console.error('❌ 구독 해제 실패:', error);
      }
    });
    subscriptionsRef.current.clear();
    console.log('🔄 모든 구독 해제 완료');
    
    // 새로운 채팅방들에 대한 구독 추가
    rooms.forEach(room => {
        
        // 채팅 메시지 토픽 구독 (lastMessage 업데이트용) - ChatRoom.jsx와 동일한 토픽
        console.log(`📡 구독 시작 1111- room.id: ${room.id}, room.roomId: ${room.roomId}`);
        console.log(`📡 구독할 토픽: /topic/chat/room/${room.id}`);
        console.log(`📡 STOMP 클라이언트 연결 상태:`, stompClientRef.current?.connected);
        
        try {
          // 채팅방 메시지 구독
          console.log(`📡 채팅방 메시지 구독 시작 - /topic/chat/room/${room.id}`);
          console.log(`📡 STOMP 클라이언트 상태:`, {
            connected: stompClientRef.current?.connected,
            active: stompClientRef.current?.active,
            state: stompClientRef.current?.state
          });
          
          // 중복 구독 방지를 위한 구독 키 생성
          const subscriptionKey = `/topic/chat/room/${room.id}`;
          
          // 이미 구독 중인지 확인 (구독 객체의 destination으로 확인)
          const alreadySubscribed = Array.from(subscriptionsRef.current).some(sub => 
            sub.destination === subscriptionKey
          );
          
          if (alreadySubscribed) {
            console.log(`⚠️ 이미 구독 중인 채널: ${subscriptionKey}`);
            return;
          }
          
          const messageSubscription = stompClientRef.current.subscribe(subscriptionKey, (message) => {
            try {
              const payload = JSON.parse(message.body || '{}');
              console.log('📨 채팅방 메시지 수신:', payload);
              
              // 🔥 프론트엔드 메시지 필터링: roomId 검증
              const msgRoomId = payload.roomId;
              const expectedRoomId = room.id;
              
              // URL에서 roomId 추출
              const urlRoomId = window.location.pathname.split('/').pop();
              
              console.log(`🔍 채팅방 메시지 필터링 체크 - 수신된 roomId: ${msgRoomId}, 예상 roomId: ${expectedRoomId}`);
              console.log(`🔍 현재 URL: ${window.location.href}`);
              console.log(`🔍 구독 키: ${subscriptionKey}`);
              console.log(`🔍 room 객체:`, room);
              console.log(`🔍 room.id: ${room.id}, room.roomId: ${room.roomId}`);
              console.log(`🔍 URL roomId: ${urlRoomId}`);
              
              // 메시지의 roomId가 현재 구독한 채팅방과 일치하는지 확인
              if (msgRoomId && expectedRoomId && String(msgRoomId) !== String(expectedRoomId)) {
                console.warn(`🚫 채팅방 메시지 필터링: roomId 불일치 - 수신된 roomId: ${msgRoomId}, 예상 roomId: ${expectedRoomId}, 메시지 무시`);
                return; // 메시지 무시
              }
              
              // 🔥 추가 필터링: URL의 roomId와도 비교
              if (msgRoomId && urlRoomId && String(msgRoomId) !== String(urlRoomId)) {
                console.warn(`🚫 URL roomId 필터링: roomId 불일치 - 수신된 roomId: ${msgRoomId}, URL roomId: ${urlRoomId}, 메시지 무시`);
                return; // 메시지 무시
              }
              
              // roomId가 비어있거나 null인 경우도 무시
              if (!msgRoomId || msgRoomId.trim() === '') {
                console.warn(`🚫 메시지 필터링: roomId가 비어있음 - 메시지 무시`);
                return;
              }
              
              const senderEmail = payload.sender || payload.accountEmail || '';
              const messageText = payload.message || '';
              const createdAt = payload.createdAt || Date.now();
              const messageId = payload.messageId || '';

              const unified = {
                roomId: msgRoomId,
                accountEmail: senderEmail,
                senderName: payload.senderName || senderEmail?.split('@')[0] || '알 수 없음',
                message: String(messageText),
                createdAt,
                messageId,
                notReadMessageCount: 0, // 채팅방 메시지는 unread 관리 안함 (개인 큐에서 처리)
              };

              console.log('📨 통합된 메시지 객체:', unified);

              // 현재 보고 있는 채팅방이면 ChatRoom으로 전달하여 append
              console.log('🔍 메시지 전달 조건 확인:', {
                unifiedRoomId: unified.roomId,
                currentRoomId: roomId,
                effectiveRoomId,
                roomIdFromParams: room.id,
                isMatch: String(unified.roomId) === String(roomId) || String(unified.roomId) === String(effectiveRoomId),
                hasCallback: !!chatRoomUpdateCallbackRef.current
              });
              
              if (chatRoomUpdateCallbackRef.current && 
                  (String(unified.roomId) === String(roomId) || 
                   String(unified.roomId) === String(effectiveRoomId) ||
                   String(unified.roomId) === String(room.id))) {
                console.log('✅ ChatRoom으로 메시지 전달:', unified);
                chatRoomUpdateCallbackRef.current(unified);
              } else {
                console.log('❌ 메시지 전달 조건 불만족');
              }

              // 사이드바 업데이트는 개인 큐(/user/queue/chat/rooms)에서 처리
            } catch (e) {
              console.error('❌ 메시지 구독 파싱 실패:', e, message?.body);
            }
        });
        
        console.log(`✅ 메시지 구독 성공: /topic/chat/room/${room.id}`);
        console.log(`📡 구독 객체:`, messageSubscription);
        console.log(`📡 구독 destination:`, messageSubscription.destination);
        subscriptionsRef.current.add(messageSubscription);
        
        } catch (subscribeError) {
          console.error(`❌ 메시지 구독 실패 (/topic/chat/room/${room.id}):`, subscribeError);
        }
        
        console.log(`📡 채팅방 ${room.id} 메시지 구독 완료`);
      });

      // 개인별 사이드바 업데이트 큐 구독 (한 번만 구독)
      try {
        const personalQueueDest = `/user/queue/chat/rooms`;
        const personalUpdateSub = stompClientRef.current.subscribe(personalQueueDest, (message) => {
          try {
            const payload = JSON.parse(message.body || '{}');
            console.log('📨 개인 큐 메시지 수신:', payload);
            
            // 개인 큐 메시지 처리
            const msgRoomId = payload.roomId;
            const currentRoomId = effectiveRoomId || roomId;
            
            console.log(`🔍 개인 큐 메시지 처리 - 수신된 roomId: ${msgRoomId}, 현재 roomId: ${currentRoomId}`);
            console.log(`🔍 개인 큐 현재 URL: ${window.location.href}`);
            
            const text = payload.message ?? payload.content ?? payload.lastMessage ?? payload.msg ?? payload.text ?? '';
            const chatMessage = {
              roomId: payload.roomId,
              accountEmail: payload.senderAccountEmail || payload.accountEmail || payload.sender || '',
              senderName: payload.senderName || payload.memberName || payload.name || (payload.senderAccountEmail || payload.accountEmail)?.split('@')[0] || '알 수 없음',
              message: String(text),
              createdAt: payload.createdAt || payload.updatedAt || Date.now(),
              messageId: payload.messageId,
            };

            // 개인 큐에서는 ChatRoom으로 메시지 전달하지 않음 (채팅방 토픽에서 처리)
            // if (chatRoomUpdateCallbackRef.current && String(chatMessage.roomId) === String(roomId)) {
            //   chatRoomUpdateCallbackRef.current(chatMessage);
            // }

            // 🔥 사이드바 목록 최신화 - 모든 메시지에 대해 실행 (채팅방 목록 업데이트)
            if (chatMessage.message && chatMessage.roomId) {
              // 백엔드에서 이미 개인별로 계산된 unread 수 사용
              const effectiveUnread = payload.unreadCountForReceiver ?? 0;
              const updateTime = new Date(chatMessage.createdAt);

              setRooms(prev => {
                const updated = prev.map(r => (
                  (String(r.id) === String(chatMessage.roomId) || String(r.roomId) === String(chatMessage.roomId))
                    ? {
                        ...r,
                        lastMessage: chatMessage.message,
                        updatedAt: formatDate(updateTime),
                        _sortTime: updateTime.getTime(), // 정렬용 타임스탬프 추가
                        notReadMessageCount: effectiveUnread,
                      }
                    : r
                ));
                
                // _sortTime 기준으로 내림차순 정렬 (최신순)
                return updated.sort((a, b) => {
                  const timeA = a._sortTime || new Date(a.updatedAt).getTime();
                  const timeB = b._sortTime || new Date(b.updatedAt).getTime();
                  return timeB - timeA;
                });
              });
            }
          } catch (e) {
            console.error('❌ 개인 큐 구독 파싱 실패:', e, message?.body);
          }
        });
        subscriptionsRef.current.add(personalUpdateSub);
        console.log(`✅ 개인 큐 구독 성공: ${personalQueueDest}`);
      } catch (e) {
        console.error('❌ 개인 큐 구독 실패:', e);
      }

      // 에러 큐 구독 (메시지 전송 실패 처리)
      try {
        const errorQueueDest = `/user/queue/errors`;
        const errorQueueSub = stompClientRef.current.subscribe(errorQueueDest, (message) => {
          try {
            const errorPayload = JSON.parse(message.body || '{}');
            console.log('❌ 실패 메시지 수신: /user/queue/errors');
            console.log('❌ 에러 큐 메시지 상세:', errorPayload);
            
            // 새로운 에러 응답 구조 처리
            const originalMessage = errorPayload.originalMessage || {};
            const errorMessage = errorPayload.error || '알 수 없는 오류';
            const errorCode = errorPayload.errorCode || 'UNKNOWN_ERROR';
            const details = errorPayload.details || '';
            const failedAt = errorPayload.failedAt || new Date().toISOString();
            
            console.log('❌ 에러 정보 분석:', {
              originalMessage,
              errorMessage,
              errorCode,
              details,
              failedAt
            });
            
            if (originalMessage.roomId) {
              // 기존 실패한 메시지가 있는지 확인 (재전송 실패인지 확인)
              const existingFailedMessages = getFailedMessagesByRoom(originalMessage.roomId);
              const existingFailedMessage = existingFailedMessages.find(msg => 
                msg.message === originalMessage.message && 
                msg.roomId === originalMessage.roomId
              );
              
              if (existingFailedMessage) {
                // 재전송 실패인 경우 - 재시도 횟수 증가
                const newRetryCount = incrementRetryCount(existingFailedMessage.id);
                console.log('🔄 재전송 실패 - 재시도 횟수 증가:', newRetryCount);
                
                // 현재 방의 실패한 메시지 목록 업데이트
                if (String(originalMessage.roomId) === String(effectiveRoomId)) {
                  const updatedFailedMessages = getFailedMessagesByRoom(effectiveRoomId);
                  setFailedMessages(updatedFailedMessages);
                  console.log('🔄 재전송 실패 메시지 목록 업데이트:', updatedFailedMessages);
                }
              } else {
                // 새로운 실패인 경우 - 새로 저장
                const failedMessageId = saveFailedMessage(originalMessage, `${errorMessage} (${errorCode})`);
                
                if (failedMessageId) {
                  // 현재 방의 실패한 메시지 목록 업데이트
                  if (String(originalMessage.roomId) === String(effectiveRoomId)) {
                    const updatedFailedMessages = getFailedMessagesByRoom(effectiveRoomId);
                    setFailedMessages(updatedFailedMessages);
                    console.log('🔄 새로운 실패 메시지 목록 업데이트:', updatedFailedMessages);
                  }
                }
              }
              
              // 사용자에게 상세 알림 표시
              console.warn('⚠️ 메시지 전송 실패:', {
                message: errorMessage,
                code: errorCode,
                details: details,
                roomId: originalMessage.roomId,
                failedAt: failedAt
              });
            } else {
              console.error('❌ 원본 메시지 정보가 없음:', errorPayload);
            }
          } catch (e) {
            console.error('❌ 에러 큐 구독 파싱 실패:', e, message?.body);
          }
        });
        subscriptionsRef.current.add(errorQueueSub);
        console.log(`✅ 에러 큐 구독 성공: ${errorQueueDest}`);
      } catch (e) {
        console.error('❌ 에러 큐 구독 실패:', e);
      }
      
      // 구독 설정 완료 플래그 설정
      console.log('🔄 웹소켓 구독 설정 완료');
      console.log('🔄 총 구독 수:', subscriptionsRef.current.size);
      console.log('🔄 구독된 토픽들:', Array.from(subscriptionsRef.current).map(sub => sub.destination || 'unknown'));
  }, [rooms, isWebSocketConnected]); // rooms와 연결 상태 의존성 필요

  // WebSocket 연결 완료 후 구독 설정
  useEffect(() => {
    if (isWebSocketConnected && rooms.length > 0) {
      console.log('🔄 WebSocket 연결 완료 후 구독 설정 시작');
      setupWebSocketSubscriptions();
    }
  }, [isWebSocketConnected, rooms.length, setupWebSocketSubscriptions]);

  // 방 제목은 렌더 시점에 rooms와 roomId로 계산
  const getSelectedRoom = useCallback(() => {
    const target = effectiveRoomId;
    if (!target) return null;
    const rid = String(target);
    const ridNoPrefix = rid.replace(/^ROOM_/, '');
    const byExactId = rooms.find(r => String(r.id) === rid);
    if (byExactId) return byExactId;
    const byRoomId = rooms.find(r => String(r.roomId) === rid);
    if (byRoomId) return byRoomId;
    const byIdNoPrefix = rooms.find(r => String(r.id).replace(/^ROOM_/, '') === ridNoPrefix);
    if (byIdNoPrefix) return byIdNoPrefix;
    const byRoomIdNoPrefix = rooms.find(r => String(r.roomId || '').replace(/^ROOM_/, '') === ridNoPrefix);
    if (byRoomIdNoPrefix) return byRoomIdNoPrefix;
    return null;
  }, [roomId, rooms]);

  // 채팅방 목록 로드 함수 (페이지네이션 지원)
  const fetchChatRooms = async (cursor = null, isLoadMore = false) => {
    if (isLoadMore && isLoadingMore) return; // 중복 요청 방지
    
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      }
      
      console.log('=== API 호출 시작 ===');
      console.log('호출 URL: /api/chat/me/chatRooms');
      console.log('커서:', cursor);
      console.log('추가 로드:', isLoadMore);
      
      const params = new URLSearchParams();
      params.append('limit', '25'); // 25개씩 로드
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      const response = await axiosInstance.get(`/api/chat/me/chatRooms?${params.toString()}`);  // axiosInstance 사용
      console.log('=== 채팅방 목록 API 응답 전체 ===');
      console.log('전체 응답 객체:', response);
      console.log('응답 상태:', response.status);
      console.log('응답 헤더:', response.headers);
      console.log('=== 응답 데이터 상세 분석 ===');
      console.log('응답 데이터:', response.data);
      console.log('응답 데이터 타입:', typeof response.data);
      console.log('응답 데이터 JSON 구조:');
      console.log(JSON.stringify(response.data, null, 2));
        
      // 페이지네이션 응답 구조 처리 (SliceResponse: items, nextCursor, hasNext)
      if (response.data && response.data.items && Array.isArray(response.data.items)) {
        const { items, nextCursor, hasNext } = response.data;
        console.log('페이지네이션 응답:', { items: items.length, nextCursor, hasNext });
        
        // 페이지네이션 상태 업데이트
        setNextCursor(nextCursor);
        setHasNextPage(hasNext);
        
        if (items.length > 0) {
          console.log('페이지네이션 데이터로 업데이트:', items);
          // API 데이터의 id 필드 확인
          console.log('첫 번째 방의 id:', items[0]?.id);
          console.log('첫 번째 방의 roomId:', items[0]?.roomId);
          console.log('첫 번째 방의 모든 필드:', Object.keys(items[0] || {}));
          
          // API 데이터의 필드명을 통일 (roomId를 id로 매핑)
          const processedData = items.map((room, index) => {
            // 각 방의 원본 데이터 상세 로그
            console.log(`=== 방 ${index + 1} 상세 분석 ===`);
            console.log(`방 ${index + 1} 원본 데이터 전체:`, room);
            console.log(`방 ${index + 1} 원본 데이터 JSON:`, JSON.stringify(room, null, 2));
            console.log(`방 ${index + 1} 모든 키:`, Object.keys(room));
            console.log(`방 ${index + 1} 값들:`, Object.values(room));
            
            console.log(`=== 방 ${index + 1} 필드별 상세 분석 ===`);
            console.log(`방 ${index + 1} notReadMessageCount 관련 필드들:`, {
              notReadMessageCount: room.notReadMessageCount,
              unreadCount: room.unreadCount,
              not_read_message_count: room.not_read_message_count,
              unread_count: room.unread_count,
              notReadCount: room.notReadCount,
              unReadMessageCount: room.unReadMessageCount
            });
            
            console.log(`방 ${index + 1} lastMessage 관련 필드들:`, {
              lastMessage: room.lastMessage,
              lastMsg: room.lastMsg,
              recentMessage: room.recentMessage,
              last_message: room.last_message,
              recent_message: room.recent_message,
              latestMessage: room.latestMessage
            });
            
            console.log(`방 ${index + 1} title 관련 필드들:`, {
              title: room.title,
              roomName: room.roomName,
              name: room.name
            });
            
            console.log(`방 ${index + 1} id 관련 필드들:`, {
              id: room.id,
              roomId: room.roomId
            });
            
            const mappedRoom = {
            ...room,
              id: room.roomId || room.id, // roomId가 있으면 id로 사용, 없으면 기존 id 사용
              title: room.title || room.roomName || room.name || `채팅방 ${room.roomId || room.id}`, // title 필드 매핑
              lastMessage: room.lastMessage || room.lastMsg || room.recentMessage || room.last_message || room.recent_message || room.latestMessage || '메시지가 없습니다', // lastMessage 필드 매핑
              updatedAt: formatDate(room.updatedAt || room.lastMessageTime || room.modifiedAt || new Date()), // 날짜 필드 매핑
              notReadMessageCount: room.notReadMessageCount || room.unreadCount || room.not_read_message_count || room.unread_count || room.notReadCount || room.unReadMessageCount || 0 // API에서 받은 값 사용, 없으면 0
            };
            
            console.log(`=== 방 ${index + 1} 매핑 결과 ===`);
            console.log(`방 ${index + 1} 매핑 후 전체:`, mappedRoom);
            console.log(`방 ${index + 1} 매핑 후 주요 필드:`, {
              id: mappedRoom.id,
              title: mappedRoom.title,
              lastMessage: mappedRoom.lastMessage,
              updatedAt: mappedRoom.updatedAt,
              notReadMessageCount: mappedRoom.notReadMessageCount
            });
            console.log(`방 ${index + 1} 매핑 후 JSON:`, JSON.stringify(mappedRoom, null, 2));
            
            return mappedRoom;
          });
          // updatedAt 내림차순으로 정렬
          const sortedData = processedData.sort((a, b) => {
            const dateA = new Date(a.updatedAt);
            const dateB = new Date(b.updatedAt);
            return dateB - dateA; // 내림차순 (최신순)
          });
          
          console.log('처리된 데이터:', sortedData);
          console.log('첫 번째 방 처리 결과:', {
            id: sortedData[0]?.id,
            title: sortedData[0]?.title,
            lastMessage: sortedData[0]?.lastMessage,
            updatedAt: sortedData[0]?.updatedAt,
            notReadMessageCount: sortedData[0]?.notReadMessageCount
          });
          console.log('🔍 setRooms 직전 sortedData 확인:', sortedData);
          console.log('🔍 첫 번째 방의 notReadMessageCount:', sortedData[0]?.notReadMessageCount);
          console.log('🔍 첫 번째 방의 notReadMessageCount 타입:', typeof sortedData[0]?.notReadMessageCount);
          console.log('🔍 첫 번째 방의 notReadMessageCount > 0:', sortedData[0]?.notReadMessageCount > 0);
          
          // 첫 페이지인지 추가 페이지인지에 따라 다르게 처리
          if (isLoadMore) {
            // 추가 페이지 - 기존 목록에 추가
            setRooms(prevRooms => [...prevRooms, ...sortedData]);
            console.log('🔄 추가 페이지 로드 완료, 새로 추가된 방 개수:', sortedData.length);
          } else {
            // 첫 페이지 - 전체 교체
            setRooms(sortedData);
            console.log('🔄 첫 페이지 로드 완료, 총 방 개수:', sortedData.length);
          }
        }
      } else if (!isLoadMore) {
          // 첫 페이지인데 데이터가 없는 경우만 더미 데이터 사용
          console.log('API 응답이 배열이 아니거나 비어있어서 더미 데이터를 사용합니다.');
          console.log('API 응답 상태:', {
            hasData: !!response.data,
            isArray: Array.isArray(response.data),
            length: response.data?.length,
            data: response.data
          });
          
          // 더미 데이터 사용 (API 데이터가 없을 때)
          console.log('더미 데이터 사용 중');
          const testDummyData = dummyRooms.map((room, index) => ({
            ...room,
            lastMessage: room.lastMessage || '메시지가 없습니다',
            notReadMessageCount: room.notReadMessageCount || 0
          }));
          console.log('더미 데이터:', testDummyData);
          setRooms(testDummyData);
        }
      } catch (error) {
        console.error('채팅방 목록 가져오기 실패:', error);
        console.error('에러 상세:', error.response?.data);
        console.error('에러 상태:', error.response?.status);
        console.error('에러 URL:', error.config?.url);
        
        if (!isLoadMore) {
          // 첫 페이지 로드 실패 시에만 더미 데이터 사용
          console.log('첫 페이지 로드 실패 - 더미 데이터 사용');
          setRooms(dummyRooms);
        }
      } finally {
        if (isLoadMore) {
          setIsLoadingMore(false);
        }
      }
    };

  // 무한 스크롤 핸들러
  const handleLoadMore = () => {
    if (hasNextPage && !isLoadingMore && nextCursor) {
      console.log('🔄 무한 스크롤 - 추가 데이터 로드 시작');
      fetchChatRooms(nextCursor, true);
    }
  };

  // 스크롤 이벤트 핸들러
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // 90% 스크롤 시 다음 페이지 로드
    if (scrollPercentage >= 0.9 && hasNextPage && !isLoadingMore) {
      handleLoadMore();
    }
  };

  // 초기 채팅방 목록 로드
  useEffect(() => {
    fetchChatRooms();
  }, []);

  // 현재 경로에 따라 채팅방 링크 결정 (메모이제이션으로 최적화)
  const getChatLink = useCallback((roomId) => {
    if (location.pathname.startsWith('/admin')) {
      return `/admin/chat/${roomId}`;
    } else {
      return `/chat/${roomId}`;
    }
  }, [location.pathname]);

  // 읽지 않은 채팅방 개수 계산 (메모이제이션으로 최적화)
  const unreadCount = useMemo(() => {
    return Array.isArray(rooms) ? rooms.filter(room => room.notReadMessageCount > 0).length : 0;
  }, [rooms]);

  // 채팅방 클릭 시 읽음 처리
  const handleRoomClick = async (roomId) => {
    // 새로운 채팅방을 클릭했으므로 currentRoomInfo 초기화
    setCurrentRoomInfo(null);
    console.log(`🔄 채팅방 ${roomId} 클릭 - currentRoomInfo 초기화`);
    
    // 해당 채팅방 찾기
    const room = rooms.find(r => r.id === roomId);
    if (room && room.notReadMessageCount > 0) {
      try {
        // 백엔드 API 호출하여 읽음 처리
        const { markRoomAsRead } = await import('../api/chatApi');
        await markRoomAsRead(roomId);
        
        // 즉시 UI 업데이트
        setRooms(prevRooms => 
          prevRooms.map(room => 
            room.id === roomId ? { ...room, notReadMessageCount: 0 } : room
          )
        );
        console.log(`채팅방 ${roomId} 읽음 처리 완료`);
      } catch (error) {
        console.error('채팅방 읽음 처리 실패:', error);
        // 에러가 발생해도 UI는 업데이트 (사용자 경험 개선)
        setRooms(prevRooms => 
          prevRooms.map(room => 
            room.id === roomId ? { ...room, notReadMessageCount: 0 } : room
          )
        );
      }
    }
  };

  // 방 삭제(나가기) 함수 - 백엔드 API 연동
  const handleDeleteRoom = async (id) => {
    if (!window.confirm('정말 이 채팅방을 나가시겠습니까? (삭제 처리)')) return;
    try {
      console.log('채팅방 나가기 요청 시작:', id);
      const url = `/api/chat/me/chatRooms/${id}`;
      const res = await axiosInstance.patch(url);
      console.log('채팅방 나가기 응답 상태:', res.status);
      if (res.status === 204) {
        // 목록에서 제거
        setRooms(prev => prev.filter(r => r.id !== id));
        console.log('채팅방 목록에서 제거 완료:', id);
        // 현재 보고 있던 방이면 목록으로 이동
    if (id === roomId) {
      if (location.pathname.startsWith('/admin')) {
        navigate('/admin/chat');
      } else {
        navigate('/chat');
      }
        }
      } else {
        console.warn('예상치 못한 상태 코드:', res.status);
      }
    } catch (error) {
      console.error('채팅방 나가기 요청 실패:', error);
      alert('채팅방 나가기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const isAdminChat = location.pathname.startsWith('/admin/chat');
  // 현재 선택된 방과 제목 계산
  const selectedRoom = getSelectedRoom();
  // currentRoomInfo가 있으면 우선 사용, 없으면 selectedRoom에서 가져옴
  const selectedRoomTitle = currentRoomInfo?.title || selectedRoom?.title || '';
  try {
    console.log('🧭 선택 로깅:', {
      paramRoomId: roomId,
      effectiveRoomId,
      roomsCount: rooms.length,
      roomsTitles: rooms.map(r => r.title),
      roomsIds: rooms.map(r => ({ id: r.id, roomId: r.roomId })),
      selectedExists: !!selectedRoom,
      selected: selectedRoom ? { id: selectedRoom.id, roomId: selectedRoom.roomId, title: selectedRoom.title } : null,
      currentRoomInfo: currentRoomInfo ? { id: currentRoomInfo.id, title: currentRoomInfo.title } : null,
      selectedRoomTitle,
    });
  } catch (_) {}
  return (
    <div className={`flex h-[calc(100vh-120px)] ${isAdminChat ? 'theme-purple' : 'theme-blue'}`}>
      {/* 사이드바 - 스크롤 가능하도록 수정 */}
      <aside className="w-64 md:w-72 lg:w-80 xl:w-96 border-r bg-white flex flex-col h-full">
        <div className="px-3 py-1 font-bold border-t border-b bg-gray-50 text-gray-900 text-sm">
          채팅 목록 ({rooms.length})
          {console.log('🚨 현재 rooms 상태:', rooms)}
          {console.log('🚨 현재 rooms title:', rooms.map(r => r.title))}
          {console.log('🚨 unreadCount:', unreadCount)}
          {rooms.map((r, i) => console.log(`🚨 방 ${i+1} notReadMessageCount:`, r.notReadMessageCount))}
          {unreadCount > 0 && (
            <span className="ml-2 text-sm text-red-600 font-normal">
              (읽지 않음: {unreadCount})
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
          <ul>
            {rooms.map((room, index) => (
              <ChatRoomItem
                key={room.id || `room-${index}`}
                room={room}
                isSelected={room.id === roomId}
                getChatLink={getChatLink}
                onRoomClick={handleRoomClick}
                onDeleteRoom={handleDeleteRoom}
                formatDate={formatDate}
              />
            ))}
            
            {/* 무한 스크롤 로딩 인디케이터 */}
            {isLoadingMore && (
              <li className="px-4 py-3 text-center text-gray-500">
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  채팅방 목록 로드 중...
                </div>
              </li>
            )}
            
            {/* 더 이상 로드할 데이터가 없는 경우 */}
            {!hasNextPage && rooms.length > 25 && (
              <li className="px-4 py-2 text-center text-gray-400 text-sm">
                모든 채팅방을 불러왔습니다
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* 채팅방 선택 전 / 후 Outlet */}
      <main className="flex-1 p-2 bg-gray-50">
        <Routes>
          {/* 아무 방도 선택 안됐을 때 */}
          <Route
            index
            element={
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-2">💬</div>
                  <div>채팅방을 선택하세요.</div>
                  <div className="text-sm mt-1">총 {rooms.length}개의 채팅방이 있습니다.</div>
                </div>
              </div>
            }
          />
          {/* 채팅방이 선택됐을 때 */}
          <Route 
            path=":roomId" 
            element={
              <ChatRoom 
                roomId={String(effectiveRoomId || '')}
                isWebSocketConnected={isWebSocketConnected}
                onSendMessage={handleSendMessage}
                onMessageUpdate={(callback) => {
                  chatRoomUpdateCallbackRef.current = callback;
                }}
                roomTitle={selectedRoomTitle}
                failedMessages={failedMessages}
                onRetryMessage={handleRetryMessage}
                onAbandonMessage={handleAbandonMessage}
                onRoomInfoUpdate={handleRoomInfoUpdate}
              />
            } 
          />
        </Routes>
      </main>
    </div>
  );
};

export default ChatPage; 