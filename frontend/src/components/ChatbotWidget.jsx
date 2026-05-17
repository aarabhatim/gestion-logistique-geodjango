import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, Sparkles, Plus, CheckCircle,
  Trash2, ShoppingCart, MapPin, Search, Zap, Minimize2,
  TrendingUp, Package as PackageIcon, RefreshCw,
} from 'lucide-react';
import { chatbotApi } from '../services/api';
import useCartStore from '../stores/cartStore';

// ─── Quick-action suggestions (rotation aléatoire) ───────────────────────────
const SUGGESTIONS_POOL = [
  { icon: '🔍', text: 'Un casque bluetooth à moins de 300 DH' },
  { icon: '🍕', text: 'Pizza margherita pas trop chère' },
  { icon: '💊', text: 'Pharmacies ouvertes à Tanger' },
  { icon: '👟', text: 'Des chaussures de sport pour homme' },
  { icon: '📦', text: 'Où en est ma dernière commande ?' },
  { icon: '🏪', text: 'Boutiques restauration les mieux notées' },
  { icon: '🛒', text: 'Articles bio en supermarché' },
  { icon: '⚡', text: 'Recommande-moi quelque chose à manger' },
  { icon: '📱', text: 'Smartphone Samsung en promo' },
  { icon: '🎁', text: 'Idée cadeau à moins de 200 DH' },
];

const QUICK_ACTIONS = [
  { label: 'Mes commandes', prompt: 'Montre-moi mes 3 dernières commandes', icon: PackageIcon, color: '#82a8ff' },
  { label: 'Promotions',    prompt: 'Quels sont les produits en promotion aujourd\'hui ?', icon: TrendingUp, color: '#fbbf24' },
  { label: 'Près de moi',   prompt: 'Les boutiques les plus proches de moi', icon: MapPin, color: '#34d399' },
  { label: 'Tendances',     prompt: 'Quelles sont les boutiques les plus populaires ?', icon: Sparkles, color: '#c4b5fd' },
];

const STATUT_COLOR = {
  EN_ATTENTE: '#f59e0b', VALIDEE: '#4f8cff', EN_PREPARATION: '#a78bfa',
  EN_ROUTE: '#10b981', LIVREE: '#10b981', ANNULEE: '#ef4444',
};

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "👋 Bonjour ! Je suis votre **assistant DeliverMap** propulsé par l'IA.\n\nJe peux vous aider à :\n🔍 trouver des produits\n📦 suivre vos commandes\n🏪 découvrir des boutiques\n🎁 trouver les meilleures promos\n\nDécrivez simplement ce que vous cherchez !",
};

// ─── Carte produit dans le chat ───────────────────────────────────────────────
const ProductCard = ({ p, onAdd }) => {
  const promo = p.prix_promo && parseFloat(p.prix_promo) < parseFloat(p.prix);
  const [g1, g2] = ['#4f8cff', '#a78bfa'];
  return (
    <div style={{
      display: 'flex', gap: 10, padding: 10,
      background: 'rgba(255,255,255,0.04)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.07)',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(79,140,255,0.3)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
      <div style={{
        width: 44, height: 44,
        background: `linear-gradient(135deg, ${g1}, ${g2})`,
        borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
        boxShadow: '0 4px 10px rgba(79,140,255,0.3)',
      }}>
        🛍️
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nom}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          🏪 {p.fondateur_nom} · {p.categorie_display}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {promo && <span style={{ fontSize: 11, color: '#ef4444', textDecoration: 'line-through' }}>{p.prix}</span>}
            <span style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>{p.prix_effectif} MAD</span>
          </div>
          <button
            onClick={() => onAdd(p)}
            title="Ajouter au panier"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--gradient-primary)', border: 'none',
              cursor: 'pointer', color: 'white', borderRadius: 8,
              padding: '5px 10px', fontSize: 11, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(79,140,255,0.35)',
            }}>
            <Plus size={12} /> Panier
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Carte suivi commande ─────────────────────────────────────────────────────
const OrderCard = ({ o }) => (
  <div style={{
    padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12,
    borderLeft: `3px solid ${STATUT_COLOR[o.statut] || '#4f8cff'}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: '#82a8ff' }}>{o.reference}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[o.statut] || '#4f8cff' }}>
        {o.statut_label}
      </span>
    </div>
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
      🏪 {o.boutique}<br />
      📍 {o.adresse_livraison}<br />
      💰 {o.total_price} MAD · {o.mode_paiement}
      {o.transporteur && <><br />🛵 {o.transporteur}</>}
    </div>
  </div>
);

// ─── Bulle message ────────────────────────────────────────────────────────────
const Bubble = ({ m, onAdd }) => {
  const isUser = m.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 8, animation: 'fadeIn 0.3s ease' }}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-secondary)', marginLeft: 2 }}>
          <Bot size={11} /> Assistant
        </div>
      )}
      <div style={{
        maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
        borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4,
        background: isUser
          ? 'var(--gradient-primary)'
          : 'rgba(255,255,255,0.06)',
        color: 'white', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
        boxShadow: isUser ? '0 4px 14px rgba(79,140,255,0.25)' : '0 2px 8px rgba(0,0,0,0.15)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
        wordBreak: 'break-word',
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

// ─── Indicateur de frappe ──────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, alignSelf: 'flex-start', borderBottomLeftRadius: 4, animation: 'fadeIn 0.2s ease' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <Bot size={13} color="#82a8ff" />
      <span style={{ display: 'inline-flex', gap: 3 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#82a8ff', animation: 'typing-bounce 1.2s infinite' }} />
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'typing-bounce 1.2s infinite 0.15s' }} />
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c4b5fd', animation: 'typing-bounce 1.2s infinite 0.3s' }} />
      </span>
    </div>
    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>L'assistant réfléchit…</span>
  </div>
);

// ─── Widget principal ─────────────────────────────────────────────────────────
const CHAT_STORAGE_KEY = 'delivermap-chat-history-v1';

const ChatbotWidget = ({ onOpenCart }) => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [WELCOME_MESSAGE];
  });
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [unread, setUnread] = useState(0);
  const [suggestions] = useState(() =>
    [...SUGGESTIONS_POOL].sort(() => Math.random() - 0.5).slice(0, 4)
  );
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const addItem = useCartStore(s => s.addItem);

  // Persist conversation
  useEffect(() => {
    try {
      const last20 = messages.slice(-20);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(last20));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, minimized]);

  // Increment unread when closed & a new bot msg appears
  useEffect(() => {
    if (!open && messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      setUnread(u => u + 1);
    }
  }, [messages.length]); // eslint-disable-line

  const handleAdd = useCallback((produit, quantite = 1) => {
    if (!produit?.fondateur) return;
    const fondateur = typeof produit.fondateur === 'object' ? produit.fondateur : { id: produit.fondateur };
    if (!fondateur.id) return;
    for (let i = 0; i < quantite; i++) addItem(produit, fondateur);
    setToast(`${quantite > 1 ? quantite + ' × ' : ''}${produit.nom} ajouté au panier 🛒`);
    setTimeout(() => setToast(''), 3500);
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
        content: data.reply || '🤔 Hmm, je n\'ai pas de réponse pour le moment. Réessayez !',
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
      let errMsg;
      if (err.response?.status === 401) {
        errMsg = "🔒 Votre session a expiré. Reconnectez-vous pour continuer.";
      } else if (err.response?.status === 403) {
        errMsg = "🚫 Accès refusé — seuls les clients peuvent utiliser l'assistant.";
      } else if (err.response?.status === 400) {
        const detail = err.response.data?.detail || err.response.data?.message?.[0] || 'Requête invalide';
        errMsg = `❌ ${detail}`;
      } else if (err.response?.status === 404) {
        errMsg = "🔍 Service indisponible — vérifiez que le serveur Django tourne sur http://127.0.0.1:8000.";
      } else if (err.response?.status >= 500) {
        errMsg = "🛠️ Le serveur a renvoyé une erreur. Vérifiez la console Django pour le détail.";
      } else if (err.message === 'Network Error' || !navigator.onLine) {
        errMsg = "📡 Impossible de joindre le serveur. Vérifiez que Django tourne (`python manage.py runserver`).";
      } else if (err.code === 'ECONNABORTED') {
        errMsg = "⏱️ La requête a pris trop de temps. Réessayez.";
      } else {
        errMsg = `😕 Erreur inattendue : ${err.message || 'inconnue'}. Ouvrez la console (F12) pour plus de détails.`;
      }
      setMessages(m => [...m, { role: 'assistant', content: errMsg }]);
    } finally {
      setLoading(false);
    }
  }, [input, history, loading, handleAdd]);

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setUnread(0);
  };

  const handleReset = () => {
    if (!window.confirm('Effacer toute la conversation ?')) return;
    setMessages([WELCOME_MESSAGE]);
    setHistory([]);
    try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
  };

  return (
    <>
      {/* ── Bouton flottant ──────────────────────────────────────────── */}
      {(!open || minimized) && (
        <button
          onClick={handleOpen}
          aria-label="Ouvrir l'assistant"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 400,
            width: 62, height: 62, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--gradient-primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(79,140,255,0.55), 0 0 0 4px rgba(79,140,255,0.15)',
            animation: 'glowPulse 3s infinite',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08) rotate(-6deg)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0)'; }}>
          <MessageCircle size={28} />
          <span style={{
            position: 'absolute', top: 4, right: 4, width: 12, height: 12,
            background: '#10b981', borderRadius: '50%',
            border: '2px solid #070b14', animation: 'pulse 2s infinite',
          }} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -2, left: -2,
              minWidth: 22, height: 22, padding: '0 6px',
              background: '#ef4444', color: 'white',
              borderRadius: 11, fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #070b14',
              boxShadow: '0 0 0 2px rgba(239,68,68,0.4)',
            }}>{unread}</span>
          )}
        </button>
      )}

      {/* ── Panneau de chat ──────────────────────────────────────────── */}
      {open && !minimized && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 400,
          width: 'min(420px, calc(100vw - 32px))', height: 'min(650px, calc(100vh - 48px))',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(180deg, rgba(12,16,28,0.98) 0%, rgba(20,26,42,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,140,255,0.1)',
          animation: 'fadeInScale 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {/* ── Header ────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            background: 'var(--gradient-primary)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Effet shine */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 70% 0%, rgba(255,255,255,0.25), transparent 60%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: 'rgba(255,255,255,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.15)',
              }}>
                <Sparkles size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'white', fontSize: 15, lineHeight: 1, letterSpacing: '-0.01em' }}>
                  Assistant DeliverMap
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <span style={{ width: 7, height: 7, background: '#34d399', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #34d399', animation: 'pulse 2s infinite' }} />
                  En ligne · IA propulsée par DeliverMap
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 1 }}>
              <button onClick={handleReset} title="Nouvelle conversation"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={15} />
              </button>
              <button onClick={() => setMinimized(true)} title="Réduire"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minimize2 size={15} />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Fermer"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={17} />
              </button>
            </div>
          </div>

          {/* ── Quick Actions Bar ─────────────────────────────────────── */}
          {messages.length <= 2 && (
            <div style={{
              display: 'flex', gap: 6, padding: '10px 12px',
              background: 'rgba(7, 11, 20, 0.4)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              overflowX: 'auto',
            }}>
              {QUICK_ACTIONS.map(qa => (
                <button key={qa.label} onClick={() => send(qa.prompt)}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                    background: `${qa.color}15`, border: `1px solid ${qa.color}30`,
                    color: qa.color, borderRadius: 999, padding: '5px 11px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${qa.color}25`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${qa.color}15`; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <qa.icon size={11} /> {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Messages ──────────────────────────────────────────────── */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 14,
            background: 'radial-gradient(ellipse at top, rgba(79,140,255,0.04), transparent 60%)',
          }}>
            {messages.map((m, i) => <Bubble key={i} m={m} onAdd={handleAdd} />)}

            {loading && <TypingDots />}

            {/* Suggestions cliquables */}
            {messages.length === 1 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>
                  💡 EXEMPLES DE RECHERCHES
                </div>
                {suggestions.map(s => (
                  <button key={s.text} onClick={() => send(s.text)}
                    style={{
                      textAlign: 'left',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      cursor: 'pointer', color: 'var(--text-secondary)',
                      borderRadius: 11, padding: '9px 12px', fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,140,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(79,140,255,0.3)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    <span style={{ flex: 1 }}>{s.text}</span>
                    <Send size={11} style={{ opacity: 0.4 }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Toast panier ──────────────────────────────────────────── */}
          {toast && (
            <div style={{
              margin: '0 14px 8px',
              padding: '9px 12px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.08))',
              border: '1px solid rgba(16,185,129,0.35)',
              borderRadius: 11, color: '#34d399', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              animation: 'slideIn 0.3s ease',
              boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> {toast}
              </span>
              {onOpenCart && (
                <button onClick={onOpenCart}
                  style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer', color: '#34d399', fontWeight: 700, fontSize: 11, padding: '3px 9px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShoppingCart size={11} /> Voir
                </button>
              )}
            </div>
          )}

          {/* ── Saisie ────────────────────────────────────────────────── */}
          <div style={{
            padding: 12,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(7, 11, 20, 0.6)',
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Écris ton message…"
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '11px 14px',
                  color: 'white', fontSize: 13, outline: 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(79,140,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(79,140,255,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="Envoyer"
              style={{
                background: input.trim() ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                color: 'white', borderRadius: 12, width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? '0 4px 14px rgba(79,140,255,0.4)' : 'none',
              }}>
              {loading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>

          {/* Footer info */}
          <div style={{
            padding: '4px 14px 8px',
            fontSize: 9, color: 'var(--text-muted)',
            textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)',
            background: 'rgba(7, 11, 20, 0.6)',
          }}>
            <Zap size={9} style={{ verticalAlign: 'middle' }} /> Propulsé par l'IA DeliverMap · Vos messages sont privés
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
