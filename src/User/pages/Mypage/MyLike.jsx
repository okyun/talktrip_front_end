import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLikedProducts } from '../../../common/api/productApi';
import { getAuthHeaders } from '../../../common/util/jwtUtil';
import Pagination from '../../../common/util/Pagination';

const MyLike = () => {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 페이지네이션 설정
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 6;

  // 좋아요 목록 조회
  const loadLikes = async (pageNum = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getLikedProducts({
        page: pageNum,
        size: itemsPerPage
      });
      
      console.log('좋아요 목록 API 응답:', data);
      
      if (data.content) {
        setLikes(data.content);
        setTotalItems(data.totalElements || 0);
      } else if (Array.isArray(data)) {
        setLikes(data);
        setTotalItems(data.length);
      } else {
        setLikes([]);
        setTotalItems(0);
      }
      
    } catch (err) {
      console.error('좋아요 목록 조회 오류:', err);
      if (err.message === '로그인이 필요합니다.') {
        alert('로그인이 필요합니다.');
        navigate('/');
        return;
      }
      setError(err.message);
      setLikes([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadLikes(0);
  }, [navigate]);

  // 페이지 변경 시 API 호출
  const handlePageChange = (newPage) => {
    setPage(newPage);
    const pageIndex = newPage - 1;
    loadLikes(pageIndex);
  };

  // 좋아요 삭제
  const handleUnlike = async (productId) => {
    try {
      const response = await fetch(`/api/products/${productId}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('좋아요 삭제에 실패했습니다.');
      }

      // 성공적으로 삭제된 경우 목록에서 제거
      setLikes(prevLikes => prevLikes.filter(like => like.productId !== productId));
      setTotalItems(prev => prev - 1);
      
      // 페이지가 비어있고 이전 페이지가 있다면 이전 페이지로 이동
      if (likes.length === 1 && page > 1) {
        const newPage = page - 1;
        setPage(newPage);
        loadLikes(newPage - 1);
      }
      
    } catch (err) {
      console.error('좋아요 삭제 오류:', err);
      alert('좋아요 삭제에 실패했습니다.');
    }
  };

  // 상품 상세 페이지로 이동
  const handleProductClick = (productId) => {
    navigate(`/commerce/detail/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">좋아요 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => loadLikes(0)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
         <div className="h-fit bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
               <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            내가 좋아한 상품
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          <p className="text-gray-600 mt-4">마음에 드는 상품들을 모아보세요</p>
        </div>

        {likes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-6">
              <svg className="mx-auto h-20 w-20" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-medium text-gray-900 mb-3">아직 좋아한 상품이 없어요</h3>
            <p className="text-gray-500 mb-8">마음에 드는 상품에 하트를 눌러보세요!</p>
            <button
              onClick={() => navigate('/commerce')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 text-lg"
            >
              쇼핑하러 가기
            </button>
          </div>
        ) : (
          <>
                         {/* 상품 그리드 */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
               {likes.map((like, idx) => (
                 <div
                   key={like.productId ?? like.id ?? idx}
                   className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col relative border border-white/20 hover:scale-105 group"
                 >
                                       <img 
                      src={like.thumbnailImageUrl || 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png'} 
                      alt="썸네일" 
                      className="w-full aspect-square object-cover rounded-t-2xl bg-gray-100 cursor-pointer" 
                      onClick={() => handleProductClick(like.productId)}
                      onError={(e) => {
                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/11573/11573069.png';
                      }}
                    />
                   
                   {/* 좋아요 버튼 */}
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       handleUnlike(like.productId);
                     }}
                     className="absolute top-3 right-3 p-2 rounded-full transition-all duration-300 hover:scale-110 bg-red-500 text-white shadow-lg"
                   >
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                     </svg>
                   </button>
                   
                   <div className="p-6 flex-1 flex flex-col justify-between">
                     <div>
                                               <div className="text-lg font-bold mb-2 cursor-pointer text-gray-900 hover:text-blue-600 transition-all duration-300 line-clamp-1" onClick={() => handleProductClick(like.productId)}>
                          {like.productName}
                        </div>
                       <div className="text-gray-600 text-sm mb-3 line-clamp-2">{like.productDescription || '상품 설명이 없습니다.'}</div>
                     </div>
                     <div className="flex items-center justify-between mt-3">
                       <span className="text-yellow-500 font-bold flex items-center">
                         <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                           <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                         </svg>
                         {like.averageReviewStar > 0 ? like.averageReviewStar.toFixed(1) : '-'}
                       </span>
                                               <div className="text-right">
                          {like.discountPrice && like.discountPrice !== like.price ? (
                            <div>
                              <span className="text-gray-400 line-through text-sm">{like.price?.toLocaleString()}원</span>
                              <div className="text-red-600 font-bold text-lg">{like.discountPrice?.toLocaleString()}원</div>
                            </div>
                          ) : (
                            <span className="text-blue-700 font-bold text-lg">{like.price?.toLocaleString()}원</span>
                          )}
                        </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>

            {/* 페이지네이션 */}
            {totalItems > itemsPerPage && (
              <div className="flex justify-center">
                <Pagination
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  currentPage={page}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyLike;
