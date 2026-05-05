import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import KakaoLoginButton from "./components/KakaoLoginButton";
import AdminMenuLink from "./components/AdminMenuLink";

// 일반 메뉴 링크 컴포넌트 (새로고침 기능 포함)
const MenuLink = ({ to, children, className }) => {
  const location = useLocation();

  const handleClick = (e) => {
    // 같은 페이지를 클릭한 경우 새로고침
    if (location.pathname === to) {
      e.preventDefault();
      window.location.reload();
      return;
    }
  };

  return (
    <Link
      to={to}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginState = useSelector((state) => state.loginSlice);
  const { accessToken, role } = loginState;
  const isLogin = !!accessToken; // accessToken이 있으면 로그인된 것으로 간주
  const isAdmin = location.pathname.startsWith('/admin');
  
  // role 체크를 더 유연하게 (문자열, 숫자, 대소문자 모두 고려)
  const normalizedRole = role ? role.toString().trim().toLowerCase() : '';
  const isAdminRole = role === 'A' || role === 'S' || role === 'ADMIN' || role === 'admin' ||
                     role === 1 || role === '1' || role === 'ROLE_ADMIN' || role === 'role_admin' ||
                     normalizedRole === 'a' || normalizedRole === 's' || normalizedRole === 'admin' || normalizedRole === 'role_admin';
  const isAdminUser = isLogin && isAdminRole;

  // 메뉴 클릭 핸들러 - 현재 위치와 같은 메뉴 클릭 시 새로고침
  const handleMenuClick = (targetPath, e) => {
    // 현재 경로가 목표 경로와 같거나 그 하위 경로인 경우
    if (location.pathname === targetPath || location.pathname.startsWith(targetPath + '/')) {
      e.preventDefault();
      // forceRefresh 상태와 함께 같은 경로로 이동하여 새로고침 효과
      navigate(targetPath, { 
        replace: false, 
        state: { forceRefresh: true, timestamp: Date.now() }
      });
    }
  };

  // Mypage 버튼 핸들러 - 새로고침 신호 전달
  const handleMypageClick = (e) => {
    e.preventDefault();
    
    // 현재 마이페이지에 있는 경우 새로고침 신호와 함께 같은 경로로 이동
    if (location.pathname === '/mypage') {
      const currentTab = searchParams.get('tab') || 'info';
      navigate(`/mypage?tab=${currentTab}`, { 
        replace: false,
        state: { forceRefresh: true, timestamp: Date.now() }
      });
      return;
    }
    
    // 다른 페이지에서 마이페이지로 이동하는 경우
    navigate('/mypage?tab=info', { 
      replace: false
    });
  };

  // console.log('=== Header 디버깅 ===');
  // console.log('전체 loginSlice 상태:', loginState);
  // console.log('location.pathname:', location.pathname);
  // console.log('accessToken:', accessToken);
  // console.log('isLogin:', isLogin);
  // console.log('role:', role);
  // console.log('role type:', typeof role);
  // console.log('role === "A":', role === 'A');
  // console.log('role === A:', role === 'A');
  // console.log('role === 1:', role === 1);
  // console.log('isAdminRole:', isAdminRole);
  // console.log('isAdmin:', isAdmin);
  // console.log('isAdminUser:', isAdminUser);
  // console.log('isAdmin && isAdminUser:', isAdmin && isAdminUser);
  
  // // 조건별 디버깅
  // console.log('조건 분석:');
  // console.log('- isAdmin (경로가 /admin으로 시작):', isAdmin);
  // console.log('- accessToken 존재:', !!accessToken);
  // console.log('- isLogin (로그인 상태):', isLogin);
  // console.log('- role 값:', role);a
  // console.log('- isAdminRole (관리자 권한):', isAdminRole);
  // console.log('- 최종 조건 (isAdmin && isAdminUser):', isAdmin && isAdminUser);

  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* 왼쪽 로고 */}
        <div className="flex items-center min-w-[120px]">
          <MenuLink 
            to={isAdmin ? "/admin" : "/"} 
            className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            TalkTrip
          </MenuLink>
        </div>

        {/* nav: user / admin 분기 */}
        <nav className="flex-1 flex justify-center gap-8">
          {isAdmin ? (
            <>
              <AdminMenuLink
                to="/admin/products"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                상품관리
              </AdminMenuLink>
              <AdminMenuLink
                to="/admin/orders"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                주문관리
              </AdminMenuLink>
              <AdminMenuLink
                to="/admin/profile"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                정보수정
              </AdminMenuLink>
              <AdminMenuLink
                to="/admin/openchat"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                오픈채팅
              </AdminMenuLink>
              <AdminMenuLink
                to="/admin/dau"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                DAU
              </AdminMenuLink>
            </>
          ) : (
            <>
              <MenuLink
                to="/commerce"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
                onClick={(e) => handleMenuClick('/commerce', e)}
              >
                투어/액티비티
              </MenuLink>
              <MenuLink
                to="/openchat"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
                onClick={(e) => handleMenuClick('/openchat', e)}
              >
                오픈채팅
              </MenuLink>
              <MenuLink
                to="/mypage"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
                onClick={handleMypageClick}
              >
                Mypage
              </MenuLink>
              {/* 사용자용 추가 메뉴들... */}
            </>
          )}
        </nav>

        {/* 오른쪽 로그인 버튼 */}
        <KakaoLoginButton />
      </div>
    </header>
  );
};

export default Header;