import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Package, Map as MapIcon, User, LogOut, Star, Plus, Minus,
  Trash2, MapPin, Clock, CheckCircle, Truck, Tag, X, Search, ChevronRight,
  Heart, Zap, ArrowLeft, CreditCard, Gift, RefreshCw, Navigation,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fondateursApi, commandesApi } from '../../services/api';
import useCartStore from '../../stores/cartStore';
import ChatbotWidget from '../../components/ChatbotWidget';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
const makeIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const iconBlue = makeIcon('blue');
const iconGreen = makeIcon('green');
const iconOrange = makeIcon('orange');
const iconRed = makeIcon('red');

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: '', label: 'Tout', icon: '🏪' },
  { key: 'RESTAURATION', label: 'Restauration', icon: '🍽️' },
  { key: 'SUPERMARCHE', label: 'Supermarché', icon: '🛒' },
  { key: 'PHARMACIE', label: 'Pharmacie', icon: '💊' },
  { key: 'ELECTRONIQUE', label: 'Électronique', icon: '📱' },
  { key: 'BOUTIQUE', label: 'Mode', icon: '👗' },
];

// ─── Photos imaginaires (Unsplash via Picsum + gradient overlay) ─────────────
const PRODUCT_GRADIENTS = {
  ALIMENTAIRE:  ['#f59e0b', '#ef4444'],
  BOISSONS:     ['#06b6d4', '#3b82f6'],
  HYGIENE:      ['#10b981', '#22d3ee'],
  MEDICAMENTS:  ['#3b82f6', '#8b5cf6'],
  ELECTRONIQUE: ['#8b5cf6', '#ec4899'],
  VETEMENTS:    ['#ec4899', '#f59e0b'],
  AUTRE:        ['#64748b', '#94a3b8'],
};
const PRODUCT_EMOJIS = {
  ALIMENTAIRE:  ['🍕', '🍔', '🥗', '🥖', '🧀', '🍳', '🍲', '🍱', '🍜'],
  BOISSONS:     ['🥤', '☕', '🧃', '🍵', '🥛', '🍶'],
  HYGIENE:      ['🧴', '🧼', '🪥', '🧻', '🧽'],
  MEDICAMENTS:  ['💊', '🩹', '🩺', '💉', '🧪'],
  ELECTRONIQUE: ['📱', '💻', '⌚', '🎧', '📷', '🔌', '🖥️'],
  VETEMENTS:    ['👗', '👔', '👟', '👜', '🧢', '🧥', '👖'],
  AUTRE:        ['📦', '🛍️', '🎁', '🪴'],
};
const getProductEmoji = (categorie, id) => {
  const list = PRODUCT_EMOJIS[categorie] || PRODUCT_EMOJIS.AUTRE;
  return list[(id || 0) % list.length];
};
const ProductImage = ({ produit, height = 140 }) => {
  const cat = produit.categorie || 'AUTRE';
  const [g1, g2] = PRODUCT_GRADIENTS[cat] || PRODUCT_GRADIENTS.AUTRE;
  const emoji = getProductEmoji(cat, produit.id);
  return (
    <div style={{
      width: '100%', height, borderRadius: '12px 12px 0 0',
      background: `linear-gradient(135deg, ${g1}, ${g2})`,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Texture overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)',
      }} />
      <span style={{ fontSize: 56, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))', position: 'relative', zIndex: 1 }}>
        {emoji}
      </span>
      {produit.prix_promo && parseFloat(produit.prix_promo) < parseFloat(produit.prix) && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(239,68,68,0.95)', color: 'white',
          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
          letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
        }}>
          🔥 PROMO
        </div>
      )}
    </div>
  );
};

const STATUT_CONFIG = {
  EN_ATTENTE:     { label: 'En attente',     cls: 'badge-warning',   icon: '⏳', step: 1 },
  VALIDEE:        { label: 'Validée',         cls: 'badge-info',      icon: '✅', step: 2 },
  EN_PREPARATION: { label: 'En préparation', cls: 'badge-primary',   icon: '👨‍🍳', step: 3 },
  EN_ROUTE:       { label: 'En route',        cls: 'badge-success',   icon: '🛵', step: 4 },
  LIVREE:         { label: 'Livrée',          cls: 'badge-success',   icon: '🎉', step: 5 },
  ANNULEE:        { label: 'Annulée',         cls: 'badge-danger',    icon: '❌', step: 0 },
};

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'catalogue', label: 'Catalogue', icon: ShoppingCart },
  { id: 'commandes', label: 'Mes commandes', icon: Package },
  { id: 'suivi',     label: 'Suivi live',    icon: MapIcon },
  { id: 'profil',    label: 'Mon profil',    icon: User },
];

// ─── Star Rating ─────────────────────────────────────────────────────────────
const Stars = ({ note, size = 12 }) => (
  <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={size} fill={i <= Math.round(note) ? '#f59e0b' : 'transparent'} color={i <= Math.round(note) ? '#f59e0b' : '#475569'} />
    ))}
    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '3px' }}>{note?.toFixed(1)}</span>
  </span>
);

// ─── Panier flottant ─────────────────────────────────────────────────────────
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
      if (data.valide) {
        setDiscount(data.reduction);
        setPromoApplied(true);
        setPromoError('');
      } else {
        setPromoError(data.message || 'Code invalide');
      }
    } catch { setPromoError('Code invalide ou expiré'); }
  };

  if (items.length === 0) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div className="glass-card" style={{ width: '380px', height: '100vh', borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <ShoppingCart size={48} style={{ opacity: 0.3 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Votre panier est vide</p>
        <button className="btn btn-secondary" onClick={onClose}>Continuer les achats</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div className="glass-card animate-fade-in" style={{ width: '400px', height: '100vh', borderRadius: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Mon panier</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {fondateur?.nom_boutique} · {items.length} article{items.length > 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {items.map(({ produit, quantite }) => {
            const [g1, g2] = PRODUCT_GRADIENTS[produit.categorie] || PRODUCT_GRADIENTS.AUTRE;
            return (
            <div key={produit.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
              <div style={{
                width: 48, height: 48,
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>
                {getProductEmoji(produit.categorie, produit.id)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{produit.nom}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{produit.fondateur_nom}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => updateQuantite(produit.id, quantite - 1)}
                      style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{quantite}</span>
                    <button onClick={() => updateQuantite(produit.id, quantite + 1)}
                      style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(59,130,246,0.3)', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>{(parseFloat(produit.prix_effectif) * quantite).toFixed(2)} MAD</span>
                    <button onClick={() => removeItem(produit.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Code promo */}
        <div style={{ padding: '0 1rem', marginBottom: '0.75rem' }}>
          {!promoApplied ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="glass-input" placeholder="Code promo..." value={codePromo}
                onChange={e => setCodePromo(e.target.value)} style={{ flex: 1, fontSize: '13px' }} />
              <button className="btn btn-secondary btn-sm" onClick={handlePromo}><Gift size={14} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13px', padding: '0.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>
              <CheckCircle size={14} /> Code appliqué ! -{discount} MAD
            </div>
          )}
          {promoError && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{promoError}</div>}
        </div>

        {/* Récap */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Sous-total</span><span>{sousTotal.toFixed(2)} MAD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Frais de livraison</span><span>{frais.toFixed(2)} MAD</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                <span>Réduction</span><span>-{discount.toFixed(2)} MAD</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>Total</span><span style={{ color: '#10b981' }}>{total.toFixed(2)} MAD</span>
            </div>
          </div>
          <button className="btn btn-primary btn-full" style={{ justifyContent: 'center' }} onClick={onOrder}>
            <CreditCard size={16} /> Commander — {total.toFixed(2)} MAD
          </button>
          <button onClick={clearCart} style={{ width: '100%', marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px' }}>
            Vider le panier
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Quartiers du Maroc (par ville) ──────────────────────────────────────────
const QUARTIERS_PAR_VILLE = {
  Casablanca: [
    { nom: 'Maarif',         lat: 33.5849, lon: -7.6336 },
    { nom: 'Anfa',           lat: 33.5897, lon: -7.6500 },
    { nom: 'Ain Diab',       lat: 33.5973, lon: -7.6900 },
    { nom: 'Hay Hassani',    lat: 33.5462, lon: -7.6620 },
    { nom: 'Sidi Belyout',   lat: 33.6020, lon: -7.6160 },
    { nom: 'Bourgogne',      lat: 33.5840, lon: -7.6240 },
    { nom: 'Gauthier',       lat: 33.5950, lon: -7.6280 },
    { nom: 'Racine',         lat: 33.5880, lon: -7.6350 },
  ],
  Rabat: [
    { nom: 'Agdal',          lat: 33.9930, lon: -6.8500 },
    { nom: 'Hay Riad',       lat: 34.0080, lon: -6.8420 },
    { nom: 'Souissi',        lat: 34.0090, lon: -6.8170 },
    { nom: 'Médina',         lat: 34.0245, lon: -6.8326 },
  ],
  Marrakech: [
    { nom: 'Gueliz',         lat: 31.6390, lon: -8.0050 },
    { nom: 'Hivernage',      lat: 31.6280, lon: -8.0080 },
    { nom: 'Médina',         lat: 31.6295, lon: -7.9811 },
    { nom: 'Targa',          lat: 31.6490, lon: -8.0290 },
  ],
  Tanger: [
    { nom: 'Centre-ville',   lat: 35.7595, lon: -5.8340 },
    { nom: 'Malabata',       lat: 35.7790, lon: -5.7670 },
    { nom: 'Iberia',         lat: 35.7700, lon: -5.8050 },
  ],
  Fès: [
    { nom: 'Médina',         lat: 34.0608, lon: -4.9777 },
    { nom: 'Ville Nouvelle', lat: 34.0331, lon: -5.0003 },
    { nom: 'Atlas',          lat: 34.0210, lon: -5.0150 },
  ],
  Agadir: [
    { nom: 'Centre',         lat: 30.4278, lon: -9.5981 },
    { nom: 'Founty',         lat: 30.4040, lon: -9.5650 },
    { nom: 'Talborjt',       lat: 30.4220, lon: -9.5870 },
  ],
};

// ─── Haversine distance (km) ─────────────────────────────────────────────────
const distanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Calcul frais de livraison dynamique ─────────────────────────────────────
const calculerFrais = (distKm, baseFrais = 15) => {
  // base + 2 MAD/km au-delà de 2km
  if (distKm <= 2) return baseFrais;
  return Math.round(baseFrais + (distKm - 2) * 2);
};

// ─── Checkout Modal ───────────────────────────────────────────────────────────
const CheckoutModal = ({ onClose, onSuccess }) => {
  const { items, fondateur, clearCart } = useCartStore();
  const [adresse, setAdresse] = useState('');
  const [position, setPosition] = useState(null);      // [lat, lon] de l'utilisateur
  const [quartier, setQuartier] = useState(null);
  const [adresseMode, setAdresseMode] = useState('manuel'); // 'manuel' | 'gps' | 'quartier'
  const [gpsStatus, setGpsStatus] = useState('idle');  // 'idle' | 'loading' | 'success' | 'error'
  const [ville, setVille] = useState(fondateur?.ville || 'Casablanca');
  const [mode, setMode] = useState('CASH');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Distance et frais dynamiques
  const boutiquePos = fondateur && fondateur.latitude && fondateur.longitude
    ? [fondateur.latitude, fondateur.longitude]
    : null;

  let targetPos = null;
  if (adresseMode === 'gps' && position) targetPos = position;
  else if (adresseMode === 'quartier' && quartier) targetPos = [quartier.lat, quartier.lon];

  const distance = (boutiquePos && targetPos)
    ? distanceKm(boutiquePos[0], boutiquePos[1], targetPos[0], targetPos[1])
    : 0;

  const baseFrais = fondateur ? parseFloat(fondateur.frais_livraison_base) : 15;
  const fraisCalcules = targetPos ? calculerFrais(distance, baseFrais) : baseFrais;
  const sousTotal = items.reduce((s, i) => s + parseFloat(i.produit.prix_effectif) * i.quantite, 0);
  const total = sousTotal + fraisCalcules;

  // Estimation temps (km / 30 km/h * 60min = min)
  const tempsEstime = distance > 0 ? Math.max(15, Math.round((distance / 30) * 60) + 15) : null;

  const getGPSPosition = () => {
    setGpsStatus('loading');
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setPosition([lat, lon]);
        setAdresse(`Position GPS : ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        setAdresseMode('gps');
        setGpsStatus('success');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const choisirQuartier = (q) => {
    setQuartier(q);
    setAdresse(`${q.nom}, ${ville}`);
    setAdresseMode('quartier');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adresse.trim()) { setError('Veuillez sélectionner ou saisir une adresse de livraison'); return; }
    setLoading(true);
    try {
      await commandesApi.create({
        fondateur_id: fondateur.id,
        produits: items.map(i => ({ produit_id: i.produit.id, quantite: i.quantite })),
        adresse_livraison: adresse,
        latitude: targetPos ? targetPos[0] : null,
        longitude: targetPos ? targetPos[1] : null,
        mode_paiement: mode,
        instructions_livraison: instructions,
        livraison_immediate: true,
      });
      clearCart();
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  const quartiers = QUARTIERS_PAR_VILLE[ville] || [];
  const villes = Object.keys(QUARTIERS_PAR_VILLE);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Finaliser la commande</h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{fondateur?.nom_boutique} · {fondateur?.ville}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Adresse — 3 modes ─────────────────────────────────────────── */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} /> Adresse de livraison *
            </label>

            {/* Boutons mode adresse */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
              <button type="button" onClick={getGPSPosition}
                style={{
                  padding: '10px 8px', borderRadius: 10,
                  border: `2px solid ${adresseMode === 'gps' ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                  background: adresseMode === 'gps' ? 'rgba(16,185,129,0.12)' : 'transparent',
                  cursor: 'pointer', color: 'white', fontSize: 11, fontWeight: adresseMode === 'gps' ? 700 : 500,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                {gpsStatus === 'loading' ? <RefreshCw size={16} className="spin" /> : <Navigation size={16} color={adresseMode === 'gps' ? '#10b981' : '#94a3b8'} />}
                <span>📍 Position live</span>
                {gpsStatus === 'success' && <span style={{ fontSize: 9, color: '#10b981' }}>✓ Localisé</span>}
                {gpsStatus === 'error' && <span style={{ fontSize: 9, color: '#ef4444' }}>Erreur GPS</span>}
              </button>

              <button type="button" onClick={() => setAdresseMode('quartier')}
                style={{
                  padding: '10px 8px', borderRadius: 10,
                  border: `2px solid ${adresseMode === 'quartier' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                  background: adresseMode === 'quartier' ? 'rgba(59,130,246,0.12)' : 'transparent',
                  cursor: 'pointer', color: 'white', fontSize: 11, fontWeight: adresseMode === 'quartier' ? 700 : 500,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                <Search size={16} color={adresseMode === 'quartier' ? '#3b82f6' : '#94a3b8'} />
                <span>🏘️ Quartier</span>
              </button>

              <button type="button" onClick={() => setAdresseMode('manuel')}
                style={{
                  padding: '10px 8px', borderRadius: 10,
                  border: `2px solid ${adresseMode === 'manuel' ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`,
                  background: adresseMode === 'manuel' ? 'rgba(139,92,246,0.12)' : 'transparent',
                  cursor: 'pointer', color: 'white', fontSize: 11, fontWeight: adresseMode === 'manuel' ? 700 : 500,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                <CreditCard size={16} color={adresseMode === 'manuel' ? '#8b5cf6' : '#94a3b8'} />
                <span>✏️ Manuelle</span>
              </button>
            </div>

            {/* Mode quartier : ville + liste */}
            {adresseMode === 'quartier' && (
              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <select className="glass-input" value={ville} onChange={e => { setVille(e.target.value); setQuartier(null); }}
                  style={{ fontSize: 12, marginBottom: 8, width: '100%' }}>
                  {villes.map(v => <option key={v} value={v}>📍 {v}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {quartiers.map(q => (
                    <button key={q.nom} type="button" onClick={() => choisirQuartier(q)}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 16,
                        border: `1.5px solid ${quartier?.nom === q.nom ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                        background: quartier?.nom === q.nom ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                        color: quartier?.nom === q.nom ? '#60a5fa' : 'white', cursor: 'pointer',
                        fontWeight: quartier?.nom === q.nom ? 700 : 500,
                      }}>
                      {q.nom}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Champ adresse final (toujours visible) */}
            <input className="glass-input" value={adresse} onChange={e => { setAdresse(e.target.value); if (adresseMode === 'manuel') { /* keep mode */ } }}
              placeholder={
                adresseMode === 'gps' ? 'Position GPS détectée' :
                adresseMode === 'quartier' ? 'Sélectionnez un quartier' :
                'Ex: 12 Rue Hassan II, Maarif, Casablanca'
              }
              required style={{ fontSize: 13 }} />
          </div>

          {/* ── Estimation distance + frais ───────────────────────────────── */}
          {targetPos && boutiquePos && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))',
              border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12,
              padding: '14px 16px', marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#10b981', letterSpacing: '0.04em' }}>
                  <Zap size={13} /> CALCUL EN TEMPS RÉEL
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>basé sur votre position</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Distance</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#3b82f6' }}>{distance.toFixed(1)} km</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Temps estimé</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#f59e0b' }}>{tempsEstime} min</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Frais livraison</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>{fraisCalcules} MAD</div>
                </div>
              </div>
              {fraisCalcules > baseFrais && (
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Base {baseFrais} MAD + {fraisCalcules - baseFrais} MAD pour {(distance - 2).toFixed(1)} km supplémentaires
                </div>
              )}
            </div>
          )}

          {/* ── Paiement ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              <CreditCard size={13} style={{ display: 'inline', marginRight: 4 }} /> Mode de paiement
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['CASH', '💵 Cash à la livraison', '#10b981'], ['CARTE', '💳 Carte bancaire', '#3b82f6']].map(([k, l, c]) => (
                <button key={k} type="button" onClick={() => setMode(k)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    border: `2px solid ${mode === k ? c : 'rgba(255,255,255,0.08)'}`,
                    background: mode === k ? `${c}15` : 'transparent', cursor: 'pointer',
                    color: mode === k ? c : 'white', fontWeight: mode === k ? 700 : 500, fontSize: 12,
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* ── Instructions ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Instructions de livraison (optionnel)
            </label>
            <textarea className="glass-input" value={instructions} onChange={e => setInstructions(e.target.value)}
              placeholder="Étage, digicode, point de repère..." rows={2} style={{ resize: 'none', fontSize: 13 }} />
          </div>

          {/* ── Récap ─────────────────────────────────────────────────────── */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '1rem', marginBottom: '1rem', fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShoppingCart size={13} /> Récapitulatif
            </div>
            {items.map(i => (
              <div key={i.produit.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 12 }}>
                <span>{i.produit.nom} <span style={{ opacity: 0.6 }}>×{i.quantite}</span></span>
                <span>{(parseFloat(i.produit.prix_effectif) * i.quantite).toFixed(2)} MAD</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: 6, fontSize: 12 }}>
              <span>Sous-total</span><span>{sousTotal.toFixed(2)} MAD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 12 }}>
              <span>Frais de livraison</span>
              <span>{fraisCalcules.toFixed(2)} MAD {fraisCalcules !== baseFrais && <span style={{ color: '#10b981', fontSize: 10 }}> (calculé)</span>}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontWeight: 700, marginTop: 6, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ color: '#10b981' }}>{total.toFixed(2)} MAD</span>
            </div>
          </div>

          {error && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? '⏳ Envoi...' : `✓ Confirmer · ${total.toFixed(2)} MAD`}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Onglet CATALOGUE ─────────────────────────────────────────────────────────
const CatalogueTab = ({ onCartOpen }) => {
  const [categorie, setCategorie] = useState('');
  const [boutiques, setBoutiques] = useState([]);
  const [selectedBoutique, setSelectedBoutique] = useState(null);
  const [produits, setProduits] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingBoutiques, setLoadingBoutiques] = useState(true);
  const [loadingProduits, setLoadingProduits] = useState(false);
  const { addItem, items, fondateur: cartFondateur } = useCartStore();

  const cartCount = items.reduce((s, i) => s + i.quantite, 0);

  useEffect(() => {
    setLoadingBoutiques(true);
    const params = { is_verified: true };
    if (categorie) params.categorie = categorie;
    fondateursApi.list(params)
      .then(r => setBoutiques(r.data.results || r.data || []))
      .finally(() => setLoadingBoutiques(false));
  }, [categorie]);

  const selectBoutique = (b) => {
    setSelectedBoutique(b);
    setLoadingProduits(true);
    fondateursApi.produits(b.id)
      .then(r => setProduits(r.data.results || r.data || []))
      .finally(() => setLoadingProduits(false));
  };

  const filteredProduits = produits.filter(p =>
    p.disponible && p.en_stock &&
    (search === '' || p.nom.toLowerCase().includes(search.toLowerCase()))
  );

  const POIDS_APPROX = { ALIMENTAIRE: '0.3–2 kg', BOISSONS: '0.5–1.5 kg', HYGIENE: '0.1–0.5 kg', VETEMENTS: '0.2–1 kg', ELECTRONIQUE: '0.1–0.8 kg', MEDICAMENTS: '0.05–0.3 kg', AUTRE: '—' };

  if (selectedBoutique) return (
    <div>
      {/* Header boutique */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => { setSelectedBoutique(null); setProduits([]); setSearch(''); }}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '10px', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '18px' }}>{selectedBoutique.nom_boutique}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            <span><MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />{selectedBoutique.ville}</span>
            <span><Stars note={selectedBoutique.note_moyenne} /></span>
            <span><Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />~25–40 min</span>
            <span>Livraison: {selectedBoutique.frais_livraison_base} MAD</span>
          </div>
        </div>
        {cartCount > 0 && (
          <button className="btn btn-primary" onClick={onCartOpen} style={{ position: 'relative' }}>
            <ShoppingCart size={16} /> Panier
            <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>
          </button>
        )}
      </div>

      {/* Avertissement changement de boutique */}
      {cartFondateur && cartFondateur.id !== selectedBoutique.id && cartCount > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '13px', color: '#f59e0b' }}>
          ⚠️ Vous avez des articles de <strong>{cartFondateur.nom_boutique}</strong> dans votre panier. Les ajouter ici videra le panier actuel.
        </div>
      )}

      {/* Recherche produit */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input className="glass-input" placeholder="Rechercher un produit..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px' }} />
      </div>

      {/* Grille produits */}
      {loadingProduits ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass-card" style={{ height: '180px', opacity: 0.4 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {filteredProduits.map(p => {
            const inCart = items.find(i => i.produit.id === p.id);
            const hasPrix_promo = p.prix_promo && parseFloat(p.prix_promo) < parseFloat(p.prix);
            return (
              <div key={p.id} className="glass-card animate-fade-in" style={{ padding: 0, position: 'relative', transition: 'transform 0.15s, box-shadow 0.2s', cursor: 'default', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
                {/* Photo */}
                <ProductImage produit={p} />

                {/* Content */}
                <div style={{ padding: '0.875rem 1rem 1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>{p.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    🏪 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fondateur_nom}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>⚖️ {POIDS_APPROX[p.categorie] || '—'}</span>
                    <span style={{ color: p.stock > 10 ? '#10b981' : p.stock > 0 ? '#f59e0b' : '#ef4444' }}>
                      📦 {p.stock > 10 ? 'Stock OK' : p.stock > 0 ? `${p.stock} restants` : 'Rupture'}
                    </span>
                    {p.nombre_commandes > 20 && <span style={{ color: '#f59e0b' }}>🔥 Populaire</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      {hasPrix_promo ? (
                        <>
                          <div style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: 11 }}>{p.prix} MAD</div>
                          <div style={{ fontWeight: 800, color: '#10b981', fontSize: 17 }}>{p.prix_promo} MAD</div>
                        </>
                      ) : (
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: 17 }}>{p.prix_effectif} MAD</div>
                      )}
                    </div>
                    {inCart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.15)', padding: '4px 8px', borderRadius: 6 }}>×{inCart.quantite}</span>
                        <button onClick={() => addItem(p, selectedBoutique)}
                          style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addItem(p, selectedBoutique)}
                        style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' }}>
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredProduits.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Aucun produit trouvé
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Filtres catégorie */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setCategorie(c.key)}
            style={{ flexShrink: 0, padding: '0.5rem 1rem', borderRadius: '20px', border: `1.5px solid ${categorie === c.key ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`, background: categorie === c.key ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', color: 'white', fontSize: '13px', fontWeight: categorie === c.key ? 700 : 400, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Grille boutiques */}
      {loadingBoutiques ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array(4).fill(0).map((_, i) => <div key={i} className="glass-card" style={{ height: '160px', opacity: 0.4 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {boutiques.map(b => (
            <div key={b.id} className="glass-card animate-fade-in" onClick={() => selectBoutique(b)}
              style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '1.25rem', borderLeft: `4px solid ${b.is_open ? '#10b981' : '#64748b'}` }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{b.nom_boutique}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    <MapPin size={11} style={{ display: 'inline' }} /> {b.ville || b.adresse}
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>{CATEGORIES.find(c => c.key === b.categorie)?.icon || '🏪'}</span>
              </div>
              <Stars note={b.note_moyenne} />
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>🚚 {b.frais_livraison_base} MAD · Min {b.commande_minimum} MAD</span>
                <span style={{ color: b.is_open ? '#10b981' : '#ef4444', fontWeight: 600 }}>{b.is_open ? '● Ouvert' : '● Fermé'}</span>
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{b.nombre_commandes} commandes · {b.rayon_livraison_km} km de rayon</span>
                <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Onglet MES COMMANDES ─────────────────────────────────────────────────────
const CommandesTab = ({ onNavigateSuivi }) => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCommandes = () => {
    setLoading(true);
    commandesApi.list()
      .then(r => setCommandes(r.data.results || r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCommandes(); }, []);
  // Auto-refresh every 20s
  useEffect(() => { const id = setInterval(fetchCommandes, 20000); return () => clearInterval(id); }, []);

  const handleCancel = async (cmd) => {
    if (!window.confirm(`Annuler la commande ${cmd.reference} ?\nVotre stock sera remis à disposition.`)) return;
    setCancelling(cmd.id);
    try {
      await commandesApi.annuler(cmd.id);
      showToast('Commande annulée avec succès');
      fetchCommandes();
    } catch (e) {
      showToast(e.response?.data?.error || 'Impossible d\'annuler', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const ProgressBar = ({ statut }) => {
    const cfg = STATUT_CONFIG[statut] || {};
    const step = cfg.step || 0;
    const steps = ['EN_ATTENTE', 'VALIDEE', 'EN_PREPARATION', 'EN_ROUTE', 'LIVREE'];
    return (
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {steps.map((s, i) => {
            const done = step > i;
            const active = step === i + 1;
            return (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: done || active ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: active ? '2px solid #3b82f6' : 'none', transition: 'all 0.3s' }}>
                    {done ? '✓' : STATUT_CONFIG[s]?.icon}
                  </div>
                  <div style={{ fontSize: '9px', color: active ? '#3b82f6' : 'var(--text-secondary)', marginTop: '3px', textAlign: 'center', maxWidth: '50px' }}>{STATUT_CONFIG[s]?.label}</div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: done ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.1)', minWidth: '20px', marginBottom: '14px' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Chargement...</div>;

  if (commandes.length === 0) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
      <Package size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Aucune commande</div>
      <div style={{ fontSize: '13px' }}>Explorez notre catalogue et passez votre première commande!</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}
      {commandes.map(cmd => {
        const isExpanded = expanded === cmd.id;
        const canCancel = !['LIVREE', 'ANNULEE'].includes(cmd.statut);
        const isActive = ['VALIDEE', 'EN_PREPARATION', 'EN_ROUTE'].includes(cmd.statut);
        return (
        <div key={cmd.id} className="glass-card animate-fade-in"
          style={{
            padding: '1.25rem',
            borderLeft: `4px solid ${cmd.statut === 'LIVREE' ? '#10b981' : cmd.statut === 'ANNULEE' ? '#ef4444' : cmd.statut === 'EN_ROUTE' ? '#06b6d4' : cmd.statut === 'EN_PREPARATION' ? '#f59e0b' : '#3b82f6'}`,
            background: isActive ? 'linear-gradient(135deg, rgba(15,23,42,0.5), rgba(59,130,246,0.04))' : undefined,
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 14, color: '#60a5fa' }}>{cmd.reference}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                🏪 {cmd.fondateur_detail?.nom_boutique} · {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: 16 }}>{cmd.total_price} MAD</div>
              <span className={`badge ${STATUT_CONFIG[cmd.statut]?.cls || 'badge-secondary'}`} style={{ fontSize: 11, marginTop: 4 }}>
                {STATUT_CONFIG[cmd.statut]?.icon} {STATUT_CONFIG[cmd.statut]?.label}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> {cmd.adresse_livraison}
          </div>

          {cmd.statut !== 'ANNULEE' && <ProgressBar statut={cmd.statut} />}

          {/* Transporteur info (visible quand EN_ROUTE) */}
          {cmd.transporteur_detail && cmd.statut === 'EN_ROUTE' && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🛵</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#06b6d4' }}>
                    {cmd.transporteur_detail.first_name} {cmd.transporteur_detail.last_name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Votre livreur en route</div>
                </div>
              </div>
              <button onClick={onNavigateSuivi}
                style={{ background: '#06b6d4', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapIcon size={11} /> Suivre
              </button>
            </div>
          )}

          {cmd.statut === 'LIVREE' && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: 10, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <CheckCircle size={13} /> Livré avec succès le {cmd.livree_at ? new Date(cmd.livree_at).toLocaleString('fr-FR') : ''}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button onClick={() => setExpanded(isExpanded ? null : cmd.id)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'white', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {isExpanded ? <>▲ Masquer détails</> : <>▼ Voir détails ({cmd.lignes?.length || 0} produits)</>}
            </button>
            {canCancel && (
              <button onClick={() => handleCancel(cmd)} disabled={cancelling === cmd.id}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {cancelling === cmd.id ? '...' : <><X size={12} /> Annuler</>}
              </button>
            )}
          </div>

          {/* Détails produits (expansible) */}
          {isExpanded && cmd.lignes?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 8 }}>PRODUITS COMMANDÉS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                {cmd.lignes.map((l, i) => {
                  const prod = { id: l.produit, categorie: l.produit_detail?.categorie || 'AUTRE' };
                  const [g1, g2] = PRODUCT_GRADIENTS[prod.categorie] || PRODUCT_GRADIENTS.AUTRE;
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 8,
                        background: `linear-gradient(135deg, ${g1}, ${g2})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                      }}>
                        {getProductEmoji(prod.categorie, prod.id)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.produit_detail?.nom || `#${l.produit}`}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>×{l.quantite}</div>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>{l.sous_total} MAD</div>
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

// ─── OSRM routing helper (client side) ───────────────────────────────────────
const fetchClientRoute = async (from, to) => {
  if (!from || !to) return null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      return {
        coords: data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]),
        distance_km: (data.routes[0].distance / 1000).toFixed(1),
        duration_min: Math.round(data.routes[0].duration / 60),
      };
    }
  } catch { /* ignore */ }
  return null;
};

// ─── Onglet SUIVI LIVE (avec filtres calques) ────────────────────────────────
const SuiviTab = ({ user }) => {
  const [livraisons, setLivraisons] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [transporteurs, setTransporteurs] = useState([]);
  const [routes, setRoutes] = useState({});  // id commande → route data
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState({
    maPosition:    { label: 'Ma position',              active: true,  emoji: '📍', color: '#3b82f6' },
    livraisons:    { label: 'Mes livraisons en cours',  active: true,  emoji: '🛵', color: '#f59e0b' },
    transporteurs: { label: 'Transporteurs',            active: true,  emoji: '🚗', color: '#8b5cf6' },
    boutiques:     { label: 'Boutiques ouvertes',       active: false, emoji: '🏪', color: '#10b981' },
  });

  const toggleLayer = (key) => setLayers(l => ({ ...l, [key]: { ...l[key], active: !l[key].active } }));

  const fetchData = () => {
    Promise.all([
      commandesApi.list(),
      fondateursApi.list({ is_verified: true, is_open: true }),
    ]).then(([cmdRes, bRes]) => {
      const all = cmdRes.data.results || cmdRes.data || [];
      // Garde mes commandes EN_ROUTE et EN_PREPARATION
      const actives = all.filter(c => ['EN_PREPARATION', 'EN_ROUTE'].includes(c.statut));
      setLivraisons(actives);
      setBoutiques((bRes.data.results || bRes.data || []).slice(0, 30));
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    const id = setInterval(fetchData, 20000);
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos([33.5731, -7.5898]),
      { enableHighAccuracy: true }
    );
    return () => clearInterval(id);
  }, []);

  // Calculer routes du transporteur vers le client (EN_ROUTE seulement)
  useEffect(() => {
    livraisons.forEach(async cmd => {
      if (cmd.statut !== 'EN_ROUTE') return;
      if (routes[cmd.id]) return;
      const transporteurPos = cmd.transporteur_detail
        ? [cmd.transporteur_detail.latitude, cmd.transporteur_detail.longitude]
        : null;
      const clientPos = cmd.latitude_livraison && cmd.longitude_livraison
        ? [cmd.latitude_livraison, cmd.longitude_livraison]
        : userPos;
      if (transporteurPos && transporteurPos[0] && clientPos && clientPos[0]) {
        const r = await fetchClientRoute(transporteurPos, clientPos);
        if (r) setRoutes(prev => ({ ...prev, [cmd.id]: r }));
      }
    });
  }, [livraisons, userPos]);

  const mapCenter = userPos || [33.5731, -7.5898];

  return (
    <div>
      {/* Calques toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {Object.entries(layers).map(([key, { label, active, emoji, color }]) => (
          <button key={key} onClick={() => toggleLayer(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 20, border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
              background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
              cursor: 'pointer', color: active ? color : 'var(--text-secondary)',
              fontSize: 12, fontWeight: active ? 700 : 400, transition: 'all 0.15s',
            }}>
            <span>{emoji}</span> {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          {livraisons.length} en route
        </div>
      </div>

      {/* Carte */}
      <div className="glass-card" style={{ height: 440, padding: 4, overflow: 'hidden', borderRadius: 16 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-secondary)' }}>
            <RefreshCw size={28} className="spin" />
            <span style={{ fontSize: 13 }}>Chargement de la carte...</span>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={userPos ? 13 : 6}
            style={{ height: '100%', width: '100%', borderRadius: 12 }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO' />

            {/* Ma position */}
            {layers.maPosition.active && userPos && (
              <>
                <Marker position={userPos} icon={iconBlue}>
                  <Popup>
                    <div style={{ color: '#000' }}>
                      <strong>📍 Votre position</strong><br />
                      {user?.first_name} {user?.last_name}
                    </div>
                  </Popup>
                </Marker>
                <Circle center={userPos} radius={400}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.07, weight: 2, dashArray: '6 3' }} />
              </>
            )}

            {/* Livraisons en cours + transporteurs + itinéraires */}
            {layers.livraisons.active && livraisons.map(cmd => {
              const lat = cmd.latitude_livraison;
              const lon = cmd.longitude_livraison;
              const tLat = cmd.transporteur_detail?.latitude;
              const tLon = cmd.transporteur_detail?.longitude;
              return (
                <React.Fragment key={`l-${cmd.id}`}>
                  {/* Marqueur destination livraison */}
                  {lat && lon && (
                    <Marker position={[lat, lon]} icon={iconRed}>
                      <Popup>
                        <div style={{ color: '#000', minWidth: 170 }}>
                          <strong>📍 Adresse de livraison</strong><br />
                          <span style={{ fontSize: 12 }}>{cmd.adresse_livraison}</span><br />
                          <strong style={{ color: '#10b981' }}>{cmd.total_price} MAD</strong>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {/* Marqueur transporteur (si EN_ROUTE) */}
                  {layers.transporteurs.active && cmd.statut === 'EN_ROUTE' && tLat && tLon && (
                    <>
                      <Marker position={[tLat, tLon]} icon={iconOrange}>
                        <Popup>
                          <div style={{ color: '#000', minWidth: 170 }}>
                            <strong>🛵 Votre livreur</strong><br />
                            <span style={{ fontSize: 12 }}>
                              {cmd.transporteur_detail.first_name} {cmd.transporteur_detail.last_name}
                            </span><br />
                            <span style={{ fontSize: 12, color: '#666' }}>{cmd.reference}</span><br />
                            {routes[cmd.id] && (
                              <span style={{ fontSize: 11, color: '#3b82f6' }}>
                                📏 {routes[cmd.id].distance_km} km · ⏱ {routes[cmd.id].duration_min} min
                              </span>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                      <Circle center={[tLat, tLon]} radius={150}
                        pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 2 }} />
                    </>
                  )}
                  {/* Polyline de l'itinéraire transporteur → client */}
                  {routes[cmd.id] && cmd.statut === 'EN_ROUTE' && (
                    <Polyline positions={routes[cmd.id].coords}
                      pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.85, dashArray: '8 6' }} />
                  )}
                </React.Fragment>
              );
            })}

            {/* Boutiques ouvertes */}
            {layers.boutiques.active && boutiques.map(b => {
              if (!b.latitude || !b.longitude) return null;
              return (
                <Marker key={b.id} position={[b.latitude, b.longitude]} icon={iconGreen}>
                  <Popup>
                    <div style={{ color: '#000', minWidth: 150 }}>
                      <strong>🏪 {b.nom_boutique}</strong><br />
                      <span style={{ fontSize: 12 }}>{b.categorie} · {b.ville}</span><br />
                      <span style={{ fontSize: 12, color: '#10b981' }}>● Ouvert</span><br />
                      <span style={{ fontSize: 12 }}>⭐ {b.note_moyenne?.toFixed(1)} · {b.frais_livraison_base} MAD livraison</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Transporteurs disponibles */}
            {layers.transporteurs.active && transporteurs.map(t => {
              if (!t.latitude || !t.longitude) return null;
              return (
                <Marker key={t.id} position={[t.latitude, t.longitude]} icon={iconRed}>
                  <Popup>
                    <div style={{ color: '#000' }}>
                      <strong>🚗 Chauffeur disponible</strong><br />
                      <span style={{ fontSize: 12 }}>{t.vehicule_type} · {t.note_moyenne?.toFixed(1)} ⭐</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Liste livraisons en cours */}
      {livraisons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 14 }}>
          <CheckCircle size={36} color="#10b981" style={{ opacity: 0.5, marginBottom: 8 }} />
          <div>Aucune livraison en cours pour le moment 🎉</div>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {livraisons.map(cmd => {
            const route = routes[cmd.id];
            const isEnRoute = cmd.statut === 'EN_ROUTE';
            const statutColor = isEnRoute ? '#f59e0b' : '#3b82f6';
            return (
              <div key={cmd.id} className="glass-card animate-fade-in" style={{
                padding: '1rem',
                borderLeft: `4px solid ${statutColor}`,
                background: `linear-gradient(135deg, rgba(15,23,42,0.4), ${statutColor}08)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 50, height: 50, background: `${statutColor}20`, borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0,
                  }}>
                    {isEnRoute ? '🛵' : '👨‍🍳'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, color: '#60a5fa', fontFamily: 'monospace' }}>{cmd.reference}</strong>
                      <span style={{
                        background: statutColor + '20', color: statutColor,
                        fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                      }}>
                        {isEnRoute ? '🚚 EN ROUTE' : '👨‍🍳 PRÉPARATION'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🏪 {cmd.fondateur_detail?.nom_boutique}
                    </div>
                    {cmd.transporteur_detail && (
                      <div style={{ fontSize: 11, color: '#06b6d4', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>👤 {cmd.transporteur_detail.first_name} {cmd.transporteur_detail.last_name}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: '#10b981', fontSize: 15 }}>{Math.round(cmd.total_price)} MAD</div>
                    {route && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        ⏱ <strong style={{ color: statutColor }}>{route.duration_min} min</strong>
                      </div>
                    )}
                  </div>
                </div>
                {route && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span>📏 Distance restante : <strong style={{ color: '#3b82f6' }}>{route.distance_km} km</strong></span>
                    <span>🚚 Arrivée estimée : <strong style={{ color: '#10b981' }}>{new Date(Date.now() + route.duration_min * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Onglet PROFIL ────────────────────────────────────────────────────────────
const ProfilTab = ({ user }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
    <div className="glass-card" style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
      <div style={{ width: '72px', height: '72px', background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
        {user?.first_name?.[0]}{user?.last_name?.[0]}
      </div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 800 }}>{user?.first_name} {user?.last_name}</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{user?.email}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>{user?.phone || 'Téléphone non renseigné'}</div>
      </div>
    </div>
    {[
      { label: 'Nom d\'utilisateur', value: `@${user?.username}` },
      { label: 'Rôle', value: 'Client DeliverMap' },
      { label: 'Membre depuis', value: user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—' },
      { label: 'Adresses sauvegardées', value: user?.adresses_sauvegardees?.length || 0 },
    ].map(({ label, value }) => (
      <div key={label} className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontWeight: 600 }}>{value}</div>
      </div>
    ))}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('catalogue');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const { items } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.quantite, 0);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const handleOrderSuccess = () => { setCheckoutOpen(false); setCartOpen(false); setOrderSuccess(true); setTab('commandes'); setTimeout(() => setOrderSuccess(false), 4000); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div className="glass-card" style={{ borderRadius: 0, padding: '0 2rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="logo-icon" style={{ width: '36px', height: '36px' }}><Truck size={20} color="white" /></div>
          <span className="logo-text text-gradient" style={{ fontSize: '1.2rem', fontWeight: 800 }}>DeliverMap</span>
          <span className="badge badge-info">Client</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Bonjour, <strong style={{ color: 'var(--text-primary)' }}>{user?.first_name}</strong></span>
          <button style={{ position: 'relative', background: cartCount > 0 ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '10px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: cartCount > 0 ? 700 : 400 }}
            onClick={() => setCartOpen(true)}>
            <ShoppingCart size={18} />
            {cartCount > 0 && <span style={{ background: '#ef4444', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}><LogOut size={15} /></button>
        </div>
      </div>

      {/* Notification succès */}
      {orderSuccess && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 30px rgba(16,185,129,0.4)', animation: 'fadeIn 0.3s' }}>
          🎉 Commande passée avec succès !
        </div>
      )}

      {/* Navigation tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', padding: '0 2rem', background: 'rgba(255,255,255,0.02)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: tab === id ? '#3b82f6' : 'var(--text-secondary)', borderBottom: `2px solid ${tab === id ? '#3b82f6' : 'transparent'}`, fontWeight: tab === id ? 700 : 400, fontSize: '14px', transition: 'all 0.2s', position: 'relative' }}>
            <Icon size={16} />
            {label}
            {id === 'commandes' && <span style={{ position: 'absolute', top: '8px', right: '4px', background: '#3b82f6', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, padding: '2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {tab === 'catalogue' && <CatalogueTab onCartOpen={() => setCartOpen(true)} />}
        {tab === 'commandes' && <CommandesTab onNavigateSuivi={() => setTab('suivi')} />}
        {tab === 'suivi'     && <SuiviTab user={user} />}
        {tab === 'profil'    && <ProfilTab user={user} />}
      </div>

      {/* Panier + Checkout */}
      {cartOpen && (
        <CartSidebar
          onClose={() => setCartOpen(false)}
          onOrder={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {/* Assistant conversationnel */}
      <ChatbotWidget onOpenCart={() => setCartOpen(true)} />
    </div>
  );
};

export default ClientDashboard;
