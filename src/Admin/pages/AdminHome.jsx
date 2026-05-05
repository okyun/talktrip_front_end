import { useSelector } from 'react-redux';

const Home = () => {
  const loginState = useSelector((state) => state.loginSlice);
  const { accessToken, name, role } = loginState;
  const isLogin = !!accessToken;
  const normalizedRole = role ? role.toString().trim().toLowerCase() : '';
  const isAdminRole = role === 'A' || role === 'S' || role === 'ADMIN' || role === 'admin' ||
    role === 1 || role === '1' || role === 'ROLE_ADMIN' || role === 'role_admin' ||
    normalizedRole === 'a' || normalizedRole === 's' || normalizedRole === 'admin' || normalizedRole === 'role_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-12">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                TalkTrip
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-6 rounded-full"></div>
              <p className="text-xl md:text-2xl text-gray-600 font-medium">
                관리자 대시보드 홈
              </p>
            </div>

            <div className="mb-16">
              {isLogin && isAdminRole ? (
                <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
                  환영합니다, <span className="font-semibold text-blue-700">{name}</span> 관리자님.<br></br>
                  시스템 현황을 확인하고 필요한 관리를 계속 진행해주세요.
                </p>
              ) : (
                <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
                  관리자 권한이 필요한 페이지입니다. 로그인 후 접근해주세요.
                </p>
              )}
            </div>

          
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
