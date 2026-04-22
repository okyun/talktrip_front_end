import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { getCookie } from "../common/util/cookieUtil";

/**
 * 주문 알림 STOMP 엔드포인트.
 *
 * - 개발: Vite 프록시(`/ws` -> 8080)를 타도록 상대경로 사용
 * - 운영: 동일 오리진(nginx)에서 `/ws`로 프록시된다고 가정
 */
function getOrderSockJsUrl(): string {
  return "/ws";
}

function makeConnectHeaders(): Record<string, string> {
  try {
    const fromLs = window.localStorage?.getItem("accessToken");
    if (fromLs) return { Authorization: `Bearer ${fromLs}` };
  } catch {
    /* ignore */
  }
  const member = getCookie("member");
  if (member?.accessToken) return { Authorization: `Bearer ${member.accessToken}` };
  return {};
}

/**
 * 주문 완료 WebSocket 알림을 구독하는 훅.
 *
 * - 백엔드에서 사용자별 채널로 메시지 발행:
 *   redisMessageBroker.publishToUserAfterCommit(email, "주문이 완료되었습니다. ...");
 * - STOMP 구독 경로 예시는 /topic/orders.{email} 로 사용한다.
 */
export function useOrderNotification(email: string | null) {
  const [message, setMessage] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!email) {
      return;
    }

    let isMounted = true;
    let disconnecting = false;

    const activate = async () => {
      const SockJS = (await import("sockjs-client")).default;
      const socket = new SockJS(getOrderSockJsUrl(), null, {
        transports: ["websocket", "xhr-streaming", "xhr-polling"],
      });

      const client = new Client({
        // SockJS 인스턴스는 STOMP가 요구하는 WebSocket 인터페이스를 만족
        webSocketFactory: () => socket as any,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        connectHeaders: makeConnectHeaders(),
        beforeConnect: () => {
          client.connectHeaders = makeConnectHeaders();
        },
        debug: () => {
          /* 필요 시 활성화 */
        },
      });

      client.onConnect = () => {
        if (!isMounted) return;

        const destination = `/topic/orders.${email}`;
        client.subscribe(destination, (frame) => {
          const body = frame.body || "";
          setMessage(body || "주문이 완료되었습니다.");
        });
      };

      client.onStompError = () => {
        /* 필요 시 로깅 */
      };

      client.activate();
      clientRef.current = client;
    };

    activate().catch(() => {
      // 연결 실패 시엔 stompjs 내부 재연결 로직이 없으므로, 다음 렌더 사이클에서 재시도되게 둔다.
    });

    return () => {
      isMounted = false;
      if (!disconnecting) {
        disconnecting = true;
      }
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [email]);

  const clear = () => setMessage(null);

  return { message, clear };
}
