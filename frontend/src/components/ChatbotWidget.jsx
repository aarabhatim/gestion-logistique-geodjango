import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, Plus, Trash2, Mic, MicOff,
  TrendingUp, Package, Users, Truck, Store, AlertTriangle,
  MapPin, Copy, Volume2, ShoppingCart,
} from 'lucide-react';
import { chatbotApi } from '../services/api';
import useCartStore from '../stores/cartStore';
import { useAuth } from '../contexts/AuthContext';

// ─── Suggestions selon rôle ──────────────────────────────────────────────────
const SUGGESTIONS_CLIENT = [
  { icon: '🔍', text: 'Un casque bluetooth à moins de 300 DH' },
  { icon: '🍕', text: 'Pizza margherita pas trop chère' },
  { icon: '📦', text: 'Où en est ma dernière commande ?' },
  { icon: '🛒', text: 'Combien d\'articles dans mon panier ?' },
];

const SUGGESTIONS_ADMIN = [
  { icon: '📊', text: 'Combien de commandes aujourd\'hui ?' },
  { icon: '💰', text: 'Quel est le CA du mois ?' },
  { icon: '🚚', text: 'Combien de transporteurs actifs ?' },
  { icon: '⚠️', text: 'Y a-t-il des incidents non traités ?' },
];

const SUGGESTIONS_FONDATEUR = [
  { icon: '📦', text: 'Mes commandes en attente' },
  { icon: '💰', text: 'Mon CA cette semaine' },
  { icon: '⭐', text: 'Mes derniers avis clients' },
];

const STATUT_COLOR = {
  EN_ATTENTE: '#f59e0b', VALIDEE: '#4f8cff', EN_PREPARATION: '#a78bfa',
  EN_ROUTE: '#10b981', LIVREE: '#10b981', ANNULEE: '#ef4444',
};

const CHAT_STORAGE_KEY = 'delivermap-chat-history-v2';

// ─── Sub-components ───────────────────────────────────────────────────────────
const ProductCard = ({ p, onAdd }) => {
  const promo = p.prix_promo && parseFloat(p.prix_promo) < parseFloat(p.prix);
  return (
    <div style={{ display: 'flex', gap: 10, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginTop: 6 }}>
      <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#16a34a,#22c55e)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🛍️</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'white' }}>{p.nom}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>🏪 {p.fondateur_nom}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {promo && <span style={{ fontSize: 11, color: '#ef4444', textDecoration: 'line-through' }}>{p.prix}</span>}
            <span style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>{p.prix_effectif ?? p.prix} MAD</span>
          </div>
          {onAdd && (
            <button onClick={() => onAdd(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg,#16a34a,#22c55e)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
              <Plus size={11} /> Panier
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ o }) => (
  <div style={{ padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 12, borderLeft: `3px solid ${STATUT_COLOR[o.statut] || '#4f8cff'}`, marginTop: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: '#82a8ff' }}>{o.reference}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[o.statut] || '#4f8cff' }}>{o.statut_label || o.statut}</span>
    </div>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.7 }}>
      {o.boutique && <div>🏪 {o.boutique}</div>}
      {o.adresse_livraison && <div>📍 {o.adresse_livraison}</div>}
      {o.total_price && <div>💰 {o.total_price} MAD · {o.mode_paiement}</div>}
      {o.transporteur && <div>🛵 {o.transporteur}</div>}
    </div>
  </div>
);

// ─── Main widget ─────────────────────────────────────────────────────────────
const ChatbotWidget = ({ onOpenCart, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'CLIENT';
  const isAdmin = role === 'ADMIN';
  const isFondateur = role === 'FONDATEUR';
  const isClient = !isAdmin && !isFondateur;

  // Thème : orange pour client (couleur DeliverMap), vert pour admin / fondateur.
  const THEME = isClient
    ? {
        primary: '#FF6B35',
        primaryDark: '#E55A28',
        gradient: 'linear-gradient(135deg,#FF6B35,#E55A28)',
        gradientLight: 'linear-gradient(135deg,rgba(255,107,53,0.15),rgba(229,90,40,0.12))',
        shadowRgba: 'rgba(255,107,53,0.45)',
        chipBg: 'rgba(255,107,53,0.12)',
        chipBorder: 'rgba(255,107,53,0.30)',
      }
    : {
        primary: '#22c55e',
        primaryDark: '#16a34a',
        gradient: 'linear-gradient(135deg,#16a34a,#22c55e)',
        gradientLight: 'linear-gradient(135deg,rgba(34,197,94,0.12),rgba(22,163,74,0.12))',
        shadowRgba: 'rgba(34,197,94,0.45)',
        chipBg: 'rgba(34,197,94,0.10)',
        chipBorder: 'rgba(34,197,94,0.25)',
      };

  const WELCOME = {
    role: 'assistant',
    content: isAdmin
      ? '👋 Bonjour Admin ! Demandez-moi des statistiques (CA, commandes, incidents) ou utilisez les raccourcis.'
      : isFondateur
        ? '👋 Bonjour ! Je peux vous aider avec vos commandes, votre CA et vos avis clients.'
        : '👋 Bonjour ! Je suis votre assistant DeliverMap. Décrivez ce que vous cherchez ou demandez le suivi d\'une commande.',
  };

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
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const addItem = useCartStore(s => s.addItem);

  const suggestions = isAdmin ? SUGGESTIONS_ADMIN : isFondateur ? SUGGESTIONS_FONDATEUR : SUGGESTIONS_CLIENT;

  // Persist messages
  useEffect(() => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30))); }
    catch { /* ignore */ }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  // Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      setTimeout(() => sendMessage(transcript), 300);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []); // eslint-disable-line

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      showToast('🎤 Reconnaissance vocale non supportée');
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try { recognitionRef.current.start(); setListening(true); } catch { /* ignore */ }
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleCopy = useCallback((text) => {
    try {
      navigator.clipboard.writeText(text);
      showToast('📋 Copié !');
    } catch {
      showToast('❌ Impossible de copier');
    }
  }, []); // eslint-disable-line

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 1.05;
    window.speechSynthesis.speak(utter);
  }, []);

  const handleAddToCart = (product) => {
    addItem({ ...product, fondateurId: product.fondateur_id || product.fondateur });
    showToast(`✅ ${product.nom} ajouté au panier`);
    if (onOpenCart) onOpenCart();
  };

  const clearHistory = () => {
    setMessages([WELCOME]);
    setHistory([]);
    try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const newHistory = [...history, { role: 'user', content: text }];

    try {
      const res = await chatbotApi.send({ message: text, history: newHistory });
      const data = res.data;
      const assistantMsg = {
        role: 'assistant',
        content: data.reply || '…',
        products: data.products || [],
        order: data.order || null,
        action: data.action || null,
      };

      // Handle action: add_to_cart
      if (data.action?.type === 'add_to_cart' && data.action.produit) {
        handleAddToCart(data.action.produit);
      }

      setMessages(prev => [...prev, assistantMsg]);
      setHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.reply || '' },
      ].slice(-20));
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: '❌ Je rencontre un problème technique. Réessayez dans un instant.',
        products: [],
        order: null,
      };
      setMessages(prev => [...prev, errMsg]);
      console.error('Chatbot error:', err);
    } finally {
      setLoading(false);
    }
  }, [input, loading, history]); // eslint-disable-line

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, fontFamily: 'system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 68, right: 0,
          background: 'rgba(20,25,45,0.97)', color: 'white',
          padding: '8px 16px', borderRadius: 10, fontSize: 12,
          border: '1px solid rgba(255,255,255,0.12)',
          whiteSpace: 'nowrap', backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>{toast}</div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 54, height: 54, borderRadius: '50%', border: 'none',
          background: THEME.gradient,
          color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 24px ${THEME.shadowRgba}`,
          transition: 'transform 0.2s',
          fontSize: open ? 20 : 24,
        }}
        title="Assistant DeliverMap"
      >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 68, right: 0,
          width: 360,
          background: 'rgba(13,18,35,0.98)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden', maxHeight: '80vh',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: THEME.gradientLight,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: THEME.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Assistant DeliverMap</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                {loading ? '⏳ En train de répondre…' : '● En ligne'}
              </div>
            </div>
            <button onClick={clearHistory} title="Nouvelle conversation"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: 8, padding: '5px 8px' }}>
              <Trash2 size={13} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200, maxHeight: 420 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '86%', padding: '9px 13px', borderRadius: 14,
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                  borderBottomLeftRadius: msg.role === 'user' ? 14 : 4,
                  background: msg.role === 'user'
                    ? THEME.gradient
                    : 'rgba(255,255,255,0.07)',
                  color: 'white', fontSize: 13, lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {msg.content}
                </div>

                {/* Rich results */}
                {msg.products?.length > 0 && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {msg.products.slice(0, 4).map(p => (
                      <ProductCard key={p.id} p={p} onAdd={handleAddToCart} />
                    ))}
                    {msg.products.length > 4 && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 4 }}>
                        + {msg.products.length - 4} autres résultats
                      </div>
                    )}
                  </div>
                )}
                {msg.order && <OrderCard o={msg.order} />}

                {/* Copy & speak */}
                {msg.role === 'assistant' && msg.content && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, opacity: 0.5 }}>
                    <button onClick={() => handleCopy(msg.content)} title="Copier"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 2 }}>
                      <Copy size={10} />
                    </button>
                    <button onClick={() => speak(msg.content)} title="Lire"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 2 }}>
                      <Volume2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, alignSelf: 'flex-start', borderBottomLeftRadius: 4 }}>
                <Bot size={13} color="#82a8ff" />
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#82a8ff', animation: `typing-bounce 1.2s infinite ${delay}s` }} />
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Suggestions (only shown when 1 message) */}
          {messages.length === 1 && !loading && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.text)}
                  style={{
                    background: THEME.chipBg, border: `1px solid ${THEME.chipBorder}`,
                    color: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '5px 10px',
                    fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  <span>{s.icon}</span> {s.text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 7, alignItems: 'center' }}>
            <button onClick={toggleVoice} title={listening ? 'Arrêter' : 'Parler'}
              style={{
                background: listening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${listening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: listening ? '#ef4444' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', borderRadius: 10, padding: '7px 9px',
                animation: listening ? 'pulse 1s infinite' : 'none',
              }}>
              {listening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Votre question…"
              disabled={loading}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                color: 'white', padding: '8px 12px', fontSize: 13, outline: 'none',
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 13px', borderRadius: 10, border: 'none',
                background: THEME.gradient,
                color: 'white', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.45 : 1,
                display: 'flex', alignItems: 'center',
              }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
