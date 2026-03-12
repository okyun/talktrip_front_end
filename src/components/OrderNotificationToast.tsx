import React, { useEffect } from "react";
import { useOrderNotification } from "../hooks/useOrderNotification";

type OrderNotificationToastProps = {
  email: string | null;
};

/**
 * 주문 완료 알림 토스트 컴포넌트.
 *
 * - 사용 예:
 *   <OrderNotificationToast email={loggedInUserEmail} />
 *
 * - 내부에서 useOrderNotification 훅으로 WebSocket 알림을 구독하고,
 *   메시지가 오면 화면 우측 하단에 토스트를 잠시 보여준다.
 */
export const OrderNotificationToast: React.FC<OrderNotificationToastProps> = ({
  email,
}) => {
  const { message, clear } = useOrderNotification(email);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, 5000);
    return () => clearTimeout(timer);
  }, [message, clear]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        padding: "12px 16px",
        borderRadius: "8px",
        backgroundColor: "#10b981",
        color: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontSize: "14px",
      }}
    >
      {message}
    </div>
  );
};

