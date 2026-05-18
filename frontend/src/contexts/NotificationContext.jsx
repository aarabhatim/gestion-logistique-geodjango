import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  Bell, CheckCircle, AlertTriangle, Info, X, Package, Truck, DollarSign,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import useNotificationSocket from '../hooks/useNotificationSocket';

const NotificationContext = createContext(null);

const TYPE_STYLE = {
  INFO:      { color: '#4f8cff', bg: 'rgba(79,140,255,0.15)',  Icon: Info },
  SUCCESS:   { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  Icon: CheckCircle },
  WARNING:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  Icon: AlertTriangle },
  DANGER:    { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   Icon: AlertTriangle },
  COMMANDE:  { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', Icon: Package },
  LIVRAISON: { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  Icon: Truck },
  PAIEMENT:  { color: '#22d3ee', bg: 'rgba(34,211,238,0.15)',  Icon: DollarSign },
};

// ─── Composant Toast ─────────────────────────────────────────────────────────
const ToastItem = ({ notif, onDismiss }) => {
  const style = TYPE_STYLE[notif.type_notif] || TYPE_STYLE.INFO;
  const Icon = style.Icon;
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => onDismiss(notif._localId), 6000);
    return () => clearTimeout(timeoutRef.current);
  }, [notif._localId, onDismiss]);

  return (
    <div style={{
      background: 'var(--bg-elevated, rgba(20,26,42,0.95))',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${style.color}40`,
      borderLeft: `4px solid ${style.color}`,
      borderRadius: 14,
      padding: '12px 14px',
      minWidth: 320, maxWidth: 380,
      boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 20px ${style.color}30`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
      animation: 'slideIn 0.35s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Barre de progression auto-dismiss */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2,
        background: style.color, opacity: 0.6,
        animation: 'shrinkBar 6s linear forwards',
      }} />

      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: style.bg, color: style.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
          {notif.titre}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
          {notif.message}
        </div>
      </div>
      <button onClick={() => onDismiss(notif._localId)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', padding: 4, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Fermer">
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────
export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const idCounter = useRef(0);

  const push = useCallback((notif) => {
    const _localId = ++idCounter.current;
    setToasts(t => [...t, { ...notif, _localId }]);
    setUnreadCount(c => c + 1);
    // Son discret optionnel (désactivé par défaut)
    try {
      const prefs = JSON.parse(localStorage.getItem('delivermap-prefs') || '{}');
      if (prefs.notif_son) {
        // Mini bip via Web Audio (pas de fichier externe)
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.05;
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      }
    } catch { /* ignore */ }
  }, []);

  const dismiss = useCallback((localId) => {
    setToasts(t => t.filter(x => x._localId !== localId));
  }, []);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  // Hook WebSocket connecté seulement si user authentifié
  const { connected } = useNotificationSocket({
    enabled: !!user,
    onNotification: push,
  });

  return (
    <NotificationContext.Provider value={{ push, dismiss, unreadCount, clearUnread, connected }}>
      {children}
      {/* Container fixe des toasts */}
      <div style={{
        position: 'fixed', top: 90, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(notif => (
          <div key={notif._localId} style={{ pointerEvents: 'auto' }}>
            <ToastItem notif={notif} onDismiss={dismiss} />
          </div>
        ))}
      </div>

      {/* Animation locale (pour la barre de progression) */}
      <style>{`
        @keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications doit être utilisé dans <NotificationProvider>');
  return ctx;
};

export default NotificationContext;
