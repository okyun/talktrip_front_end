import axiosInstance from './mainApi';

export const getProductStatsTop = async (limit = 10) => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  const response = await axiosInstance.get(`/api/stats/products/top?${params.toString()}`);
  // axios interceptor가 response를 그대로 반환하거나(response.data 접근 필요),
  // data만 반환하도록 바뀌는 경우(그 자체가 data) 모두 대응
  return response?.data ?? response;
};

// 관리자 상품 클릭 통계 (3분 윈도우, TOP N)
export const getProductClickStats = async (limit = 10) => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  const response = await axiosInstance.get(`/api/stats/products/clicks?${params.toString()}`);
  return response?.data ?? response;
};

// 관리자 상품 목록 조회 (기본)
export const getAdminProducts = async (params = {}) => {
  try {
    console.log('관리자 상품 목록 조회 요청:', params);
    
    // URLSearchParams를 사용하여 파라미터 전송
    const searchParams = new URLSearchParams();
    searchParams.append('page', params.page || 0);
    searchParams.append('size', params.size || 10);
    searchParams.append('sortBy', params.sortBy || 'updatedAt');
    searchParams.append('sortOrder', params.ascending === false ? 'desc' : 'asc');
    
    // 상태 필터 추가
    if (params.status) {
      searchParams.append('status', params.status);
    }
    
    const response = await axiosInstance.get(`/api/admin/products?${searchParams.toString()}`);
    
    console.log('관리자 상품 목록 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 목록 조회 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품 검색
export const searchAdminProducts = async (params = {}) => {
  try {
    console.log('관리자 상품 검색 요청:', params);
    
         // URLSearchParams를 사용하여 파라미터 전송
     const searchParams = new URLSearchParams();
     searchParams.append('keyword', params.keyword || '');
     searchParams.append('page', params.page || 0);
     searchParams.append('size', params.size || 10);
     searchParams.append('sortBy', params.sortBy || 'updatedAt');
     searchParams.append('sortOrder', params.ascending === false ? 'desc' : 'asc');
     
     const response = await axiosInstance.get(`/api/admin/products/search?${searchParams.toString()}`);
    
    console.log('관리자 상품 검색 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 검색 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품 정렬
export const sortAdminProducts = async (params = {}) => {
  try {
    console.log('관리자 상품 정렬 요청:', params);
    
         // URLSearchParams를 사용하여 파라미터 전송
     const searchParams = new URLSearchParams();
     searchParams.append('page', params.page || 0);
     searchParams.append('size', params.size || 10);
     searchParams.append('sortBy', params.sortBy || 'updatedAt');
     searchParams.append('sortOrder', params.ascending === false ? 'desc' : 'asc');
     
     const response = await axiosInstance.get(`/api/admin/products/sort?${searchParams.toString()}`);
    
    console.log('관리자 상품 정렬 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 정렬 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품 상세 조회
export const getAdminProductDetail = async (productId) => {
  try {
    console.log('관리자 상품 상세 조회 요청:', productId);
    
    const response = await axiosInstance.get(`/api/admin/products/${productId}`);
    
    console.log('관리자 상품 상세 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 상세 조회 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품 생성
export const createAdminProduct = async (productData) => {
  try {
    console.log('관리자 상품 생성 요청:', productData);
    
    const response = await axiosInstance.post('/api/admin/products', productData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('관리자 상품 생성 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 생성 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품 수정
export const updateAdminProduct = async (productId, productData) => {
  try {
    console.log('관리자 상품 수정 요청:', { productId, productData });
    
    const response = await axiosInstance.put(`/api/admin/products/${productId}`, productData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('관리자 상품 수정 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 수정 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품 삭제
export const deleteAdminProduct = async (productId) => {
  try {
    console.log('관리자 상품 삭제 요청:', productId);
    
    const response = await axiosInstance.delete(`/api/admin/products/${productId}`);
    
    console.log('관리자 상품 삭제 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 삭제 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품 복구
export const restoreAdminProduct = async (productId) => {
  try {
    console.log('관리자 상품 복구 요청:', productId);
    
    const response = await axiosInstance.post(`/api/admin/products/${productId}/restore`);
    
    console.log('관리자 상품 복구 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 복구 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
};

// 관리자 상품별 리뷰 조회
export const getAdminProductReviews = async (productId, params = {}) => {
  try {
    console.log('관리자 상품 리뷰 조회 요청:', { productId, params });
    
    // URLSearchParams를 사용하여 파라미터 전송
    const searchParams = new URLSearchParams();
    searchParams.append('page', params.page || 0);
    searchParams.append('size', params.size || 10);
    searchParams.append('sortBy', params.sortBy || 'createdAt');
    searchParams.append('sortOrder', params.ascending === false ? 'desc' : 'asc');
    
    const response = await axiosInstance.get(`/api/admin/products/${productId}/reviews?${searchParams.toString()}`);
    
    console.log('관리자 상품 리뷰 조회 응답:', response);
    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('관리자 상품 리뷰 조회 실패:', error);
    console.error('에러 응답:', error.response);
    console.error('에러 상태:', error.response?.status);
    console.error('에러 데이터:', error.response?.data);
    throw error;
  }
}; 