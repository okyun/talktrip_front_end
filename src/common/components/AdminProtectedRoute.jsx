import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import MessagePopup from './MessagePopup';

const AdminProtectedRoute = ({ children }) => {
  const loginState = useSelector((state) => state.loginSlice);
  const { accessToken, role } = loginState;
  const isLogin = !!accessToken; // accessToken이 있으면 로그인된 것으로 간주
  const navigate = useNavigate();
  
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [messageData, setMessageData] = useState({ message: '', type: 'warning' });

  console.log('=== AdminProtectedRoute 디버깅 ===');
  console.log('전체 loginSlice 상태:', loginState);
  console.log('accessToken:', accessToken);
  console.log('isLogin:', isLogin);
  console.log('role:', role);
  console.log('role type:', typeof role);
  console.log('role === "A":', role === 'A');
  console.log('role === A (숫자):', role === 'A');
  console.log('role === "A" (문자열):', role === 'A');
  console.log('role 값 확인:', JSON.stringify(role));
  console.log('role 길이:', role ? role.length : 'undefined');
  console.log('role.trim():', role ? role.trim() : 'undefined');
  console.log('role.toLowerCase():', role ? role.toLowerCase() : 'undefined');

  // 로그인하지 않은 경우
  if (!isLogin) {
    console.log('로그인하지 않음 - 로그인 페이지로 리다이렉트');
    return <Navigate to="/member/login" replace />;
  }

  // role 체크 - 더 유연하게 확인 (문자열, 숫자, 대소문자 모두 고려)
  const normalizedRole = role ? role.toString().trim().toLowerCase() : '';
  const isAdminRole = role === 'A' || role === 'S' || role === 'ADMIN' || role === 'admin' ||
                     role === 1 || role === '1' || role === 'ROLE_ADMIN' || role === 'role_admin' ||
                     normalizedRole === 'a' || normalizedRole === 's' || normalizedRole === 'admin' || normalizedRole === 'role_admin';
  
  console.log('normalizedRole:', normalizedRole);
  console.log('isAdminRole:', isAdminRole);
  
  if (!isAdminRole) {
    console.log('관리자 권한 없음 - 메시지 팝업 표시');
    console.log('현재 role:', role, '필요한 role: A');
    console.log('isAdminRole:', isAdminRole);
    console.log('role 체크 결과:');
    console.log('- role === "A":', role === 'A');
    console.log('- role === A:', role === 'A');
    console.log('- role === 1:', role === 1);
    
    // 메시지 팝업 표시 후 홈페이지로 이동
    useEffect(() => {
      setMessageData({ 
        message: '관리자 권한이 필요합니다. 관리자 계정으로 로그인해주세요.', 
        type: 'warning' 
      });
      setShowMessagePopup(true);
    }, []);
    
    const handleClosePopup = () => {
      setShowMessagePopup(false);
      navigate('/');
    };

    return (
      <>
        <div className="flex flex-col items-center justify-center text-center gap-6 py-12">
          <h2 className="text-3xl font-bold text-blue-700 mb-8">TalkTrip Admin에 오신 것을 환영합니다!</h2>
          <p className="text-lg text-gray-700 max-w-xl mt-4">
            로그인을 진행해주세요!
          </p>
        </div>
        
        <MessagePopup
          isOpen={showMessagePopup}
          onClose={handleClosePopup}
          message={messageData.message}
          type={messageData.type}
        />
      </>
    );
  }

  // 권한이 있는 경우 자식 컴포넌트 렌더링
  console.log('관리자 권한 확인됨 - 페이지 렌더링');
  return children;
};

export default AdminProtectedRoute; 