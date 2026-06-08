import axiosInstance from './mainApi';
import { getCookie } from '../util/cookieUtil';

// 주문 생성
export const createOrder = async (productId, orderData) => {
  try {
    const member = getCookie("member");
    
    if (!member || !member.accessToken) {
      throw new Error("로그인이 필요합니다.");
    }

    const response = await axiosInstance.post(`/api/orders/${productId}`, orderData);
    return response.data;
  } catch (error) {
    console.error('주문 생성 실패:', error);
    
    if (error.response?.status === 401) {
      throw new Error('로그인이 필요합니다.');
    }

    if (error.response?.status === 429) {
      throw new Error(error.response?.data?.message || '요청이 많아 잠시 후 다시 시도해주세요.');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('주문 생성에 실패했습니다.');
  }
};

// 관리자 주문 목록 조회
export const getAdminOrders = async (params = {}) => {
  try {
    const member = getCookie("member");
    
    if (!member || !member.accessToken) {
      throw new Error("로그인이 필요합니다.");
    }

    // 쿼리 파라미터 구성
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.size !== undefined) queryParams.append('size', params.size);
    if (params.sort !== undefined) queryParams.append('sort', params.sort);
    if (params.paymentMethod !== undefined) queryParams.append('paymentMethod', params.paymentMethod);
    if (params.keyword !== undefined) queryParams.append('keyword', params.keyword);
    if (params.orderStatus !== undefined) queryParams.append('orderStatus', params.orderStatus);

    const url = `/api/admin/orders/me${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('관리자 주문 목록 조회 실패:', error);
    
    if (error.response?.status === 403) {
      console.error('403 Forbidden - 권한이 없습니다. 관리자 권한이 필요합니다.');
      throw new Error('관리자 권한이 필요합니다.');
    }
    
    if (error.response?.status === 401) {
      console.error('401 Unauthorized - 로그인이 필요합니다.');
      throw new Error('로그인이 필요합니다.');
    }
    
    throw error;
  }
};

// 주문 상세 조회
export const getOrderDetail = async (orderId) => {
  try {
    const response = await axiosInstance.get(`/api/admin/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('주문 상세 조회 실패:', error);
    throw error;
  }
}; 