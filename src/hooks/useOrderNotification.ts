import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";

/**
 * 주문 완료 WebSocket 알림을 구독하는 훅.
 *
 * - 백엔드에서 사용자별 채널로 메시지 발행:
 *   redisMessageBroker.publishToUserAfterCommit(email, "주문이 완료되었습니다. ...");
 * - STOMP 구독 경로 예시는 /topic/orders.{email} 로 사용한다.
 *   (실제 백엔드 STOMP 엔드포인트 설정에 맞게 dest를 수정해서 사용하면 된다.)
 */
export function useOrderNotification(email: string | null) {
  const [message, setMessage] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!email) {
      return;
    }

    const client = new Client({
      // 백엔드 WebSocket 엔드포인트 URL에 맞게 수정
      brokerURL: "ws://localhost:8080/ws", // 예시: Spring STOMP 엔드포인트
      reconnectDelay: 5000,
      debug: () => {
        // 필요 시 콘솔 로그 활성화
      },
    });

    client.onConnect = () => {
      // 사용자별 주문 알림 구독 경로 (백엔드에서 convertAndSend 대상과 맞춰야 함)
      const destination = `/topic/orders.${email}`;

      client.subscribe(destination, (frame) => {
        const body = frame.body || "";
        setMessage(body || "주문이 완료되었습니다.");
      });
    };

    client.onStompError = () => {
      // 에러 로그가 필요하면 여기서 처리
    };

    client.activate();
    clientRef.current = client;

    return () => {
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [email]);

  const clear = () => setMessage(null);

  return { message, clear };
}

