import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function useLivraisonTracking(commandeId, onPosition, onStatut) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!commandeId) return;
    const ws = new WebSocket(`${WS_BASE}/ws/livraison/${commandeId}/`);
    wsRef.current = ws;

    ws.onopen = () => console.log(`[WS] Tracking commande ${commandeId} connecté`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'position_update' && onPosition) {
        onPosition({ lat: data.latitude, lng: data.longitude, vitesse: data.vitesse, eta: data.eta });
      }
      if (data.type === 'statut_update' && onStatut) {
        onStatut(data.statut);
      }
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [commandeId, onPosition, onStatut]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}

export function useNotificationsWS(onNotification) {
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/notifications/`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification' && onNotification) {
        onNotification(data.data);
      }
    };

    ws.onclose = () => setTimeout(() => {
      const newWs = new WebSocket(`${WS_BASE}/ws/notifications/`);
      wsRef.current = newWs;
    }, 3000);

    return () => ws.close();
  }, [onNotification]);
}
