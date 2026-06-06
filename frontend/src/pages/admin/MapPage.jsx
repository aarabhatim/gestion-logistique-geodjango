import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { transporteursApi, fondateursApi, commandesApi } from '../../services/api';
import { useI18n } from '../../contexts/I18nContext';
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
  transporteur_available:  makeIcon('#10b981', '🚗'),
  transporteur_delivering: makeIcon('#f59e0b', '🚚', 36, true),
  transporteur_offline:    makeIcon('#475569', '🚙'),
  transporteur_unverified: makeIcon('#ef4444', '⚠️', 34),
  boutique_open:           makeIcon('#3b82f6', '🏪', 34),
  boutique_closed:         makeIcon('#64748b', '🏪', 32),
  boutique_unverified:     makeIcon('#f59e0b', '🏪', 34),
  delivery_active:         makeIcon('#ec4899', '📦', 34, true),
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
const KPIRow = ({ stats }) => {
  const { t } = useI18n();
  return (
  <div style={{
    position: 'absolute', top: 16, left: 16, zIndex: 1000,
    display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 'calc(100% - 240px)',
  }}>
    {stats.map(({ icon: Icon, labelKey, value, color, sub }) => (
      <div key={labelKey} style={{
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(14px)',
        border: `1px solid ${color}30`, borderRadius: 12,
        padding: '10px 14px', minWidth: 110, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.85)', marginTop: 2, fontWeight: 600, letterSpacing: '0.02em' }}>{t(labelKey)}</div>
          {sub && <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.6)' }}>{sub}</div>}
        </div>
      </div>
    ))}
  </div>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = () => {
  const { t } = useI18n();
  return (
  <div style={{
    position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
    background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
    padding: '14px 16px', minWidth: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }}>
    <div style={{ fontWeight: 800, fontSize: 11, color: '#94a3b8', marginBottom: 12, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Layers size={11} /> {t('mp_legend')}
    </div>

    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>{t('mp_transporteurs')}</div>
      {[
        { color: '#10b981', emoji: '🚗', lk: 'mp_available' },
        { color: '#f59e0b', emoji: '🚚', lk: 'mp_delivering' },
        { color: '#475569', emoji: '🚙', lk: 'mp_offline' },
        { color: '#ef4444', emoji: '⚠️', lk: 'mp_unverified' },
      ].map(({ color, emoji, lk }) => (
        <div key={lk} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
          <span style={{ fontSize: 13 }}>{emoji}</span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1' }}>{t(lk)}</span>
        </div>
      ))}
    </div>

    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>{t('mp_boutiques')}</div>
      {[
        { color: '#3b82f6', emoji: '🏪', lk: 'mp_open' },
        { color: '#64748b', emoji: '🏪', lk: 'mp_closed' },
        { color: '#f59e0b', emoji: '🏪', lk: 'mp_unverified_store' },
      ].map(({ color, emoji, lk }) => (
        <div key={lk} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
          <span style={{ fontSize: 13 }}>{emoji}</span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1' }}>{t(lk)}</span>
        </div>
      ))}
    </div>

    <div>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>{t('mp_operations')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        <span style={{ fontSize: 13 }}>📦</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899', flexShrink: 0 }} />
        <span style={{ color: '#cbd5e1' }}>{t('mp_active_delivery')}</span>
      </div>
    </div>
  </div>
  );
};

// ─── Layer Toggle ─────────────────────────────────────────────────────────────
const LayerToggle = ({ layers, onToggle }) => {
  const { t } = useI18n();
  return (
  <div style={{
    position: 'absolute', top: 16, right: 16, zIndex: 1000,
    background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px',
    minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }}>
    <div style={{ fontWeight: 800, fontSize: 11, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Eye size={11} /> Couches
    </div>
    {Object.entries(layers).map(([key, { labelKey, color, active, count }]) => (
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
        <span style={{ fontSize: 12, color: active ? '#e2e8f0' : '#64748b', flex: 1 }}>{t(labelKey)}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: active ? color : '#475569',
          background: active ? `${color}15` : 'transparent',
          padding: '1px 7px', borderRadius: 10,
        }}>{count}</span>
      </div>
    ))}
  </div>
);
};

// ─── Side panel: Boutiques supervision ────────────────────────────────────────
const BoutiqueSupervisionPanel = ({ boutiques, onValider }) => {
  const { t } = useI18n();
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nonVerifiees.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={12} /> {nonVerifiees.length} {t('mp_pending_verif')}
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
              <Star size={11} /> {lowRated.length} {t('mp_low_rating')}
            </div>
          </div>
        )}

        {nonVerifiees.length === 0 && closed.length === 0 && lowRated.length === 0 && (
          <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-secondary)', fontSize: 12 }}>
            <CheckCircle size={20} color="#10b981" style={{ marginBottom: 4 }} />
            <div>Toutes les boutiques sont OK ✓</div>
          </div>
        )}
      </div>

      {/* Répartition catégories */}
      <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 6 }}>{t('mp_repartition')}</div>
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
  const { t } = useI18n();
  const formatDuration = (m) => {
    if (!m) return '0h';
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h${String(m % 60).padStart(2, '0')}` : `${m}min`;
  };

  const topActifs = [...transporteurs]
    .filter(tr => tr.minutes_travaillees_aujourd_hui > 0 || tr.is_available)
    .sort((a, b) => {
      const aMin = (a.minutes_travaillees_aujourd_hui || 0) + (a.is_available ? (a.minutes_session_courante || 0) : 0);
      const bMin = (b.minutes_travaillees_aujourd_hui || 0) + (b.is_available ? (b.minutes_session_courante || 0) : 0);
      return bMin - aMin;
    })
    .slice(0, 5);

  return (
    <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Activity size={15} color="#10b981" /> {t('mp_realtime_activity')}
      </h4>

      {/* Livraisons EN_ROUTE */}
      {livraisons.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#ec4899', letterSpacing: '0.05em', marginBottom: 6 }}>
            🚚 {t('mp_en_cours')} ({livraisons.length})
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
        ) : topActifs.map((tr, i) => {
          const min = (tr.minutes_travaillees_aujourd_hui || 0) + (tr.is_available ? (tr.minutes_session_courante || 0) : 0);
          return (
            <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11 }}>
              <span style={{ width: 16, fontWeight: 700, color: i === 0 ? '#f59e0b' : '#64748b' }}>{i + 1}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tr.nom_complet || tr.user_email}
              </span>
              {tr.is_available && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />}
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
  const { t } = useI18n();
  const [transporteurs, setTransporteurs] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [search, setSearch] = useState('');
  const [layers, setLayers] = useState({
    transporteurs: { labelKey: 'nav_transporteurs', color: '#10b981', active: true, count: 0 },
    boutiques:     { labelKey: 'nav_stores',         color: '#3b82f6', active: true, count: 0 },
    livraisons:    { labelKey: 'nav_orders',          color: '#ec4899', active: true, count: 0 },
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

  const filteredT = transporteurs.filter(tr =>
    filterSearch(tr, [tr.nom_complet, tr.user_email, tr.plaque, tr.vehicule_type])
  );
  const filteredB = boutiques.filter(b =>
    filterSearch(b, [b.nom_boutique, b.ville, b.categorie, b.adresse])
  );
  const filteredL = livraisons.filter(c =>
    filterSearch(c, [c.reference, c.adresse_livraison, c.fondateur_detail?.nom_boutique])
  );

  // Points for fit-bounds
  const allPoints = [];
  filteredT.forEach(tr => {
    const lat = parseFloat(tr.latitude);
    const lon = parseFloat(tr.longitude);
    if (!isNaN(lat) && !isNaN(lon)) allPoints.push([lat, lon]);
  });
  filteredB.forEach(b => {
    const lat = parseFloat(b.latitude);
    const lon = parseFloat(b.longitude);
    if (!isNaN(lat) && !isNaN(lon)) allPoints.push([lat, lon]);
  });
  filteredL.forEach(c => {
    const lat = parseFloat(c.latitude_livraison);
    const lon = parseFloat(c.longitude_livraison);
    if (!isNaN(lat) && !isNaN(lon)) allPoints.push([lat, lon]);
  });

  // KPIs
  const disponibles      = transporteurs.filter(tr => tr.is_available && !tr.is_on_delivery).length;
  const enLivraison      = transporteurs.filter(tr => tr.is_on_delivery).length;
  const boutiquesOpen    = boutiques.filter(b => b.is_open && b.is_verified).length;
  const boutiquesAttente = boutiques.filter(b => !b.is_verified).length;
  const totalTempsActif  = transporteurs.reduce((s, tr) =>
    s + (tr.minutes_travaillees_aujourd_hui || 0) + (tr.is_available ? (tr.minutes_session_courante || 0) : 0), 0);
  const heuresFlotte = Math.floor(totalTempsActif / 60);

  const kpiStats = [
    { icon: CheckCircle, labelKey: 'mp_available',   value: disponibles,       color: '#10b981' },
    { icon: Truck,       labelKey: 'mp_delivering',  value: enLivraison,       color: '#f59e0b' },
    { icon: Package,     labelKey: 'dash_actives',   value: livraisons.length, color: '#ec4899' },
    { icon: Store,       labelKey: 'mp_open',        value: boutiquesOpen,     color: '#3b82f6', sub: `${boutiquesAttente} ${t('mp_pending_verif')}` },
    { icon: Clock,       labelKey: 'chd_active_since', value: `${heuresFlotte}h`, color: '#a78bfa', sub: t('dash_today') },
  ];

  const getTransporteurIcon = (tr) => {
    if (!tr.is_verified) return ICONS.transporteur_unverified;
    if (tr.is_on_delivery) return ICONS.transporteur_delivering;
    if (tr.is_available)   return ICONS.transporteur_available;
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
          <h2 className="page-title text-gradient">{t('mp_title')}</h2>
          <p className="page-subtitle">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {t('mp_realtime')}
            </span>
            {lastUpdate && ` · Maj ${lastUpdate.toLocaleTimeString(undefined)}`}
            {' · '}Auto-refresh 30s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input className="glass-input" placeholder={t('mp_search_placeholder')} value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 260, fontSize: 13 }} />
          </div>
          <button className="btn btn-secondary" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main grid: map + side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', flex: 1, minHeight: 500, height: '100%' }}>

        {/* MAP */}
        <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden', position: 'relative', borderRadius: 16, height: '100%', minHeight: 500 }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--text-secondary)' }}>
              <RefreshCw size={32} className="spin" />
              <span>{t('mp_loading')}</span>
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
                  url={`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                  attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
                />
                <FitBounds points={allPoints} />

                {/* Transporteurs */}
                {layers.transporteurs.active && filteredT.map(tr => {
                  if (!tr.latitude || !tr.longitude) return null;
                  const workedMin = (tr.minutes_travaillees_aujourd_hui || 0) + (tr.is_available ? (tr.minutes_session_courante || 0) : 0);
                  return (
                    <Marker key={`t-${tr.id}`} position={[tr.latitude, tr.longitude]} icon={getTransporteurIcon(tr)}>
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong>🚗 {tr.nom_complet}</strong>
                            {tr.is_verified && <span style={{ background: '#10b98120', color: '#10b981', fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>✔ Vérifié</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{tr.vehicule_type} · {tr.plaque}</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                            {tr.is_on_delivery
                              ? <span style={{ background: '#f59e0b20', color: '#f59e0b', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🚚 {t('mp_delivering')}</span>
                              : tr.is_available
                                ? <span style={{ background: '#10b98120', color: '#10b981', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>✅ {t('mp_available')}</span>
                                : <span style={{ background: '#47556920', color: '#94a3b8', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>⭕ {t('mp_offline')}</span>
                            }
                          </div>
                          <div style={{ fontSize: 12, marginTop: 6, color: '#64748b' }}>
                            ⭐ {tr.note_moyenne?.toFixed(1) || '–'} · {tr.nombre_livraisons || 0} livraisons
                          </div>
                          <div style={{ fontSize: 11, marginTop: 4, color: '#a78bfa' }}>
                            🕐 Travail aujourd'hui : <strong>{Math.floor(workedMin / 60)}h{String(workedMin % 60).padStart(2, '0')}</strong>
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
                            <span style={{ color: b.is_open ? '#10b981' : '#ef4444' }}>● {b.is_open ? t('mp_open_status') : t('mp_closed_status')}</span>
                            <span style={{ marginLeft: 10, color: '#64748b' }}>⭐ {b.note_moyenne?.toFixed(1) || '–'}</span>
                          </div>
                          <div style={{ fontSize: 11, marginTop: 4, color: '#64748b' }}>
                            {b.nombre_commandes || 0} commandes · {b.categorie}
                          </div>
                          {!b.is_verified && (
                            <button
                              onClick={() => handleValiderBoutique(b.id, 'valider')}
                              style={{ marginTop: 8, background: '#10b981', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700, width: '100%' }}>
                              {t('mp_verify_store')}
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

        {/* Side panels */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <ActivityPanel transporteurs={transporteurs} livraisons={livraisons} />
          <BoutiqueSupervisionPanel boutiques={boutiques} onValider={handleValiderBoutique} />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
