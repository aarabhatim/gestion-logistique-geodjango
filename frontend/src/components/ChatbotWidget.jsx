import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, Sparkles, Plus, CheckCircle,
  Trash2, ShoppingCart, Zap, RefreshCw,
} from 'lucide-react';
import { chatbotApi } from '../services/api';
import useCartStore from '../stores/cartStore';

const SUGGESTIONS = [
  { icon: '🔍', text: 'Un casque bluetooth à moins de 300 DH' },
  { icon: '🍕', text: 'Pizza margherita pas trop chère' },
  { icon: '💊', text: 'Pharmacies ouvertes à Tanger' },
  { icon: '📦', text: 'Où en est ma dernière commande ?' },
];

const STATUT_COLOR = {
  EN_ATTENTE: '#f59e0b', VALIDEE: '#4f8cff', EN_PREPARATION: '#a78bfa',
  EN_ROUTE: '#10b981', LIVREE: '#10b981', ANNULEE: '#ef4444',
};

const WELCOME = {
  role: 'assistant',
  content: "👋 Bonjour ! Je suis votre assistant DeliverMap. Décrivez ce que vous cherchez ou demandez le suivi d'une commande.",
};

const CHAT_STORAGE_KEY = 'delivermap-chat-history-v1';

const ProductCard = ({ p, onAdd }) => {
  const promo = p.prix_promo && parseFloat(p.prix_promo) < parseFloat(p.prix);
  return (
    <div style={{ display: 'flex', gap: 10, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 44, height: 44, background: 'var(--gradient-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🛍️</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>🏪 {p.fondateur_nom} · {p.categorie_display}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {promo && <span style={{ fontSize: 11, color: '#ef4444', textDecoration: 'line-through' }}>{p.prix}</span>}
            <span style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>{p.prix_effectif} MAD</span>
          </div>
          <button onClick={() => onAdd(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--gradient-primary)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700 }}>
            <Plus size={12} /> Panier
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ o }) => (
  <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, borderLeft: `3px solid ${STATUT_COLOR[o.statut] || '#4f8cff'}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: '#82a8ff' }}>{o.reference}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[o.statut] || '#4f8cff' }}>{o.statut_label}</span>
    </div>
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
      🏪 {o.boutique}<br />📍 {o.adresse_livraison}<br />💰 {o.total_price} MAD · {o.mode_paiement}
      {o.transporteur && <><br />🛵 {o.transporteur}</>}
    </div>
  </div>
);

const Bubble = ({ m, onAdd }) => {
  const isUser = m.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
      <div style={{
        maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
        borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4,
        background: isUser ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.07)',
        color: 'white', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
      }}>
        {m.content}
      </div>
      {m.products?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {m.products.map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} />)}
        </div>
      )}
      {m.order && <div style={{ width: '100%' }}><OrderCard o={m.order} /></div>}
    </div>
  );
};

const TypingDots = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, alignSelf: 'flex-start', borderBottomLeftRadius: 4 }}>
    <Bot size={13} color="#82a8ff" />
    <span style={{ display: 'inline-flex', gap: 3 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#82a8ff', animation: 'typing-bounce 1.2s infinite' }} />
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'typing-bounce 1.2s infinite 0.15s' }} />
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c4b5fd', animation: 'typing-bounce 1.2s infinite 0.3s' }} />
    </span>
    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>L'assistant réfléchit…</span>
  </div>
);

const ChatbotWidget = ({ onOpenCart }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [WELCOME];
  });
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const scrollRef = useRef(null);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  const handleAdd = useCallback((produit, quantite = 1) => {
    if (!produit?.fondateur) return;
    const fondateur = typeof produit.fondateur === 'object' ? produit.fondateur : { id: produit.fondateur };
    if (!fondateur.id) return;
    for (let i = 0; i < quantite; i++) addItem(produit, fondateur);
    setToast(`${produit.nom} ajouté au panier 🛒`);
    setTimeout(() => setToast(''), 3000);
  }, [addItem]);

  const send = useCallback(async (text) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: message }]);
    setLoading(true);
    try {
      const { data } = await chatbotApi.send({ message, history });
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.reply || 'Hmm, pas de réponse pour le moment.',
        products: data.products || [],
        order: data.order || null,
      }]);
      setHistory(data.history || []);
      if (data.action?.type === 'add_to_cart' && data.action.produit) {
        handleAdd(data.action.produit, data.action.quantite || 1);
      }
    } catch (err) {
      console.error('[Chatbot] Erreur:', err);
      console.error('[Chatbot] Status:', err.response?.status, 'Data:', err.response?.data);
      let msg;
      if (err.response?.status === 401) msg = "🔒 Session expirée. Reconnectez-vous.";
      else if (err.response?.status === 403) msg = "🚫 Accès refusé.";
      else if (err.response?.status === 404) msg = "🔍 Service indisponible — vérifiez que Django tourne sur http://127.0.0.1:8000.";
      else if (err.response?.status >= 500) msg = "🛠️ Erreur serveur. Consultez la console Django.";
      else if (err.message === 'Network Error') msg = "📡 Pas de connexion. Django est-il lancé ?";
      else msg = `😕 Erreur : ${err.message || 'inconnue'}`;
      setMessages(m => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  }, [input, history, loading, handleAdd]);

  const handleReset = () => {
    if (!window.confirm('Effacer toute la conversation ?')) return;
    setMessages([WELCOME]);
    setHistory([]);
    try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 400,
            width: 62, height: 62, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--gradient-primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(79,140,255,0.55)',
            animation: 'glowPulse 3s infinite',
          }}>
          <MessageCircle size={28} />
          <span style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, background: '#10b981', borderRadius: '50%', border: '2px solid #070b14', animation: 'pulse 2s infinite' }} />
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 400,
          width: 'min(420px, calc(100vw - 32px))', height: 'min(650px, calc(100vh - 48px))',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(180deg, rgba(12,16,28,0.98) 0%, rgba(20,26,42,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          animation: 'fadeInScale 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--gradient-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>Assistant DeliverMap</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <span style={{ width: 7, height: 7, background: '#34d399', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                  En ligne
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleReset} title="Nouvelle conversation" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30 }}>
                <Trash2 size={14} />
              </button>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30 }}>
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m, i) => <Bubble key={i} m={m} onAdd={handleAdd} />)}
            {loading && <TypingDots />}
            {messages.length === 1 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.08em' }}>💡 EXEMPLES</div>
                {SUGGESTIONS.map(s => (
                  <button key={s.text} onClick={() => send(s.text)}
                    style={{ textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 11, padding: '9px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{s.icon}</span> {s.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div style={{ margin: '0 14px 8px', padding: '9px 12px', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 11, color: '#34d399', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> {toast}</span>
              {onOpenCart && (
                <button onClick={onOpenCart} style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer', color: '#34d399', fontWeight: 700, fontSize: 11, padding: '3px 9px', borderRadius: 7 }}>
                  <ShoppingCart size={11} /> Voir
                </button>
              )}
            </div>
          )}

          {/* Saisie */}
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,11,20,0.6)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="Écris ton message…"
              disabled={loading}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '11px 14px', color: 'white', fontSize: 13, outline: 'none' }} />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              style={{ background: input.trim() ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, color: 'white', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
