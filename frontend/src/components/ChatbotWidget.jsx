import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, Sparkles, Plus, CheckCircle,
} from 'lucide-react';
import { chatbotApi } from '../services/api';
import useCartStore from '../stores/cartStore';

const SUGGESTIONS = [
  'Un casque bluetooth à moins de 300 DH',
  'Des chaussures de sport pas cher',
  'Où en est ma dernière commande ?',
];

const STATUT_COLOR = {
  EN_ATTENTE: '#f59e0b', VALIDEE: '#3b82f6', EN_PREPARATION: '#8b5cf6',
  EN_ROUTE: '#10b981', LIVREE: '#10b981', ANNULEE: '#ef4444',
};

// ─── Carte produit dans le chat ───────────────────────────────────────────────
const ProductCard = ({ p, onAdd }) => {
  const promo = p.prix_promo && parseFloat(p.prix_promo) < parseFloat(p.prix);
  return (
    <div style={{ display: 'flex', gap: 10, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 40, height: 40, background: 'var(--gradient-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        🛍️
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.25 }}>{p.nom}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          🏪 {p.fondateur_nom} · {p.categorie_display}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {promo && <span style={{ fontSize: 11, color: '#ef4444', textDecoration: 'line-through' }}>{p.prix}</span>}
            <span style={{ fontWeight: 800, color: '#10b981', fontSize: 14 }}>{p.prix_effectif} MAD</span>
          </div>
          <button
            onClick={() => onAdd(p)}
            title="Ajouter au panier"
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--gradient-primary)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, padding: '5px 9px', fontSize: 11, fontWeight: 600 }}>
            <Plus size={12} /> Panier
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Carte suivi commande ─────────────────────────────────────────────────────
const OrderCard = ({ o }) => (
  <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, borderLeft: `3px solid ${STATUT_COLOR[o.statut] || '#3b82f6'}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{o.reference}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[o.statut] || '#3b82f6' }}>
        {o.statut_label}
      </span>
    </div>
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
      <div style={{
        maxWidth: '85%', padding: '9px 13px', borderRadius: 14,
        borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4,
        background: isUser ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.07)',
        color: 'white', fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap',
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

// ─── Widget principal ─────────────────────────────────────────────────────────
const ChatbotWidget = ({ onOpenCart }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Bonjour 👋 Je suis ton assistant DeliverMap. Décris ce que tu cherches (ex : « un casque bluetooth à moins de 300 DH ») ou demande le suivi d'une commande.",
  }]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const scrollRef = useRef(null);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  const handleAdd = useCallback((produit, quantite = 1) => {
    if (!produit?.fondateur) return;
    for (let i = 0; i < quantite; i++) addItem(produit, produit.fondateur);
    setToast(`${quantite > 1 ? quantite + ' × ' : ''}${produit.nom} ajouté au panier 🛒`);
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
        content: data.reply,
        products: data.products || [],
        order: data.order || null,
      }]);
      setHistory(data.history || []);
      if (data.action?.type === 'add_to_cart' && data.action.produit) {
        handleAdd(data.action.produit, data.action.quantite || 1);
      }
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        content: "Désolé, une erreur est survenue. Réessaie dans un instant 🙏",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, history, loading, handleAdd]);

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 400,
            width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--gradient-primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(59,130,246,0.5)',
          }}>
          <MessageCircle size={26} />
          <span style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, background: '#10b981', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
        </button>
      )}

      {/* Panneau de chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 400,
          width: 'min(400px, calc(100vw - 32px))', height: 'min(620px, calc(100vh - 48px))',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRadius: 18, border: '1px solid rgba(255,255,255,0.1)',
          background: 'var(--bg-primary, #0f172a)', boxShadow: '0 16px 50px rgba(0,0,0,0.55)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--gradient-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={19} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Assistant DeliverMap</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                  En ligne
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={17} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m, i) => <Bubble key={i} m={m} onAdd={handleAdd} />)}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                <Sparkles size={13} className="spin" /> L'assistant réfléchit…
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 10, padding: '8px 11px', fontSize: 12 }}>
                    💡 {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toast panier */}
          {toast && (
            <div style={{ margin: '0 14px 8px', padding: '8px 11px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 9, color: '#10b981', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={13} /> {toast}</span>
              {onOpenCart && (
                <button onClick={onOpenCart} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', fontWeight: 700, fontSize: 12, textDecoration: 'underline' }}>
                  Voir
                </button>
              )}
            </div>
          )}

          {/* Saisie */}
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="Écris ton message…"
              disabled={loading}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none' }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="Envoyer"
              style={{ background: 'var(--gradient-primary)', border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, color: 'white', borderRadius: 10, width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
