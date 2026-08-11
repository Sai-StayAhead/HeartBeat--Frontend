import { useEffect, useRef, useState } from "react";

/**
 * Single WebSocket connection for the whole dashboard (mounted once in
 * AppShell / Dashboard page, not per-widget, so we never open duplicate
 * sockets). Reconnects with backoff on drop; exposes a `status` the UI
 * turns into LIVE / RECONNECTING… / OFFLINE.
 */
export function useHeartbeatSocket(baseUrl, token) {
  const [status, setStatus] = useState("connecting"); // connecting | live | reconnecting | offline
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);
  const attemptRef = useRef(0);
  const closedByUsRef = useRef(false);

  useEffect(() => {
    if (!baseUrl || !token) return;
    closedByUsRef.current = false;

    let reconnectTimer;

    const connect = () => {
      const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws?token=${encodeURIComponent(token)}`;
      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch (_) {
        setStatus("offline");
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("live");
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event) {
            setEvents((prev) => [{ ...data, _receivedAt: Date.now() }, ...prev].slice(0, 50));
          }
        } catch (_) { /* ignore non-JSON pings */ }
      };
      ws.onclose = () => {
        if (closedByUsRef.current) return;
        setStatus(attemptRef.current === 0 ? "reconnecting" : "reconnecting");
        const delay = Math.min(1000 * 2 ** attemptRef.current, 15000);
        attemptRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => { try { ws.close(); } catch (_) {} };
    };

    connect();

    return () => {
      closedByUsRef.current = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [baseUrl, token]);

  return { status, events };
}