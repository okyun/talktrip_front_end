import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { getCookie } from "../common/util/cookieUtil";

/** 메인 백엔드 STOMP 네이티브 엔드포인트 — `/ws`는 SockJS용이라 stompjs 직접 연결에 쓰면 안 됨 */
function buildOrderStompWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/websocket`;
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

    const client = new Client({
      webSocketFactory: () => new WebSocket(buildOrderStompWsUrl()),
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

    return () => {
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [email]);

  const clear = () => setMessage(null);

  return { message, clear };
}
