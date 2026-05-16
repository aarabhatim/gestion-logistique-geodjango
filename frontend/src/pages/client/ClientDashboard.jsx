import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Package, Map as MapIcon, User, LogOut, Star, Plus, Minus,
  Trash2, MapPin, Clock, CheckCircle, Truck, Tag, X, Search, ChevronRight,
  Heart, Zap, ArrowLeft, CreditCard, Gift, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fondateursApi, commandesApi } from '../../services/api';
import useCartStore from '../../stores/cartStore';
import ChatbotWidget from '../../components/ChatbotWidget';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
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
          {items.map(({ produit, quantite }) => (
            <div key={produit.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: 'var(--gradient-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                🛍️
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
          ))}
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

// ─── Checkout Modal ───────────────────────────────────────────────────────────
const CheckoutModal = ({ onClose, onSuccess }) => {
  const { items, fondateur, clearCart } = useCartStore();
  const [adresse, setAdresse] = useState('');
  const [mode, setMode] = useState('CASH');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adresse.trim()) { setError('Veuillez saisir une adresse de livraison'); return; }
    setLoading(true);
    try {
      await commandesApi.create({
        fondateur_id: fondateur.id,
        lignes: items.map(i => ({ produit_id: i.produit.id, quantite: i.quantite })),
        adresse_livraison: adresse,
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

  const sousTotal = items.reduce((s, i) => s + parseFloat(i.produit.prix_effectif) * i.quantite, 0);
  const frais = fondateur ? parseFloat(fondateur.frais_livraison_base) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, margin: 0 }}>Finaliser la commande</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} /> Adresse de livraison *
            </label>
            <input className="glass-input" value={adresse} onChange={e => setAdresse(e.target.value)}
              placeholder="Ex: 12 Rue Hassan II, Maarif, Casablanca" required />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <CreditCard size={13} style={{ display: 'inline', marginRight: '4px' }} /> Mode de paiement
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[['CASH', '💵 Cash'], ['CARTE', '💳 Carte']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setMode(k)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: `2px solid ${mode === k ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, background: mode === k ? 'rgba(59,130,246,0.15)' : 'transparent', cursor: 'pointer', color: 'white', fontWeight: mode === k ? 700 : 400, fontSize: '13px' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Instructions (optionnel)
            </label>
            <textarea className="glass-input" value={instructions} onChange={e => setInstructions(e.target.value)}
              placeholder="Étage, digicode, sonnette..." rows={2} style={{ resize: 'none' }} />
          </div>

          {/* Récap */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '13px' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{fondateur?.nom_boutique}</div>
            {items.map(i => (
              <div key={i.produit.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>{i.produit.nom} ×{i.quantite}</span>
                <span>{(parseFloat(i.produit.prix_effectif) * i.quantite).toFixed(2)} MAD</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontWeight: 700, marginTop: '4px' }}>
              <span>Total avec livraison</span>
              <span style={{ color: '#10b981' }}>{(sousTotal + frais).toFixed(2)} MAD</span>
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Envoi...' : `Confirmer la commande · ${(sousTotal + frais).toFixed(2)} MAD`}
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
              <div key={p.id} className="glass-card animate-fade-in" style={{ padding: '1rem', position: 'relative', transition: 'transform 0.15s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                {hasPrix_promo && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: 'white', borderRadius: '6px', padding: '2px 7px', fontSize: '11px', fontWeight: 700 }}>
                    PROMO
                  </div>
                )}
                {/* Icône produit */}
                <div style={{ width: '50px', height: '50px', background: 'var(--gradient-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '0.75rem' }}>
                  {CATEGORIES.find(c => c.key === p.fondateur_categorie)?.icon || '📦'}
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', lineHeight: 1.3 }}>{p.nom}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  🏪 {p.fondateur_nom} · ⚖️ {POIDS_APPROX[p.categorie] || '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  📦 Stock: {p.stock > 10 ? 'Disponible' : p.stock > 0 ? `${p.stock} restants` : 'Rupture'}
                  {p.nombre_commandes > 20 && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>🔥 Populaire</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    {hasPrix_promo ? (
                      <>
                        <div style={{ color: '#ef4444', textDecoration: 'line-through', fontSize: '11px' }}>{p.prix} MAD</div>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '16px' }}>{p.prix_promo} MAD</div>
                      </>
                    ) : (
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '16px' }}>{p.prix_effectif} MAD</div>
                    )}
                  </div>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>×{inCart.quantite}</span>
                      <button onClick={() => addItem(p, selectedBoutique)}
                        style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--gradient-primary)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addItem(p, selectedBoutique)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-primary)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' }}>
                      <Plus size={16} />
                    </button>
                  )}
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
const CommandesTab = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    commandesApi.list()
      .then(r => setCommandes(r.data.results || r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      {commandes.map(cmd => (
        <div key={cmd.id} className="glass-card animate-fade-in" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '13px' }}>{cmd.reference}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {cmd.fondateur_detail?.nom_boutique} · {new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '15px' }}>{cmd.total_price} MAD</div>
              <span className={`badge ${STATUT_CONFIG[cmd.statut]?.cls || 'badge-secondary'}`} style={{ fontSize: '11px', marginTop: '4px' }}>
                {STATUT_CONFIG[cmd.statut]?.icon} {STATUT_CONFIG[cmd.statut]?.label}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />{cmd.adresse_livraison}
          </div>
          {cmd.statut !== 'ANNULEE' && <ProgressBar statut={cmd.statut} />}
          {cmd.statut === 'EN_ROUTE' && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} /> Votre commande est en route ! Consultez l'onglet Suivi live.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Onglet SUIVI LIVE (avec filtres calques) ────────────────────────────────
const SuiviTab = ({ user }) => {
  const [livraisons, setLivraisons] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [transporteurs, setTransporteurs] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState({
    maPosition:    { label: 'Ma position',              active: true,  emoji: '📍', color: '#3b82f6' },
    livraisons:    { label: 'Mes livraisons en cours',  active: true,  emoji: '🛵', color: '#f59e0b' },
    boutiques:     { label: 'Boutiques',                active: true,  emoji: '🏪', color: '#10b981' },
    transporteurs: { label: 'Transporteurs disponibles', active: false, emoji: '🚗', color: '#8b5cf6' },
  });

  const toggleLayer = (key) => setLayers(l => ({ ...l, [key]: { ...l[key], active: !l[key].active } }));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      commandesApi.list({ statut: 'EN_ROUTE' }),
      fondateursApi.list({ is_verified: true, is_open: true }),
      fondateursApi.proches(33.5731, -7.5898, 20).catch(() => ({ data: [] })),
    ]).then(([cmdRes, bRes]) => {
      setLivraisons(cmdRes.data.results || cmdRes.data || []);
      setBoutiques((bRes.data.results || bRes.data || []).slice(0, 30));
    }).catch(console.error).finally(() => setLoading(false));

    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos([33.5731, -7.5898]),
      { enableHighAccuracy: true }
    );
  }, []);

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

            {/* Livraisons en cours */}
            {layers.livraisons.active && livraisons.map(cmd => {
              if (!cmd.latitude_livraison || !cmd.longitude_livraison) return null;
              return (
                <Marker key={cmd.id} position={[cmd.latitude_livraison, cmd.longitude_livraison]} icon={iconOrange}>
                  <Popup>
                    <div style={{ color: '#000', minWidth: 160 }}>
                      <strong>🛵 {cmd.reference}</strong><br />
                      <span style={{ fontSize: 12, color: '#666' }}>{cmd.fondateur_detail?.nom_boutique}</span><br />
                      <span style={{ fontSize: 12 }}>{cmd.adresse_livraison}</span><br />
                      <strong style={{ color: '#10b981' }}>{Math.round(cmd.total_price)} MAD</strong>
                    </div>
                  </Popup>
                </Marker>
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
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: 14 }}>
          Aucune livraison en cours pour le moment 🎉
        </div>
      ) : (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {livraisons.map(cmd => (
            <div key={cmd.id} className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(245,158,11,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🛵</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{cmd.reference}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cmd.fondateur_detail?.nom_boutique} → {cmd.adresse_livraison}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>{Math.round(cmd.total_price)} MAD</div>
                <span className="badge badge-warning" style={{ fontSize: 10, marginTop: 4 }}>🛵 En route</span>
              </div>
            </div>
          ))}
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
        {tab === 'commandes' && <CommandesTab />}
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

      {/* Assistant conversationnel (UX client) */}
      <ChatbotWidget onOpenCart={() => setCartOpen(true)} />
    </div>
  );
};

export default ClientDashboard;
