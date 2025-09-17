import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosInstance, { API_SERVER_HOST } from '../api/mainApi';
import { getCookie } from '../util/cookieUtil';
import { Client } from '@stomp/stompjs';
import ChatRoom from './ChatRoom';

const dummyGroupRooms = [
  { id: 'GROUP_001', title: '홀랜드 8/20 단체투어', lastMessage: '집합 장소 공지드립니다.', updatedAt: '2024-08-10', notReadMessageCount: 3 },
  { id: 'GROUP_002', title: '스위스 9/2 하이킹 모임', lastMessage: '장비 리스트 공유해요', updatedAt: '2024-08-09', notReadMessageCount: 0 },
  { id: 'GROUP_003', title: '일본 9/15 미식투어', lastMessage: '예약 확정되었습니다.', updatedAt: '2024-08-08', notReadMessageCount: 1 },
];

const GroupChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const loginState = useSelector((state) => state.loginSlice);
  const { accessToken } = loginState || {};

  const [rooms, setRooms] = useState([]);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const stompClientRef = useRef(null);

  const isAdminPath = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);

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

  useEffect(() => {
    let isMounted = true;
    const wsBase = API_SERVER_HOST.replace(/\/$/, '').replace(/^http/, 'ws');
    const brokerWsUrl = `${wsBase}/ws/websocket`;

    const makeConnectHeaders = () => {
      const token = getAccessToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const client = new Client({
      webSocketFactory: () => new WebSocket(brokerWsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: makeConnectHeaders(),
      beforeConnect: () => {
        client.connectHeaders = makeConnectHeaders();
      },
      debug: (msg) => console.log('STOMP GROUP DEBUG:', msg),
    });

    client.onConnect = () => {
      if (!isMounted) return;
      stompClientRef.current = client;
      setIsWebSocketConnected(true);
    };

    client.onDisconnect = () => {
      if (!isMounted) return;
      setIsWebSocketConnected(false);
    };

    client.onStompError = () => {
      if (!isMounted) return;
      setIsWebSocketConnected(false);
    };

    client.activate();

    return () => {
      isMounted = false;
      try { client.deactivate(); } catch (_) {}
      stompClientRef.current = null;
    };
  }, [accessToken]);

  const handleSendMessage = useCallback((messageDto) => {
    if (isWebSocketConnected && stompClientRef.current && stompClientRef.current.connected) {
      try {
        stompClientRef.current.publish({
          destination: '/app/chat/message',
          body: JSON.stringify(messageDto),
          headers: { 'content-type': 'application/json' },
        });
        return { success: true };
      } catch (error) {
        console.error('GroupChatPage WebSocket 전송 실패:', error);
        return { success: false, error };
      }
    }
    console.warn('GroupChatPage WebSocket 미연결로 전송 실패');
    return { success: false, error: 'WebSocket not connected' };
  }, [isWebSocketConnected]);

  useEffect(() => {
    const fetchGroupRooms = async () => {
      try {
        const res = await axiosInstance.get('/api/chat/me/chatRooms/all?roomType=GROUP');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((room) => ({
            ...room,
            id: room.roomId || room.id,
            title: room.title || room.name || room.roomName || `모임방 ${room.roomId || room.id}`,
            lastMessage: room.lastMessage || room.lastMsg || room.recentMessage || '메시지가 없습니다',
            updatedAt: room.updatedAt || room.lastMessageTime || room.modifiedAt || new Date().toISOString(),
            notReadMessageCount: room.notReadMessageCount || room.unreadCount || 0,
          }));
          setRooms(mapped.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
          return;
        }
      } catch (error) {
        console.error('그룹채팅방 목록 조회 실패:', error);
      }
      setRooms(dummyGroupRooms);
    };
    fetchGroupRooms();
  }, []);

  const getChatLink = (id) => (isAdminPath ? `/admin/groups/${id}` : `/groups/${id}`);

  const unreadCount = Array.isArray(rooms) ? rooms.filter(r => Number(r.notReadMessageCount) > 0).length : 0;

  const handleRoomClick = async (id) => {
    const room = rooms.find(r => r.id === id);
    if (room && room.notReadMessageCount > 0) {
      try {
        const { markRoomAsRead } = await import('../api/chatApi');
        await markRoomAsRead(id);
        
        setRooms(prevRooms => 
          prevRooms.map(room => 
            room.id === id ? { ...room, notReadMessageCount: 0 } : room
          )
        );
        console.log(`그룹채팅방 ${id} 읽음 처리 완료`);
      } catch (error) {
        console.error('그룹채팅방 읽음 처리 실패:', error);
        setRooms(prevRooms => 
          prevRooms.map(room => 
            room.id === id ? { ...room, notReadMessageCount: 0 } : room
          )
        );
      }
    }
  };

  const selectedRoom = useMemo(() => {
    if (!roomId) return null;
    const rid = String(roomId);
    return rooms.find(r => String(r.id) === rid || String(r.roomId) === rid) || null;
  }, [roomId, rooms]);

  return (
    <div className={`flex h-screen ${isAdminPath ? 'theme-purple' : 'theme-blue'}`}>
      <aside className="w-64 border-r bg-white flex flex-col">
        <div className="px-4 py-1 font-bold border-t border-b bg-gray-50 text-gray-900">
          모임 채팅방 ({rooms.length})
          {unreadCount > 0 && (
            <span className="ml-2 text-sm text-red-600 font-normal">(읽지 않음: {unreadCount})</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul>
            {rooms.map((room, index) => (
              <li
                key={room.id || `groom-${index}`}
                className={`flex justify-between items-center px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100
                  ${Number(room.notReadMessageCount) > 0 ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : ''}`}
              >
                <Link to={getChatLink(room.id)} className="flex-1 min-w-0" onClick={() => handleRoomClick(room.id)}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium truncate text-gray-900 font-semibold">{room.title}</span>
                    {Number(room.notReadMessageCount) > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <div className={`text-xs truncate mt-1 ${Number(room.notReadMessageCount) > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{room.lastMessage}</div>
                  <div className="text-xs text-gray-400 mt-1">{room.updatedAt?.toString()?.slice(0, 10)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex-1 p-4 bg-gray-50">
        <Routes>
          <Route
            index
            element={
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-2">👥</div>
                  <div>모임 채팅방을 선택하세요.</div>
                  <div className="text-sm mt-1">총 {rooms.length}개의 모임방이 있습니다.</div>
                </div>
              </div>
            }
          />
          <Route
            path=":roomId"
            element={
              <ChatRoom
                isWebSocketConnected={isWebSocketConnected}
                onSendMessage={handleSendMessage}
                onMessageUpdate={() => {}}
                roomTitle={selectedRoom?.title || ''}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default GroupChatPage;


