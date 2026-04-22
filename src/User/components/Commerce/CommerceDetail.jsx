import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getProductDetail, toggleLike } from '../../../common/api/productApi';
import SellerInfo from '../../../common/components/SellerInfo';
import ReviewSummary from './ReviewSummary';

// 한국 시간 기준으로 날짜 문자열 생성 (공통 함수)
const getKoreaDateString = (date) => {
  // 로컬 시간 기준으로 직접 날짜 생성 (시간대 문제 완전 해결)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// startDate 포맷 정규화 (YYYY-MM-DD만 사용)
const normalizeYmd = (value) => {
  if (!value) return '';
  // "2026-04-27", "2026-04-27T00:00:00", "2026-04-27 00:00:00" 모두 대응
  return String(value).trim().slice(0, 10);
};

// 달력 컴포넌트
const Calendar = ({ availableDates, selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // 현재 월의 첫 번째 날과 마지막 날
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // 달력 시작일 (이전 달의 날짜들 포함)
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
  
  // 달력 끝일 (다음 달의 날짜들 포함)
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()));
  
  // 달력에 표시할 모든 날짜들
  const calendarDates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    calendarDates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // 이전/다음 월 이동
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // 날짜가 재고가 있는 날짜인지 확인 (일관된 날짜 형식 사용)
  const isAvailableDate = (date) => {
    const dateString = getKoreaDateString(date);
    return availableDates.includes(normalizeYmd(dateString));
  };

  // 날짜가 오늘 이후인지 확인
  const isFutureDate = (date) => {
    const today = new Date();
    const todayString = getKoreaDateString(today);
    const dateString = getKoreaDateString(date);
    return dateString >= todayString;
  };

  // 지난 날짜인지 확인
  const isPastDate = (date) => {
    const today = new Date();
    const todayString = getKoreaDateString(today);
    const dateString = getKoreaDateString(date);
    return dateString < todayString;
  };
  
  // 날짜 클릭 핸들러
  const handleDateClick = (date) => {
    if (isAvailableDate(date) && isFutureDate(date)) {
      // 일관된 날짜 형식 사용
      const dateString = getKoreaDateString(date);
      onDateSelect(normalizeYmd(dateString));
    }
  };
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-white/60 rounded-xl transition-all duration-300 hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-white/60 rounded-xl transition-all duration-300 hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 요일 헤더 */}
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {/* 날짜들 */}
        {calendarDates.map((date, index) => {
          const dateString = getKoreaDateString(date);
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isSelected = dateString === selectedDate;
          const isAvailable = isAvailableDate(date);
          const isFuture = isFutureDate(date);
          const isPast = isPastDate(date);
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!isAvailable || !isFuture}
              className={`
                p-2 text-sm rounded-lg transition-all duration-300 relative
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${isSelected ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : ''}
                ${isAvailable && isFuture && !isSelected ? 'hover:bg-blue-50 hover:scale-105' : ''}
                ${!isAvailable || !isFuture ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {date.getDate()}
              {isAvailable && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded"></div>
          <span>재고 있음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded"></div>
          <span>선택됨</span>
        </div>
      </div>
    </div>
  );
};

const CommerceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 상태 관리
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockCounts, setStockCounts] = useState({});
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // 상품 상세 정보 로드
  const loadProductDetail = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('상품 상세 조회 중...', id);
      const response = await getProductDetail(id);
      console.log('상품 상세 응답:', response);
      
      // 백엔드 응답을 프론트엔드 구조로 변환
      const transformedProduct = {
        id: response.productId,
        title: response.productName,
        description: response.shortDescription,
        thumbnail: response.thumbnailImageUrl,
        price: response.price,
        discountPrice: response.discountPrice,
        regDate: response.regDate,
        countryName: response.countryName,
        hashtags: response.hashtags || [],
        images: response.images || [],
        stocks: (response.stocks || []).map((s) => ({
          ...s,
          startDate: normalizeYmd(s.startDate),
        })),
        rating: response.averageReviewStar,
        reviews: response.reviews || [],
        reviewStats: response.reviewStats,
        like: response.isLiked,
        sellerId: response.sellerId || response.memberId || response.userId,
        sellerName: response.sellerName,
        email: response.email,
        phoneNum: response.phoneNum
      };
      
      setProduct(transformedProduct);
      setIsLiked(transformedProduct.like);
      
      // 재고가 있는 가장 빠른 날짜를 기본 선택
      if (transformedProduct.stocks.length > 0) {
        // 오늘 날짜 (한국 시간 기준)
        const today = new Date();
        const todayString = getKoreaDateString(today);
        
        // 재고가 있는 날짜들을 오늘 이후로 필터링하고 정렬
        const availableDates = transformedProduct.stocks
          .map(stock => normalizeYmd(stock.startDate))
          .filter((date, index, self) => self.indexOf(date) === index)
          .filter(date => {
            return date >= todayString;
          })
          .sort();
        
        if (availableDates.length > 0) {
          // 가장 빠른 날짜 선택
          const earliestDate = availableDates[0];
          setSelectedDate(earliestDate);
          
          // 해당 날짜의 첫 번째 재고 옵션을 기본 선택
          const firstStockForDate = transformedProduct.stocks.find(stock => stock.startDate === earliestDate);
          if (firstStockForDate) {
            setSelectedStock(firstStockForDate);
          }
        } else {
          // 오늘 이후 재고가 없는 경우 첫 번째 재고 선택
          setSelectedStock(transformedProduct.stocks[0]);
          setSelectedDate(transformedProduct.stocks[0].startDate);
        }
        
        // 재고 옵션별 수량 초기화
        const initialCounts = {};
        transformedProduct.stocks.forEach(stock => {
          const key = `${stock.optionName}-${stock.startDate}`;
          initialCounts[key] = 0;
        });
        setStockCounts(initialCounts);
      }
      
    } catch (error) {
      console.error('상품 상세 조회 실패:', error);
      
      let errorMessage = '상품 상세 정보를 불러오는데 실패했습니다.';
      
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        
        if (status === 404) {
          errorMessage = '상품을 찾을 수 없습니다. (404)';
        } else if (status === 403) {
          errorMessage = '접근 권한이 없습니다. (403)';
        } else if (status === 500) {
          errorMessage = '서버 내부 오류가 발생했습니다. (500)';
        } else {
          errorMessage = `서버 오류: ${status} - ${statusText}`;
        }
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
      } else {
        errorMessage = `요청 오류: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 상품 정보 로드
  useEffect(() => {
    if (id) {
      loadProductDetail();
    }
  }, [id]);

  const handleToggleLike = async () => {
    try {
      console.log('좋아요 토글 중...', { productId: id });
      
      // 백엔드에 토글 요청
      await toggleLike(id);
      console.log('좋아요 토글 완료');
      
      // 로컬 상태 업데이트
      setIsLiked(!isLiked);
      
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

  const updateStockCount = (optionName, startDate, change) => {
    const key = `${optionName}-${startDate}`;
    setStockCounts(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + change),
    }));
  };

  // 날짜 변경 핸들러
  const handleDateChange = (newDate) => {
    // 지난 날짜인지 확인 (한국 시간 기준)
    const today = new Date();
    const todayString = getKoreaDateString(today);
    
    // 날짜 문자열을 직접 비교 (한국 시간 기준)
    if (newDate < todayString) {
      console.log('지난 날짜는 선택할 수 없습니다.');
      return;
    }
    
    setSelectedDate(newDate);
    // 날짜 변경 시 옵션 개수 초기화
    if (product?.stocks) {
      const initialCounts = {};
      product.stocks.forEach(stock => {
        const key = `${stock.optionName}-${stock.startDate}`;
        initialCounts[key] = 0;
      });
      setStockCounts(initialCounts);
    }
  };

  // 재고가 있는 날짜들만 필터링
  const availableDates = product?.stocks
    ? product.stocks
        .map(stock => normalizeYmd(stock.startDate))
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort()
    : [];

  const totalCount = Object.values(stockCounts).reduce((sum, count) => sum + count, 0);
  const totalPrice = product?.stocks ? product.stocks.reduce((sum, stock) => {
    const key = `${stock.optionName}-${stock.startDate}`;
    const count = stockCounts[key] || 0;
    return sum + ((stock.discountPrice || stock.price) * count);
  }, 0) : 0;

  // 로딩 상태
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gradient-to-r from-blue-600 to-purple-600"></div>
          <p className="mt-2 text-gray-600">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => navigate('/commerce')}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 상품이 없는 경우
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        <div className="text-center py-8">
          <p className="text-gray-600">상품을 찾을 수 없습니다.</p>
          <button 
            onClick={() => navigate('/commerce')}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="max-w-4xl mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 flex flex-col gap-8">
        {/* 썸네일 이미지와 상품 정보를 3:7 비율로 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* 썸네일 이미지 - 왼쪽 (3/10) */}
          <div className="lg:col-span-3 relative bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-4">
            <img 
              src={product.thumbnail || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png'} 
              alt={product.title} 
              className="w-full aspect-square object-cover rounded-xl shadow-lg"
              onError={(e) => {
                e.target.src = 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png';
              }}
            />
            {/* 좋아요 버튼 */}
            <button
              onClick={handleToggleLike}
              className={`absolute top-6 right-6 p-3 rounded-full transition-all duration-300 hover:scale-110 ${
                isLiked 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg' 
                  : 'bg-white/90 text-gray-600 hover:bg-red-50 shadow-md'
              }`}
            >
              {isLiked ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* 상품 정보 - 오른쪽 (7/10) */}
          <div className="lg:col-span-7 flex flex-col gap-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6">
            {/* 제목과 좋아요, 국가 정보를 한 줄에 배치 */}
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex-1 min-w-0 mr-4 break-words">
                {product.title}
              </h2>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm border border-gray-200/30 rounded-full px-3 py-1 shadow-sm">❤️ {isLiked ? '1' : '0'}</span>
                <span className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm border border-gray-200/30 rounded-full px-3 py-1 shadow-sm">📍 {product.countryName}</span>
              </div>
            </div>
            
            {/* 가격 정보 - 박스 하단에 배치 */}
            <div className="mt-auto pt-4 border-t border-gray-200/30">
              {product.discountPrice && product.discountPrice !== product.price ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 line-through text-lg">{product.price?.toLocaleString()}원</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">{product.discountPrice?.toLocaleString()}원</span>
                </div>
              ) : (
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{product.price?.toLocaleString()}원</span>
              )}
            </div>
          </div>
        </div>

        {/* 해시태그 */}
        {product?.hashtags && product.hashtags.length > 0 && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6 mb-8">
            <h4 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">해시태그</h4>
            <div className="flex flex-wrap gap-2">
              {product.hashtags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 cursor-pointer shadow-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 상품 설명 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6 mb-8">
          <h4 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">상품 설명</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
        </div>

        {/* 재고 옵션 선택 섹션 */}
        {product?.stocks && product.stocks.length > 0 && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 날짜 선택 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">날짜 선택</h4>
                <Calendar 
                  availableDates={availableDates} 
                  selectedDate={selectedDate} 
                  onDateSelect={handleDateChange} 
                />
              </div>

              {/* 재고 옵션 선택 */}
              <div className="space-y-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6">
                <h4 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">옵션 선택</h4>
                {selectedDate && product?.stocks ? (
                  <div className="space-y-4">
                    {product.stocks
                      .filter(stock => stock.startDate === selectedDate)
                      .map((stock) => (
                        <div key={stock.optionName} className="flex items-center justify-between p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl shadow-md">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{stock.optionName}</h5>
                            <div className="text-sm text-gray-600 mb-1">재고: {stock.stock}개</div>
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                              {stock.discountPrice && stock.discountPrice !== stock.price ? (
                                <div>
                                  <span className="text-gray-400 line-through text-sm">{stock.price.toLocaleString()}원</span>
                                  <div className="text-lg">{stock.discountPrice.toLocaleString()}원</div>
                                </div>
                              ) : (
                                <div className="text-lg">{stock.price.toLocaleString()}원</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => updateStockCount(stock.optionName, stock.startDate, -1)}
                              className="w-10 h-10 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-300 shadow-sm"
                              disabled={(stockCounts[`${stock.optionName}-${stock.startDate}`] || 0) === 0}
                            >-</button>
                            <span className="w-12 text-center font-medium">{stockCounts[`${stock.optionName}-${stock.startDate}`] || 0}</span>
                            <button
                              onClick={() => updateStockCount(stock.optionName, stock.startDate, 1)}
                              className="w-10 h-10 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-300 shadow-sm"
                              disabled={(stockCounts[`${stock.optionName}-${stock.startDate}`] || 0) >= stock.stock}
                            >+</button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    날짜를 선택하면 옵션을 선택할 수 있습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 선택된 옵션의 총 가격 표시 */}
            {totalCount > 0 && (
              <div className="mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">총 결제 금액:</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>
            )}

            {/* 예약진행 버튼 */}
            <div className="flex gap-3 mt-6">
              <button
                className={`px-6 py-3 rounded-xl font-semibold w-full transition-all duration-300 ${
                  totalCount === 0 || !selectedDate
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                }`}
                onClick={() => {
                  if (totalCount > 0 && selectedDate) {
                    const selectedOptions = product.stocks.filter(stock => (stockCounts[`${stock.optionName}-${stock.startDate}`] || 0) > 0);
                    const optionsParam = selectedOptions.map(opt => `${opt.optionName}-${opt.startDate}:${stockCounts[`${opt.optionName}-${opt.startDate}`]}`).join(',');
                    navigate(`/commerce/${id}/payment?date=${selectedDate}&options=${optionsParam}&totalPrice=${totalPrice}`);
                  }
                }}
                disabled={totalCount === 0 || !selectedDate}
              >
                예약진행
              </button>
            </div>
          </div>
        )}

        {/* 상품 이미지 갤러리 */}
        {product?.images && product.images.length > 0 && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6">
            <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">상품 이미지</h3>
            
            {/* 이미지들 */}
            <div className="flex flex-col gap-4">
              {product.images.map((image, index) => (
                <div key={index} className="flex justify-center">
                  <img 
                    src={image} 
                    alt={`${product.title} ${index + 1}`}
                    className="w-full max-w-full h-auto object-contain rounded-xl shadow-lg"
                    onError={(e) => {
                      e.target.src = 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 판매자 정보 */}
        <SellerInfo 
          sellerId={product?.sellerId}
          sellerName={product?.sellerName}
          email={product?.email}
          phoneNum={product?.phoneNum}
          productId={product?.id}
          productName={product?.title}
        />

        {/* AI 리뷰 요약 */}
        <ReviewSummary reviewStats={product?.reviewStats} />

        {/* 리뷰 목록 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">상품 후기</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {product?.reviews && product.reviews.length === 0 ? (
              <li className="text-gray-400">아직 후기가 없습니다.</li>
            ) : (
              product?.reviews?.map((review, idx) => {
                // 별점이 숫자가 아닌 경우 기본값 설정
                const rating = typeof review.rating === 'number' ? review.rating : 
                             typeof review.reviewStar === 'number' ? review.reviewStar : 0;
                
                return (
                  <li key={idx} className="border-b border-gray-200/30 py-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {review.nickName || review.user || review.userName || '익명'}
                      </span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="text-sm text-gray-600 ml-1">({rating}/5)</span>
                      </div>
                    </div>
                    <span className="text-gray-700">
                      {review.comment || review.content || '리뷰 내용이 없습니다.'}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* 상품 등록일 */}
        <div className="border-t border-gray-200/30 pt-4 bg-white/40 backdrop-blur-sm rounded-xl p-4">
          <div className="text-sm text-gray-500">
            상품 등록일: {product?.regDate ? new Date(product.regDate).toLocaleDateString('ko-KR') : ''}
          </div>
        </div>
      </section>

      {/* 뒤로가기 버튼 - 왼쪽 하단에 고정 */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="flex justify-start">
          <button
            onClick={() => navigate('/commerce')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            투어 상품 목록으로
          </button>
        </div>
      </div>
    </>
  );
};

export default CommerceDetail;

