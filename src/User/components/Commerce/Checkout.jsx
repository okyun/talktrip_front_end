// Checkout.jsx
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

const isValidTossClientKey = (key) =>
    typeof key === "string" &&
    /^(test|live)_(gck|ck)_[0-9A-Za-z_-]+$/.test(key);

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [widgets, setWidgets] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // URL 파라미터에서 주문 정보 가져오기
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const orderId = searchParams.get('orderId');
    const orderName = searchParams.get('orderName');
    const amount = searchParams.get('amount');
    const customerEmail = searchParams.get('customerEmail');
    const productId = searchParams.get('productId'); // productId 추가

    if (!orderId || !orderName || !amount) {
      setError('주문 정보가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    setOrderInfo({
      orderId,
      orderName,
      amount: parseInt(amount, 10),
      customerEmail,
      productId // productId 추가
    });
    setLoading(false);
  }, [location.search]);

  useEffect(() => {
    async function fetchPaymentWidgets() {
      try {
        console.log('토스 페이먼츠 위젯 초기화 중...');
        if (!isValidTossClientKey(clientKey)) {
          console.error("VITE_TOSS_CLIENT_KEY가 올바르지 않습니다.", { clientKey });
          setError(
            "결제 시스템 설정이 올바르지 않습니다. (Toss ClientKey 형식: test_ck_... 또는 live_ck_...)"
          );
          return;
        }
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({
          // 비회원 결제 시 customerKey: ANONYMOUS
          // 회원 결제 시 고객별 키를 넣으면 됩니다.
          customerKey: ANONYMOUS,
        });
        setWidgets(widgets);
        console.log('토스 페이먼츠 위젯 초기화 완료');
      } catch (error) {
        console.error('토스 페이먼츠 위젯 초기화 실패:', error);
        const msg =
          error instanceof Error ? error.message : String(error ?? '');
        if (
          msg.includes('결제위젯') ||
          msg.includes('API 개별') ||
          msg.includes('payment widget')
        ) {
          setError(
            'VITE_TOSS_CLIENT_KEY에 API 개별 연동 키가 들어가 있습니다. 토스 개발자센터(developers.tosspayments.com) → 내 애플리케이션 → 결제위젯 연동 메뉴의 클라이언트 키로 교체한 뒤, 저장소 루트 .env를 수정하고 개발 서버를 재시작하세요.'
          );
        } else {
          setError('결제 시스템 초기화에 실패했습니다.');
        }
      }
    }

    if (orderInfo) {
      fetchPaymentWidgets();
    }
  }, [orderInfo]);

  useEffect(() => {
    async function renderWidgets() {
      if (!widgets || !orderInfo) return;
      
      try {
        console.log('결제 위젯 렌더링 중...', { amount: orderInfo.amount });
        
        await widgets.setAmount({
          currency: "KRW",
          value: orderInfo.amount,
        });
        
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        
        setReady(true);
        console.log('결제 위젯 렌더링 완료');
      } catch (error) {
        console.error('결제 위젯 렌더링 실패:', error);
        setError('결제 위젯 렌더링에 실패했습니다.');
      }
    }

    renderWidgets();
  }, [widgets, orderInfo]);

  const handleBack = () => {
    navigate(-1); // 이전 페이지로 돌아가기
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">결제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!orderInfo) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">주문 정보를 찾을 수 없습니다.</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">결제</h1>
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← 이전 페이지로 돌아가기
        </button>
      </div>

      {/* 주문 정보 요약 */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 정보 확인</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex justify-between">
            <span>주문 ID:</span>
            <span className="font-medium">{orderInfo.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>주문명:</span>
            <span className="font-medium">{orderInfo.orderName}</span>
          </div>
          <div className="flex justify-between">
            <span>결제 금액:</span>
            <span className="font-bold text-blue-600 text-lg">{orderInfo.amount?.toLocaleString()}원</span>
          </div>
          {orderInfo.customerEmail && (
            <div className="flex justify-between">
              <span>고객 이메일:</span>
              <span className="font-medium">{orderInfo.customerEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* 결제 위젯 */}
      <div className="wrapper">
        <div className="box_section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 방법 선택</h3>
          <div id="payment-method" className="mb-4" />
          <div id="agreement" className="mb-6" />
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
            disabled={!ready}
            onClick={async () => {
              try {
                await widgets.requestPayment({
                  orderId: orderInfo.orderId,
                  orderName: orderInfo.orderName,
                  successUrl: window.location.origin + "/commerce/order/success",
                  failUrl: window.location.origin + "/commerce/order/fail",
                  // 필요한 경우 추가 정보 (ex. 고객명, 전화번호) 넣어주세요
                  // customerName: "홍길동",
                  // customerMobilePhone: "010-1234-5678",
                });
              } catch (error) {
                console.error(error);
                alert("결제 중 오류가 발생했습니다.");
              }
            }}
          >
            {ready ? '결제하기' : '결제 준비 중...'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
