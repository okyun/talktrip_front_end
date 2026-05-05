import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Pagination from '../../../common/util/Pagination';
import AISearchBot from '../../../common/AISearchBot';
import { getProductList, aiSearchProducts, toggleLike } from '../../../common/api/productApi';

const CommerceList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  
  // 검색어 상태 추가
  const [inputValue, setInputValue] = useState("");    // input 에 타이핑할 값
  const [search, setSearch] = useState("");    // 실제 검색어
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [isAISearch, setIsAISearch] = useState(false);
  /** null = 전체, 그 외 ISO country_id (FR, IT, JP …) */
  const [selectedCountryId, setSelectedCountryId] = useState(null);

  // 상품 상태 관리
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 페이지네이션 설정
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 9; // 페이지당 아이템 개수

  // 주요 여행국가 — API 는 country_id(ISO) 쿼리로 전달 (DB product.country_id)
  const countries = [
    { name: '전체', countryId: null, flag: '🌍', color: 'bg-gray-600 hover:bg-gray-700' },
    { name: '프랑스', countryId: 'FR', flag: '🗼', color: 'bg-blue-500 hover:bg-blue-600' },
    { name: '이탈리아', countryId: 'IT', flag: '🍕', color: 'bg-green-500 hover:bg-green-600' },
    { name: '일본', countryId: 'JP', flag: '🗾', color: 'bg-red-500 hover:bg-red-600' },
    { name: '미국', countryId: 'US', flag: '🗽', color: 'bg-blue-600 hover:bg-blue-700' },
    { name: '한국', countryId: 'KR', flag: '🏯', color: 'bg-red-600 hover:bg-red-700' },
    { name: '호주', countryId: 'AU', flag: '🦘', color: 'bg-blue-400 hover:bg-blue-500' },
    { name: '태국', countryId: 'TH', flag: '🐘', color: 'bg-blue-500 hover:bg-blue-600' },
    { name: '스페인', countryId: 'ES', flag: '🐂', color: 'bg-red-500 hover:bg-red-600' },
    { name: '멕시코', countryId: 'MX', flag: '🌵', color: 'bg-green-600 hover:bg-green-700' },
    { name: '싱가포르', countryId: 'SG', flag: '🦁', color: 'bg-red-500 hover:bg-red-600' }
  ];

  // 페이지 새로고침 감지 및 처리
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 페이지가 새로고침될 때 실행될 코드
      console.log('상품 목록 페이지 새로고침 감지');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 초기 로드 - 컴포넌트 마운트 시에만 실행
  useEffect(() => {
    const aiSearchQuery = location.state?.aiSearchQuery;
    const immediateAISearch = location.state?.immediateAISearch;
    
    // AI 검색이 예정된 경우 전체 상품 로드하지 않음
    if (aiSearchQuery && immediateAISearch) {
      console.log('AI 검색이 예정되어 있어 전체 상품 로드 건너뜀');
      return;
    }
    
    // AI 검색이 아닐 때만 전체 상품 로드
    if (!isAISearch && !aiSearchQuery) {
      loadProducts(0, '', sort, sortOrder, selectedCountryId);
    }
  }, []); // 빈 의존성 배열로 컴포넌트 마운트 시에만 실행

  // 초기 상품 목록 로드
  const loadProducts = async (pageNum = 0, keyword = '', sort = 'updatedAt', sortOrder = 'desc', countryId = null) => {
    setLoading(true);
    setError('');
    setIsAISearch(false); // 일반 검색으로 플래그 해제
    
    try {
      console.log('상품 목록 조회 중...', { page: pageNum, size: itemsPerPage, keyword, sort, sortOrder, countryId });
      const response = await getProductList({
        page: pageNum,
        size: itemsPerPage,
        keyword: keyword,
        sort: sort,
        sortOrder: sortOrder,
        countryId: countryId || undefined,
      });
      
      console.log('상품 목록 응답:', response);
      
             // 백엔드 응답 구조에 맞게 데이터 변환
       console.log('응답 데이터 구조 확인:', response);
       
       let transformedProducts = [];
       let totalCount = 0;
       
       if (Array.isArray(response)) {
         // 배열 형태로 직접 받은 경우
         transformedProducts = response.map(product => ({
           id: product.productId || product.id,
           title: product.productName || product.title || '제목 없음',
           description: product.productDescription || product.description || '설명 없음',
           thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
           price: product.price || 0,
           discountPrice: product.discountPrice || null,
           rating: product.averageReviewStar || product.rating || 0,
           like: product.isLiked || product.like || false,
           reviews: [] // 리뷰 배열은 별도로 받아야 할 수 있음
         }));
         totalCount = transformedProducts.length;
       } else if (response.content && Array.isArray(response.content)) {
         // 페이지네이션 응답 구조인 경우
         transformedProducts = response.content.map(product => ({
           id: product.productId || product.id,
           title: product.productName || product.title || '제목 없음',
           description: product.productDescription || product.description || '설명 없음',
           thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
           price: product.price || 0,
           discountPrice: product.discountPrice || null,
           rating: product.averageReviewStar || product.rating || 0,
           like: product.isLiked || product.like || false,
           reviews: []
         }));
         totalCount = response.totalElements || transformedProducts.length;
       } else {
         console.warn('예상하지 못한 응답 구조:', response);
         transformedProducts = [];
         totalCount = 0;
       }
       
       console.log('변환된 상품 데이터:', transformedProducts);
       console.log('총 상품 수:', totalCount);
       
       setProducts(transformedProducts);
       setTotalItems(totalCount);
      
    } catch (error) {
      console.error('상품 목록 조회 실패:', error);
      
      // 더 자세한 에러 메시지 생성
      let errorMessage = '상품 목록을 불러오는데 실패했습니다.';
      
      if (error.response) {
        // 서버에서 응답이 왔지만 에러인 경우
        const status = error.response.status;
        const statusText = error.response.statusText;
        
        if (status === 403) {
          errorMessage = '접근 권한이 없습니다. (403)';
        } else if (status === 404) {
          errorMessage = 'API 엔드포인트를 찾을 수 없습니다. (404)';
        } else if (status === 500) {
          errorMessage = '서버 내부 오류가 발생했습니다. (500)';
        } else {
          errorMessage = `서버 오류: ${status} - ${statusText}`;
        }
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우
        errorMessage = '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
      } else {
        // 요청 자체를 보내지 못한 경우
        errorMessage = `요청 오류: ${error.message}`;
      }
      
      setError(errorMessage);
      setProducts([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // 상태 초기화 함수
  const resetToInitialState = () => {
    setInputValue("");
    setSearch("");
    setDate("");
    setSort("updatedAt");
    setSortOrder("desc");
    setIsAISearch(false);
    setPage(1);
    setError('');
    setSelectedCountryId(null);
  };

  // AI 검색봇 핸들러
  const handleAISearch = async (query, isAISearchStart = false) => {
    console.log('AI 검색 쿼리:', query);
    setSearch(query);
    setIsAISearch(true); // AI 검색 플래그 설정
    
    // AI 검색 시작 시 즉시 로딩 상태로 설정
    if (isAISearchStart) {
      setLoading(true);
      setProducts([]); // 기존 상품 목록 초기화
      setError(''); // 에러 메시지 초기화
    }

    try {
      const response = await aiSearchProducts(query);
      console.log('AI 검색 결과:', response);

      // 백엔드 응답 구조에 맞게 데이터 변환
      console.log('AI 검색 응답 데이터 구조 확인:', response);
      
      let transformedProducts = [];
      let totalCount = 0;
      
      if (Array.isArray(response)) {
        transformedProducts = response.map(product => ({
          id: product.productId || product.id,
          title: product.productName || product.title || '제목 없음',
          description: product.productDescription || product.description || '설명 없음',
          thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
          price: product.price || 0,
          discountPrice: product.discountPrice || null,
          rating: product.averageReviewStar || product.rating || 0,
          like: product.isLiked || product.like || false,
          reviews: []
        }));
        totalCount = transformedProducts.length;
      } else if (response.content && Array.isArray(response.content)) {
        transformedProducts = response.content.map(product => ({
          id: product.productId || product.id,
          title: product.productName || product.title || '제목 없음',
          description: product.productDescription || product.description || '설명 없음',
          thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
          price: product.price || 0,
          discountPrice: product.discountPrice || null,
          rating: product.averageReviewStar || product.rating || 0,
          like: product.isLiked || product.like || false,
          reviews: []
        }));
        totalCount = response.totalElements || transformedProducts.length;
      } else {
        console.warn('AI 검색: 예상하지 못한 응답 구조:', response);
        transformedProducts = [];
        totalCount = 0;
      }
      
      console.log('AI 검색 변환된 상품 데이터:', transformedProducts);
      console.log('AI 검색 총 상품 수:', totalCount);
      
      setProducts(transformedProducts);
      setTotalItems(totalCount);
      
      setPage(1); // 검색 결과 나오면 페이지 1로 초기화

    } catch (error) {
      console.error('AI 검색 중 오류 발생:', error);
      setError('AI 검색 중 오류가 발생했습니다.');
      setProducts([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초기 데이터 로드 (AI 검색 쿼리 고려)
  useEffect(() => {
    const aiSearchQuery = location.state?.aiSearchQuery;
    const immediateAISearch = location.state?.immediateAISearch;
    const forceRefresh = location.state?.forceRefresh;
    
    // AI 검색 쿼리가 있는 경우 - 즉시 AI 검색 모드로 전환
    if (aiSearchQuery && immediateAISearch) {
      console.log('즉시 AI 검색 모드로 진입:', aiSearchQuery);
      resetToInitialState();
      setLoading(true); // AI 검색 대기 중 로딩 표시
      setProducts([]); // 기존 상품 목록 즉시 초기화
      setError(''); // 에러 메시지 초기화
      
      // AI 검색 직접 실행
      const executeAISearch = async () => {
        setSearch(aiSearchQuery);
        setIsAISearch(true);
        
        try {
          const response = await aiSearchProducts(aiSearchQuery);
          console.log('AI 검색 결과:', response);

          // 백엔드 응답 구조에 맞게 데이터 변환
          console.log('useEffect AI 검색 응답 데이터 구조 확인:', response);
          
          let transformedProducts = [];
          let totalCount = 0;
          
          if (Array.isArray(response)) {
            transformedProducts = response.map(product => ({
              id: product.productId || product.id,
              title: product.productName || product.title || '제목 없음',
              description: product.productDescription || product.description || '설명 없음',
              thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
              price: product.price || 0,
              discountPrice: product.discountPrice || null,
              rating: product.averageReviewStar || product.rating || 0,
              like: product.isLiked || product.like || false,
              reviews: []
            }));
            totalCount = transformedProducts.length;
          } else if (response.content && Array.isArray(response.content)) {
            transformedProducts = response.content.map(product => ({
              id: product.productId || product.id,
              title: product.productName || product.title || '제목 없음',
              description: product.productDescription || product.description || '설명 없음',
              thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
              price: product.price || 0,
              discountPrice: product.discountPrice || null,
              rating: product.averageReviewStar || product.rating || 0,
              like: product.isLiked || product.like || false,
              reviews: []
            }));
            totalCount = response.totalElements || transformedProducts.length;
          } else {
            console.warn('useEffect AI 검색: 예상하지 못한 응답 구조:', response);
            transformedProducts = [];
            totalCount = 0;
          }
          
          console.log('useEffect AI 검색 변환된 상품 데이터:', transformedProducts);
          console.log('useEffect AI 검색 총 상품 수:', totalCount);
          
          setProducts(transformedProducts);
          setTotalItems(totalCount);
          
          setPage(1);
        } catch (error) {
          console.error('AI 검색 중 오류 발생:', error);
          setError('AI 검색 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      };
      
      executeAISearch();
      
      // state 초기화 (페이지 새로고침 시에도 AI 검색 상태 유지)
      navigate(location.pathname, { replace: true });
    } 
    // 강제 새로고침인 경우
    else if (forceRefresh) {
      resetToInitialState();
      loadProducts(0, '', sort, sortOrder, selectedCountryId);
    }
    // 일반 진입인 경우 - 초기 로드 useEffect에서 처리하므로 여기서는 아무것도 하지 않음
  }, []);

  // location.state 변경 감지 (페이지 이동 시 AI 검색 처리)
  useEffect(() => {
    const aiSearchQuery = location.state?.aiSearchQuery;
    const immediateAISearch = location.state?.immediateAISearch;
    
    // 컴포넌트 마운트 시가 아닌 location.state 변경 시에만 실행
    if (aiSearchQuery && immediateAISearch && location.state) {
      console.log('페이지 이동으로 인한 즉시 AI 검색:', aiSearchQuery);
      
      // 즉시 상태 초기화 및 AI 검색 모드 전환
      setSearch(aiSearchQuery);
      setIsAISearch(true);
      setProducts([]); // 기존 상품 목록 즉시 초기화
      setError(''); // 에러 메시지 초기화
      setLoading(true); // 로딩 상태 활성화
      setPage(1); // 페이지 초기화
      
      const executeAISearch = async () => {
        try {
          const response = await aiSearchProducts(aiSearchQuery);
          console.log('AI 검색 결과:', response);

          if (Array.isArray(response)) {
            const transformedProducts = response.map(product => ({
              id: product.productId || product.id,
              title: product.productName || product.title || '제목 없음',
              description: product.productDescription || product.description || '설명 없음',
              thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
              price: product.price || 0,
              discountPrice: product.discountPrice || null,
              rating: product.averageReviewStar || product.rating || 0,
              like: product.isLiked || product.like || false,
              reviews: []
            }));
            setProducts(transformedProducts);
            setTotalItems(transformedProducts.length);
          } else if (response.content && Array.isArray(response.content)) {
            const transformedProducts = response.content.map(product => ({
              id: product.productId || product.id,
              title: product.productName || product.title || '제목 없음',
              description: product.productDescription || product.description || '설명 없음',
              thumbnail: product.thumbnailImageUrl || product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png',
              price: product.price || 0,
              discountPrice: product.discountPrice || null,
              rating: product.averageReviewStar || product.rating || 0,
              like: product.isLiked || product.like || false,
              reviews: []
            }));
            setProducts(transformedProducts);
            setTotalItems(response.totalElements || transformedProducts.length);
          } else {
            console.warn('location.state AI 검색: 예상하지 못한 응답 구조:', response);
            setProducts([]);
            setTotalItems(0);
          }
        } catch (error) {
          console.error('AI 검색 중 오류 발생:', error);
          setError('AI 검색 중 오류가 발생했습니다.');
          setProducts([]);
          setTotalItems(0);
        } finally {
          setLoading(false);
        }
      };
      
      executeAISearch();
      
      // state 초기화 (페이지 새로고침 시에도 AI 검색 상태 유지)
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  // 응답 데이터를 그대로 표시 (필터링 없음)
  const filteredProducts = useMemo(() => {
    console.log('=== 응답 데이터 그대로 표시 ===');
    console.log('원본 products:', products);
    console.log('개수:', products.length);
    
    // 응답 데이터를 그대로 반환 (필터링 없음)
    return products;
  }, [products]);

  // 좋아요 토글 함수
  const handleToggleLike = async (productId) => {
    try {
      console.log('좋아요 토글 중...', { productId });
      
      // 백엔드에 토글 요청
      await toggleLike(productId);
      console.log('좋아요 토글 완료');
      
      // 로컬 상태 업데이트
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, like: !product.like }
          : product
      ));
      
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      
      // 에러 메시지 표시
      let errorMessage = '좋아요 처리 중 오류가 발생했습니다.';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          errorMessage = '로그인이 필요합니다. 로그인 후 다시 시도해주세요.';
        } else if (status === 404) {
          errorMessage = '상품을 찾을 수 없습니다.';
        } else {
          errorMessage = `서버 오류: ${status}`;
        }
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.';
      }
      
      alert(errorMessage);
    }
  };

  // 페이지 변경 시 API 호출
  const handlePageChange = (newPage) => {
    setPage(newPage);
    const pageIndex = newPage - 1;
    loadProducts(pageIndex, search, sort, sortOrder, selectedCountryId);
  };

  // 검색 버튼 클릭 시
  const handleSearch = () => {
    setSearch(inputValue); // inputValue를 실제 검색어로 설정
    setIsAISearch(false); // 일반 검색으로 플래그 해제
    setPage(1);
    loadProducts(0, inputValue, sort, sortOrder, selectedCountryId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 페이지 헤더 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          투어 & 액티비티
        </h1>
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
        <p className="text-lg text-gray-600 mt-4">
          전세계의 다양한 여행상품을 둘러보고 예약하세요
        </p>
      </div>

      {/* AI 검색봇 영역 */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-12">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI 여행상품 검색
            </h3>
          </div>
          <p className="text-gray-600">
            자연어로 원하는 여행상품을 쉽게 찾아보세요
          </p>
        </div>
        <AISearchBot 
          onSearch={handleAISearch}
          placeholder="예: 로맨틱한 여행지 추천, 가족과 함께하는 여행, 서울 근교 당일치기 투어"
        />
        
        {/* AI 검색 결과가 있을 때 전체 상품 보기 버튼 */}
        {isAISearch && products.length > 0 && !loading && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsAISearch(false);
                setSearch('');
                setProducts([]);
                setTotalItems(0);
                setError('');
                // 전체 상품 로드
                loadProducts(0, '', sort, sortOrder, selectedCountryId);
              }}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              전체 상품 보기
            </button>
          </div>
        )}
      </div>

      {/* 검색 및 필터 섹션 */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            검색 및 필터
          </h3>
        </div>
        
                 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           {/* 검색 입력 필드 */}
           <div className="lg:col-span-2">
             <label className="block text-sm font-medium text-gray-700 mb-2">상품명 검색</label>
             <div className="flex">
               <input
                 type="text"
                 placeholder="검색할 상품명을 입력하세요"
                 value={inputValue}
                 onChange={e => setInputValue(e.target.value)}
                 className="flex-1 border border-gray-300 rounded-l-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
               />
               <button
                 onClick={handleSearch}
                 className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-r-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold"
               >
                 검색
               </button>
             </div>
           </div>

           

          {/* 정렬 및 필터 드롭다운 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">정렬 및 필터</label>
            <select
              value={sort}
              onChange={(e) => {
                const newSort = e.target.value;
                // 이미 같은 정렬 옵션이 선택된 경우 중복 호출 방지
                if (sort === newSort) {
                  return;
                }
                setSort(newSort);
                setPage(1);
                loadProducts(0, search, newSort, sortOrder, selectedCountryId);
              }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            >
              <option value="updatedAt">등록일순</option>
              <option value="discountPrice">할인가순</option>
              <option value="averageStar">평점순</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">정렬 순서</label>
            <select
              value={sortOrder}
              onChange={(e) => {
                const newSortOrder = e.target.value;
                // 이미 같은 정렬 순서가 선택된 경우 중복 호출 방지
                if (sortOrder === newSortOrder) {
                  return;
                }
                setSortOrder(newSortOrder);
                setPage(1);
                loadProducts(0, search, sort, newSortOrder, selectedCountryId);
              }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            >
              <option value="desc">내림차순</option>
              <option value="asc">오름차순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 주요 여행국가 카테고리 */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-2xl">🌍</span>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              주요 여행국가
            </h3>
          </div>
          <p className="text-gray-600">
            인기 여행지로 빠르게 검색해보세요
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {/* 첫 번째 줄: 6개 국가 */}
          <div className="flex justify-center gap-3">
            {countries.slice(0, 6).map((country, index) => (
              <button
                key={index}
                onClick={() => {
                  if (selectedCountryId === country.countryId) {
                    return;
                  }
                  setSelectedCountryId(country.countryId);
                  setPage(1);
                  loadProducts(0, search, sort, sortOrder, country.countryId);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg ${country.color} text-white ${selectedCountryId === country.countryId ? 'ring-2 ring-black ring-opacity-80 shadow-lg' : ''}`}
              >
                <span className="text-lg">{country.flag}</span>
                <span>{country.name}</span>
              </button>
            ))}
          </div>
          {/* 두 번째 줄: 5개 국가 */}
          <div className="flex justify-center gap-3">
            {countries.slice(6).map((country, index) => (
              <button
                key={index + 6}
                onClick={() => {
                  if (selectedCountryId === country.countryId) {
                    return;
                  }
                  setSelectedCountryId(country.countryId);
                  setPage(1);
                  loadProducts(0, search, sort, sortOrder, country.countryId);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg ${country.color} text-white ${selectedCountryId === country.countryId ? 'ring-2 ring-black ring-opacity-80 shadow-lg' : ''}`}
              >
                <span className="text-lg">{country.flag}</span>
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-12">
          {isAISearch ? (
            // AI 검색 중일 때 - 밝고 경쾌한 메시지
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <div className="relative inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                <div className="absolute top-0 left-0 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-blue-600 border-r-purple-600"></div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-semibold text-blue-600">
                  🤖 AI가 열심히 검색 중입니다!
                </p>
                <p className="mt-1 text-sm text-purple-500 font-medium">
                  최적의 여행상품을 찾고 있어요 ✨
                </p>
              </div>
            </div>
          ) : (
            // 일반 로딩 중일 때
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">상품을 불러오는 중...</p>
            </div>
          )}
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* 검색 결과 없음 상태 */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12">
          {isAISearch ? (
            // AI 검색 결과 없음
            <div className="w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <div className="mb-4">
                <span className="text-6xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                적합한 상품을 찾지 못했어요
              </h3>
              <p className="text-gray-600 mb-4">
                여행과 관련된 질문으로 다시 검색해보시거나<br/>
                아래 예시를 참고해보세요!
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  "로맨틱한 여행지 추천",
                  "가족과 함께하는 여행",
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleAISearch(example)}
                    className="px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-700 rounded-full text-sm transition-all duration-300 border border-blue-200/50 hover:border-blue-300/50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // 초기 상태 또는 일반 검색 결과 없음
            <div className="w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <div className="mb-4">
                <span className="text-6xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {search ? '검색 결과가 없습니다' : 'AI 검색을 시작해보세요'}
              </h3>
              <p className="text-gray-600">
                {search ? (
                  <>
                    다른 키워드로 검색해보시거나<br/>
                    검색어를 줄여서 시도해보세요
                  </>
                ) : (
                  <>
                    위의 AI 검색봇에 여행 관련 질문을 입력하면<br/>
                    최적의 여행상품을 추천해드립니다
                  </>
                )}
              </p>
              {!search && (
                <div className="mt-4">
                  <button
                    onClick={() => loadProducts(0, '', sort, sortOrder, selectedCountryId)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    전체 상품 보기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 카드 리스트 */}
      {!loading && !error && (
        <div>
          {console.log('=== 카드 리스트 렌더링 조건 확인 ===')}
                     {console.log('조건들:', { 
             loading, 
             error, 
             productsLength: products.length, 
             filteredProductsLength: filteredProducts.length,
             isAISearch,
             search
           })}
          {console.log('filteredProducts 존재 여부:', !!filteredProducts)}
          {console.log('filteredProducts 길이:', filteredProducts?.length)}
          {console.log('조건 평가:', !loading && !error && filteredProducts && filteredProducts.length > 0)}
          {filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {console.log('=== 카드 맵핑 시작 ===')}
              {console.log('맵핑할 상품들:', filteredProducts)}
                            {filteredProducts.map((product, index) => {
                console.log(`상품 ${index}:`, product);
                return (
                  <div
                    key={product.id}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col relative border border-white/20 hover:scale-105 group"
                  >
                    <img 
                      src={product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png'} 
                      alt="썸네일" 
                      className="w-full aspect-square object-cover rounded-t-2xl bg-gray-100 cursor-pointer" 
                      onClick={() => navigate(`${product.id}`)}
                      onError={(e) => {
                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png';
                      }}
                    />
                    
                    {/* 좋아요 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLike(product.id);
                      }}
                      className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                        product.like 
                          ? 'bg-red-500 text-white shadow-lg' 
                          : 'bg-white/90 text-gray-600 hover:bg-red-50 shadow-md'
                      }`}
                    >
                      {product.like ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                    </button>
                    
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-lg font-bold mb-2 cursor-pointer text-gray-900 hover:text-blue-600 transition-all duration-300" onClick={() => navigate(`${product.id}`)}>
                          {product.title.length > 20 ? `${product.title.substring(0, 20)}...` : product.title}
                        </div>
                        <div className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-yellow-500 font-bold flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {product.rating > 0 ? product.rating.toFixed(1) : '-'}
                        </span>
                        <div className="text-right">
                          {product.discountPrice && product.discountPrice !== product.price ? (
                            <div>
                              <span className="text-gray-400 line-through text-sm">{product.price?.toLocaleString()}원</span>
                              <div className="text-red-600 font-bold text-lg">{product.discountPrice?.toLocaleString()}원</div>
                            </div>
                          ) : (
                            <span className="text-blue-700 font-bold text-lg">{product.price?.toLocaleString()}원</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>
         ) : (
           <div className="text-center py-8">
           </div>
         )}
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && !error && totalItems > 0 && (
        <div className="flex justify-center">
          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={page}
            onPageChange={handlePageChange}
            className="mt-6"
          />
        </div>
      )}
    </div>
  );
};

export default CommerceList;