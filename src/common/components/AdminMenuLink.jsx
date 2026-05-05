import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MessagePopup from './MessagePopup';

const AdminMenuLink = ({ to, children, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginState = useSelector((state) => state.loginSlice);
  const { accessToken, role } = loginState;
  const isLogin = !!accessToken;
  const normalizedRole = role ? role.toString().trim().toLowerCase() : '';
  const isAdminRole = role === 'A' || role === 'S' || role === 'ADMIN' || role === 'admin' ||
                     role === 1 || role === '1' || role === 'ROLE_ADMIN' || role === 'role_admin' ||
                     normalizedRole === 'a' || normalizedRole === 's' || normalizedRole === 'admin' || normalizedRole === 'role_admin';
  
  const [showMessagePopup, setShowMessagePopup] = useState(false);

  const handleClick = (e) => {
    // Home 페이지는 권한 체크 없이 접근 가능
    if (to === '/admin') {
      return; // 기본 링크 동작 허용
    }
    
    // 관리자 권한이 없는 경우
    if (!isLogin || !isAdminRole) {
      e.preventDefault();
      setShowMessagePopup(true);
      return;
    }

    // 현재 위치와 같은 메뉴 클릭 시 새로고침
    if (location.pathname === to || location.pathname.startsWith(to + '/')) {
      e.preventDefault();
      // forceRefresh 상태와 함께 같은 경로로 이동하여 새로고침 효과
      navigate(to, { 
        replace: false, 
        state: { forceRefresh: true, timestamp: Date.now() }
      });
    }
  };

  const handleClosePopup = () => {
    setShowMessagePopup(false);
  };

  return (
    <>
      <Link
        to={to}
        className={className}
        onClick={handleClick}
      >
        {children}
      </Link>
      
      <MessagePopup
        isOpen={showMessagePopup}
        onClose={handleClosePopup}
        message="관리자 권한이 필요합니다. 관리자 계정으로 로그인해주세요."
        type="warning"
      />
    </>
  );
};

export default AdminMenuLink; 