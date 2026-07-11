import { useEffect, useRef, useCallback } from 'react';

type WSEventHandler = (event: Record<string, unknown>) => void;

const WS_URL = `ws://${window.location.hostname}:3712/ws`;

/**
 * Singleton WebSocket connection with auto-reconnect
 */
class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<WSEventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.debug('[WS] Connected');
        this.reconnectTimer = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, ...payload } = data;
          if (type) {
            const handlers = this.handlers.get(type);
            if (handlers) {
              handlers.forEach((fn) => fn(payload));
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        console.debug('[WS] Disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(type: string, handler: WSEventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  unsubscribe(type: string, handler: WSEventHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }
}

const wsClient = new WSClient(WS_URL);

/**
 * Hook to use WebSocket subscriptions in components
 */
export function useWebSocket() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      wsClient.connect();
      initialized.current = true;
    }
    return () => {
      // Don't disconnect on unmount — singleton
    };
  }, []);

  const subscribe = useCallback((type: string, handler: WSEventHandler) => {
    wsClient.subscribe(type, handler);
    return () => wsClient.unsubscribe(type, handler);
  }, []);

  const send = useCallback((message: Record<string, unknown>) => {
    wsClient.send(message);
  }, []);

  return { subscribe, send, wsClient };
}

export { wsClient };
