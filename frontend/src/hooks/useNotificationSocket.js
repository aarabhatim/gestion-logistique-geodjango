import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook pour se connecter au WebSocket Django Channels des notifications.
 *
 * Le serveur pousse des messages au format :
 *   { type: 'notification', data: { id, titre, message, type_notif, commande_id, date_creation } }
 *
 * Le hook gère :
 *  - reconnexion automatique avec backoff exponentiel
 *  - heartbeat (ping toutes les 30s pour détecter une coupure)
 *  - callback `onNotification` pour chaque notif reçue
 *
 * Usage :
 *   useNotificationSocket({
 *     onNotification: (notif) => showToast(notif),
 *   });
 */

const WS_BASE = (
  import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000`
    : 'ws://localhost:8000')
);

const getToken = () => {
  try {
    const stored = localStorage.getItem('delivermap-auth');
    if (!stored) return null;
    const { state } = JSON.parse(stored);
    return state?.accessToken || null;
  } catch {
    return null;
  }
};

export default function useNotificationSocket({ onNotification, enabled = true } = {}) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const onNotifRef = useRef(onNotification);

  // Garde la callback la plus récente sans re-déclencher la reconnexion
  useEffect(() => { onNotifRef.current = onNotification; }, [onNotification]);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(1000, 'cleanup'); } catch { /* ignore */ }
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) {
      // Pas de session → on attend (le composant doit relancer connect après login)
      return;
    }

    const url = `${WS_BASE}/ws/notifications/?token=${encodeURIComponent(token)}`;
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.warn('[Notif WS] Création impossible :', err);
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      setConnected(true);
      // Heartbeat (Django Channels ignore les pings textuels mais ça maintient la TCP)
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch { /* ignore */ }
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'notification' && msg.data) {
          if (typeof onNotifRef.current === 'function') {
            onNotifRef.current(msg.data);
          }
        }
      } catch (err) {
        console.warn('[Notif WS] Message non-JSON :', event.data);
      }
    };

    ws.onerror = () => {
      // Pas de log spammeur — l'erreur déclenche un close juste après
    };

    ws.onclose = (ev) => {
      setConnected(false);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      // Code 1000 = fermeture volontaire (ne pas reconnecter)
      if (ev.code !== 1000) scheduleReconnect();
    };
  }, [enabled]);

  const scheduleReconnect = useCallback(() => {
    retryRef.current = Math.min(retryRef.current + 1, 6);
    const delay = Math.min(30000, 1000 * 2 ** retryRef.current); // backoff exponentiel max 30s
    reconnectTimerRef.current = setTimeout(connect, delay);
  }, [connect]);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }
    connect();
    return cleanup;
  }, [enabled, connect, cleanup]);

  return { connected };
}
