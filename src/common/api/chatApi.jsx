import axiosInstance from './mainApi';

// 채팅방 읽음 처리 (notReadMessageCount 초기화)
export const markRoomAsRead = async (roomId) => {
  try {
    const response = await axiosInstance.patch(`/api/chat/me/chatRooms/${roomId}/markAsRead`);
    return response.data;
  } catch (error) {
    console.error('채팅방 읽음 처리 실패:', error);
    throw error;
  }
};

// 채팅방 목록 조회
export const getChatRooms = async (limit = 25, cursor = null) => {
  try {
    const params = { limit };
    if (cursor) {
      params.cursor = cursor;
    }
    const response = await axiosInstance.get('/api/chat/me/chatRooms', { params });
    return response.data;
  } catch (error) {
    console.error('채팅방 목록 조회 실패:', error);
    throw error;
  }
};

// 채팅방 메시지 조회
export const getRoomMessages = async (roomId, limit = 50, cursor = null, includeMessages = false) => {
  try {
    const params = { limit, includeMessages };
    if (cursor) {
      params.cursor = cursor;
    }
    const response = await axiosInstance.get(`/api/chat/me/chatRooms/${roomId}/messages`, { params });
    return response.data;
  } catch (error) {
    console.error('채팅방 메시지 조회 실패:', error);
    throw error;
  }
};

// 안읽은 메시지 총 개수 조회
export const getUnreadMessageCount = async () => {
  try {
    const response = await axiosInstance.get('/api/chat/countALLUnreadMessages');
    return response.data;
  } catch (error) {
    console.error('안읽은 메시지 개수 조회 실패:', error);
    throw error;
  }
};

// 채팅방 나가기
export const leaveChatRoom = async (roomId) => {
  try {
    const response = await axiosInstance.patch(`/api/chat/me/chatRooms/${roomId}`);
    return response.data;
  } catch (error) {
    console.error('채팅방 나가기 실패:', error);
    throw error;
  }
};
