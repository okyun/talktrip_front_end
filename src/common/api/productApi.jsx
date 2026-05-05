import axiosInstance from './mainApi';

// 상품 목록 조회
export const getProductList = async (params = {}) => {
  try {
    // URLSearchParams를 사용하여 중복된 sort 파라미터를 정확히 전송
    const searchParams = new URLSearchParams();
    searchParams.append('page', params.page || 0);
    searchParams.append('size', params.size || 9);
    searchParams.append('keyword', params.keyword || '');
    searchParams.append('sort', params.sort || 'updatedAt');
    searchParams.append('sort', params.sortOrder || 'desc');
    
    // 국가: ISO country_id 우선 (commerce 국가 버튼). 없으면 기존 countryName(한글 등).
    if (params.countryId) {
      searchParams.append('countryId', params.countryId);
    } else if (params.country && params.country !== '전체') {
      searchParams.append('countryName', params.country);
    }
    
    const response = await axiosInstance.get(`/api/products?${searchParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('상품 목록 조회 실패:', error);
    throw error;
  }
};

// AI 검색 상품 조회
export const aiSearchProducts = async (query) => {
  try {
    const response = await axiosInstance.get('/api/products/aisearch', {
      params: {
        question: query
      }
    });
    return response.data;
  } catch (error) {
    console.error('AI 검색 실패:', error);
    throw error;
  }
};

// 상품 상세 조회
export const getProductDetail = async (productId, memberId) => {
  try {
    const response = await axiosInstance.get(`/api/products/${productId}`, {
      params: memberId != null ? { memberId } : undefined,
    });
    return response.data;
  } catch (error) {
    console.error('상품 상세 조회 실패:', error);
    throw error;
  }
};

// 좋아요 토글 (추가/삭제 통합)
export const toggleLike = async (productId) => {
  try {
    const response = await axiosInstance.post(`/api/products/${productId}/like`);
    return response.data;
  } catch (error) {
    console.error('좋아요 토글 실패:', error);
    throw error;
  }
};

/** 목표 상태로 설정(멱등). UI가 다음 상태를 알 때 재시도에 유리 */
export const setLikeDesiredState = async (productId, liked) => {
  try {
    const response = await axiosInstance.put(`/api/products/${productId}/like`, { liked });
    return response.data;
  } catch (error) {
    console.error('좋아요 상태 설정 실패:', error);
    throw error;
  }
};

// 좋아요 목록 조회
export const getLikedProducts = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/api/me/likes', {
      params: {
        page: params.page || 0,
        size: params.size || 9
      }
    });
    return response.data;
  } catch (error) {
    console.error('좋아요 목록 조회 실패:', error);
    throw error;
  }
};

// 내 리뷰 목록 조회
export const getMyReviews = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/api/me/reviews', {
      params: {
        page: params.page || 0,
        size: params.size || 9
      }
    });
    return response.data;
  } catch (error) {
    console.error('내 리뷰 목록 조회 실패:', error);
    throw error;
  }
};

// 리뷰 수정
export const updateReview = async (reviewId, reviewData) => {
  try {
    console.log('리뷰 수정 요청:', { reviewId, reviewData });
    
    // ReviewRequest DTO에 맞는 형식으로 데이터 준비
    const requestData = {
      comment: reviewData.comment.trim(),
      reviewStar: parseFloat(reviewData.reviewStar) // float 타입으로 변환
    };
    
    console.log('전송할 데이터:', requestData);
    
    // PUT 메서드로 변경하여 /api/reviews/{reviewId} 엔드포인트 사용
    const response = await axiosInstance.put(`/api/reviews/${reviewId}`, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('리뷰 수정 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('리뷰 수정 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    
    // 더 구체적인 에러 메시지 제공
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error('로그인이 필요합니다.');
      } else if (status === 403) {
        throw new Error('리뷰를 수정할 권한이 없습니다.');
      } else if (status === 404) {
        throw new Error('수정하려는 리뷰를 찾을 수 없습니다.');
      } else if (status === 400) {
        const message = error.response.data?.message || '잘못된 요청입니다.';
        throw new Error(message);
      } else if (status >= 500) {
        throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
    
    throw error;
  }
};

// 리뷰 삭제
export const deleteReview = async (reviewId) => {
  try {
    const response = await axiosInstance.delete(`/api/reviews/${reviewId}`);
    return response.data;
  } catch (error) {
    console.error('리뷰 삭제 실패:', error);
    throw error;
  }
};

// 리뷰 작성 폼 데이터 조회 (상품 정보 포함)
export const getReviewFormData = async (productId) => {
  try {
    const response = await axiosInstance.get(`/api/products/${productId}/reviews/form`);
    return response.data;
  } catch (error) {
    console.error('리뷰 작성 폼 데이터 조회 실패:', error);
    throw error;
  }
};

// 주문 기반 리뷰 작성 폼 데이터 조회
export const getOrderReviewFormData = async (orderId) => {
  try {
    const response = await axiosInstance.get(`/api/orders/${orderId}/review/form`);
    return response.data;
  } catch (error) {
    console.error('주문 기반 리뷰 작성 폼 데이터 조회 실패:', error);
    throw error;
  }
};

// 리뷰 수정 폼 데이터 조회 (상품 정보 포함)
export const getReviewEditFormData = async (reviewId) => {
  try {
    console.log('리뷰 수정 폼 데이터 조회 요청:', reviewId);
    
    const response = await axiosInstance.get(`/api/reviews/${reviewId}/form`);
    
    console.log('리뷰 수정 폼 데이터 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('리뷰 수정 폼 데이터 조회 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 리뷰 작성
export const createReview = async (productId, reviewData) => {
  try {
    console.log('리뷰 작성 요청:', { productId, reviewData });
    
    // API 문서에 맞는 요청 형식으로 데이터 준비
    const requestData = {
      comment: reviewData.comment,
      reviewStar: parseInt(reviewData.reviewStar) // 숫자로 확실히 변환
    };
    
    console.log('전송할 데이터:', requestData);
    
    const response = await axiosInstance.post(`/api/products/${productId}/reviews`, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('리뷰 작성 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('리뷰 작성 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 주문 기반 리뷰 작성
export const createOrderReview = async (orderId, reviewData) => {
  try {
    console.log('주문 기반 리뷰 작성 요청:', { orderId, reviewData });
    
    // API 문서에 맞는 요청 형식으로 데이터 준비
    const requestData = {
      comment: reviewData.comment,
      reviewStar: parseInt(reviewData.reviewStar) // 숫자로 확실히 변환
    };
    
    console.log('전송할 데이터:', requestData);
    
    const response = await axiosInstance.post(`/api/orders/${orderId}/review`, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('주문 기반 리뷰 작성 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('주문 기반 리뷰 작성 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};
