// src/common/chat/ChatRoom.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getCookie } from '../util/cookieUtil';
import useChatMessages from '../hook/useChatMessages';
import { removeFailedMessage } from '../util/failedMessageUtil';

// 더미 데이터는 훅에서 처리하므로 제거

const ChatRoom = ({ isWebSocketConnected, onSendMessage, onMessageUpdate, roomTitle, failedMessages = [], onRetryMessage, onAbandonMessage, onRoomInfoUpdate }) => {
  const { roomId } = useParams();
  // URL에서 가져온 roomId 사용
  const actualRoomId = roomId || 'ROOM001';
  const topSentinelRef = useRef();
  const messagesContainerRef = useRef();
  const [input, setInput] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const previousMessagesLength = useRef(0);
  
  // useChatMessages 훅 사용
  const {
    messages,
    loading,
    loadingOlder,
    error,
    hasNext,
    loadOlderMessages,
    appendNewMessage,
    roomInfo
  } = useChatMessages(actualRoomId, onRoomInfoUpdate);

  // 현재 방의 실패한 메시지만 필터링
  const roomFailedMessages = failedMessages.filter(f => f.roomId === actualRoomId);

  // roomInfo 변경 감지 로깅
  useEffect(() => {
    console.log('🔍 ChatRoom roomInfo 변경:', roomInfo);
  }, [roomInfo]);

  // actualRoomId 변경 감지 로깅
  useEffect(() => {
    console.log('🔍 ChatRoom actualRoomId 변경:', actualRoomId);
  }, [actualRoomId]);

  // 현재 로그인한 사용자 이메일
  const loginState = useSelector((state) => state.loginSlice);
  const currentUserEmail = loginState?.email || getCookie('member')?.email || '';

  const normalizeEmail = (v) => String(v || '').trim().toLowerCase();
  const emailsEqual = (a, b) => normalizeEmail(a) === normalizeEmail(b);

  // 날짜 포맷팅 함수 (간단 버전 - 훅에서 처리하므로)
  const formatDateTime = (dateInput) => {
    if (!dateInput) return '';
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return String(dateInput);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      return String(dateInput);
    }
  };

  // ChatPage.jsx에서 WebSocket 메시지를 받아 처리하는 콜백 등록
  useEffect(() => {
    if (onMessageUpdate) {
      console.log('🔗 ChatRoom WebSocket 콜백 등록');
      
      // appendNewMessage를 래핑하여 성공한 메시지의 실패 메시지를 제거
      const wrappedAppendNewMessage = (message) => {
        // 메시지가 성공적으로 수신되면 해당 실패 메시지를 제거
        if (message.messageId) {
          // 실패 메시지 중에서 같은 messageId를 가진 것을 찾아 제거
          const failedMessage = roomFailedMessages.find(f => 
            f.message === message.message && 
            f.roomId === message.roomId
          );
          if (failedMessage) {
            console.log('✅ 성공한 메시지로 실패 메시지 제거:', failedMessage.id);
            removeFailedMessage(failedMessage.id);
          }
        }
        
        // 원래 appendNewMessage 호출
        appendNewMessage(message);
      };
      
      onMessageUpdate(wrappedAppendNewMessage);
    }
  }, [onMessageUpdate, appendNewMessage, roomFailedMessages]);

  // Intersection Observer를 사용한 무한 스크롤 (상단 sentinel)
  useEffect(() => {
    if (!topSentinelRef.current || !hasNext) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loadingOlder) {
          console.log('🔄 상단 sentinel 감지 - 이전 메시지 로드');
          setIsLoadingOlder(true);
          
          // 현재 스크롤 위치 저장
          const container = messagesContainerRef.current;
          if (container) {
            const scrollHeight = container.scrollHeight;
            const scrollTop = container.scrollTop;
            
            loadOlderMessages().then(() => {
              // 이전 메시지 로드 후 스크롤 위치 조정
              setTimeout(() => {
                if (container) {
                  const newScrollHeight = container.scrollHeight;
                  const heightDiff = newScrollHeight - scrollHeight;
                  container.scrollTop = scrollTop + heightDiff;
                }
                setIsLoadingOlder(false);
              }, 50);
            });
          } else {
            loadOlderMessages().finally(() => setIsLoadingOlder(false));
          }
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(topSentinelRef.current);
    
    return () => observer.disconnect();
  }, [hasNext, loadingOlder, loadOlderMessages]);

  useEffect(() => {
    // 새 메시지가 추가되었을 때만 스크롤을 맨 아래로 이동
    // 이전 메시지 로드 중이거나 메시지 길이가 줄어든 경우는 제외
    if (!isLoadingOlder && messages.length > previousMessagesLength.current && messagesContainerRef.current) {
      // 채팅 컨테이너 내에서만 스크롤 (전체 페이지 스크롤 방지)
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    previousMessagesLength.current = messages.length;
  }, [messages, isLoadingOlder]);

  const handleSend = async () => {
    if (!input.trim() || isComposing) return;

    // ChatMessageRequestDto 형태에 맞게 구성 (Member 객체 포함)
    const memberInfo = loginState || getCookie('member') || {};
    const senderMember = {
      id: memberInfo.id || null,
      accountEmail: currentUserEmail,
      name: memberInfo.name || '',
      role: memberInfo.role || 'U'
    };

    const messageDto = {
      roomId: actualRoomId,
      message: input,
      //sender: senderMember // Member 객체 직접 포함
    };
    
    console.log('📨 ChatMessageRequestDto 형태로 전송:', messageDto);

    // 즉시 로컬 상태에 메시지 추가 (옵티미스틱 업데이트)
    // const now = new Date();
    // const createdAt = formatDateTime(now);
    // const newMessage = {
    //   messageId: `msg${Date.now()}`,
    //   accountEmail: currentUserEmail,
    //   message: input,
    //   createdAt,
    // };
    
    // // 훅의 appendNewMessage 사용
    // appendNewMessage(newMessage);
    
    setInput('');

    // ChatPage.jsx의 WebSocket을 통한 메시지 전송
    if (onSendMessage) {
      try {
        const result = onSendMessage(messageDto);
        
        if (result.success) {
          console.log('✅ 메시지 전송 성공');
          // 메시지 전송 후 채팅 컨테이너를 맨 아래로 스크롤
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          }, 100);
        } else {
          console.warn('⚠️ 메시지는 화면에 추가되었지만 서버 전송에 실패했습니다.');
        }
        
      } catch (error) {
        console.error('❌ 메시지 전송 콜백 실행 실패:', error);
        console.warn('⚠️ 메시지는 화면에 추가되었지만 서버 전송에 실패했습니다.');
      }
    } else {
      console.warn('⚠️ onSendMessage 콜백이 없어서 서버 전송을 건너뜀');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.isComposing && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // 실패한 메시지 UI 렌더링 함수
  const renderFailedMessage = (failedMsg) => {
    const isRetrying = failedMsg.status === 'retrying';
    const isAbandoned = failedMsg.status === 'abandoned';
    const retryCount = failedMsg.retryCount || 0;
    
    // 포기된 메시지는 렌더링하지 않음
    if (isAbandoned) {
      return null;
    }
    
    return (
      <div key={failedMsg.id} className="flex flex-col items-end mb-4">
        {/* 실패한 메시지 */}
        <div className="max-w-xs">
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-lg shadow-sm">
            <p className="text-sm">{failedMsg.message}</p>
          </div>
          
          {/* 재전송/포기 버튼 */}
          <div className="flex space-x-2 mt-2 justify-end">
            <button
              onClick={() => onRetryMessage && onRetryMessage(failedMsg.id, failedMsg.roomId, failedMsg.message)}
              disabled={isRetrying || retryCount >= 3}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                isRetrying || retryCount >= 3
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isRetrying ? '재전송 중...' : retryCount >= 3 ? '재시도 초과' : '재전송'}
            </button>
            <button
              onClick={() => onAbandonMessage && onAbandonMessage(failedMsg.id)}
              disabled={isRetrying}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                isRetrying
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              포기
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* 채팅방 헤더 */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {roomInfo?.title || roomTitle || `채팅방 ${actualRoomId}`}
            </h3>
            {/* 디버깅 정보 */}
            <div className="text-xs text-gray-500 mt-1">
              {/* roomInfo: {roomInfo ? JSON.stringify({ id: roomInfo.id, title: roomInfo.title }) : 'null'} | 
              roomTitle: {roomTitle || 'null'} | 
              actualRoomId: {actualRoomId} */}
            </div>
            {roomFailedMessages.length > 0 && (
              <p className="text-sm text-red-600">실패한 메시지 {roomFailedMessages.length}개</p>
            )}
          </div>
        </div>
      </div>

      {/* 메시지 리스트 */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 상단 Sentinel - 이전 메시지 로드용 */}
        {hasNext && (
          <div ref={topSentinelRef} className="h-1 w-full">
            {(loadingOlder || isLoadingOlder) && (
              <div className="text-center text-gray-400 py-2">
                <div className="text-sm">이전 메시지를 불러오는 중...</div>
              </div>
            )}
          </div>
        )}
        
        {loading && <div className="text-center text-gray-500 py-8">메시지를 불러오는 중입니다...</div>}
        {error && <div className="text-center text-red-500 py-8">{error}</div>}
        
        {/* 실패한 메시지들 먼저 표시 */}
        {roomFailedMessages.length > 0 && (
          <div className="border-b border-red-200 pb-4 mb-4">
            {roomFailedMessages.map(renderFailedMessage)}
          </div>
        )}
        
        {messages.length === 0 && !loading && !error ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">💬</div>
            <p>아직 메시지가 없습니다.</p>
            <p className="text-sm">첫 번째 메시지를 보내보세요!</p>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div
                key={m.messageId || `msg_${m.accountEmail}_${m.createdAt}_${i}`}
                className={`flex flex-col ${emailsEqual(m.accountEmail, currentUserEmail) ? 'items-end' : 'items-start'}`}
              >
                {/* 발신자 이름 표시 */}
                {!emailsEqual(m.accountEmail, currentUserEmail) && (
                  <div className="text-xs text-gray-500 mb-1 px-2">
                    {m.senderName || m.accountEmail?.split('@')[0] || '알 수 없음'} ({m.accountEmail || '이메일 없음'})
                  </div>
                )}
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg shadow-sm ${
                    emailsEqual(m.accountEmail, currentUserEmail) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{m.message}</p>
                  <p className={`text-xs mt-1 ${
                    emailsEqual(m.accountEmail, currentUserEmail) ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatDateTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 입력창 */}
      <div className="border-t p-4 bg-gray-50 rounded-b-lg">
        {/* WebSocket 연결 상태 표시 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {isWebSocketConnected ? '연결됨' : '연결 끊김'}
            </span>
          </div>
          {roomFailedMessages.length > 0 && (
            <div className="text-xs text-red-600">
              실패한 메시지 {roomFailedMessages.length}개
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent"
            placeholder="메시지를 입력하세요..."
          />
          <div className={`transition-all duration-500 ease-in-out ${input.trim() ? 'opacity-100 scale-100 w-auto' : 'opacity-0 scale-95 w-0 overflow-hidden'}`}>
            <button
              onClick={handleSend}
              disabled={!isWebSocketConnected}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                isWebSocketConnected 
                  ? 'btn-main hover:opacity-90' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
