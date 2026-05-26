/**
 * ModeLivraison.jsx
 * Mode conduite simplifié pour chauffeur :
 * accepter → se rendre à la boutique → récupérer → démarrer → arriver → confirmer
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, MapPin, Package, Navigation, CheckCircle,
  Phone, AlertTriangle, Camera, Hash, Loader, X, Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { commandesApi } from '../../services/api';

/* ── Thème "mode conduite" ── fond sombre, gros éléments ─────────────────── */
const T = {
  bg:      '#0B0B0B',
  surface: '#161616',
  card:    '#1C1C1C',
  primary: '#FF8A00',
  text:    '#FFFFFF',
  text2:   '#A3A3A3',
  border:  'rgba(255,255,255,0.06)',
  success: '#22C55E',
  error:   '#EF4444',
  info:    '#3B82F6',
};

/* ── Étapes de livraison ─────────────────────────────────────────────────── */
const ETAPES = [
  {
    id: 'ACCEPTER',
    label: 'Accepter la mission',
    desc: 'Confirmer la prise en charge de la livraison',
    icon: '📋',
    action: 'Accepter la mission',
    color: T.info,
  },
  {
    id: 'EN_ROUTE_BOUTIQUE',
    label: 'En route vers la boutique',
    desc: 'Rendez-vous à la boutique pour récupérer la commande',
    icon: '🏪',
    action: "J'arrive à la boutique",
    color: T.primary,
  },
  {
    id: 'RECUPERER',
    label: 'Récupération commande',
    desc: 'Confirmez la prise en charge des articles',
    icon: '📦',
    action: 'Commande récupérée — Démarrer livraison',
    color: T.primary,
  },
  {
    id: 'EN_ROUTE_CLIENT',
    label: 'En route vers le client',
    desc: 'Livraison en cours vers le client',
    icon: '🛵',
    action: "Je suis arrivé chez le client",
    color: T.primary,
  },
  {
    id: 'CONFIRMER',
    label: 'Confirmer la livraison',
    desc: 'PIN, photo ou signature du client',
    icon: '✅',
    action: 'Livraison confirmée',
    color: T.success,
  },
];

/* ── Icônes carte ────────────────────────────────────────────────────────── */
const makeIcon = (color, emoji, size = 38) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid rgba(255,255,255,0.85);box-shadow:0 3px 10px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px">${emoji}</div>`,
  iconSize:[size,size], iconAnchor:[size/2,size/2], popupAnchor:[0,-size/2],
});

/* ── Barre de progression ───────────────────────────────────────────────── */
const ProgressBar = ({ current }) => {
  const idx = ETAPES.findIndex(e => e.id === current);
  const pct = ((idx + 1) / ETAPES.length) * 100;
  return (
    <div style={{ padding: '0 20px 0', marginBottom: 6 }}>
      <div style={{ height: 4, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: T.primary, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: T.text2 }}>Étape {idx + 1}/{ETAPES.length}</span>
        <span style={{ fontSize: 10, color: T.text2 }}>{Math.round(pct)}%</span>
      </div>
    </div>
  );
};

/* ── Gros bouton action ─────────────────────────────────────────────────── */
const BigBtn = ({ label, onClick, color = T.primary, disabled, loading, icon: Icon }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    style={{
      width: '100%', padding: '22px 20px', borderRadius: 20,
      background: disabled ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${color}, ${color}cc)`,
      border: 'none', color: '#fff', fontWeight: 800, fontSize: 18,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      boxShadow: disabled ? 'none' : `0 12px 32px ${color}44`,
      transition: 'all 0.3s ease',
      letterSpacing: 0.3,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    {loading
      ? <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} />
      : Icon
        ? <Icon size={22} />
        : null
    }
    {label}
  </button>
);

/* ── Panneau confirmation PIN ───────────────────────────────────────────── */
const PanelPIN = ({ onConfirm, onClose }) => {
  const [pin, setPin] = useState('');
  const [method, setMethod] = useState('pin'); // pin | photo | signature

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: T.surface, borderRadius: '24px 24px 0 0', padding: '28px 24px 40px',
        width: '100%', maxWidth: 500, border: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Confirmer la livraison</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Méthodes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ id:'pin', label:'📱 Code PIN' }, { id:'photo', label:'📷 Photo' }, { id:'sign', label:'✍️ Signature' }].map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              style={{ flex:1, padding:'10px 8px', borderRadius:12, border:`2px solid ${method===m.id?T.primary:T.border}`, background: method===m.id?`${T.primary}20`:T.card, color:T.text, fontWeight:600, fontSize:12, cursor:'pointer' }}>
              {m.label}
            </button>
          ))}
        </div>

        {method === 'pin' && (
          <>
            <label style={{ display:'block', fontSize:13, color:T.text2, marginBottom:8 }}>Code PIN du client</label>
            <input
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,6))}
              placeholder="000000"
              type="number"
              style={{ width:'100%', padding:'16px 18px', background:T.card, border:`1px solid ${T.border}`, borderRadius:14, color:T.text, fontSize:24, fontWeight:700, textAlign:'center', outline:'none', letterSpacing:8, boxSizing:'border-box', fontFamily:'monospace' }}
            />
          </>
        )}

        {method === 'photo' && (
          <div style={{ background:T.card, borderRadius:14, padding:'32px 20px', textAlign:'center', border:`2px dashed ${T.border}` }}>
            <Camera size={40} color={T.primary} style={{ marginBottom:12, opacity:0.7 }} />
            <div style={{ fontSize:14, color:T.text2 }}>Prenez une photo de la livraison</div>
            <div style={{ fontSize:12, color:T.text2, marginTop:4 }}>Fonctionnalité disponible sur mobile</div>
          </div>
        )}

        {method === 'sign' && (
          <div style={{ background:T.card, borderRadius:14, padding:'32px 20px', textAlign:'center', border:`2px dashed ${T.border}` }}>
            <div style={{ fontSize:36, marginBottom:12 }}>✍️</div>
            <div style={{ fontSize:14, color:T.text2 }}>Zone de signature client</div>
            <div style={{ fontSize:12, color:T.text2, marginTop:4 }}>Demandez au client de signer</div>
          </div>
        )}

        <BigBtn
          label="Confirmer la livraison"
          color={T.success}
          icon={CheckCircle}
          onClick={() => onConfirm({ method, pin })}
          disabled={method === 'pin' && pin.length < 4}
          style={{ marginTop: 20 }}
        />
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════════════ */
export default function ModeLivraison({ commandeId: propCommandeId }) {
  const navigate = useNavigate();
  const [commandeId, setCommandeId] = useState(propCommandeId || null);
  const [commande, setCommande]   = useState(null);
  const [etape, setEtape]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [showPIN, setShowPIN]     = useState(false);
  const [livree, setLivree]       = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const timerRef = useRef(null);

  /* Charger commandes proposées si aucune sélectionnée */
  const [proposees, setProposees] = useState([]);
  const [selectMode, setSelectMode] = useState(!commandeId);

  useEffect(() => {
    if (selectMode) {
      commandesApi.proposees().then(r => setProposees(r.data?.results || r.data || [])).catch(() => {});
    }
  }, [selectMode]);

  useEffect(() => {
    if (commandeId) {
      commandesApi.detail(commandeId).then(r => setCommande(r.data)).catch(() => {});
    }
  }, [commandeId]);

  /* Chronomètre livraison */
  useEffect(() => {
    if (etape > 0 && !livree) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [etape, livree]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const avancerEtape = async () => {
    setLoading(true);
    setError(null);
    try {
      if (etape === 0) {
        // Accepter la commande
        await commandesApi.transporteurAction(commandeId, 'accepter');
        setElapsed(0);
      } else if (etape < ETAPES.length - 1) {
        // Avancer le statut
        await commandesApi.avancer(commandeId);
      }
      setEtape(e => e + 1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const confirmerLivraison = async ({ method, pin }) => {
    setLoading(true);
    try {
      await commandesApi.avancer(commandeId); // → LIVREE
      setShowPIN(false);
      setLivree(true);
      setEtape(ETAPES.length - 1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la confirmation.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Écran sélection commande ──────────────────────────────────────────── */
  if (selectMode) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/chauffeur')} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', color: T.text, cursor: 'pointer' }}>
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>Choisir une mission</span>
        </div>
        <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
          {proposees.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: T.text2 }}>
              <Package size={56} style={{ opacity: 0.3, marginBottom: 16 }} />
              <div style={{ fontWeight: 700, fontSize: 17 }}>Aucune mission disponible</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Attendez qu'une nouvelle commande vous soit assignée.</div>
            </div>
          ) : (
            proposees.map(cmd => (
              <div key={cmd.id} onClick={() => { setCommandeId(cmd.id); setSelectMode(false); }}
                style={{ background: T.card, borderRadius: 16, padding: '16px 18px', border: `1px solid ${T.border}`, marginBottom: 12, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>#{cmd.reference}</span>
                  <span style={{ fontSize: 12, background: `${T.primary}20`, color: T.primary, padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>Proposée</span>
                </div>
                <div style={{ fontSize: 13, color: T.text2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={12} /> {cmd.adresse_livraison || 'Adresse non définie'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  /* ── Écran livraison terminée ──────────────────────────────────────────── */
  if (livree) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: `${T.success}20`, border: `3px solid ${T.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: `0 0 40px ${T.success}44` }}>
          <CheckCircle size={64} color={T.success} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 26, color: T.text, marginBottom: 8 }}>Livraison confirmée !</div>
        <div style={{ fontSize: 15, color: T.text2, marginBottom: 6 }}>Commande #{commande?.reference || commandeId}</div>
        <div style={{ fontSize: 13, color: T.primary, marginBottom: 32 }}>⏱️ Durée : {formatTime(elapsed)}</div>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <BigBtn label="Voir mes prochaines missions" color={T.primary} onClick={() => { setSelectMode(true); setLivree(false); setEtape(0); setCommandeId(null); }} />
          <div style={{ marginTop: 12 }}>
            <BigBtn label="Retour au dashboard" color={T.surface} onClick={() => navigate('/chauffeur')} />
          </div>
        </div>
      </div>
    );
  }

  const etapeActuelle = ETAPES[etape];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/chauffeur')}
          style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', color: T.text, cursor: 'pointer' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            Mode livraison {commande?.reference ? `· #${commande.reference}` : ''}
          </div>
          {etape > 0 && (
            <div style={{ fontSize: 12, color: T.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {formatTime(elapsed)}
            </div>
          )}
        </div>
      </div>

      <ProgressBar current={etapeActuelle.id} />

      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Étape en cours */}
        <div style={{
          background: `${etapeActuelle.color}15`,
          border: `2px solid ${etapeActuelle.color}50`,
          borderRadius: 24, padding: '28px 24px', textAlign: 'center', marginBottom: 20,
          boxShadow: `0 0 32px ${etapeActuelle.color}20`,
        }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{etapeActuelle.icon}</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: T.text, marginBottom: 6 }}>{etapeActuelle.label}</div>
          <div style={{ fontSize: 14, color: T.text2, lineHeight: 1.5 }}>{etapeActuelle.desc}</div>
        </div>

        {/* Infos commande */}
        {commande && (
          <div style={{ background: T.card, borderRadius: 16, padding: '16px 18px', border: `1px solid ${T.border}`, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.text2, marginBottom: 2 }}>Boutique</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{commande.fondateur_detail?.nom_boutique || '–'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.text2, marginBottom: 2 }}>Articles</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{commande.lignes?.length || 0} article(s)</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: T.text2, marginBottom: 2 }}>Adresse de livraison</div>
              <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={13} color={T.primary} style={{ marginTop: 1, flexShrink: 0 }} />
                {commande.adresse_livraison || '–'}
              </div>
            </div>
          </div>
        )}

        {/* Lien navigation externe */}
        {etape >= 1 && commande?.adresse_livraison && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(commande.adresse_livraison)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: T.info, color: '#fff', borderRadius: 14, padding: '12px 0', fontWeight: 700, fontSize: 14, textDecoration: 'none', marginBottom: 16 }}>
            <Navigation size={16} /> Ouvrir dans Google Maps
          </a>
        )}

        {/* Erreur */}
        {error && (
          <div style={{ background: `${T.error}18`, border: `1px solid ${T.error}44`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.error }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Bouton principal */}
        <div style={{ marginTop: 'auto' }}>
          {etape < ETAPES.length - 1 ? (
            <BigBtn
              label={etapeActuelle.action}
              color={etapeActuelle.color}
              loading={loading}
              onClick={avancerEtape}
            />
          ) : (
            <BigBtn
              label="Confirmer la livraison"
              color={T.success}
              icon={CheckCircle}
              onClick={() => setShowPIN(true)}
              loading={loading}
            />
          )}

          {/* Signaler incident */}
          <button
            onClick={() => navigate('/chauffeur/signaler-incident')}
            style={{ width: '100%', marginTop: 12, padding: '14px 0', background: 'none', border: `1px solid ${T.border}`, borderRadius: 14, color: T.text2, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <AlertTriangle size={15} /> Signaler un incident
          </button>
        </div>
      </div>

      {/* Panel confirmation */}
      {showPIN && (
        <PanelPIN
          onConfirm={confirmerLivraison}
          onClose={() => setShowPIN(false)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
