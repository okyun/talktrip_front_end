// CommercePayment.jsx
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getProductDetail } from '../../../common/api/productApi';
import { createOrder as createOrderApi } from '../../../common/api/orderApi';
import { getAuthHeaders } from '../../../common/util/jwtUtil';
import { useCustomLogin } from '../../../common/hook/useCustomLogin';

// 한국 시간 기준으로 날짜 문자열 생성 (공통 함수)
const getKoreaDateString = (date) => {
  // 로컬 시간 기준으로 직접 날짜 생성 (시간대 문제 완전 해결)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 달력 컴포넌트 (상품 상세와 동일)
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
    return availableDates.includes(dateString);
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
      onDateSelect(dateString);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold">
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDates.map((date, index) => {
          const dateString = getKoreaDateString(date);
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isSelected = selectedDate === dateString;
          const isAvailable = isAvailableDate(date) && isFutureDate(date);
          const isPast = isPastDate(date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!isAvailable}
              className={`
                p-2 text-sm rounded-lg transition-colors
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                ${isSelected ? 'bg-blue-600 text-white' : ''}
                ${isAvailable && !isSelected ? 'hover:bg-blue-100' : ''}
                ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'}
                ${isAvailable && !isSelected ? 'bg-green-50' : ''}
                ${isPast ? 'text-gray-400 bg-gray-100' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
          <span>재고 있음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span>선택됨</span>
        </div>
      </div>
    </div>
  );
};

const CommercePayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { memberId } = useCustomLogin();

  const [product, setProduct] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [optionCounts, setOptionCounts] = useState({});
  const [initialTotalPrice, setInitialTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState('');

  // 상품 상세 정보 로드
  const loadProductDetail = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('상품 상세 조회 중...', id);
      const response = await getProductDetail(id, memberId);
      console.log('상품 상세 응답:', response);
      
      // 백엔드 응답을 프론트엔드 구조로 변환 (CommerceDetail과 동일한 방식)
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
        stocks: response.stocks || [],
        rating: response.averageReviewStar,
        reviews: response.reviews || [],
        like: response.isLiked
      };
      
      setProduct(transformedProduct);

      // URL 파라미터에서 전달받은 정보 파싱
      const searchParams = new URLSearchParams(location.search);
      const initialDate = searchParams.get('date') || '';
      
      // 초기 날짜 설정 로직
      let finalSelectedDate = '';
      
      if (initialDate) {
        // 오늘 날짜 (한국 시간 기준)
        const today = new Date();
        const todayString = getKoreaDateString(today);
        
        // 날짜 문자열을 직접 비교 (한국 시간 기준)
        if (initialDate >= todayString) {
          finalSelectedDate = initialDate;
        } else {
          console.log('전달된 날짜가 지난 날짜입니다. 가장 빠른 날짜를 선택합니다.');
        }
      }
      
      // 초기 날짜가 없거나 지난 날짜인 경우, 가장 빠른 날짜 선택
      if (!finalSelectedDate && transformedProduct.stocks.length > 0) {
        // 오늘 날짜 (한국 시간 기준)
        const today = new Date();
        const todayString = getKoreaDateString(today);
        
        // 재고가 있는 날짜들을 오늘 이후로 필터링하고 정렬
        const availableDates = transformedProduct.stocks
          .map(stock => stock.startDate)
          .filter((date, index, self) => self.indexOf(date) === index) // 중복 제거
          .filter(date => {
            // 날짜 문자열을 직접 비교 (한국 시간 기준)
            return date >= todayString; // 오늘 포함
          })
          .sort(); // 날짜순 정렬
        
        if (availableDates.length > 0) {
          finalSelectedDate = availableDates[0];
        }
      }
      
      setSelectedDate(finalSelectedDate);

      // URL에서 전달받은 총 금액 정보
      const totalPriceParam = searchParams.get('totalPrice');
      if (totalPriceParam) {
        setInitialTotalPrice(parseInt(totalPriceParam, 10));
      }

      // URL에서 전달받은 옵션 정보 파싱
      const optionsParam = searchParams.get('options');
      const initialOptionCounts = {};
      
             if (optionsParam) {
         // "오전 출발-2024-01-15:2,오후 출발-2024-01-15:1" 형태의 문자열을 파싱
         optionsParam.split(',').forEach(optionStr => {
           const [optionKey, count] = optionStr.split(':');
           if (optionKey && count) {
             initialOptionCounts[optionKey] = parseInt(count, 10);
           }
         });
       } else {
                 // 기본값 설정
         transformedProduct.stocks.forEach(stock => {
           const key = `${stock.optionName}-${stock.startDate}`;
           initialOptionCounts[key] = 0;
         });
      }
      
      setOptionCounts(initialOptionCounts);
      
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadProductDetail();
    }
  }, [id, location.search, memberId]);

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
         // 날짜 변경 시 선택된 날짜의 옵션만 초기화
     if (product?.stocks) {
       setOptionCounts(prev => {
         const newCounts = { ...prev };
         // 선택된 날짜의 옵션들만 초기화
         product.stocks
           .filter(stock => stock.startDate === newDate)
           .forEach(stock => {
             const key = `${stock.optionName}-${stock.startDate}`;
             newCounts[key] = 0;
           });
         return newCounts;
       });
     }
  };

  // 재고가 있는 날짜들만 필터링
  const availableDates = product?.stocks
    ? product.stocks
        .map(stock => stock.startDate)
        .filter((date, index, self) => self.indexOf(date) === index) // 중복 제거
        .sort() // 날짜순 정렬
    : [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => navigate(`/commerce/${id}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            상품 상세로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center py-8">
          <p className="text-gray-600">상품을 찾을 수 없습니다.</p>
          <button 
            onClick={() => navigate('/commerce')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => navigate(`/commerce/${id}`);

  const updateOptionCount = (optionName, startDate, change) => {
    const key = `${optionName}-${startDate}`;
    setOptionCounts(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + change),
    }));
  };

  const totalCount = product.stocks
    .filter(stock => stock.startDate === selectedDate)
    .reduce((sum, stock) => {
      const key = `${stock.optionName}-${stock.startDate}`;
      return sum + (optionCounts[key] || 0);
    }, 0);
  const totalPrice = product.stocks
    .filter(stock => stock.startDate === selectedDate)
    .reduce((sum, stock) => {
      const key = `${stock.optionName}-${stock.startDate}`;
      const count = optionCounts[key] || 0;
      return sum + ((stock.discountPrice || stock.price) * count);
    }, 0);

  const selectedOptions = product.stocks.filter(stock => 
    stock.startDate === selectedDate && (optionCounts[`${stock.optionName}-${stock.startDate}`] || 0) > 0
  );

       // 주문 생성 함수: 백엔드에 주문 생성 요청
   const createOrder = async () => {
     if (totalCount === 0 || !selectedDate) return alert('날짜와 옵션을 모두 선택해주세요.');

     setIsCreatingOrder(true);
     try {
       const orderData = {
           date: selectedDate,
           options: selectedOptions.map(opt => ({
             productOptionId: opt.productOptionId, // 옵션 ID 추가
             optionName: opt.optionName,
             quantity: optionCounts[`${opt.optionName}-${opt.startDate}`],
             price: opt.discountPrice || opt.price, // 실제 결제 가격
             discountPrice: opt.discountPrice,
             startDate: opt.startDate
           })),
           totalPrice: totalPrice,
       };

       console.log('주문 생성 요청 데이터:', orderData);
       const response = await createOrderApi(id, orderData);
       console.log('주문 생성 응답:', response);
       
       // 응답 검증
       if (!response || !response.orderId) {
         throw new Error('주문 생성 응답이 올바르지 않습니다. 응답: ' + JSON.stringify(response));
       }
       
       // 주문명을 상품명으로 설정 (백엔드에서 생성된 주문명 대신)
       const orderName = product.title;
       
       // 주문 생성 성공 후 Checkout 페이지로 이동
       const params = new URLSearchParams({
         orderId: response.orderId,
         orderName: orderName, // 상품명을 주문명으로 사용
         amount: response.totalPrice.toString(),
         customerEmail: response.customerEmail || '',
         productId: id // productId 추가
       });
       
       navigate(`/commerce/checkout?${params.toString()}`);
     } catch (err) {
       console.error('주문 생성 에러:', err);
       console.error('에러 상세 정보:', {
         message: err.message,
         response: err.response,
         status: err.response?.status,
         data: err.response?.data
       });
       alert('주문 생성 중 오류가 발생했습니다: ' + err.message);
     } finally {
       setIsCreatingOrder(false);
     }
   };

  return (
    <section className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">예약 정보 확인</h1>
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← 상품 상세로 돌아가기
        </button>
      </div>

      <div className="flex gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
        {product?.thumbnail ? (
          <img src={product.thumbnail} alt={product.title} className="w-24 h-24 object-cover rounded-lg" 
            onError={(e) => {
              e.target.src = 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png';
            }}
          />
        ) : (
          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{product.title}</h2>
          <p className="text-gray-600 text-sm">{product.description}</p>
        </div>
      </div>

      {/* 재고 옵션 선택 섹션 */}
      {product?.stocks && product.stocks.length > 0 && (
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 날짜 선택 */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">날짜 선택</h4>
              <Calendar
                availableDates={availableDates}
                selectedDate={selectedDate}
                onDateSelect={handleDateChange}
              />
            </div>

            {/* 재고 옵션 선택 */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">옵션 선택</h4>
              {selectedDate && product?.stocks ? (
                <div className="space-y-4">
                  {product.stocks
                    .filter(stock => stock.startDate === selectedDate)
                    .map((stock) => (
                      <div key={stock.optionName} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{stock.optionName}</h5>
                          <div className="text-sm text-gray-600 mb-1">재고: {stock.stock}개</div>
                          <div className="text-blue-600 font-semibold">
                            {stock.discountPrice && stock.discountPrice !== stock.price ? (
                              <div>
                                <span className="text-gray-400 line-through text-sm">{stock.price?.toLocaleString()}원</span>
                                <div className="text-lg">{stock.discountPrice?.toLocaleString()}원</div>
                              </div>
                            ) : (
                              <div className="text-lg">{stock.price?.toLocaleString()}원</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => updateOptionCount(stock.optionName, stock.startDate, -1)}
                            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                            disabled={(optionCounts[`${stock.optionName}-${stock.startDate}`] || 0) === 0}
                          >-</button>
                          <span className="w-12 text-center font-medium">{optionCounts[`${stock.optionName}-${stock.startDate}`] || 0}</span>
                          <button
                            onClick={() => updateOptionCount(stock.optionName, stock.startDate, 1)}
                            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                            disabled={(optionCounts[`${stock.optionName}-${stock.startDate}`] || 0) >= stock.stock}
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

                     {/* 예약 정보 요약 */}
           {totalCount > 0 && (
             <div className="mt-6 p-4 bg-white rounded-lg border mb-4">
               <h4 className="text-lg font-semibold text-gray-900 mb-4">예약 정보 요약</h4>
               <div className="space-y-3 text-gray-700">
                 <div className="flex justify-between">
                   <span>투어 날짜:</span>
                   <span className="font-medium">{selectedDate}</span>
                 </div>
                 <div className="space-y-2">
                   <span className="font-medium">선택한 옵션:</span>
                   {selectedOptions.map((opt, index) => (
                     <div key={`${opt.optionName}-${index}`} className="flex justify-between ml-4">
                       <span>• {opt.optionName}</span>
                       <span className="font-medium">{optionCounts[`${opt.optionName}-${opt.startDate}`]}개</span>
                     </div>
                   ))}
                 </div>
                 {initialTotalPrice > 0 && initialTotalPrice !== totalPrice && (
                   <div className="text-sm text-gray-500 mt-2">
                     * 상세 페이지에서 선택한 금액과 다를 수 있습니다. 현재 계산된 금액이 최종 결제 금액입니다.
                   </div>
                 )}
               </div>
             </div>
           )}

           {/* 선택된 옵션의 총 가격 표시 */}
           {totalCount > 0 && (
             <div className="p-4 bg-white rounded-lg border">
               <div className="flex justify-between items-center">
                 <span className="font-medium text-gray-900">총 결제 금액:</span>
                 <span className="text-2xl font-bold text-blue-600">
                   {totalPrice.toLocaleString()}원
                 </span>
               </div>
             </div>
           )}
        </div>
      )}

      {/* 주문 생성 버튼 */}
      <button
        className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        onClick={createOrder}
        disabled={totalCount === 0 || !selectedDate || isCreatingOrder}
      >
        {isCreatingOrder ? '주문 생성 중...' : '주문 생성 및 결제'}
      </button>
    </section>
  );
};

export default CommercePayment;


