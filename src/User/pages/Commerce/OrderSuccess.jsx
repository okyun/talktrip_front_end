import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const paymentKey = searchParams.get("paymentKey");

    if (!orderId || !amount || !paymentKey) {
      navigate("/commerce/order/fail?message=결제 승인에 필요한 정보가 없습니다.&code=INVALID_REQUEST");
      return;
    }

    const requestData = {
      orderId,
      amount: Number(amount),
      paymentKey,
    };

    async function confirm() {
      try {
        const response = await fetch("/api/tosspay/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        const json = await response.json();

        if (!response.ok) {
          navigate(
              `/commerce/order/fail?message=${encodeURIComponent(json.message)}&code=${encodeURIComponent(json.code)}`
          );
          return;
        }

        setIsConfirmed(true);
      } catch (error) {
        console.error("결제 승인 중 오류:", error);
        navigate("/commerce/order/fail?message=결제 승인 중 오류가 발생했습니다.&code=CONFIRM_ERROR");
      } finally {
        setIsLoading(false);
      }
    }

    confirm();
  }, [navigate, searchParams]);

  const handleGoHome = () => {
    navigate("/commerce");
  };

  const handleGoMyPage = () => {
    navigate("/mypage?tab=order");
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">결제 승인 중</h2>
            <p className="text-gray-600">잠시만 기다려주세요...</p>
          </div>
        </div>
    );
  }

  if (!isConfirmed) {
    return null;
  }

  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">결제 완료</h1>
            <p className="text-blue-100">안전하게 결제가 처리되었습니다</p>
          </div>

          <div className="px-6 py-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">주문번호</span>
                <span className="text-gray-900 font-mono text-sm">{searchParams.get("orderId")}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">결제 금액</span>
                <span className="text-2xl font-bold text-blue-600">
                {Number(searchParams.get("amount")).toLocaleString()}원
              </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">결제 수단</span>
                <span className="text-gray-900">
                {searchParams.get("paymentType") === "NORMAL"
                    ? "일반결제"
                    : searchParams.get("paymentType")}
              </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 font-medium">결제 상태</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                결제 완료
              </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700">
                <p className="font-medium">결제가 성공적으로 완료되었습니다.</p>
                <p className="mt-1">주문 내역은 마이페이지에서 확인하실 수 있습니다.</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                  onClick={handleGoMyPage}
                  className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                주문 내역 확인
              </button>
              <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                쇼핑 계속하기
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}

export default OrderSuccess;