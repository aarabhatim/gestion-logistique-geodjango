import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { transporteursApi, fondateursApi, commandesApi } from '../services/api';
import {
  Truck, Store, Package, RefreshCw, Layers, Users, Eye, EyeOff,
  Navigation, AlertCircle, CheckCircle, Clock, TrendingUp, Shield,
  MapPin, Activity, DollarSign, Star, AlertTriangle, BarChart3, Search,
  Maximize2, ChevronRight, Zap,
} from 'lucide-react';

// ─── Marker SVG factories ─────────────────────────────────────────────────────
const makeIcon = (color, emoji, size = 36, pulse = false) => L.divIcon({
  className: '',
  html: `<div style="
    position:relative;width:${size}px;height:${size}px;
  ">
    ${pulse ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.3;animation:mapPulse 2s ease-out infinite"></div>` : ''}
    <div style="
      position:relative;width:${size}px;height:${size}px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid rgba(255,255,255,0.85);
      box-shadow:0 4px 12px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:${size * 0.45}px;line-height:1">${emoji}</span></div>
  </div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const ICONS = {
  transporteur_available: makeIcon('#10b981', '🚗'),
  transporteur_delivering: makeIcon('#f59e0b', '🚚', 36, true),
  transporteur_offline:   makeIcon('#475569', '🚙'),
  transporteur_unverified: makeIcon('#ef4444', '⚠️', 34),
  boutique_open:          makeIcon('#3b82f6', '🏪', 34),
  boutique_closed:        makeIcon('#64748b', '🏪', 32),
  boutique_unverified:    makeIcon('#f59e0b', '🏪', 34),
  delivery_active:        makeIcon('#ec4899', '📦', 34, true),
};

const CATEGORIE_ICONS = {
  SUPERMARCHE:  '🛒', PHARMACIE: '💊', RESTAURATION: '🍽️',
  BOUTIQUE: '👗', ELECTRONIQUE: '📱',
};

// ─── Auto-fit map bounds ──────────────────────────────────────────────────────
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [60, 60], maxZoom: 13 });
    }
  }, [JSON.stringify(points)]);
  return null;
};

// ─── KPI Card (floating, top-left overlay) ───────────────────────────────────
const KPIRow = ({ stats }) => (
  <div style={{
    position: 'absolute', top: 16, left: 16, zIndex: 1000,
    display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 'calc(100% - 240px)',
  }}>
    {stats.map(({ icon: Icon, label, value, color, sub }) => (
      <div key={label} style={{
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(14px)',
        border: `1px solid ${color}30`, borderRadius: 12,
        padding: '10px 14px', minWidth: 110, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.85)', marginTop: 2, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</div>
          {sub && <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.6)' }}>{sub}</div>}
        </div>
      </div>
    ))}
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = () => (
  <div style={{
    position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
    background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
    padding: '14px 16px', minWidth: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }}>
    <div style={{ fontWeight: 800, fontSize: 11, color: '#94a3b8', marginBottom: 12, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Layers size={11} /> LÉGENDE
    </div>

    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>TRANSPORTEURS</div>
      {[
        { color: '#10b981', emoji: '🚗', label: 'Disponible' },
        { color: '#f59e0b', emoji: '🚚', label: 'En livraison' },
        { color: '#475569', emoji: '🚙', label: 'Hors ligne' },
        { color: '#ef4444', emoji: '⚠️', label: 'Non vérifié' },
      ].map(({ color, emoji, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
          <span style={{ fontSize: 13 }}>{emoji}</span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1' }}>{label}</span>
        </div>
      ))}
    </div>

    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>BOUTIQUES</div>
      {[
        { color: '#3b82f6', emoji: '🏪', label: 'Ouverte' },
        { color: '#64748b', emoji: '🏪', label: 'Fermée' },
        { color: '#f59e0b', emoji: '🏪', label: 'Non vérifiée' },
      ].map(({ color, emoji, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
          <span style={{ fontSize: 13 }}>{emoji}</span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1' }}>{label}</span>
        </div>
      ))}
    </div>

    <div>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>OPÉRATIONS</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        <span style={{ fontSize: 13 }}>📦</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899', flexShrink: 0 }} />
        <span style={{ color: '#cbd5e1' }}>Livraison active</span>
      </div>
    </div>
  </div>
);

// ─── Layer Toggle ─────────────────────────────────────────────────────────────
const LayerToggle = ({ layers, onToggle }) => (
  <div style={{
    position: 'absolute', top: 16, right: 16, zIndex: 1000,
    background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px',
    minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }}>
    <div style={{ fontWeight: 800, fontSize: 11, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Eye size={11} /> COUCHES VISIBLES
    </div>
    {Object.entries(layers).map(([key, { label, color, active, count }]) => (
      <div key={key} style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer',
        padding: '4px 6px', borderRadius: 6, transition: 'background 0.15s',
      }}
        onClick={() => onToggle(key)}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{
          width: 16, height: 16, borderRadius: 4, border: `2px solid ${color}`,
          background: active ? color : 'transparent', transition: 'all 0.2s', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {active && <CheckCircle size={10} color="white" />}
        </div>
        <span style={{ fontSize: 12, color: active ? '#e2e8f0' : '#64748b', flex: 1 }}>{label}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: active ? color : '#475569',
          background: active ? `${color}15` : 'transparent',
          padding: '1px 7px', borderRadius: 10,
        }}>{count}</span>
      </div>
    ))}
  </div>
);

// ─── Side panel: Boutiques supervision ────────────────────────────────────────
const BoutiqueSupervisionPanel = ({ boutiques, onValider, loading }) => {
  const nonVerifiees = boutiques.filter(b => !b.is_verified);
  const closed = boutiques.filter(b => b.is_verified && !b.is_open);
  const lowRated = boutiques.filter(b => b.is_verified && b.note_moyenne && b.note_moyenne < 3.5);

  return (
    <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
          <Shield size={15} color="#8b5cf6" /> Supervision Boutiques
        </h4>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{boutiques.length} total</span>
      </div>

      {/* Alertes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nonVerifiees.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={12} /> {nonVerifiees.length} en attente de vérification
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto' }}>
              {nonVerifiees.slice(0, 4).map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <span>{CATEGORIE_ICONS[b.categorie]} {b.nom_boutique}</span>
                  <button onClick={() => onValider(b.id, 'valider')}
                    style={{ background: '#10b98120', color: '#10b981', border: 'none', borderRadius: 4, padding: '1px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                    ✓ Valider
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {closed.length > 0 && (
          <div style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)', borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Store size={11} /> <strong>{closed.length}</strong> boutique{closed.length > 1 ? 's' : ''} fermée{closed.length > 1 ? 's' : ''}
            </div>
          </div>
        )}

        {lowRated.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Star size={11} /> {lowRated.length} note &lt; 3.5 — à surveiller
            </div>
          </div>
        )}

        {nonVerifiees.length === 0 && closed.length === 0 && lowRated.length === 0 && (
          <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-secondary)', fontSize: 12 }}>
            <CheckCircle size={20} color="#10b981" style={{ marginBottom: 4 }} />
            <div>Toutes les boutiques sont saines ✓</div>
          </div>
        )}
      </div>

      {/* Répartition catégories */}
      <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 6 }}>RÉPARTITION</div>
        {Object.entries(CATEGORIE_ICONS).map(([cat, icon]) => {
          const n = boutiques.filter(b => b.categorie === cat).length;
          if (!n) return null;
          const pct = boutiques.length ? Math.round((n / boutiques.length) * 100) : 0;
          return (
            <div key={cat} style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span>{icon} {cat}</span>
                <span style={{ fontWeight: 700 }}>{n} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({pct}%)</span></span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Side panel: Activité temps réel ──────────────────────────────────────────
const ActivityPanel = ({ transporteurs, livraisons }) => {
  const formatDuration = (m) => {
    if (!m) return '0h';
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h${String(m % 60).padStart(2, '0')}` : `${m}min`;
  };

  const topActifs = [...transporteurs]
    .filter(t => t.minutes_travaillees_aujourd_hui > 0 || t.is_available)
    .sort((a, b) => {
      const aMin = (a.minutes_travaillees_aujourd_hui || 0) + (a.is_available ? (a.minutes_session_courante || 0) : 0);
      const bMin = (b.minutes_travaillees_aujourd_hui || 0) + (b.is_available ? (b.minutes_session_courante || 0) : 0);
      return bMin - aMin;
    })
    .slice(0, 5);

  return (
    <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Activity size={15} color="#10b981" /> Activité temps réel
      </h4>

      {/* Livraisons EN_ROUTE */}
      {livraisons.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#ec4899', letterSpacing: '0.05em', marginBottom: 6 }}>
            🚚 EN COURS ({livraisons.length})
          </div>
          <div style={{ maxHeight: 130, overflowY: 'auto' }}>
            {livraisons.slice(0, 5).map(cmd => (
              <div key={cmd.id} style={{ fontSize: 11, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#ec4899' }}>{cmd.reference}</strong>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{Math.round(cmd.total_price)} MAD</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginTop: 1 }}>
                  {cmd.fondateur_detail?.nom_boutique || '–'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top actifs */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={10} /> TOP CHAUFFEURS — TEMPS TRAVAIL
        </div>
        {topActifs.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>
            Aucun chauffeur actif
          </div>
        ) : topActifs.map((t, i) => {
          const min = (t.minutes_travaillees_aujourd_hui || 0) + (t.is_available ? (t.minutes_session_courante || 0) : 0);
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11 }}>
              <span style={{ width: 16, fontWeight: 700, color: i === 0 ? '#f59e0b' : '#64748b' }}>{i + 1}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.nom_complet || t.user_email}
              </span>
              {t.is_available && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />}
              <span style={{ fontWeight: 700, color: '#a78bfa', minWidth: 50, textAlign: 'right' }}>
                {formatDuration(min)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MapPage = () => {
  const [transporteurs, setTransporteurs] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [search, setSearch] = useState('');
  const [layers, setLayers] = useState({
    transporteurs: { label: 'Transporteurs', color: '#10b981', active: true, count: 0 },
    boutiques:     { label: 'Boutiques',     color: '#3b82f6', active: true, count: 0 },
    livraisons:    { label: 'Livraisons',    color: '#ec4899', active: true, count: 0 },
  });
  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [tRes, bRes, cRes] = await Promise.all([
        transporteursApi.adminListe(),
        fondateursApi.adminListe(),
        commandesApi.list({ statut: 'EN_ROUTE' }),
      ]);
      const tData = tRes.data.results || tRes.data || [];
      const bData = bRes.data.results || bRes.data || [];
      const cData = cRes.data.results || cRes.data || [];
      setTransporteurs(tData);
      setBoutiques(bData);
      setLivraisons(cData);
      setLayers(prev => ({
        ...prev,
        transporteurs: { ...prev.transporteurs, count: tData.length },
        boutiques:     { ...prev.boutiques,     count: bData.length },
        livraisons:    { ...prev.livraisons,    count: cData.length },
      }));
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const toggleLayer = (key) =>
    setLayers(prev => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }));

  const handleValiderBoutique = async (id, action) => {
    try {
      await fondateursApi.adminValider(id, action);
      fetchAll();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  // Filter by search
  const filterSearch = (item, fields) => {
    if (!search) return true;
    return fields.some(f => f?.toLowerCase().includes(search.toLowerCase()));
  };

  const filteredT = transporteurs.filter(t =>
    filterSearch(t, [t.nom_complet, t.user_email, t.plaque, t.vehicule_type])
  );
  const filteredB = boutiques.filter(b =>
    filterSearch(b, [b.nom_boutique, b.ville, b.categorie, b.adresse])
  );
  const filteredL = livraisons.filter(c =>
    filterSearch(c, [c.reference, c.adresse_livraison, c.fondateur_detail?.nom_boutique])
  );

  // Points for fit-bounds
  const allPoints = [];
  filteredT.forEach(t => { if (t.latitude && t.longitude) allPoints.push([t.latitude, t.longitude]); });
  filteredB.forEach(b => { if (b.latitude && b.longitude) allPoints.push([b.latitude, b.longitude]); });
  filteredL.forEach(c => { if (c.latitude_livraison && c.longitude_livraison) allPoints.push([c.latitude_livraison, c.longitude_livraison]); });

  // KPIs
  const disponibles    = transporteurs.filter(t => t.is_available && !t.is_on_delivery).length;
  const enLivraison    = transporteurs.filter(t => t.is_on_delivery).length;
  const boutiquesOpen  = boutiques.filter(b => b.is_open && b.is_verified).length;
  const boutiquesAttente = boutiques.filter(b => !b.is_verified).length;
  const totalTempsActif = transporteurs.reduce((s, t) =>
    s + (t.minutes_travaillees_aujourd_hui || 0) + (t.is_available ? (t.minutes_session_courante || 0) : 0), 0);
  const heuresFlotte = Math.floor(totalTempsActif / 60);

  const kpiStats = [
    { icon: CheckCircle, label: 'Disponibles',  value: disponibles,    color: '#10b981' },
    { icon: Truck,       label: 'En livraison', value: enLivraison,    color: '#f59e0b' },
    { icon: Package,     label: 'Actives',      value: livraisons.length, color: '#ec4899' },
    { icon: Store,       label: 'Ouvertes',     value: boutiquesOpen,  color: '#3b82f6', sub: `${boutiquesAttente} en attente` },
    { icon: Clock,       label: 'Heures flotte', value: `${heuresFlotte}h`, color: '#a78bfa', sub: 'aujourd\'hui' },
  ];

  const getTransporteurIcon = (t) => {
    if (!t.is_verified) return ICONS.transporteur_unverified;
    if (t.is_on_delivery) return ICONS.transporteur_delivering;
    if (t.is_available)   return ICONS.transporteur_available;
    return ICONS.transporteur_offline;
  };

  const getBoutiqueIcon = (b) => {
    if (!b.is_verified) return ICONS.boutique_unverified;
    if (!b.is_open) return ICONS.boutique_closed;
    return ICONS.boutique_open;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Custom CSS for map pulse */}
      <style>{`
        @keyframes mapPulse {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div className="dashboard-header animate-fade-in" style={{ flexShrink: 0 }}>
        <div>
          <h2 className="page-title text-gradient">Centre de Supervision</h2>
          <p className="page-subtitle">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Temps réel
            </span>
            {lastUpdate && ` · Maj ${lastUpdate.toLocaleTimeString('fr-FR')}`}
            {' · '}Auto-refresh 30s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input className="glass-input" placeholder="Rechercher sur la carte..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 260, fontSize: 13 }} />
          </div>
          <button className="btn btn-secondary" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main grid: map + side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', flex: 1, minHeight: 0 }}>

        {/* MAP */}
        <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden', position: 'relative', borderRadius: 16, minHeight: 500 }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--text-secondary)' }}>
              <RefreshCw size={32} className="spin" />
              <span>Chargement des données cartographiques…</span>
            </div>
          ) : (
            <>
              <MapContainer
                center={[33.5731, -7.5898]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />
                <FitBounds points={allPoints} />

                {/* Transporteurs */}
                {layers.transporteurs.active && filteredT.map(t => {
                  if (!t.latitude || !t.longitude) return null;
                  return (
                    <Marker key={`t-${t.id}`} position={[t.latitude, t.longitude]} icon={getTransporteurIcon(t)}>
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong>🚗 {t.nom_complet}</strong>
                            {t.is_verified && <span style={{ background: '#10b98120', color: '#10b981', fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>✔ VÉRIFIÉ</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{t.vehicule_type} · {t.plaque}</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                            {t.is_on_delivery
                              ? <span style={{ background: '#f59e0b20', color: '#f59e0b', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🚚 En livraison</span>
                              : t.is_available
                                ? <span style={{ background: '#10b98120', color: '#10b981', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>✅ Disponible</span>
                                : <span style={{ background: '#47556920', color: '#94a3b8', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>⭕ Hors ligne</span>
                            }
                          </div>
                          <div style={{ fontSize: 12, marginTop: 6, color: '#64748b' }}>
                            ⭐ {t.note_moyenne?.toFixed(1) || '–'} · {t.nombre_livraisons || 0} livraisons
                          </div>
                          <div style={{ fontSize: 11, marginTop: 4, color: '#a78bfa' }}>
                            🕐 Travail aujourd'hui : <strong>{Math.floor(((t.minutes_travaillees_aujourd_hui || 0) + (t.is_available ? (t.minutes_session_courante || 0) : 0)) / 60)}h{String(((t.minutes_travaillees_aujourd_hui || 0) + (t.is_available ? (t.minutes_session_courante || 0) : 0)) % 60).padStart(2, '0')}</strong>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Boutiques */}
                {layers.boutiques.active && filteredB.map(b => {
                  if (!b.latitude || !b.longitude) return null;
                  return (
                    <Marker key={`b-${b.id}`} position={[b.latitude, b.longitude]} icon={getBoutiqueIcon(b)}>
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong>{CATEGORIE_ICONS[b.categorie] || '🏪'} {b.nom_boutique}</strong>
                            {!b.is_verified && (
                              <span style={{ background: '#f59e0b20', color: '#f59e0b', fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>⏳ ATTENTE</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{b.adresse} · {b.ville}</div>
                          <div style={{ fontSize: 12, marginTop: 6 }}>
                            <span style={{ color: b.is_open ? '#10b981' : '#ef4444' }}>● {b.is_open ? 'Ouvert' : 'Fermé'}</span>
                            <span style={{ marginLeft: 10, color: '#64748b' }}>⭐ {b.note_moyenne?.toFixed(1) || '–'}</span>
                          </div>
                          <div style={{ fontSize: 11, marginTop: 4, color: '#64748b' }}>
                            {b.nombre_commandes || 0} commandes · {b.categorie}
                          </div>
                          {!b.is_verified && (
                            <button
                              onClick={() => handleValiderBoutique(b.id, 'valider')}
                              style={{ marginTop: 8, background: '#10b981', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700, width: '100%' }}>
                              ✓ Valider la boutique
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Livraisons actives */}
                {layers.livraisons.active && filteredL.map(cmd => {
                  const lat = cmd.latitude_livraison;
                  const lon = cmd.longitude_livraison;
                  if (!lat || !lon) return null;
                  return (
                    <React.Fragment key={`l-${cmd.id}`}>
                      <Marker position={[lat, lon]} icon={ICONS.delivery_active}>
                        <Popup>
                          <div style={{ minWidth: 200 }}>
                            <strong>📦 {cmd.reference}</strong>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                              {cmd.fondateur_detail?.nom_boutique || 'Boutique'}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>📍 {cmd.adresse_livraison}</div>
                            <div style={{ fontSize: 12, marginTop: 6 }}>
                              <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>🚚 EN ROUTE</span>
                            </div>
                            <div style={{ fontSize: 13, marginTop: 6, color: '#10b981', fontWeight: 700 }}>
                              {Math.round(cmd.total_price)} MAD
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                      <Circle
                        center={[lat, lon]}
                        radius={500}
                        pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.08, weight: 1, dashArray: '6 4' }}
                      />
                    </React.Fragment>
                  );
                })}
              </MapContainer>

              {/* Overlays */}
              <KPIRow stats={kpiStats} />
              <LayerToggle layers={layers} onToggle={toggleLayer} />
              <Legend />
            </>
          )}
        </div>

        {/* SIDE PANELS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: 4 }}>
          <ActivityPanel transporteurs={transporteurs} livraisons={livraisons} />
          <BoutiqueSupervisionPanel boutiques={boutiques} onValider={handleValiderBoutique} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
