import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Package, Map as MapIcon, User, LogOut, Star, Plus, Minus,
  Trash2, MapPin, Clock, CheckCircle, Truck, Tag, X, Search, ChevronRight,
  Heart, Zap, ArrowLeft, CreditCard, Gift, RefreshCw, Navigation, TicketIcon,
  AlertCircle, MessageSquare, Send, SlidersHorizontal, Filter,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fondateursApi, commandesApi, ticketsApi, clientApi, mediaUrl } from '../../services/api';
import useCartStore from '../../stores/cartStore';
import useFavoritesStore from '../../stores/favoritesStore';
import useLoyaltyStore from '../../stores/loyaltyStore';
import ChatbotWidget from '../../components/ChatbotWidget';
import SuiviTimeline from '../../components/SuiviTimeline';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/marjane.css';

/* ── Leaflet icon fix ─────────────────────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' });
const _pin = (color, emoji = '📍') => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px">${emoji}</span></div>`,
  iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -32],
});
const iconBlue   = _pin('#3b82f6', '🏪');
const iconGreen  = _pin('#22c55e', '✅');
const iconOrange = _pin('#E30613', '🚚');
const iconRed    = _pin('#ef4444', '📍');

/* ── Constantes ───────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { key: '', label: 'Tout', icon: '🏪' },
  { key: 'RESTAURATION', label: 'Restauration', icon: '🍽️' },
  { key: 'SUPERMARCHE', label: 'Supermarché', icon: '🛒' },
  { key: 'PHARMACIE', label: 'Pharmacie', icon: '💊' },
  { key: 'ELECTRONIQUE', label: 'Électronique', icon: '📱' },
  { key: 'BOUTIQUE', label: 'Mode', icon: '👗' },
];

const PRODUCT_GRADIENTS = {
  ALIMENTAIRE:  ['#f59e0b','#ef4444'],
  BOISSONS:     ['#06b6d4','#3b82f6'],
  HYGIENE:      ['#10b981','#22d3ee'],
  MEDICAMENTS:  ['#3b82f6','#8b5cf6'],
  ELECTRONIQUE: ['#8b5cf6','#ec4899'],
  VETEMENTS:    ['#ec4899','#f59e0b'],
  AUTRE:        ['#94a3b8','#64748b'],
};
const PRODUCT_EMOJIS = {
  ALIMENTAIRE:  ['🍕','🍔','🥗','🥖','🧀','🍳','🍲','🍱','🍜'],
  BOISSONS:     ['🥤','☕','🧃','🍵','🥛','🍶'],
  HYGIENE:      ['🧴','🧼','🪥','🧻','🧽'],
  MEDICAMENTS:  ['💊','🩹','🩺','💉','🧪'],
  ELECTRONIQUE: ['📱','💻','⌚','🎧','📷','🔌','🖥️'],
  VETEMENTS:    ['👗','👔','👟','👜','🧢','🧥','👖'],
  AUTRE:        ['📦','🛍️','🎁','🪴'],
};
const getProductEmoji = (cat, id) => {
  const list = PRODUCT_EMOJIS[cat] || PRODUCT_EMOJIS.AUTRE;
  return list[(id || 0) % list.length];
};

const STATUT_CONFIG = {
  EN_ATTENTE:     { label: 'En attente',     color: '#F59E0B', icon: '⏳', step: 1 },
  VALIDEE:        { label: 'Validée',         color: '#3B82F6', icon: '✅', step: 2 },
  EN_PREPARATION: { label: 'En préparation', color: '#8B5CF6', icon: '👨‍🍳', step: 3 },
  EN_ROUTE:       { label: 'En route',        color: '#E30613', icon: '🛵', step: 4 },
  LIVREE:         { label: 'Livrée',          color: '#22C55E', icon: '🎉', step: 5 },
  ANNULEE:        { label: 'Annulée',         color: '#EF4444', icon: '❌', step: 0 },
};

const TABS = [
  { id: 'catalogue', label: 'Catalogue',      icon: ShoppingCart },
  { id: 'commandes', label: 'Mes commandes',   icon: Package },
  { id: 'suivi',     label: 'Suivi live',      icon: MapIcon },
  { id: 'favoris',   label: 'Favoris',         icon: Heart },
  { id: 'tickets',   label: 'Tickets',         icon: TicketIcon },
  { id: 'profil',    label: 'Mon profil',      icon: User },
];

const QUARTIERS_PAR_VILLE = {
  Casablanca: [
    { nom: 'Maarif', lat: 33.5849, lon: -7.6336 },
    { nom: 'Anfa', lat: 33.5897, lon: -7.6500 },
    { nom: 'Ain Diab', lat: 33.5973, lon: -7.6900 },
    { nom: 'Hay Hassani', lat: 33.5462, lon: -7.6620 },
    { nom: 'Sidi Belyout', lat: 33.6020, lon: -7.6160 },
    { nom: 'Bourgogne', lat: 33.5840, lon: -7.6240 },
    { nom: 'Gauthier', lat: 33.5950, lon: -7.6280 },
    { nom: 'Racine', lat: 33.5880, lon: -7.6350 },
  ],
  Rabat: [
    { nom: 'Agdal', lat: 33.9930, lon: -6.8500 },
    { nom: 'Hay Riad', lat: 34.0080, lon: -6.8420 },
    { nom: 'Souissi', lat: 34.0090, lon: -6.8170 },
    { nom: 'Médina', lat: 34.0245, lon: -6.8326 },
  ],
  Marrakech: [
    { nom: 'Gueliz', lat: 31.6390, lon: -8.0050 },
    { nom: 'Hivernage', lat: 31.6280, lon: -8.0080 },
    { nom: 'Médina', lat: 31.6295, lon: -7.9811 },
    { nom: 'Targa', lat: 31.6490, lon: -8.0290 },
  ],
  Tanger: [
    { nom: 'Centre-ville', lat: 35.7595, lon: -5.8340 },
    { nom: 'Malabata', lat: 35.7790, lon: -5.7670 },
    { nom: 'Iberia', lat: 35.7700, lon: -5.8050 },
  ],
  Fès: [
    { nom: 'Médina', lat: 34.0608, lon: -4.9777 },
    { nom: 'Ville Nouvelle', lat: 34.0331, lon: -5.0003 },
    { nom: 'Atlas', lat: 34.0210, lon: -5.0150 },
  ],
  Agadir: [
    { nom: 'Centre', lat: 30.4278, lon: -9.5981 },
    { nom: 'Founty', lat: 30.4040, lon: -9.5650 },
    { nom: 'Talborjt', lat: 30.4220, lon: -9.5870 },
  ],
};

const distanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};
const calculerFrais = (distKm, baseFrais) => {
  if (distKm <= 2) return baseFrais;
  return Math.round(baseFrais + (distKm - 2) * 2);
};

/* ── Stars ────────────────────────────────────────────────────────────────── */
const Stars = ({ note, size = 12 }) => (
  <span className="mj-stars">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={size}
        fill={i <= Math.round(note) ? '#F59E0B' : 'transparent'}
        color={i <= Math.round(note) ? '#F59E0B' : '#D1D5DB'} />
    ))}
    <span style={{ fontSize: 11, color: 'var(--mj-text-3)', marginLeft: 3 }}>{note?.toFixed(1)}</span>
  </span>
);

/* ── ProductImage ─────────────────────────────────────────────────────────── */
const ProductImage = ({ produit, height = 140 }) => {
  const cat = produit.categorie || 'AUTRE';
  const [g1, g2] = PRODUCT_GRADIENTS[cat] || PRODUCT_GRADIENTS.AUTRE;
  const emoji = getProductEmoji(cat, produit.id);
  const [imgError, setImgError] = useState(false);
  const src = mediaUrl(produit.image_principale || produit.image);

  if (src && !imgError) {
    return (
      <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden', background: '#1A1A1A' }}>
        <img
          src={src}
          alt={produit.nom}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Subtle dark overlay at the bottom for text readability */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }} />
      </div>
    );
  }

  /* Fallback — emoji gradient */
  return (
    <div style={{
      width: '100%', height, background: `linear-gradient(135deg, ${g1}, ${g2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
      <span style={{ fontSize: 52, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))', position: 'relative', zIndex: 1 }}>
        {emoji}
      </span>
    </div>
  );
};

/* ── ChatSidebar ──────────────────────────────────────────────────────────── */
const ChatSidebar = ({ commande, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const chatBottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const r = await clientApi.chatGet(commande.id);
      setMessages(r.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [commande.id]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    try {
      const r = await clientApi.chatSend(commande.id, text);
      setMessages(prev => [...prev, { id: r.data.id, auteur_role: 'CLIENT', contenu: r.data.contenu, created_at: r.data.created_at }]);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="mj-overlay">
      <div className="mj-chat-sidebar mj-fade-in">
        {/* Header */}
        <div className="mj-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'var(--mj-red-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              🛵
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--mj-text)' }}>
                {commande.transporteur_detail ? `${commande.transporteur_detail.first_name} ${commande.transporteur_detail.last_name}` : 'Livreur'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mj-red)', fontWeight: 600 }}>#{commande.reference}</div>
            </div>
          </div>
          <button className="mj-btn mj-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--mj-bg)' }}>
          {loading ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--mj-text-4)' }}>
              <RefreshCw size={24} className="mj-spin" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12 }}>Chargement...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="mj-empty" style={{ margin: 'auto' }}>
              <div className="mj-empty-icon">💬</div>
              <div className="mj-empty-title">Aucun message</div>
              <div className="mj-empty-desc">Démarrez la conversation avec votre livreur</div>
            </div>
          ) : messages.map((msg, i) => {
            const isMe = msg.auteur_role === 'CLIENT';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div className={isMe ? 'mj-chat-bubble-me' : 'mj-chat-bubble-other'} style={{ maxWidth: '80%', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                  <div style={{ wordBreak: 'break-word' }}>{msg.contenu}</div>
                  <div style={{ fontSize: 9, marginTop: 4, textAlign: 'right', opacity: 0.6 }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div className="mj-sidebar-footer">
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Votre message..." className="mj-input" style={{ fontSize: 13 }} />
            <button type="submit" disabled={!input.trim()} className="mj-btn mj-btn-primary mj-btn-sm" style={{ padding: '10px 14px' }}>
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ── CartSidebar ──────────────────────────────────────────────────────────── */
const CartSidebar = ({ onClose, onOrder }) => {
  const { items, fondateur, updateQuantite, removeItem, clearCart } = useCartStore();
  const [codePromo, setCodePromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [discount, setDiscount] = useState(0);

  const sousTotal = items.reduce((s, i) => s + parseFloat(i.produit.prix_effectif) * i.quantite, 0);
  const frais = fondateur ? parseFloat(fondateur.frais_livraison_base) : 0;
  const total = sousTotal + frais - discount;

  const handlePromo = async () => {
    try {
      const res = await fondateursApi.verifierCode({ code: codePromo, fondateur_id: fondateur?.id, montant: sousTotal });
      const data = res.data;
      if (data.valide) { setDiscount(data.reduction); setPromoApplied(true); setPromoError(''); }
      else setPromoError(data.message || 'Code invalide');
    } catch { setPromoError('Code invalide ou expiré'); }
  };

  if (items.length === 0) return (
    <div className="mj-overlay">
      <div className="mj-sidebar mj-fade-in" style={{ width: 400, height: '100vh', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <ShoppingCart size={48} style={{ color: 'var(--mj-text-4)' }} />
        <p style={{ color: 'var(--mj-text-3)', fontWeight: 600 }}>Votre panier est vide</p>
        <button className="mj-btn mj-btn-secondary" onClick={onClose}>Continuer les achats</button>
      </div>
    </div>
  );

  return (
    <div className="mj-overlay">
      <div className="mj-sidebar mj-fade-in" style={{ width: 400, height: '100vh' }}>
        <div className="mj-sidebar-header">
          <div>
            <h3 style={{ fontWeight: 700, margin: 0, color: 'var(--mj-text)' }}>Mon panier</h3>
            <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginTop: 2 }}>
              {fondateur?.nom_boutique} · {items.length} article{items.length > 1 ? 's' : ''}
            </div>
          </div>
          <button className="mj-btn mj-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--mj-bg)' }}>
          {items.map(({ produit, quantite }) => {
            const [g1, g2] = PRODUCT_GRADIENTS[produit.categorie] || PRODUCT_GRADIENTS.AUTRE;
            const imgSrc = mediaUrl(produit.image_principale || produit.image);
            return (
              <div key={produit.id} className="mj-card" style={{ display: 'flex', gap: 12, marginBottom: 12, padding: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: `linear-gradient(135deg, ${g1}, ${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {imgSrc
                    ? <img src={imgSrc} alt={produit.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : getProductEmoji(produit.categorie, produit.id)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{produit.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--mj-text-4)', marginBottom: 6 }}>{produit.fondateur_nom}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => updateQuantite(produit.id, quantite - 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--mj-bg)', border: '1px solid var(--mj-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mj-text)' }}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: 14 }}>{quantite}</span>
                      <button onClick={() => updateQuantite(produit.id, quantite + 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--mj-red)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--mj-red)' }}>{(parseFloat(produit.prix_effectif) * quantite).toFixed(2)} MAD</span>
                      <button onClick={() => removeItem(produit.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mj-danger)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Code promo */}
        <div style={{ padding: '0 16px 12px', background: 'var(--mj-bg)' }}>
          {!promoApplied ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="mj-input" placeholder="Code promo..." value={codePromo} onChange={e => setCodePromo(e.target.value)} style={{ fontSize: 13 }} />
              <button className="mj-btn mj-btn-outline-red" onClick={handlePromo} style={{ flexShrink: 0 }}><Gift size={15} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mj-green)', fontSize: 13, padding: '10px 14px', background: 'var(--mj-green-light)', borderRadius: 10 }}>
              <CheckCircle size={14} /> Code appliqué ! -{discount} MAD
            </div>
          )}
          {promoError && <div style={{ color: 'var(--mj-danger)', fontSize: 11, marginTop: 4 }}>{promoError}</div>}
        </div>

        <div className="mj-sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mj-text-3)' }}>
              <span>Sous-total</span><span>{sousTotal.toFixed(2)} MAD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mj-text-3)' }}>
              <span>Frais de livraison</span><span>{frais.toFixed(2)} MAD</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mj-green)' }}>
                <span>Réduction</span><span>-{discount.toFixed(2)} MAD</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, paddingTop: 8, borderTop: '1px solid var(--mj-border)' }}>
              <span>Total</span><span style={{ color: 'var(--mj-red)' }}>{total.toFixed(2)} MAD</span>
            </div>
          </div>
          <button className="mj-btn mj-btn-primary mj-btn-full" onClick={onOrder}>
            <CreditCard size={16} /> Commander — {total.toFixed(2)} MAD
          </button>
          <button onClick={clearCart} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mj-danger)', fontSize: 12, fontFamily: 'var(--mj-font)' }}>
            Vider le panier
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── CheckoutModal ────────────────────────────────────────────────────────── */
const CheckoutModal = ({ onClose, onSuccess }) => {
  const { items, fondateur, clearCart } = useCartStore();
  const { points, redeemPoints, addPoints } = useLoyaltyStore();
  const [adresse, setAdresse] = useState('');
  const [position, setPosition] = useState(null);
  const [quartier, setQuartier] = useState(null);
  const [adresseMode, setAdresseMode] = useState('manuel');
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [ville, setVille] = useState(fondateur?.ville || 'Casablanca');
  const [mode, setMode] = useState('CASH');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usePoints, setUsePoints] = useState(false);

  const boutiquePos = fondateur?.latitude && fondateur?.longitude ? [fondateur.latitude, fondateur.longitude] : null;
  let targetPos = null;
  if (adresseMode === 'gps' && position) targetPos = position;
  else if (adresseMode === 'quartier' && quartier) targetPos = [quartier.lat, quartier.lon];

  const distance = (boutiquePos && targetPos) ? distanceKm(boutiquePos[0], boutiquePos[1], targetPos[0], targetPos[1]) : 0;
  const baseFrais = fondateur ? parseFloat(fondateur.frais_livraison_base) : 15;
  const fraisCalcules = targetPos ? calculerFrais(distance, baseFrais) : baseFrais;
  const sousTotal = items.reduce((s, i) => s + parseFloat(i.produit.prix_effectif) * i.quantite, 0);
  const totalSansReduction = sousTotal + fraisCalcules;
  const pointsRedeemed = usePoints ? Math.min(Math.floor(points / 100) * 100, Math.floor(totalSansReduction / 10) * 100) : 0;
  const discount = (pointsRedeemed / 100) * 10;
  const total = totalSansReduction - discount;
  const tempsEstime = distance > 0 ? Math.max(15, Math.round((distance / 30) * 60) + 15) : null;

  const getGPSPosition = () => {
    setGpsStatus('loading');
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setPosition([pos.coords.latitude, pos.coords.longitude]); setAdresse(`Position GPS : ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setAdresseMode('gps'); setGpsStatus('success'); },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adresse.trim()) { setError('Veuillez sélectionner ou saisir une adresse'); return; }
    setLoading(true);
    try {
      const res = await commandesApi.create({ fondateur_id: fondateur.id, produits: items.map(i => ({ produit_id: i.produit.id, quantite: i.quantite })), adresse_livraison: adresse, latitude: targetPos?.[0] || null, longitude: targetPos?.[1] || null, mode_paiement: mode, instructions_livraison: instructions, livraison_immediate: true });
      const ref = res.data.reference || `#${res.data.id}`;
      if (pointsRedeemed > 0) redeemPoints(pointsRedeemed, ref);
      addPoints(total, ref);
      clearCart();
      onSuccess();
    } catch (err) { setError(err.response?.data?.detail || 'Erreur lors de la commande'); }
    finally { setLoading(false); }
  };

  const quartiers = QUARTIERS_PAR_VILLE[ville] || [];
  const villes = Object.keys(QUARTIERS_PAR_VILLE);

  const modeBtn = (k, label, icon) => (
    <button key={k} type="button" onClick={() => setAdresseMode(k)}
      style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: `2px solid ${adresseMode === k ? 'var(--mj-red)' : 'var(--mj-border)'}`, background: adresseMode === k ? 'var(--mj-red-10)' : 'var(--mj-white)', cursor: 'pointer', color: adresseMode === k ? 'var(--mj-red)' : 'var(--mj-text-3)', fontWeight: adresseMode === k ? 700 : 500, fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'var(--mj-ease-fast)', fontFamily: 'var(--mj-font)' }}>
      {icon}{label}
    </button>
  );

  return (
    <div className="mj-modal-overlay">
      <div className="mj-card mj-fade-in" style={{ width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700, margin: 0, color: 'var(--mj-text)' }}>Finaliser la commande</h3>
            <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginTop: 2 }}>{fondateur?.nom_boutique} · {fondateur?.ville}</div>
          </div>
          <button className="mj-btn mj-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Adresse */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--mj-text)', marginBottom: 8 }}>
              <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--mj-red)' }} />
              Adresse de livraison *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
              {modeBtn('gps', gpsStatus === 'loading' ? 'Localisation...' : '📍 Position live', gpsStatus === 'loading' ? <RefreshCw size={16} className="mj-spin" /> : <Navigation size={16} />)}
              {modeBtn('quartier', '🏘️ Quartier', <Search size={16} />)}
              {modeBtn('manuel', '✏️ Manuelle', <MapPin size={16} />)}
            </div>
            {adresseMode === 'quartier' && (
              <div style={{ background: 'var(--mj-blue-light)', border: '1px solid #BFDBFE', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <select className="mj-select" value={ville} onChange={e => { setVille(e.target.value); setQuartier(null); }} style={{ marginBottom: 8, fontSize: 13 }}>
                  {villes.map(v => <option key={v} value={v}>📍 {v}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {quartiers.map(q => (
                    <button key={q.nom} type="button" onClick={() => { setQuartier(q); setAdresse(`${q.nom}, ${ville}`); setAdresseMode('quartier'); }}
                      style={{ padding: '4px 12px', fontSize: 11, borderRadius: 20, border: `1.5px solid ${quartier?.nom === q.nom ? 'var(--mj-red)' : 'var(--mj-border)'}`, background: quartier?.nom === q.nom ? 'var(--mj-red)' : 'var(--mj-white)', color: quartier?.nom === q.nom ? 'white' : 'var(--mj-text-2)', cursor: 'pointer', fontWeight: quartier?.nom === q.nom ? 700 : 500, transition: 'var(--mj-ease-fast)', fontFamily: 'var(--mj-font)' }}>
                      {q.nom}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input className="mj-input" value={adresse} onChange={e => setAdresse(e.target.value)}
              placeholder={adresseMode === 'gps' ? 'Position GPS détectée' : adresseMode === 'quartier' ? 'Sélectionnez un quartier' : 'Ex: 12 Rue Hassan II, Maarif, Casablanca'}
              required style={{ fontSize: 13 }} />
          </div>

          {/* Distance estimée */}
          {targetPos && boutiquePos && (
            <div style={{ background: 'var(--mj-green-light)', border: '1px solid #BBF7D0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} /> CALCUL EN TEMPS RÉEL
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[['Distance', `${distance.toFixed(1)} km`, '#3B82F6'], ['Temps', `${tempsEstime} min`, '#F59E0B'], ['Frais', `${fraisCalcules} MAD`, '#22C55E']].map(([l, v, c]) => (
                  <div key={l}><div style={{ fontSize: 10, color: 'var(--mj-text-4)' }}>{l}</div><div style={{ fontWeight: 700, fontSize: 16, color: c }}>{v}</div></div>
                ))}
              </div>
            </div>
          )}

          {/* Paiement */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--mj-text)' }}>
              <CreditCard size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--mj-red)' }} /> Mode de paiement
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['CASH', '💵 Cash', '#22C55E'], ['CARTE', '💳 Carte', '#3B82F6']].map(([k, l, c]) => (
                <button key={k} type="button" onClick={() => setMode(k)}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: `2px solid ${mode === k ? c : 'var(--mj-border)'}`, background: mode === k ? `${c}12` : 'var(--mj-white)', cursor: 'pointer', color: mode === k ? c : 'var(--mj-text-3)', fontWeight: mode === k ? 700 : 500, fontSize: 13, transition: 'var(--mj-ease-fast)', fontFamily: 'var(--mj-font)' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--mj-text-3)', marginBottom: 6 }}>Instructions de livraison (optionnel)</label>
            <textarea className="mj-input" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Étage, digicode, point de repère..." rows={2} style={{ resize: 'none', fontSize: 13 }} />
          </div>

          {/* Points fidélité */}
          {points >= 100 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--mj-amber-light)', border: '1px solid #FCD34D', borderRadius: 12, marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⭐</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#92400e' }}>Utiliser mes points</div>
                  <div style={{ fontSize: 10, color: 'var(--mj-text-3)' }}>Solde : {points} pts · Réduction max : {Math.min(Math.floor(points / 100) * 10, Math.floor(totalSansReduction))} MAD</div>
                </div>
              </div>
              <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--mj-red)' }} />
            </div>
          )}

          {/* Récap */}
          <div style={{ background: 'var(--mj-bg)', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--mj-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShoppingCart size={13} color="var(--mj-red)" /> Récapitulatif
            </div>
            {items.map(i => (
              <div key={i.produit.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mj-text-3)', marginBottom: 4, fontSize: 12 }}>
                <span>{i.produit.nom} <span style={{ opacity: 0.7 }}>×{i.quantite}</span></span>
                <span>{(parseFloat(i.produit.prix_effectif) * i.quantite).toFixed(2)} MAD</span>
              </div>
            ))}
            <hr className="mj-divider" style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mj-text-3)', fontSize: 12 }}>
              <span>Sous-total</span><span>{sousTotal.toFixed(2)} MAD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mj-text-3)', fontSize: 12 }}>
              <span>Frais de livraison</span><span>{fraisCalcules.toFixed(2)} MAD</span>
            </div>
            {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mj-green)', fontSize: 12 }}><span>Réduction</span><span>-{discount.toFixed(2)} MAD</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, paddingTop: 8, borderTop: '1px solid var(--mj-border)', marginTop: 6 }}>
              <span>Total</span><span style={{ color: 'var(--mj-red)' }}>{total.toFixed(2)} MAD</span>
            </div>
          </div>

          {error && <div style={{ color: 'var(--mj-danger)', fontSize: 13, marginBottom: 14, padding: '10px 14px', background: 'var(--mj-danger-light)', borderRadius: 8, border: '1px solid #FECACA' }}>{error}</div>}

          <button type="submit" className="mj-btn mj-btn-primary mj-btn-full" disabled={loading}>
            {loading ? '⏳ Envoi...' : `✓ Confirmer · ${total.toFixed(2)} MAD`}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ── BoutiqueCard ─────────────────────────────────────────────────────────── */
const BoutiqueCard = ({ b, onSelect, isFav, onFav }) => {
  const [logoErr, setLogoErr] = useState(false);
  const catIcon = CATEGORIES.find(c => c.key === b.categorie)?.icon || '🏪';
  const logoSrc = mediaUrl(b.logo);
  const hasLogo = !!logoSrc && !logoErr;

  return (
    <div className="mj-boutique-card mj-fade-in" onClick={onSelect}>
      {/* Cover — bannière ou dégradé avec emoji */}
      <div className="mj-boutique-cover">
        {hasLogo ? (
          <img
            src={logoSrc}
            alt={b.nom_boutique}
            onError={() => setLogoErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, opacity: 0.3,
            }}>
              {catIcon}
            </div>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 60% 40%, rgba(249,115,22,0.12) 0%, transparent 70%)',
            }} />
          </>
        )}
        {/* Dark gradient overlay bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }} />

        {/* Open/closed badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: b.is_open ? 'rgba(34,197,94,0.9)' : 'rgba(100,116,139,0.85)',
          backdropFilter: 'blur(6px)',
          color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
        }}>
          {b.is_open ? '● Ouvert' : '● Fermé'}
        </div>

        {/* Fav button */}
        <button
          onClick={onFav}
          style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%',
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: isFav ? 'var(--mj-red)' : '#CBD5E1',
          }}
        >
          <Heart size={13} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Info */}
      <div className="mj-boutique-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {/* Mini logo ou icône */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
            background: hasLogo ? 'transparent' : 'linear-gradient(135deg, var(--mj-red), #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            border: '1px solid #2D2D2D',
          }}>
            {hasLogo ? (
              <img src={logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : catIcon}
          </div>
          <div className="mj-boutique-name">{b.nom_boutique}</div>
        </div>
        <div className="mj-boutique-meta">
          <MapPin size={10} style={{ flexShrink: 0 }} />
          <span>{b.ville || b.adresse}</span>
          <span className="mj-boutique-rating">★ {b.note_moyenne?.toFixed(1) || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B' }}>
          <span>🚚 {b.frais_livraison_base} MAD · min {b.commande_minimum} MAD</span>
          <ChevronRight size={13} style={{ color: 'var(--mj-red)' }} />
        </div>
      </div>
    </div>
  );
};

/* ── CategorySidebar ──────────────────────────────────────────────────────── */
const CategorySidebar = ({ categorie, setCategorie }) => (
  <aside className="mj-cat-sidebar">
    <div className="mj-cat-sidebar-title">Catégories</div>
    {CATEGORIES.map(c => (
      <div
        key={c.key}
        className={`mj-cat-sidebar-item${categorie === c.key ? ' active' : ''}`}
        onClick={() => setCategorie(c.key)}
      >
        <span style={{ fontSize: 18 }}>{c.icon}</span>
        <span>{c.label}</span>
      </div>
    ))}
  </aside>
);

/* ── CatalogueTab ─────────────────────────────────────────────────────────── */
const CatalogueTab = ({ onCartOpen, categorie, groupCode, setGroupCode, groupMembers, selectedBoutique, setSelectedBoutique }) => {
  const [boutiques, setBoutiques] = useState([]);
  const [produits, setProduits] = useState([]);
  const [search, setSearch] = useState('');
  const [searchBoutique, setSearchBoutique] = useState('');
  const [filtreVille, setFiltreVille] = useState('');
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [loadingBoutiques, setLoadingBoutiques] = useState(true);
  const [loadingProduits, setLoadingProduits] = useState(false);
  const [noteMin, setNoteMin] = useState(0);
  const [fraisMax, setFraisMax] = useState(50);
  const [delaiMax, setDelaiMax] = useState(90);
  const [showFilters, setShowFilters] = useState(false);
  const { addItem, items, fondateur: cartFondateur } = useCartStore();
  const { toggleFavShop, isFavShop, toggleFavProduct, isFavProduct } = useFavoritesStore();
  const cartCount = items.reduce((s, i) => s + i.quantite, 0);
  const POIDS_APPROX = { ALIMENTAIRE: '0.3–2 kg', BOISSONS: '0.5–1.5 kg', HYGIENE: '0.1–0.5 kg', VETEMENTS: '0.2–1 kg', ELECTRONIQUE: '0.1–0.8 kg', MEDICAMENTS: '0.05–0.3 kg', AUTRE: '—' };

  useEffect(() => {
    setLoadingBoutiques(true);
    const params = { is_verified: true };
    if (categorie) params.categorie = categorie;
    fondateursApi.list(params).then(r => setBoutiques(r.data.results || r.data || [])).finally(() => setLoadingBoutiques(false));
  }, [categorie]);

  useEffect(() => {
    if (!selectedBoutique) return;
    setLoadingProduits(true);
    fondateursApi.produits(selectedBoutique.id).then(r => setProduits(r.data.results || r.data || [])).finally(() => setLoadingProduits(false));
  }, [selectedBoutique]);

  const villesDisponibles = React.useMemo(() => {
    const set = new Set();
    boutiques.forEach(b => { if (b.ville) set.add(b.ville); });
    return Array.from(set).sort();
  }, [boutiques]);

  const boutiquesFiltrees = React.useMemo(() => boutiques.filter(b => {
    if (filtreVille && b.ville !== filtreVille) return false;
    if (showOnlyOpen && !b.is_open) return false;
    if (searchBoutique) { const q = searchBoutique.toLowerCase(); if (!`${b.nom_boutique||''} ${b.ville||''} ${b.adresse||''}`.toLowerCase().includes(q)) return false; }
    if (b.note_moyenne < noteMin) return false;
    if (parseFloat(b.frais_livraison_base || 0) > fraisMax) return false;
    if (Math.round(20 + (b.rayon_livraison_km || 5) * 4) > delaiMax) return false;
    return true;
  }), [boutiques, filtreVille, searchBoutique, showOnlyOpen, noteMin, fraisMax, delaiMax]);

  const filteredProduits = produits.filter(p => p.disponible && p.en_stock && (search === '' || p.nom.toLowerCase().includes(search.toLowerCase())));

  /* ── Vue produits d'une boutique ── */
  if (selectedBoutique) return (
    <div className="mj-fade-in">
      {/* Back + boutique header */}
      <button className="mj-back-btn" onClick={() => { setSelectedBoutique(null); setProduits([]); setSearch(''); }}>
        <ArrowLeft size={14} /> Retour aux boutiques
      </button>

      <div className="mj-boutique-header-bar">
        {/* Logo réel ou avatar emoji */}
        <div className="mj-boutique-avatar-lg" style={{ overflow: 'hidden', padding: 0 }}>
          {mediaUrl(selectedBoutique.logo)
            ? <img src={mediaUrl(selectedBoutique.logo)} alt={selectedBoutique.nom_boutique} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
            : <span style={{ fontSize: 28 }}>{CATEGORIES.find(c => c.key === selectedBoutique.categorie)?.icon || '🏪'}</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            {selectedBoutique.nom_boutique}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--mj-text-3)', marginTop: 4, flexWrap: 'wrap' }}>
            <span><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{selectedBoutique.ville}</span>
            <Stars note={selectedBoutique.note_moyenne} />
            <span><Clock size={11} style={{ display: 'inline', marginRight: 3 }} />~{Math.round(20 + (selectedBoutique.rayon_livraison_km || 5) * 4)} min</span>
            <span style={{ color: 'var(--mj-red)', fontWeight: 700 }}>{selectedBoutique.frais_livraison_base} MAD livraison</span>
          </div>
        </div>
        {cartCount > 0 && (
          <button className="mj-btn mj-btn-primary" onClick={onCartOpen} style={{ position: 'relative', flexShrink: 0 }}>
            <ShoppingCart size={16} /> Panier
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>
          </button>
        )}
      </div>

      {cartFondateur && cartFondateur.id !== selectedBoutique.id && cartCount > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F59E0B' }}>
          ⚠️ Vous avez des articles de <strong>{cartFondateur.nom_boutique}</strong> dans votre panier.
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
        <input className="mj-header-search" placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 44, borderRadius: 12 }} />
      </div>

      {/* Products grid — Marjane Mall cards */}
      <div className="mj-products-grid">
        {loadingProduits ? Array(6).fill(0).map((_, i) => (
          <div key={i} className="mj-skeleton" style={{ height: 300, borderRadius: 16 }} />
        )) : filteredProduits.map(p => {
          const inCart = items.find(i => i.produit.id === p.id);
          const hasPrix_promo = p.prix_promo && parseFloat(p.prix_promo) < parseFloat(p.prix);
          const discount = hasPrix_promo ? Math.round((1 - parseFloat(p.prix_promo) / parseFloat(p.prix)) * 100) : 0;
          return (
            <div key={p.id} className="mj-mm-product-card mj-fade-in">
              {discount > 0 && <div className="mj-discount-badge">-{discount}%</div>}
              {p.nombre_commandes > 20 && !discount && <div className="mj-discount-badge" style={{ background: '#F59E0B' }}>🔥</div>}
              <button
                className={`mj-fav-btn${isFavProduct(p.id) ? ' active' : ''}`}
                onClick={() => toggleFavProduct(p, selectedBoutique.id)}
              >
                <Heart size={14} fill={isFavProduct(p.id) ? 'currentColor' : 'none'} />
              </button>
              <ProductImage produit={p} height={150} />
              <div className="mj-mm-product-body">
                <div className="mj-mm-product-name">{p.nom}</div>
                {hasPrix_promo ? (
                  <>
                    <div className="mj-mm-product-price-old">{p.prix} MAD</div>
                    <div className="mj-mm-product-price">{p.prix_promo} MAD</div>
                  </>
                ) : (
                  <div className="mj-mm-product-price">{p.prix_effectif} MAD</div>
                )}
                <div className="mj-mm-product-stock">
                  {p.stock > 10
                    ? <span style={{ color: '#22C55E' }}>✓ En stock</span>
                    : p.stock > 0
                      ? <span style={{ color: '#F59E0B' }}>⚠ {p.stock} restants</span>
                      : <span style={{ color: '#ef4444' }}>✗ Rupture</span>}
                </div>
                {inCart ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--mj-red)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                      ×{inCart.quantite}
                    </span>
                    <button className="mj-mm-add-btn" style={{ flex: 1 }} onClick={() => addItem(p, selectedBoutique)}>
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <button className="mj-mm-add-btn" onClick={() => addItem(p, selectedBoutique)} disabled={!p.en_stock}>
                    <Plus size={14} /> Ajouter
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!loadingProduits && filteredProduits.length === 0 && (
          <div style={{ gridColumn: '1/-1' }} className="mj-empty">
            <div className="mj-empty-icon">🔍</div>
            <div className="mj-empty-title">Aucun produit trouvé</div>
          </div>
        )}
      </div>
    </div>
  );

  /* ── Vue liste boutiques ── */
  return (
    <div className="mj-fade-in">

      {/* Hero Banner — photo Unsplash + overlay sombre */}
      <div className="mj-hero-banner" style={{ padding: 0, minHeight: 220, overflow: 'hidden' }}>
        {/* Photo de fond */}
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop"
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', display: 'block', filter: 'brightness(0.35)',
          }}
        />
        {/* Overlay dégradé orange */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(120deg, rgba(249,115,22,0.45) 0%, rgba(17,17,17,0.7) 60%, rgba(17,17,17,0.9) 100%)',
        }} />
        {/* Contenu */}
        <div className="mj-hero-content" style={{ padding: '36px 40px', position: 'relative', zIndex: 2 }}>
          <div className="mj-hero-title">Livraison rapide<br /><span>chez vous</span></div>
          <div className="mj-hero-sub">Commandez auprès de boutiques locales vérifiées</div>
          <button className="mj-hero-cta">
            <ShoppingCart size={16} />
            {boutiques.length} boutiques disponibles
          </button>
        </div>
      </div>

      {/* Features strip */}
      <div className="mj-features-strip" style={{ marginBottom: 28 }}>
        {[
          { icon: '🚚', label: 'Livraison rapide', sub: '30 à 60 min' },
          { icon: '🔒', label: 'Paiement sécurisé', sub: 'Cash ou carte' },
          { icon: '⭐', label: 'Boutiques vérifiées', sub: 'Qualité garantie' },
          { icon: '📍', label: 'Suivi GPS live', sub: 'Temps réel' },
          { icon: '🎁', label: 'Points fidélité', sub: 'À chaque commande' },
        ].map((f, i) => (
          <div key={i} className="mj-feature-item">
            <div className="mj-feature-icon">{f.icon}</div>
            <div className="mj-feature-label">{f.label}</div>
            <div className="mj-feature-sub">{f.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '2 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input className="mj-header-search" placeholder="Rechercher une boutique…" value={searchBoutique} onChange={e => setSearchBoutique(e.target.value)} style={{ paddingLeft: 42, borderRadius: 12, height: 38 }} />
        </div>
        <select
          value={filtreVille} onChange={e => setFiltreVille(e.target.value)}
          style={{ height: 38, background: '#1C1C1C', border: '1px solid #2D2D2D', borderRadius: 12, color: '#CBD5E1', fontSize: 13, padding: '0 12px', cursor: 'pointer', fontFamily: 'var(--mj-font)' }}
        >
          <option value="">🌍 Toutes les villes</option>
          {villesDisponibles.map(v => <option key={v} value={v}>📍 {v}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#94A3B8', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showOnlyOpen} onChange={e => setShowOnlyOpen(e.target.checked)} style={{ accentColor: 'var(--mj-red)' }} />
          🟢 Ouvertes
        </label>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ height: 38, padding: '0 14px', background: showFilters ? 'rgba(249,115,22,0.15)' : '#1C1C1C', border: `1px solid ${showFilters ? 'var(--mj-red)' : '#2D2D2D'}`, borderRadius: 12, color: showFilters ? 'var(--mj-red)' : '#94A3B8', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mj-font)' }}
        >
          <SlidersHorizontal size={14} /> Filtres
        </button>
        {(filtreVille || searchBoutique || showOnlyOpen || noteMin > 0 || fraisMax < 50 || delaiMax < 90) && (
          <button onClick={() => { setFiltreVille(''); setSearchBoutique(''); setShowOnlyOpen(false); setNoteMin(0); setFraisMax(50); setDelaiMax(90); }}
            style={{ height: 38, padding: '0 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#ef4444', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mj-font)' }}>
            <X size={12} /> Réinitialiser
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748B', fontWeight: 600 }}>
          {boutiquesFiltrees.length} boutiques
        </span>
      </div>

      {showFilters && (
        <div className="mj-card mj-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, padding: 18, marginBottom: 20 }}>
          {[
            { label: 'Note minimale', value: `${noteMin} ★`, min: 0, max: 5, step: 0.5, v: noteMin, sv: setNoteMin, color: '#F59E0B' },
            { label: 'Frais max', value: `${fraisMax} MAD`, min: 0, max: 50, step: 1, v: fraisMax, sv: setFraisMax, color: '#22C55E' },
            { label: 'Délai max', value: `${delaiMax} min`, min: 15, max: 90, step: 5, v: delaiMax, sv: setDelaiMax, color: '#F59E0B' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--mj-text-3)' }}>
                <span>{f.label}</span>
                <strong style={{ color: f.color }}>{f.value}</strong>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={f.v} onChange={e => f.sv(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--mj-red)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Section title */}
      <div className="mj-section-bar" style={{ marginBottom: 16 }}>
        <div className="mj-section-title">
          {categorie ? (CATEGORIES.find(c => c.key === categorie)?.label || 'Boutiques') : 'Toutes les boutiques'}
        </div>
        <span style={{ fontSize: 12, color: '#64748B' }}>{boutiquesFiltrees.length} résultats</span>
      </div>

      {/* Boutiques grid — Marjane Mall cards */}
      {loadingBoutiques ? (
        <div className="mj-boutiques-grid">
          {Array(6).fill(0).map((_, i) => <div key={i} className="mj-skeleton" style={{ height: 210, borderRadius: 16 }} />)}
        </div>
      ) : boutiquesFiltrees.length === 0 ? (
        <div className="mj-empty">
          <div className="mj-empty-icon">🔍</div>
          <div className="mj-empty-title">Aucune boutique correspondante</div>
          <div className="mj-empty-desc">Essayez de modifier vos filtres.</div>
        </div>
      ) : (
        <div className="mj-boutiques-grid">
          {boutiquesFiltrees.map(b => (
            <BoutiqueCard
              key={b.id}
              b={b}
              onSelect={() => setSelectedBoutique(b)}
              isFav={isFavShop(b.id)}
              onFav={e => { e.stopPropagation(); toggleFavShop(b); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── CommandesTab ─────────────────────────────────────────────────────────── */
const CommandesTab = ({ onNavigateSuivi, onOpenChat }) => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchCommandes = () => {
    setLoading(true);
    commandesApi.list().then(r => setCommandes(r.data.results || r.data || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCommandes(); }, []);
  useEffect(() => { const id = setInterval(fetchCommandes, 20000); return () => clearInterval(id); }, []);

  const handleCancel = async (cmd) => {
    if (!window.confirm(`Annuler la commande ${cmd.reference} ?`)) return;
    setCancelling(cmd.id);
    try { await commandesApi.annuler(cmd.id); showToast('Commande annulée'); fetchCommandes(); }
    catch (e) { showToast(e.response?.data?.error || 'Impossible d\'annuler', 'error'); }
    finally { setCancelling(null); }
  };

  const ProgressBar = ({ statut }) => {
    const step = STATUT_CONFIG[statut]?.step || 0;
    const steps = ['EN_ATTENTE', 'VALIDEE', 'EN_PREPARATION', 'EN_ROUTE', 'LIVREE'];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
        {steps.map((s, i) => {
          const done = step > i; const active = step === i + 1;
          return (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: done || active ? 'var(--mj-red)' : 'var(--mj-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: done || active ? 'white' : 'var(--mj-text-4)', border: active ? '2px solid var(--mj-red-dark)' : 'none', transition: 'var(--mj-ease)' }}>
                  {done ? '✓' : STATUT_CONFIG[s]?.icon}
                </div>
                <div style={{ fontSize: 9, color: active ? 'var(--mj-red)' : 'var(--mj-text-4)', marginTop: 3, textAlign: 'center', maxWidth: 50 }}>{STATUT_CONFIG[s]?.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? 'var(--mj-red)' : 'var(--mj-border)', minWidth: 16, marginBottom: 14, transition: 'var(--mj-ease)' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="mj-empty"><RefreshCw size={28} className="mj-spin" style={{ margin: '0 auto 12px' }} /></div>;

  if (commandes.length === 0) return (
    <div className="mj-empty">
      <div className="mj-empty-icon"><Package size={48} /></div>
      <div className="mj-empty-title">Aucune commande</div>
      <div className="mj-empty-desc">Explorez notre catalogue et passez votre première commande !</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {toast && <div className={`mj-toast ${toast.type === 'error' ? 'mj-toast-error' : 'mj-toast-success'}`}>{toast.type === 'error' ? '❌' : '✅'} {toast.msg}</div>}
      {commandes.map(cmd => {
        const isExpanded = expanded === cmd.id;
        const canCancel = !['LIVREE', 'ANNULEE'].includes(cmd.statut);
        const isActive = ['VALIDEE', 'EN_PREPARATION', 'EN_ROUTE'].includes(cmd.statut);
        const sc = STATUT_CONFIG[cmd.statut] || {};
        return (
          <div key={cmd.id} className="mj-order-card mj-fade-in" style={{ borderLeft: `4px solid ${sc.color || 'var(--mj-border-md)'}`, background: isActive ? '#FFFBFB' : 'var(--mj-white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 14, color: 'var(--mj-red)' }}>{cmd.reference}</div>
                <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginTop: 2 }}>
                  🏪 {cmd.fondateur_detail?.nom_boutique} · {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--mj-text)', fontSize: 16 }}>{cmd.total_price} MAD</div>
                <span className="mj-badge" style={{ background: `${sc.color}18`, color: sc.color, marginTop: 4 }}>
                  {sc.icon} {sc.label}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--mj-text-3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <MapPin size={11} style={{ color: 'var(--mj-red)' }} /> {cmd.adresse_livraison}
            </div>

            {cmd.statut !== 'ANNULEE' && <ProgressBar statut={cmd.statut} />}

            {cmd.transporteur_detail && cmd.statut === 'EN_ROUTE' && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--mj-red-light)', border: '1px solid #FECACA', borderRadius: 10, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🛵</span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--mj-red)' }}>{cmd.transporteur_detail.first_name} {cmd.transporteur_detail.last_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--mj-text-3)' }}>Votre livreur en route</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onOpenChat(cmd)} className="mj-btn mj-btn-sm" style={{ background: 'white', border: '1px solid var(--mj-border)', color: 'var(--mj-text)', gap: 4 }}>
                    <MessageSquare size={11} /> Chat
                  </button>
                  <button onClick={onNavigateSuivi} className="mj-btn mj-btn-sm mj-btn-primary" style={{ gap: 4 }}>
                    <MapIcon size={11} /> Suivre
                  </button>
                </div>
              </div>
            )}

            {cmd.statut === 'LIVREE' && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--mj-green-light)', borderRadius: 10, fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <CheckCircle size={13} /> Livré avec succès le {cmd.livree_at ? new Date(cmd.livree_at).toLocaleString('fr-FR') : ''}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setExpanded(isExpanded ? null : cmd.id)} className="mj-btn mj-btn-secondary mj-btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                {isExpanded ? '▲ Masquer' : `▼ Voir détails (${cmd.lignes?.length || 0} produits)`}
              </button>
              {canCancel && (
                <button onClick={() => handleCancel(cmd)} disabled={cancelling === cmd.id} className="mj-btn mj-btn-sm" style={{ background: 'var(--mj-danger-light)', border: '1px solid #FECACA', color: 'var(--mj-danger)' }}>
                  {cancelling === cmd.id ? '...' : <><X size={12} /> Annuler</>}
                </button>
              )}
            </div>

            {isExpanded && cmd.lignes?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--mj-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mj-text-4)', letterSpacing: '0.05em', marginBottom: 8 }}>PRODUITS COMMANDÉS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                  {cmd.lignes.map((l, i) => {
                    const prod = { id: l.produit, categorie: l.produit_detail?.categorie || 'AUTRE' };
                    const [g1, g2] = PRODUCT_GRADIENTS[prod.categorie] || PRODUCT_GRADIENTS.AUTRE;
                    const detailImg = mediaUrl(l.produit_detail?.image_principale || l.produit_detail?.image);
                    return (
                      <div key={i} style={{ background: 'var(--mj-bg)', borderRadius: 10, padding: 10, display: 'flex', gap: 8, alignItems: 'center', border: '1px solid var(--mj-border)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: `linear-gradient(135deg, ${g1}, ${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, overflow: 'hidden' }}>
                          {detailImg
                            ? <img src={detailImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                            : getProductEmoji(prod.categorie, prod.id)
                          }
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--mj-text)' }}>{l.produit_detail?.nom || `#${l.produit}`}</div>
                          <div style={{ fontSize: 10, color: 'var(--mj-text-4)' }}>×{l.quantite}</div>
                          <div style={{ fontSize: 11, color: 'var(--mj-red)', fontWeight: 700 }}>{l.sous_total} MAD</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── SuiviTab ─────────────────────────────────────────────────────────────── */
const fetchClientRoute = async (from, to) => {
  if (!from || !to) return null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]) return { coords: data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]), distance_km: (data.routes[0].distance / 1000).toFixed(1), duration_min: Math.round(data.routes[0].duration / 60) };
  } catch { /* ignore */ }
  return null;
};

const SuiviTab = ({ user, onOpenChat }) => {
  const [livraisons, setLivraisons] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [routes, setRoutes] = useState({});
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState({
    maPosition:    { label: 'Ma position',              active: true,  emoji: '📍', color: '#3B82F6' },
    livraisons:    { label: 'Mes livraisons en cours',  active: true,  emoji: '🛵', color: '#E30613' },
    transporteurs: { label: 'Transporteurs',            active: true,  emoji: '🚗', color: '#8B5CF6' },
    boutiques:     { label: 'Boutiques ouvertes',       active: false, emoji: '🏪', color: '#22C55E' },
  });
  const toggleLayer = (key) => setLayers(l => ({ ...l, [key]: { ...l[key], active: !l[key].active } }));

  const fetchData = () => {
    Promise.all([commandesApi.list(), fondateursApi.list({ is_verified: true, is_open: true })])
      .then(([cmdRes, bRes]) => {
        const all = cmdRes.data.results || cmdRes.data || [];
        setLivraisons(all.filter(c => ['EN_PREPARATION', 'EN_ROUTE'].includes(c.statut)));
        setBoutiques((bRes.data.results || bRes.data || []).slice(0, 30));
      }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true); fetchData();
    const id = setInterval(fetchData, 20000);
    navigator.geolocation?.getCurrentPosition(pos => setUserPos([pos.coords.latitude, pos.coords.longitude]), () => setUserPos([33.5731, -7.5898]), { enableHighAccuracy: true });
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    livraisons.forEach(async cmd => {
      if (cmd.statut !== 'EN_ROUTE' || routes[cmd.id]) return;
      const tPos = cmd.transporteur_detail ? [cmd.transporteur_detail.latitude, cmd.transporteur_detail.longitude] : null;
      const cPos = cmd.latitude_livraison && cmd.longitude_livraison ? [cmd.latitude_livraison, cmd.longitude_livraison] : userPos;
      if (tPos?.[0] && cPos?.[0]) { const r = await fetchClientRoute(tPos, cPos); if (r) setRoutes(prev => ({ ...prev, [cmd.id]: r })); }
    });
  }, [livraisons, userPos]);

  return (
    <div className="mj-fade-in">
      {/* Calques */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(layers).map(([key, { label, active, emoji, color }]) => (
          <button key={key} onClick={() => toggleLayer(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${active ? color : 'var(--mj-border)'}`, background: active ? `${color}12` : 'var(--mj-white)', cursor: 'pointer', color: active ? color : 'var(--mj-text-3)', fontSize: 12, fontWeight: active ? 700 : 400, transition: 'var(--mj-ease-fast)', fontFamily: 'var(--mj-font)' }}>
            {emoji} {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--mj-text-3)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mj-green)', display: 'inline-block' }} />
          {livraisons.length} en route
        </div>
      </div>

      {/* Carte */}
      <div className="mj-card" style={{ height: 440, padding: 4, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--mj-text-4)' }}>
            <RefreshCw size={28} className="mj-spin" />
            <span style={{ fontSize: 13 }}>Chargement de la carte...</span>
          </div>
        ) : (
          <MapContainer center={userPos || [33.5731, -7.5898]} zoom={userPos ? 13 : 6} style={{ height: '100%', width: '100%', borderRadius: 12 }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
            {layers.maPosition.active && userPos && (
              <>
                <Marker position={userPos} icon={iconBlue}><Popup><div><strong>📍 Votre position</strong><br />{user?.first_name} {user?.last_name}</div></Popup></Marker>
                <Circle center={userPos} radius={400} pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 2, dashArray: '6 3' }} />
              </>
            )}
            {layers.livraisons.active && livraisons.map(cmd => {
              const lat = cmd.latitude_livraison; const lon = cmd.longitude_livraison;
              const tLat = cmd.transporteur_detail?.latitude; const tLon = cmd.transporteur_detail?.longitude;
              return (
                <React.Fragment key={`l-${cmd.id}`}>
                  {lat && lon && <Marker position={[lat, lon]} icon={iconRed}><Popup><div><strong>📍 Adresse de livraison</strong><br /><span style={{ fontSize: 12 }}>{cmd.adresse_livraison}</span><br /><strong style={{ color: 'var(--mj-red)' }}>{cmd.total_price} MAD</strong></div></Popup></Marker>}
                  {layers.transporteurs.active && cmd.statut === 'EN_ROUTE' && tLat && tLon && (
                    <>
                      <Marker position={[tLat, tLon]} icon={iconOrange}><Popup><div><strong>🛵 Votre livreur</strong><br /><span style={{ fontSize: 12 }}>{cmd.transporteur_detail.first_name} {cmd.transporteur_detail.last_name}</span></div></Popup></Marker>
                      <Circle center={[tLat, tLon]} radius={150} pathOptions={{ color: '#E30613', fillColor: '#E30613', fillOpacity: 0.12, weight: 2 }} />
                    </>
                  )}
                  {routes[cmd.id] && cmd.statut === 'EN_ROUTE' && <Polyline positions={routes[cmd.id].coords} pathOptions={{ color: '#E30613', weight: 4, opacity: 0.8, dashArray: '8 6' }} />}
                </React.Fragment>
              );
            })}
            {layers.boutiques.active && boutiques.map(b => b.latitude && b.longitude ? (
              <Marker key={b.id} position={[b.latitude, b.longitude]} icon={iconGreen}><Popup><div><strong>🏪 {b.nom_boutique}</strong><br /><span style={{ fontSize: 12 }}>{b.categorie} · {b.ville}</span><br /><span style={{ fontSize: 12, color: 'var(--mj-green)' }}>● Ouvert</span></div></Popup></Marker>
            ) : null)}
          </MapContainer>
        )}
      </div>

      {/* Liste */}
      {livraisons.length === 0 ? (
        <div className="mj-empty" style={{ marginTop: 24 }}>
          <div className="mj-empty-icon"><CheckCircle size={36} color="var(--mj-green)" /></div>
          <div className="mj-empty-title">Aucune livraison en cours</div>
          <div className="mj-empty-desc">Toutes vos commandes ont été livrées 🎉</div>
        </div>
      ) : (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {livraisons.map(cmd => {
            const route = routes[cmd.id];
            const isEnRoute = cmd.statut === 'EN_ROUTE';
            return (
              <div key={cmd.id} className="mj-order-card mj-fade-in" style={{ borderLeft: `4px solid ${isEnRoute ? 'var(--mj-red)' : '#8B5CF6'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 50, height: 50, background: isEnRoute ? 'var(--mj-red-light)' : '#F3E8FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    {isEnRoute ? '🛵' : '👨‍🍳'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, color: 'var(--mj-red)', fontFamily: 'monospace' }}>{cmd.reference}</strong>
                      <span className="mj-badge" style={{ background: isEnRoute ? 'var(--mj-red-light)' : '#F3E8FF', color: isEnRoute ? 'var(--mj-red)' : '#7C3AED' }}>
                        {isEnRoute ? '🚚 EN ROUTE' : '👨‍🍳 PRÉPARATION'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🏪 {cmd.fondateur_detail?.nom_boutique}</div>
                    {cmd.transporteur_detail && (
                      <div style={{ fontSize: 11, color: 'var(--mj-text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>👤 {cmd.transporteur_detail.first_name} {cmd.transporteur_detail.last_name}</span>
                        <button onClick={() => onOpenChat(cmd)} className="mj-btn mj-btn-sm" style={{ background: 'var(--mj-red-light)', border: '1px solid #FECACA', color: 'var(--mj-red)', padding: '2px 10px', fontSize: 10, height: 'auto' }}>
                          <MessageSquare size={10} /> Chat
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--mj-text)', fontSize: 15 }}>{Math.round(cmd.total_price)} MAD</div>
                    {route && <div style={{ fontSize: 11, color: 'var(--mj-text-4)', marginTop: 4 }}>⏱ <strong style={{ color: 'var(--mj-red)' }}>{route.duration_min} min</strong></div>}
                  </div>
                </div>
                {route && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--mj-border)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mj-text-3)' }}>
                    <span>📏 Restant : <strong style={{ color: 'var(--mj-blue)' }}>{route.distance_km} km</strong></span>
                    <span>🚚 Arrivée : <strong style={{ color: 'var(--mj-green)' }}>{new Date(Date.now() + route.duration_min * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                )}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--mj-border)' }}>
                  <SuiviTimeline commande={cmd} livraison={cmd.livraison} onContact={cmd.transporteur_detail ? () => onOpenChat(cmd) : null} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── ProfilTab ────────────────────────────────────────────────────────────── */
const ProfilTab = ({ user }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
    <div className="mj-card" style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 20, padding: 22 }}>
      <div className="mj-avatar" style={{ width: 72, height: 72 }}>
        {user?.first_name?.[0]}{user?.last_name?.[0]}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--mj-text)' }}>{user?.first_name} {user?.last_name}</div>
        <div style={{ color: 'var(--mj-text-3)', marginTop: 4 }}>{user?.email}</div>
        <div style={{ color: 'var(--mj-text-4)', fontSize: 13, marginTop: 2 }}>{user?.phone || 'Téléphone non renseigné'}</div>
      </div>
    </div>
    {[
      { label: 'Nom d\'utilisateur', value: `@${user?.username}` },
      { label: 'Rôle', value: 'Client DeliverMap' },
      { label: 'Membre depuis', value: user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—' },
      { label: 'Adresses sauvegardées', value: user?.adresses_sauvegardees?.length || 0 },
    ].map(({ label, value }) => (
      <div key={label} className="mj-stat-card">
        <div style={{ fontSize: 12, color: 'var(--mj-text-4)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontWeight: 700, color: 'var(--mj-text)', fontSize: 15 }}>{value}</div>
      </div>
    ))}
  </div>
);

/* ── TicketsTab ───────────────────────────────────────────────────────────── */
const TICKET_CATEGORIES = [
  { value: 'livraison', label: 'Problème de livraison' },
  { value: 'paiement', label: 'Problème de paiement' },
  { value: 'produit', label: 'Produit endommagé / manquant' },
  { value: 'retard', label: 'Retard de livraison' },
  { value: 'annulation', label: 'Annulation de commande' },
  { value: 'autre', label: 'Autre' },
];

const TicketsTab = ({ userId }) => {
  const [tickets, setTickets] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sujet, setSujet] = React.useState('');
  const [categorie, setCategorie] = React.useState('autre');
  const [desc, setDesc] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    ticketsApi.list().then(r => setTickets(r.data?.results || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!sujet.trim()) return;
    setSubmitting(true);
    try {
      await ticketsApi.create({ titre: sujet, categorie, description: desc });
      const r = await ticketsApi.list();
      setTickets(r.data?.results || r.data || []);
      setSujet(''); setDesc('');
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="mj-card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="mj-section-title" style={{ marginBottom: 16 }}>Nouveau ticket</div>
        <input value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Sujet du ticket" className="mj-input" style={{ marginBottom: 10 }} />
        <select value={categorie} onChange={e => setCategorie(e.target.value)} className="mj-select" style={{ marginBottom: 10 }}>
          {TICKET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description détaillée..." rows={3} className="mj-input" style={{ marginBottom: 14, resize: 'vertical' }} />
        <button onClick={handleSubmit} disabled={submitting || !sujet.trim()} className="mj-btn mj-btn-primary">
          {submitting ? 'Envoi...' : '📨 Envoyer le ticket'}
        </button>
      </div>

      {loading ? <div className="mj-empty"><RefreshCw size={24} className="mj-spin" style={{ margin: '0 auto' }} /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tickets.length === 0 && <div className="mj-empty"><div className="mj-empty-title">Aucun ticket</div></div>}
          {tickets.map(t => (
            <div key={t.id} className="mj-ticket-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--mj-text)', fontSize: 14 }}>#{t.id} — {t.sujet}</span>
                <span className="mj-badge" style={{ background: t.statut === 'ouvert' ? 'var(--mj-red-light)' : 'var(--mj-green-light)', color: t.statut === 'ouvert' ? 'var(--mj-red)' : '#15803d' }}>
                  {t.statut}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--mj-text-3)' }}>{t.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────────────────────── */
const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('catalogue');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [categorie, setCategorie] = useState('');
  const { items } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.quantite, 0);
  const [selectedBoutique, setSelectedBoutique] = useState(null);
  const [groupCode, setGroupCode] = useState('');
  const [groupMembers, setGroupMembers] = useState(1);
  const [activeChatCommande, setActiveChatCommande] = useState(null);
  const [activeDelivery, setActiveDelivery] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await commandesApi.list({ statut: 'EN_ROUTE', page_size: 5 });
        const rows = res.data.results || res.data || [];
        if (!cancelled) setActiveDelivery(rows.find(c => c.transporteur_detail) || null);
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="mj-page mj-client-theme" style={{ padding: 0 }}>

      {/* ── Dark Header ── */}
      <header className="mj-client-header">
        <div className="mj-client-logo">🚀 DeliverMap</div>

        <div className="mj-header-search-wrap">
          <input
            className="mj-header-search"
            placeholder="Rechercher boutiques, produits…"
            onFocus={() => setTab('catalogue')}
          />
          <Search size={16} className="mj-header-search-icon" />
        </div>

        <div className="mj-header-actions">
          {/* Favoris */}
          <button className="mj-header-icon-btn" onClick={() => setTab('favoris')} title="Mes favoris">
            <Heart size={18} />
          </button>

          {/* Panier */}
          <button className="mj-header-icon-btn" onClick={() => setCartOpen(true)} title="Mon panier">
            <ShoppingCart size={18} />
            {cartCount > 0 && <span className="mj-header-cart-badge">{cartCount}</span>}
          </button>


          {/* User */}
          <div className="mj-header-user" onClick={() => setTab('profil')}>
            <User size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <span className="mj-header-user-name">{user?.first_name || user?.username}</span>
          </div>

          {/* Logout */}
          <button
            className="mj-header-icon-btn"
            onClick={() => { logout(); navigate('/login'); }}
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="mj-client-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`mj-client-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={15} />
              {t.label}
              {t.id === 'commandes' && activeDelivery && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block', marginLeft: 2, boxShadow: '0 0 5px #22C55E' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Content ── */}
      {tab === 'catalogue' ? (
        <div className="mj-catalogue-layout">
          <CategorySidebar categorie={categorie} setCategorie={setCategorie} />
          <div className="mj-catalogue-main">
            <CatalogueTab
              onCartOpen={() => setCartOpen(true)}
              categorie={categorie}
              groupCode={groupCode}
              setGroupCode={setGroupCode}
              groupMembers={groupMembers}
              selectedBoutique={selectedBoutique}
              setSelectedBoutique={setSelectedBoutique}
            />
          </div>
        </div>
      ) : (
        <main style={{ padding: '20px', maxWidth: 1000, margin: '0 auto' }}>
          {tab === 'commandes' && <CommandesTab onNavigateSuivi={() => setTab('suivi')} onOpenChat={setActiveChatCommande} />}
          {tab === 'suivi'     && <SuiviTab user={user} onOpenChat={setActiveChatCommande} />}
          {tab === 'favoris'   && (
            <div className="mj-empty">
              <div className="mj-empty-icon">❤️</div>
              <div className="mj-empty-title">Mes favoris</div>
              <div className="mj-empty-desc">
                <a href="/client/favoris" style={{ color: 'var(--mj-red)', fontWeight: 600 }}>Voir mes favoris →</a>
              </div>
            </div>
          )}
          {tab === 'tickets'   && <TicketsTab userId={user?.id} />}
          {tab === 'profil'    && <ProfilTab user={user} />}
        </main>
      )}

      {/* Sidebars & modals */}
      {cartOpen     && <CartSidebar onClose={() => setCartOpen(false)} onOrder={() => { setCartOpen(false); setCheckoutOpen(true); }} />}
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} onSuccess={() => { setCheckoutOpen(false); setTab('commandes'); }} />}
      {activeChatCommande && <ChatSidebar commande={activeChatCommande} onClose={() => setActiveChatCommande(null)} />}

      {/* Floating chat button */}
      {/* Chat livreur — positionné juste au-dessus du bouton chatbot (bottom 24 + 54px + 12 gap) */}
      {activeDelivery && !activeChatCommande && (
        <button
          onClick={() => setActiveChatCommande(activeDelivery)}
          title="Chat avec le livreur"
          style={{
            position: 'fixed', bottom: 90, right: 24, zIndex: 9998,
            background: 'var(--mj-red)', border: 'none', borderRadius: 28,
            padding: '11px 18px', color: 'white', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(249,115,22,0.55)',
            animation: 'mj-pulse-red 2.5s ease-in-out infinite',
            fontFamily: 'var(--mj-font)',
          }}
        >
          <MessageSquare size={15} />
          <span>Chat livreur</span>
          <span style={{ background: '#22C55E', borderRadius: '50%', width: 8, height: 8, display: 'inline-block', boxShadow: '0 0 6px #22C55E' }} />
        </button>
      )}

      <ChatbotWidget />
    </div>
  );
};

export default ClientDashboard;
