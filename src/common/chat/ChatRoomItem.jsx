import React, { memo } from 'react';
import { Link } from 'react-router-dom';

const ChatRoomItem = memo(({ 
  room, 
  isSelected, 
  getChatLink, 
  onRoomClick, 
  onDeleteRoom, 
  formatDate 
}) => {
  console.log(`🔍 렌더링 중인 방:`, {
    id: room.id,
    title: room.title,
    notReadMessageCount: room.notReadMessageCount,
    notReadMessageCountType: typeof room.notReadMessageCount,
    condition: room.notReadMessageCount > 0
  });

  return (
    <li
      className={`flex justify-between items-center px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100
        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
        ${Number(room.notReadMessageCount) > 0 ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : ''}
        ${room.roomType === 'GROUP' ? 'border-l-2 border-l-green-300' : ''}`}
    >
      <Link to={getChatLink(room.id)} className="flex-1 min-w-0" onClick={() => onRoomClick(room.id)}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex-shrink-0 mr-2">
              {room.roomType === 'GROUP' ? (
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center">
                <span className="font-medium truncate text-gray-900 font-semibold text-sm">{room.title}</span>
                {room.roomType === 'GROUP' && (
                  <span className="ml-2 px-1 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex-shrink-0">
                    그룹
                  </span>
                )}
              </div>
            </div>
          </div>
          {Number(room.notReadMessageCount) > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
          )}
        </div>
        <div className={`text-xs truncate mt-0.5 ml-7 ${Number(room.notReadMessageCount) > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
          {room.lastMessage}
        </div>
        <div className="text-xs text-gray-400 mt-0.5 ml-7">{formatDate(room.updatedAt)}</div>
      </Link>
      <button
        onClick={() => onDeleteRoom(room.id)}
        className="text-blue-400 hover:text-blue-600 px-2 ml-2 flex-shrink-0 transition-colors duration-200"
        title="채팅방 삭제"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </li>
  );
});

ChatRoomItem.displayName = 'ChatRoomItem';

export default ChatRoomItem;
