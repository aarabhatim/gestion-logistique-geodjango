import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, Sparkles, Plus, CheckCircle,
  Trash2, ShoppingCart, RefreshCw, Mic, MicOff, Maximize2, Minimize2,
  TrendingUp, Package, Users, Truck, Store, AlertTriangle, MapPin,
  Copy, Volume2, VolumeX, Zap,
} from 'lucide-react';
import { chatbotApi, commandesApi, analyticsApi } from '../services/api';
import useCartStore from '../stores/cartStore';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

// ─── Suggestions selon rôle ──────────────────────────────────────────────────
const SUGGESTIONS_CLIENT = [
  { icon: '🔍', text: 'Un casque bluetooth à moins de 300 DH', tag: 'recherche' },
  { icon: '🍕', text: 'Pizza margherita pas trop chère', tag: 'recherche' },
  { icon: '💊', text: 'Pharmacies ouvertes à Tanger', tag: 'recherche' },
  { icon: '📦', text: 'Où en est ma dernière commande ?', tag: 'suivi' },
  { icon: '🛒', text: 'Combien d\'articles dans mon panier ?', tag: 'panier' },
  { icon: '🏪', text: 'Boutiques les mieux notées à Casablanca', tag: 'recherche' },
];

const SUGGESTIONS_ADMIN = [
  { icon: '📊', text: 'Combien de commandes aujourd\'hui ?', tag: 'stats' },
  { icon: '💰', text: 'Quel est le CA du mois ?', tag: 'stats' },
  { icon: '🚚', text: 'Combien de transporteurs sont actifs ?', tag: 'stats' },
  { icon: '⚠️', text: 'Y a-t-il des incidents non traités ?', tag: 'alerte' },
  { icon: '🏪', text: 'Top 5 des boutiques en CA', tag: 'stats' },
];

const SUGGESTIONS_FONDATEUR = [
  { icon: '📦', text: 'Mes commandes en attente', tag: 'suivi' },
  { icon: '💰', text: 'Mon CA cette semaine', tag: 'stats' },
  { icon: '⭐', text: 'Mes derniers avis clients', tag: 'avis' },
];

const QUICK_ACTIONS_CLIENT = [
  { icon: ShoppingCart, label: 'Panier', action: 'cart' },
  { icon: Package, label: 'Commandes', action: 'orders' },
  { icon: Store, label: 'Boutiques', action: 'shops' },
  { icon: MapPin, label: 'Suivi', action: 'tracking' },
];

const QUICK_ACTIONS_ADMIN = [
  { icon: TrendingUp, label: 'Dashboard', action: 'dashboard' },
  { icon: Package, label: 'Commandes', action: 'orders' },
  { icon: Users, label: 'Clients', action: 'clients' },
  { icon: AlertTriangle, label: 'Incidents', action: 'incidents' },
];

const STATUT_COLOR = {
  EN_ATTENTE: '#f59e0b', VALIDEE: '#4f8cff', EN_PREPARATION: '#a78bfa',
  EN_ROUTE: '#10b981', LIVREE: '#10b981', ANNULEE: '#ef4444',
};

const CHAT_STORAGE_KEY = 'delivermap-chat-history-v1';

// ─── Components internes ─────────────────────────────────────────────────────
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

const StatsCard = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
    {stats.map((s, i) => (
      <div key={i} style={{ padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, borderLeft: `3px solid ${s.color}` }}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{s.label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
      </div>
    ))}
  </div>
);

const Bubble = ({ m, onAdd, onCopy, speak }) => {
  const isUser = m.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
      <div style={{
        maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
        borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4,
        background: isUser ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.07)',
        color: 'white', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
        position: 'relative',
      }}>
        {m.content}
        {!isUser && m.content && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, opacity: 0.7 }}>
            <button onClick={() => onCopy(m.content)} title="Copier"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}>
              <Copy size={11} />
            </button>
            {speak && (
              <button onClick={() => speak(m.content)} title="Lire à haute voix"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}>
                <Volume2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>
      {m.products?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {m.products.map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} />)}
        </div>
      )}
      {m.order && <div style={{ width: '100%' }}><OrderCard o={m.order} /></div>}
      {m.stats && <div style={{ width: '100%' }}><StatsCard stats={m.stats} /></div>}
    </div>
  );
};

const TypingDots = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, alignSelf: 'flex-start', borderBottomLeftRadius: 4 }}>
    <Bot size={13} color="#82a8ff" />
    <span style={{ display: 'inline-flex', gap: 3 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#82a8ff', animation: 'typing-bounce 1.2s infinite' }} />
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'typing-bounce 1.2s infinite 0.15s' }} />
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c4b5fd', animation: 'typing-bounce 1.2s infinite 0.3s' }} />
    </span>
    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
  </div>
);

// ─── Main widget ─────────────────────────────────────────────────────────────
const ChatbotWidget = ({ onOpenCart, onNavigate }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const role = user?.role || 'CLIENT';
  const isAdmin = role === 'ADMIN';
  const isFondateur = role === 'FONDATEUR';

  const WELCOME = {
    role: 'assistant',
    content: isAdmin
      ? "👋 Bonjour Admin ! Demandez-moi des statistiques (CA, commandes, incidents) ou utilisez les raccourcis."
      : isFondateur
        ? "👋 Bonjour ! Je peux vous aider avec vos commandes, votre CA et vos avis clients."
        : "👋 Bonjour ! Je suis votre assistant DeliverMap. Décrivez ce que vous cherchez ou demandez le suivi d'une commande.",
  };

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);

  // Suggestions selon rôle
  const suggestions = isAdmin ? SUGGESTIONS_ADMIN : isFondateur ? SUGGESTIONS_FONDATEUR : SUGGESTIONS_CLIENT;
  const quickActions = isAdmin ? QUICK_ACTIONS_ADMIN : QUICK_ACTIONS_CLIENT;

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  // ── Web Speech API : reconnaissance vocale ───────────────────────────
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
      // Envoi automatique
      setTimeout(() => send(transcript), 300);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []); // eslint-disable-line

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setToast('🎤 Reconnaissance vocale non supportée par ce navigateur');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try { recognitionRef.current.start(); setListening(true); } catch { /* ignore */ }
    }
  };

  // ── Synthèse vocale (lecture à haute voix) ──────────────────────────
  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 1.05;
    window.speechSynthesis.speak(utter);
  }, []);

  const handleCopy = useCallback((text) => {
    try {
      navigator.clipboard.writeText(text);
      setToast('📋 Copié dans le presse-papier');
      setTimeout(() => setToast(''), 2000);
    } catch { /* ignore */ }
  }, []);

  const handleAdd = useCallback((produit, quantite = 1) => {
    if (!produit?.fondateur) return;
    const fondateur = typeof produit.fondateur === 'object' ? produit.fondateur : { id: produit.fondateur };
    if (!fondateur.id) return;
    for (let i = 0; i < quantite; i++) addItem(produit, fondateur);
    setToast(`${produit.nom} ajouté au panier 🛒`);
    setTimeout(() => setToast(''), 3000);
  }, [addItem]);

  // ── Commandes locales (raccourcis intelligents avant appel API) ─────
  const handleLocalCommand = async (message) => {
    const lc = message.toLowerCase();

    // Stats live admin (sans appel API au backend chatbot)
    if (isAdmin && (lc.includes('combien de commandes') || lc.includes('ca du mois') || lc.includes('chiffre') || lc.includes('top 5'))) {
      try {
        const { data } = await analyticsApi.adminDashboard();
        const k = data.kpis || {};
        const reply = `📊 Statistiques en direct :\n• CA total : ${Math.round(k.ca_total || 0).toLocaleString()} MAD\n• CA ce mois : ${Math.round(k.ca_mois || 0).toLocaleString()} MAD\n• Taux de livraison : ${k.taux_livraison || 0}%\n• Boutiques actives : ${k.fondateurs_actifs || 0}\n• Transporteurs actifs : ${k.transporteurs_actifs || 0}`;
        return {
          reply,
          stats: [
            { label: 'CA Total', value: `${Math.round(k.ca_total || 0).toLocaleString()} MAD`, color: '#10b981' },
            { label: 'CA Mois', value: `${Math.round(k.ca_mois || 0).toLocaleString()} MAD`, color: '#3b82f6' },
            { label: 'Livraison', value: `${k.taux_livraison || 0}%`, color: '#f59e0b' },
            { label: 'Actifs', value: k.fondateurs_actifs || 0, color: '#8b5cf6' },
          ],
        };
      } catch { /* fallback API */ }
    }

    // Panier client (local store)
    if (!isAdmin && (lc.includes('panier') || lc.includes('mon cart'))) {
      const count = cartItems.reduce((s, i) => s + i.quantite, 0);
      const total = cartItems.reduce((s, i) => s + i.quantite * parseFloat(i.produit.prix_effectif || i.produit.prix), 0);
      if (count === 0) return { reply: '🛒 Votre panier est vide. Parcourez le catalogue pour ajouter des articles !' };
      return { reply: `🛒 Votre panier contient ${count} article${count > 1 ? 's' : ''} pour un total de ${total.toFixed(2)} MAD.` };
    }

    return null;
  };

  const send = useCallback(async (text) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: message }]);
    setLoading(true);

    // Tentative commande locale
    const local = await handleLocalCommand(message);
    if (local) {
      setMessages(m => [...m, { role: 'assistant', ...local }]);
      if (voiceEnabled) speak(local.reply);
      setLoading(false);
      return;
    }

    try {
      const { data } = await chatbotApi.send({ message, history });
      const reply = data.reply || 'Hmm, pas de réponse pour le moment.';
      setMessages(m => [...m, {
        role: 'assistant',
        content: reply,
        products: data.products || [],
        order: data.order || null,
      }]);
      setHistory(data.history || []);
      if (data.action?.type === 'add_to_cart' && data.action.produit) {
        handleAdd(data.action.produit, data.action.quantite || 1);
      }
      if (voiceEnabled) speak(reply);
    } catch (err) {
      console.error('[Chatbot] Erreur:', err);
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
  }, [input, history, loading, handleAdd, isAdmin, cartItems, voiceEnabled, speak]); // eslint-disable-line

  const handleReset = () => {
    if (!window.confirm('Effacer toute la conversation ?')) return;
    setMessages([WELCOME]);
    setHistory([]);
    try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
  };

  const handleQuickAction = (action) => {
    const routes = {
      cart: () => onOpenCart && onOpenCart(),
      orders: () => onNavigate ? onNavigate('/commandes') : null,
      shops: () => onNavigate ? onNavigate('/boutiques') : null,
      tracking: () => onNavigate ? onNavigate('/map') : null,
      dashboard: () => onNavigate ? onNavigate('/') : null,
      clients: () => onNavigate ? onNavigate('/clients') : null,
      incidents: () => onNavigate ? onNavigate('/incidents') : null,
    };
    if (routes[action]) routes[action]();
    setOpen(false);
  };

  // ── Dimensions selon mode étendu ────────────────────────────────────
  const widgetWidth = expanded ? 'min(720px, calc(100vw - 32px))' : 'min(420px, calc(100vw - 32px))';
  const widgetHeight = expanded ? 'min(85vh, calc(100vh - 48px))' : 'min(650px, calc(100vh - 48px))';

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
          width: widgetWidth, height: widgetHeight,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(180deg, rgba(12,16,28,0.98) 0%, rgba(20,26,42,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          animation: 'fadeInScale 0.3s cubic-bezier(0.4,0,0.2,1)',
          transition: 'width 0.25s, height 0.25s',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--gradient-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>
                  {t('chatbot_title')}
                  {isAdmin && <span style={{ marginLeft: 6, fontSize: 9, padding: '2px 6px', background: 'rgba(255,255,255,0.25)', borderRadius: 4, verticalAlign: 'middle' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <span style={{ width: 7, height: 7, background: '#34d399', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                  {t('chatbot_online')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setVoiceEnabled(v => !v)} title={voiceEnabled ? "Couper la voix" : "Activer la lecture vocale"}
                style={{ background: voiceEnabled ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30 }}>
                {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <button onClick={() => setExpanded(e => !e)} title={expanded ? "Réduire" : "Agrandir"}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30 }}>
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={handleReset} title={t('chatbot_new')}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30 }}>
                <Trash2 size={14} />
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 8, width: 30, height: 30 }}>
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Raccourcis (quick actions) */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
            {quickActions.map(a => (
              <button key={a.action} onClick={() => handleQuickAction(a.action)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  background: 'rgba(79,140,255,0.12)', border: '1px solid rgba(79,140,255,0.25)',
                  cursor: 'pointer', color: '#82a8ff', borderRadius: 8, padding: '5px 10px',
                  fontSize: 11, fontWeight: 600,
                }}>
                <a.icon size={12} /> {a.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m, i) => <Bubble key={i} m={m} onAdd={handleAdd} onCopy={handleCopy} speak={voiceEnabled ? speak : null} />)}
            {loading && <TypingDots label={t('chatbot_thinking')} />}
            {messages.length === 1 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.08em' }}>💡 {t('chatbot_examples')}</div>
                {suggestions.map(s => (
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
              {onOpenCart && toast.includes('panier') && (
                <button onClick={onOpenCart} style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer', color: '#34d399', fontWeight: 700, fontSize: 11, padding: '3px 9px', borderRadius: 7 }}>
                  <ShoppingCart size={11} /> Voir
                </button>
              )}
            </div>
          )}

          {/* Saisie */}
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,11,20,0.6)', display: 'flex', gap: 8 }}>
            <button onClick={toggleVoice} title="Parler" disabled={loading}
              style={{
                background: listening ? 'linear-gradient(135deg,#ef4444,#f59e0b)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'white',
                borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: listening ? 'pulse 1.2s infinite' : 'none',
              }}>
              {listening ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder={t('chatbot_placeholder')}
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
