import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useI18n } from '../contexts/I18nContext';

/**
 * ClientChat — Chat client ↔ chauffeur (MANQUANT côté client)
 * Connexion WebSocket sur le même endpoint que le chauffeur.
 *
 * Usage dans ClientDashboard.jsx (lors d'une livraison active) :
 *   import ClientChat from '../components/ClientChat';
 *   {commandeEnCours && <ClientChat commandeId={commandeEnCours.id} />}
 *
 * Props :
 *   commandeId  — id de la commande en cours
 *   onClose     — callback pour fermer le chat
 */

const ClientChat = ({ commandeId, onClose }) => {
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const userId = useRef(null);

  // Récupérer l'ID utilisateur courant
  useEffect(() => {
    api.get('/auth/me/').then(r => { userId.current = r.data.id; }).catch(() => {});
  }, []);

  // Charger l'historique des messages
  useEffect(() => {
    if (!commandeId) return;
    setLoading(true);
    api.get(`/transporteurs/chat/${commandeId}/`)
      .then(r => setMessages(r.data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [commandeId]);

  // Connexion WebSocket
  useEffect(() => {
    if (!commandeId) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/chat/${commandeId}/`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            sender: data.sender_id,
            contenu: data.message,
            timestamp: new Date().toISOString(),
          }]);
        }
      } catch {}
    };

    return () => ws.close();
  }, [commandeId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({ type: 'chat_message', message: text }));

    // Affichage optimiste
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: userId.current,
      contenu: text,
      timestamp: new Date().toISOString(),
      optimistic: true,
    }]);
    setInput('');
  };

  const isMyMessage = (msg) => msg.sender === userId.current;

  return (
    <div
      className={`
        fixed bottom-5 right-5 flex flex-col rounded-2xl shadow-2xl overflow-hidden
        bg-[var(--color-surface)] border border-[var(--color-border)]
        transition-all duration-300
        ${minimized ? 'h-14 w-64' : 'h-[420px] w-80'}
      `}
      style={{ zIndex: 'var(--z-modal, 300)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-primary)] text-white flex-shrink-0">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-lg">💬</span>
          <div>
            <p className="text-sm font-semibold leading-tight">{t('cc_title')}</p>
            <p className="text-xs opacity-75 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-300' : 'bg-gray-300'}`} />
              {connected ? t('cc_connected') : t('cc_reconnecting')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMinimized(prev => !prev)}
          className="text-white/80 hover:text-white transition-colors p-1"
        >
          {minimized ? '▲' : '▼'}
        </button>
        {onClose && (
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">✕</button>
        )}
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[var(--color-bg)]">
            {loading ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
                <p className="text-2xl mb-2">🚗</p>
                <p>{t('cc_no_messages')}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-3 py-2 rounded-2xl text-sm
                      ${isMyMessage(msg)
                        ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                        : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-bl-sm'
                      }
                      ${msg.optimistic ? 'opacity-75' : ''}
                    `}
                  >
                    {msg.contenu}
                    <p className={`text-xs mt-0.5 ${isMyMessage(msg) ? 'text-white/60' : 'text-[var(--color-text-muted)]'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={t('cc_msg_placeholder')}
              className="flex-1 text-sm px-3 py-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] outline-none focus:border-[var(--color-primary)] text-[var(--color-text)]"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !connected}
              className="bg-[var(--color-primary)] text-white p-2 rounded-full hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientChat;
