// src/common/hook/useChatMessages.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../api/mainApi';

const useChatMessages = (roomId, onRoomInfoUpdate) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null); // 채팅방 정보 상태 추가
  const initialLoadRef = useRef(false);

  // 날짜를 yyyy-mm-dd hh:mm:ss 형식으로 변환하는 함수
  const formatDateTime = (dateInput) => {
    if (!dateInput) return '';
    
    try {
      let date;
      
      // Date 객체인 경우
      if (dateInput instanceof Date) {
        date = dateInput;
      }
      // 배열 형태인 경우 (예: [2025, 7, 7, 16, 59, 9])
      else if (Array.isArray(dateInput)) {
        const [year, month, day, hours = 0, minutes = 0, seconds = 0] = dateInput;
        date = new Date(year, month - 1, day, hours, minutes, seconds);
      }
      // 콤마로 구분된 문자열인 경우
      else if (typeof dateInput === 'string' && dateInput.includes(',')) {
        const parts = dateInput.split(',').map(part => parseInt(part.trim()));
        const [year, month, day, hours = 0, minutes = 0, seconds = 0] = parts;
        date = new Date(year, month - 1, day, hours, minutes, seconds);
      }
      // 타임스탬프 숫자인 경우
      else if (typeof dateInput === 'number') {
        const timestamp = dateInput.toString().length === 10 ? dateInput * 1000 : dateInput;
        date = new Date(timestamp);
      }
      // 문자열 숫자인 경우
      else if (typeof dateInput === 'string' && /^\d+$/.test(dateInput)) {
        const timestamp = parseInt(dateInput);
        const finalTimestamp = dateInput.length === 10 ? timestamp * 1000 : timestamp;
        date = new Date(finalTimestamp);
      }
      // 일반 문자열 날짜인 경우
      else {
        date = new Date(dateInput);
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn('❌ 유효하지 않은 날짜:', dateInput);
        return String(dateInput);
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.warn('❌ 날짜 시간 형식 변환 실패:', dateInput, error);
      return String(dateInput);
    }
  };

  // 초기 메시지 로드 (채팅방 정보 + 메시지를 한 번에 가져와서 첫 렌더링 최적화)
  const loadInitialMessages = useCallback(async () => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🚀 첫 페이지 메시지 로드 - roomId: ${roomId}`);
      // includeMessages=true로 첫 페이지 메시지를 가져오기
      const response = await axiosInstance.get(`/api/chat/me/chatRooms/${roomId}/messages?includeMessages=true&limit=50`);
      
      console.log('📨 첫 페이지 메시지 응답:', response.data);
      
      if (response.data) {
        // 응답 구조: SliceResponse<ChatMemberRoomWithMessageDto>
        const { items = [], nextCursor = null, hasNext = false } = response.data;
        
        // 서버에서 DESC로 정렬되어 온 메시지를 ASC로 뒤집어서 표시 (오래된 것부터)
        const sortedMessages = items
          .map(msg => ({
            ...msg,
            createdAt: msg.createdAt || formatDateTime(new Date())
          }))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        console.log(`✅ 첫 페이지 로드 완료 - 메시지 ${sortedMessages.length}개`);
        console.log('📊 정렬된 메시지:', sortedMessages);
        
        setMessages(sortedMessages);
        setNextCursor(nextCursor);
        setHasNext(hasNext);
        
        // 기본 roomInfo 설정 (메시지만 있는 경우)
        const basicRoomInfo = {
          id: roomId,
          roomId: roomId,
          title: `채팅방 ${roomId}`,
          productId: null,
          ownerEmail: null,
          memberCount: 0,
          participants: [],
          myLastReadAt: null
        };
        
        setRoomInfo(basicRoomInfo);
        console.log('📤 useChatMessages에서 기본 roomInfo 설정:', basicRoomInfo);
        
        // 채팅방 정보를 부모 컴포넌트로 전달
        if (onRoomInfoUpdate && basicRoomInfo) {
          console.log('📤 기본 채팅방 정보를 부모로 전달:', basicRoomInfo);
          onRoomInfoUpdate(basicRoomInfo);
        }
      }
    } catch (error) {
      console.error('❌ 통합 초기 로드 실패:', error);
      console.log('🔄 fallback으로 메시지만 별도 로드 시도');
      
      // fallback: includeMessages=false로 메시지만 로드
      try {
        const fallbackResponse = await axiosInstance.get(`/api/chat/me/chatRooms/${roomId}/messages?includeMessages=false&limit=50`);
        
        if (fallbackResponse.data) {
          const { items = [], nextCursor = null, hasNext = false } = fallbackResponse.data;
          const sortedMessages = items
            .map(msg => ({
              ...msg,
              createdAt: msg.createdAt || formatDateTime(new Date())
            }))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          
          console.log(`✅ fallback 로드 완료 - 메시지 ${sortedMessages.length}개`);
          setMessages(sortedMessages);
          setNextCursor(nextCursor);
          setHasNext(hasNext);
        }
      } catch (fallbackError) {
        console.error('❌ fallback 로드도 실패:', fallbackError);
        setError('메시지를 불러오는데 실패했습니다.');
        setMessages([]);
      }
    } finally {
      setLoading(false);
      initialLoadRef.current = true;
    }
  }, [roomId]);

  // 이전 메시지 더 로드 (cursor 기반)
  const loadOlderMessages = useCallback(async () => {
    if (!roomId || !hasNext || !nextCursor || loadingOlder) return;
    
    try {
      setLoadingOlder(true);
      
      console.log(`🔄 이전 메시지 로드 시작 - cursor: ${nextCursor}`);
      const response = await axiosInstance.get(
        `/api/chat/me/chatRooms/${roomId}/messages?includeMessages=false&limit=50&cursor=${nextCursor}`
      );
      
      console.log('📨 이전 메시지 응답:', response.data);
      
      if (response.data) {
        const { items = [], nextCursor: newCursor = null, hasNext: newHasNext = false } = response.data;
        
        // 서버에서 DESC로 정렬되어 온 메시지를 ASC로 뒤집어서 기존 메시지 앞에 추가
        const sortedNewMessages = items
          .map(msg => ({
            ...msg,
            createdAt: msg.createdAt || formatDateTime(new Date())
          }))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        console.log(`✅ 이전 메시지 ${sortedNewMessages.length}개 추가 로드 완료`);
        
        setMessages(prev => {
          // 중복 제거하면서 앞에 추가
          const existingIds = new Set(prev.map(m => m.messageId).filter(Boolean));
          const newMessages = sortedNewMessages.filter(m => !m.messageId || !existingIds.has(m.messageId));
          return [...newMessages, ...prev];
        });
        
        setNextCursor(newCursor);
        setHasNext(newHasNext);
      }
    } catch (error) {
      console.error('❌ 이전 메시지 로드 실패:', error);
    } finally {
      setLoadingOlder(false);
    }
  }, [roomId, hasNext, nextCursor, loadingOlder]);

  // 새 메시지 추가 (WebSocket으로 받은 메시지)
  const appendNewMessage = useCallback((chatMessage) => {
    console.log('📨 새 메시지 추가:', chatMessage);
    
    // createdAt이 없으면 현재 시간 추가
    if (!chatMessage.createdAt) {
      chatMessage.createdAt = formatDateTime(new Date());
    }
    
    setMessages(prev => {
      // 중복 메시지 방지
      let isDuplicate = false;
      
      if (chatMessage.messageId) {
        // messageId가 있는 경우
        isDuplicate = prev.some(msg => msg.messageId === chatMessage.messageId);
        if (isDuplicate) {
          console.log('🔍 중복 메시지 감지 (messageId):', chatMessage.messageId);
          return prev;
        }
      } else {
        // messageId가 없는 경우 - 메시지 내용, 발신자, 시간으로 중복 체크
        const currentTime = new Date(chatMessage.createdAt).getTime();
        isDuplicate = prev.some(msg => {
          if (msg.message === chatMessage.message && msg.accountEmail === chatMessage.accountEmail) {
            if (msg.createdAt) {
              const msgTime = new Date(msg.createdAt).getTime();
              const timeDiff = Math.abs(currentTime - msgTime);
              if (timeDiff < 5000) { // 5초 이내
                return true;
              }
            }
          }
          return false;
        });
        
        if (isDuplicate) {
          console.log('🔍 중복 메시지 감지 (내용/시간):', chatMessage.message);
          return prev;
        }
      }
      
      console.log('✅ 새 메시지 추가됨:', chatMessage);
      return [...prev, chatMessage];
    });
  }, []);

  // 방 변경 시 상태 초기화 및 초기 로드
  useEffect(() => {
    if (!roomId) return;
    
    console.log(`🔄 방 변경 감지 - roomId: ${roomId}`);
    
    // 상태 초기화
    setMessages([]);
    setError(null);
    setHasNext(false);
    setNextCursor(null);
    setRoomInfo(null); // 채팅방 정보도 초기화
    initialLoadRef.current = false;
    
    // 초기 메시지 로드
    loadInitialMessages();
  }, [roomId]); // loadInitialMessages 제거하여 무한 루프 방지

  return {
    messages,
    loading,
    loadingOlder,
    error,
    hasNext,
    loadOlderMessages,
    appendNewMessage,
    roomInfo, // 채팅방 정보도 반환
    // 디버깅용
    nextCursor,
    initialLoaded: initialLoadRef.current
  };
};

export default useChatMessages;
