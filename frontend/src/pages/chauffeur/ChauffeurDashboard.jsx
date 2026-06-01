import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck, MapPin, Navigation, Star, CheckCircle, Clock, LogOut,
  Package, TrendingUp, Bell, ChevronRight, ToggleLeft, ToggleRight,
  DollarSign, Award, AlertTriangle, Map, List, User, Zap,
  ArrowRight, Phone, RefreshCw, MessageSquare, History, Target,
  Send, QrCode, Crosshair, ShieldAlert, Settings, Wallet,
  BarChart3, Home, ChevronLeft, Menu, Activity, Bike, Loader,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { transporteursApi, commandesApi, livraisonsApi, notificationsApi, authApi, chauffeurApi } from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignalerIncidentPanel } from './SignalerIncident';
import '../../utils/leafletIcons';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:       '#0B0B0B',
  surface:  '#161616',
  sidebar:  '#111111',
  primary:  '#FF8A00',
  primary2: '#FF6B00',
  text:     '#FFFFFF',
  text2:    '#A3A3A3',
  border:   'rgba(255,255,255,0.05)',
  success:  '#22C55E',
  danger:   '#EF4444',
  warning:  '#FACC15',
};

const gradient = `linear-gradient(90deg, ${T.primary}, ${T.primary2})`;
const glowOrange = `0 8px 24px rgba(255,138,0,0.25)`;

// ─── Map icons ────────────────────────────────────────────────────────────────
const makeIcon = (color, emoji, size = 36) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:${size*0.45}px">${emoji}</div>`,
  iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2],
});
const MY_ICON       = makeIcon('#FF8A00', '🚗', 40);
const DELIVERY_ICON = makeIcon('#ef4444', '📦', 36);
const BOUTIQUE_ICON = makeIcon('#3b82f6', '🏪', 36);
const CLIENT_ICON   = makeIcon('#22c55e', '🏠', 36);

// ─── Statut styles ────────────────────────────────────────────────────────────
const STATUT_STYLE = {
  EN_ATTENTE:     { bg: '#64748b20', color: '#94a3b8', label: 'En attente' },
  VALIDEE:        { bg: '#3b82f620', color: '#3b82f6', label: 'Validée' },
  EN_PREPARATION: { bg: '#f59e0b20', color: '#f59e0b', label: 'En préparation' },
  EN_ROUTE:       { bg: '#FF8A0020', color: '#FF8A00', label: '🚚 En route' },
  LIVREE:         { bg: '#22c55e20', color: '#22c55e', label: '✅ Livrée' },
  ANNULEE:        { bg: '#ef444420', color: '#ef4444', label: 'Annulée' },
};

// ─── OSRM routing ─────────────────────────────────────────────────────────────
const fetchRoute = async (from, to) => {
  if (!from || !to) return null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]) {
      return {
        coords: data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]),
        distance_km: (data.routes[0].distance / 1000).toFixed(1),
        duration_min: Math.round(data.routes[0].duration / 60),
      };
    }
  } catch {}
  return null;
};

// ─── Vehicle display ──────────────────────────────────────────────────────────
const VEHICLE_EMOJI = { MOTO: '🛵', VOITURE: '🚗', VAN: '🚐', CAMIONNETTE: '🚐', CAMION: '🚛' };
const VEHICLE_LABEL = { MOTO: 'Moto', VOITURE: 'Voiture', VAN: 'Van', CAMIONNETTE: 'Camionnette', CAMION: 'Camion' };

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, trend, color = T.primary }) => (
  <div style={{
    background: T.surface, borderRadius: 20, padding: '22px 24px',
    border: `1px solid ${T.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    transition: 'transform 0.3s ease',
    cursor: 'default',
  }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div>
      <div style={{ fontSize: 13, color: T.text2, marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
      {trend && (
        <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={12} /> {trend}
        </div>
      )}
    </div>
    <div style={{
      width: 46, height: 46, borderRadius: 14,
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 12px ${color}40`,
    }}>
      <Icon size={22} color="white" />
    </div>
  </div>
);

// ─── MiniStat (used inside tabs) ──────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, value, color, sub }) => (
  <div style={{ background: T.surface, borderRadius: 14, padding: '1rem', textAlign: 'center', border: `1px solid ${T.border}`, borderTop: `3px solid ${color}` }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
      <Icon size={18} color={color} />
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─── Mission Card ─────────────────────────────────────────────────────────────
const MissionCard = ({ commande, onAccept, onRefuse, proposed, disabled }) => {
  const s = STATUT_STYLE[commande.statut] || STATUT_STYLE.EN_ATTENTE;
  return (
    <div style={{ background: T.surface, borderRadius: 14, padding: '1rem 1.25rem', borderLeft: `4px solid ${s.color}`, position: 'relative', border: `1px solid ${T.border}`, marginBottom: 12 }}>
      {proposed && (
        <div style={{ position: 'absolute', top: -8, right: 12, background: gradient, color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
          ✨ PROPOSÉE
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>#{commande.reference}</div>
          <div style={{ fontSize: 12, color: T.text2 }}>{commande.fondateur_detail?.nom_boutique || 'Boutique'}</div>
        </div>
        <span style={{ background: s.bg, color: s.color, fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{s.label}</span>
      </div>
      <div style={{ fontSize: 13, color: T.text2, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <MapPin size={12} /> {commande.adresse_livraison || 'Adresse non définie'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.success }}>{Math.round(commande.total_price || 0)} MAD</span>
        {proposed && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={disabled} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.danger}30`, background: `${T.danger}15`, color: T.danger, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontSize: 12, fontWeight: 600 }} onClick={() => onRefuse(commande.id)}>Refuser</button>
            <button disabled={disabled} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: disabled ? 'rgba(255,138,0,0.35)' : gradient, color: 'white', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onAccept(commande.id)}><CheckCircle size={13} /> {disabled ? 'En cours...' : 'Accepter'}</button>
          </div>
        )}
        {commande.statut === 'EN_ROUTE' && <span style={{ fontSize: 12, color: T.success, fontWeight: 600 }}>🚚 En cours</span>}
      </div>
    </div>
  );
};

// ─── Active Mission Card ──────────────────────────────────────────────────────
const ActiveMissionCard = ({ mission, myPosition, onAdvance, onCancel, disabled }) => {
  const [route, setRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const isEnRoute = mission.statut === 'EN_ROUTE';
  const destination = isEnRoute
    ? (mission.latitude_livraison && mission.longitude_livraison ? [mission.latitude_livraison, mission.longitude_livraison] : null)
    : (mission.fondateur_detail?.latitude && mission.fondateur_detail?.longitude ? [mission.fondateur_detail.latitude, mission.fondateur_detail.longitude] : null);

  useEffect(() => {
    if (myPosition && destination) {
      setLoadingRoute(true);
      fetchRoute(myPosition, destination).then(setRoute).finally(() => setLoadingRoute(false));
    }
  }, [myPosition?.[0], myPosition?.[1], destination?.[0], destination?.[1]]);

  const statusConfig = {
    VALIDEE:        { color: '#3b82f6', label: '✅ Mission assignée',       emoji: '📋', dest: 'boutique' },
    EN_PREPARATION: { color: T.warning, label: '👨‍🍳 En préparation',         emoji: '🏪', dest: 'boutique' },
    EN_ROUTE:       { color: T.primary, label: '🚚 En route vers client',   emoji: '🏠', dest: 'client' },
  }[mission.statut] || { color: '#64748b', label: mission.statut, emoji: '📦' };

  const nextAction = isEnRoute
    ? { label: '✓ Confirmer livraison', color: T.success, icon: CheckCircle }
    : { label: '🚗 En route — Commande prise', color: '#3b82f6', icon: ArrowRight };

  return (
    <div style={{ background: T.surface, borderRadius: 16, padding: '1.25rem', borderLeft: `4px solid ${statusConfig.color}`, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{statusConfig.emoji}</span>
            <strong style={{ fontSize: 16, color: T.text }}>{mission.reference}</strong>
            <span style={{ fontSize: 11, background: statusConfig.color + '20', color: statusConfig.color, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>{statusConfig.label}</span>
          </div>
          <div style={{ fontSize: 13, color: T.text2 }}>{mission.fondateur_detail?.nom_boutique} → {mission.client_detail?.first_name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.success }}>+{(parseFloat(mission.frais_livraison || 0) + parseFloat(mission.sous_total || 0) * 0.05).toFixed(0)} MAD</div>
          <div style={{ fontSize: 10, color: T.text2 }}>votre gain</div>
        </div>
      </div>
      {route && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: T.text2 }}>Distance</div><div style={{ fontWeight: 700, color: '#3b82f6' }}>{route.distance_km} km</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: T.text2 }}>Temps</div><div style={{ fontWeight: 700, color: T.warning }}>{route.duration_min} min</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: T.text2 }}>Direction</div><div style={{ fontWeight: 700, color: statusConfig.color }}>{statusConfig.dest === 'boutique' ? '🏪 Boutique' : '🏠 Client'}</div></div>
        </div>
      )}
      {loadingRoute && <div style={{ fontSize: 11, color: T.text2, textAlign: 'center', padding: '6px 0' }}><RefreshCw size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Calcul itinéraire...</div>}
      {myPosition && destination && (
        <div style={{ height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
          <MapContainer center={myPosition} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`} attribution="&copy; MapTiler &copy; OpenStreetMap contributors" />
            <Marker position={myPosition} icon={MY_ICON}><Popup>📍 Moi</Popup></Marker>
            <Marker position={destination} icon={statusConfig.dest === 'boutique' ? BOUTIQUE_ICON : CLIENT_ICON}><Popup><strong>{statusConfig.dest === 'boutique' ? `🏪 ${mission.fondateur_detail?.nom_boutique}` : `🏠 ${mission.client_detail?.first_name}`}</strong></Popup></Marker>
            {route?.coords?.length > 0 && <Polyline positions={route.coords} pathOptions={{ color: statusConfig.color, weight: 4, opacity: 0.85 }} />}
          </MapContainer>
        </div>
      )}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
        <div style={{ fontSize: 10, color: T.text2, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>{statusConfig.dest === 'boutique' ? '📍 RÉCUPÉRER À' : '📍 LIVRER À'}</div>
        <div style={{ fontWeight: 600, color: T.text }}>{statusConfig.dest === 'boutique' ? mission.fondateur_detail?.nom_boutique : `${mission.client_detail?.first_name} ${mission.client_detail?.last_name || ''}`}</div>
        <div style={{ color: T.text2, marginTop: 2 }}>{statusConfig.dest === 'boutique' ? mission.fondateur_detail?.adresse : mission.adresse_livraison}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={disabled} onClick={() => onAdvance(mission)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, background: nextAction.color, color: 'white', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 14px ${nextAction.color}40` }}>
          {disabled ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <nextAction.icon size={15} />} {nextAction.label}
        </button>
        {destination && (
          <a href={`https://www.google.com/maps/dir/${myPosition ? myPosition.join(',') : ''}/${destination.join(',')}`} target="_blank" rel="noreferrer"
            style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', color: T.text, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <Navigation size={15} />
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Working Hours Card ───────────────────────────────────────────────────────
const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0h00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
};

const WorkingHoursCard = ({ profile }) => {
  const { t: wT } = useI18n();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!profile?.is_available) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [profile?.is_available]);
  let sessionMin = profile?.minutes_session_courante || 0;
  if (profile?.is_available && profile?.heure_debut_disponibilite) {
    const start = new Date(profile.heure_debut_disponibilite);
    sessionMin = Math.floor((Date.now() - start.getTime()) / 60000);
  }
  const todayMin = (profile?.minutes_travaillees_aujourd_hui || 0) + (profile?.is_available ? sessionMin : 0);
  const weekMin  = profile?.minutes_travaillees_semaine || 0;
  const monthMin = profile?.minutes_travaillees_mois || 0;
  const goalMin  = 480;
  const goalPct  = Math.min(100, Math.round((todayMin / goalMin) * 100));
  return (
    <div style={{ background: T.surface, borderRadius: 16, padding: '1.25rem', border: `1px solid ${T.border}`, borderLeft: `4px solid #a78bfa` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: T.text }}><Clock size={16} color="#a78bfa" /> {wT('chd_working_hours')}</h4>
        {profile?.is_available && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.success, fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: T.success, display: 'inline-block' }} />En activité depuis {formatDuration(sessionMin)}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { label: wT('chd_today_rev'), value: formatDuration(todayMin), color: '#a78bfa', big: true },
          { label: wT('chd_this_week'), value: formatDuration(weekMin), color: '#3b82f6' },
          { label: wT('chd_this_month_w'), value: formatDuration(monthMin), color: T.success },
        ].map(({ label, value, color, big }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: big ? `1px solid ${color}30` : `1px solid transparent` }}>
            <div style={{ fontSize: 10, color: T.text2, fontWeight: 600, marginBottom: 4 }}>{label.toUpperCase()}</div>
            <div style={{ fontWeight: 800, fontSize: big ? 20 : 16, color, fontFamily: 'monospace' }}>{value}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: T.text2 }}>{wT('chd_daily_goal')}</span>
          <span style={{ fontWeight: 700, color: goalPct >= 100 ? T.success : '#a78bfa' }}>{goalPct}%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, goalPct)}%`, height: '100%', background: goalPct >= 100 ? `linear-gradient(90deg, ${T.success}, #22c55e)` : 'linear-gradient(90deg, #8b5cf6, #a78bfa)', transition: 'width 0.6s ease' }} />
        </div>
        {goalPct >= 100 && <div style={{ fontSize: 11, color: T.success, marginTop: 6, textAlign: 'center', fontWeight: 600 }}>🏆 {wT('chd_objective_reached')}</div>}
      </div>
    </div>
  );
};

// ─── Sidebar NavItem ──────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, active, onClick, badge, collapsed }) => (
  <button onClick={onClick} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: collapsed ? '12px 0' : '11px 16px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: 16, border: 'none', cursor: 'pointer',
    background: active ? gradient : 'transparent',
    color: active ? 'white' : T.text2,
    fontWeight: active ? 700 : 500, fontSize: 14,
    transition: 'all 0.2s ease',
    position: 'relative',
    boxShadow: active ? glowOrange : 'none',
  }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,138,0,0.1)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    <Icon size={18} />
    {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>}
    {badge > 0 && (
      <span style={{ position: 'absolute', top: 8, right: collapsed ? 8 : 14, background: T.danger, color: 'white', borderRadius: 10, fontSize: 9, fontWeight: 800, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{badge}</span>
    )}
  </button>
);

// ─── Revenue chart data (illustrative) ───────────────────────────────────────
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const buildRevenueData = (revMois, months) => {
  const base = [8200,11500,9800,14200,12800,16500,18900,21200,19500,22800,24100, revMois || 24550];
  return months.map((m, i) => ({ month: m, revenus: base[i] }));
};


// ─── Tab ↔ URL mapping ───────────────────────────────────────────────────────
const PATH_TO_TAB = {
  '/chauffeur':            'dashboard',
  '/chauffeur/missions':   'missions',
  '/chauffeur/map':        'map',
  '/chauffeur/historique': 'historique',
  '/chauffeur/conduite':   'conduite',
  '/chauffeur/objectifs':  'objectifs',
  '/chauffeur/support':    'support',
  '/chauffeur/profil':     'profil',
};
const TAB_TO_PATH = {
  dashboard:  '/chauffeur',
  missions:   '/chauffeur/missions',
  map:        '/chauffeur/map',
  historique: '/chauffeur/historique',
  conduite:   '/chauffeur/conduite',
  objectifs:  '/chauffeur/objectifs',
  support:    '/chauffeur/support',
  profil:     '/chauffeur/profil',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ChauffeurDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  // tab is derived from URL; chat is an internal overlay with no route
  const [chatOpen, setChatOpen] = useState(false);
  const urlTab = PATH_TO_TAB[location.pathname] || 'dashboard';
  const tab = chatOpen ? 'chat' : urlTab;
  const setTab = (id) => {
    if (id === 'chat') { setChatOpen(true); return; }
    setChatOpen(false);
    if (TAB_TO_PATH[id]) navigate(TAB_TO_PATH[id]);
  };
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [profile, setProfile]           = useState(null);
  const [missions, setMissions]         = useState([]);
  const [proposees, setProposees]       = useState([]);
  const {
    notifications,
    unreadCount,
    marquerLue,
    toutLire,
  } = useNotifications();
  const [stats, setStats]               = useState(null);
  const [myPosition, setMyPosition]     = useState(null);
  const [posStatus, setPosStatus]       = useState('idle');
  const [togglingDispo, setTogglingDispo] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [toast, setToast]               = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [objectifs, setObjectifs]       = useState(null);
  const [historique, setHistorique]     = useState([]);
  const [chatCommande, setChatCommande] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [sosLoading, setSosLoading]     = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosType, setSosType]           = useState('ACCIDENT');
  const [sosSent, setSosSent]           = useState(false);
  const [qrInput, setQrInput]           = useState('');
  const [qrMission, setQrMission]       = useState(null);
  const [notifOpen, setNotifOpen]       = useState(false);
  const notifRef                        = useRef(null);
  const chatBottomRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [profRes, missionRes, propRes, statsRes] = await Promise.all([
        transporteursApi.monProfil(),
        commandesApi.list(),
        commandesApi.proposees().catch(() => ({ data: [] })),
        transporteursApi.mesStats().catch(() => ({ data: null })),
      ]);
      setProfile(profRes.data);
      const all = missionRes.data.results || missionRes.data || [];
      setMissions(all.filter(c => ['VALIDEE','EN_PREPARATION','EN_ROUTE'].includes(c.statut)));
      setProposees(Array.isArray(propRes.data) ? propRes.data : propRes.data.results || []);
      if (statsRes && statsRes.data) setStats(statsRes.data);
    } catch (e) {
      console.error(e);
      setError('Impossible de charger les données du tableau de bord.');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => setMyPosition([pos.coords.latitude, pos.coords.longitude]), () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }, []);
  useEffect(() => { const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    let id;
    if (tab === 'map' && navigator.geolocation) {
      const up = () => navigator.geolocation.getCurrentPosition(pos => { setMyPosition([pos.coords.latitude, pos.coords.longitude]); authApi.updatePosition(pos.coords.latitude, pos.coords.longitude).catch(() => {}); }, () => {}, { enableHighAccuracy: true });
      up(); id = setInterval(up, 60000);
    }
    return () => clearInterval(id);
  }, [tab]);

  const handleUpdatePosition = () => {
    setPosStatus('loading');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try { await authApi.updatePosition(pos.coords.latitude, pos.coords.longitude); setMyPosition([pos.coords.latitude, pos.coords.longitude]); setPosStatus('success'); showToast('Position mise à jour !'); setTimeout(() => setPosStatus('idle'), 3000); }
      catch { setPosStatus('error'); setTimeout(() => setPosStatus('idle'), 3000); }
    }, () => { setPosStatus('error'); setTimeout(() => setPosStatus('idle'), 3000); }, { enableHighAccuracy: true });
  };

  const handleToggleDispo = async () => {
    setTogglingDispo(true);
    try { const res = await transporteursApi.toggleDisponibilite(); setProfile(prev => ({ ...prev, is_available: res.data.is_available })); showToast(res.data.is_available ? 'Vous êtes disponible' : 'Vous êtes indisponible'); }
    catch { showToast('Erreur', 'error'); }
    finally { setTogglingDispo(false); }
  };

  const handleAccept = async (id) => {
    if (actionLoading) return;
    setActionLoading(true);
    try { await commandesApi.transporteurAction(id, 'accepter'); showToast('Mission acceptée ! Bonne route 🚚'); await fetchData(); }
    catch (e) { showToast(e.response?.data?.detail || 'Erreur', 'error'); }
    finally { setActionLoading(false); }
  };
  const handleRefuse = async (id) => {
    if (actionLoading) return;
    setActionLoading(true);
    try { await commandesApi.transporteurAction(id, 'refuser'); showToast('Mission refusée'); await fetchData(); }
    catch { showToast('Erreur', 'error'); }
    finally { setActionLoading(false); }
  };
  const handleAdvance = async (mission) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await commandesApi.avancer(mission.id);
      showToast(mission.statut === 'EN_ROUTE' ? `✅ Livraison confirmée ! +${(parseFloat(mission.frais_livraison || 0) + parseFloat(mission.sous_total || 0) * 0.05).toFixed(0)} MAD` : '🚗 En route !');
      await fetchData();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setActionLoading(false); }
  };

  const SOS_OPTIONS = [
    { id: 'accident',  emoji: '🚗💥', label: 'Accident de véhicule',      message: 'ACCIDENT — Véhicule impliqué dans un accident' },
    { id: 'panne',     emoji: '🔧',   label: 'Panne / Crevaison',          message: 'PANNE — Véhicule immobilisé' },
    { id: 'agression', emoji: '🆘',   label: 'Agression / Insécurité',     message: 'URGENCE SÉCURITÉ — Chauffeur en danger' },
    { id: 'medical',   emoji: '🏥',   label: 'Urgence médicale',           message: 'URGENCE MÉDICALE — Chauffeur nécessite secours' },
    { id: 'perdu',     emoji: '🗺️',   label: 'Perdu / Problème itinéraire',message: "NAVIGATION — Chauffeur perdu" },
    { id: 'autre',     emoji: '⚠️',   label: 'Autre urgence',              message: 'URGENCE — Situation critique' },
  ];
  const sendSOS = async (option) => {
    // BUG-08: le bouton modal appelle sendSOS sans argument — on résout le type via sosType
    const selectedOption = (option && option.message) ? option : (
      SOS_OPTIONS.find(o => o.id === sosType.toLowerCase()) || { label: sosType, message: `SOS ${sosType}` }
    );
    setSosModalOpen(false); setSosLoading(true);
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              // BUG-08: le backend attend `lat` et `lng`, pas `latitude`/`longitude`
              await chauffeurApi.sos({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                type: selectedOption.id,
                message: selectedOption.message,
              });
              resolve();
            } catch (e) { reject(e); }
          },
          async () => {
            try {
              await chauffeurApi.sos({ type: selectedOption.id, message: selectedOption.message + ' (position inconnue)' });
              resolve();
            } catch (e) { reject(e); }
          },
          { timeout: 5000 }
        );
      });
      showToast(`🚨 SOS "${selectedOption.label}" envoyé !`);
    } catch { showToast("Erreur lors de l'envoi SOS", 'error'); }
    finally { setSosLoading(false); }
  };

  const loadObjectifs = useCallback(async () => { try { const r = await chauffeurApi.objectifs(); setObjectifs(r.data); } catch {} }, []);
  const loadHistorique = useCallback(async () => { try { const r = await chauffeurApi.historique({ page_size: 30 }); setHistorique(r.data?.results || r.data || []); } catch {} }, []);
  const openChat = async (commande) => {
    setChatCommande(commande); setChatLoading(true); setTab('chat');
    try { const r = await chauffeurApi.chatGet(commande.id); setChatMessages(r.data || []); }
    catch { setChatMessages([]); } finally { setChatLoading(false); }
  };
  const sendChat = async () => {
    if (!chatInput.trim() || !chatCommande) return;
    const text = chatInput.trim(); setChatInput('');
    try { const r = await chauffeurApi.chatSend(chatCommande.id, text); setChatMessages(prev => [...prev, r.data]); setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }
    catch {}
  };
  const handleQrConfirm = async () => {
    if (!qrMission || !qrInput.trim()) return;
    try { await commandesApi.avancer(qrMission.id, { code_confirmation: qrInput.trim() }); showToast('✅ Livraison confirmée par QR code !'); setQrInput(''); setQrMission(null); fetchData(); }
    catch (e) { showToast(e.response?.data?.error || 'Code incorrect', 'error'); }
  };

  useEffect(() => {
    if (tab === 'objectifs') loadObjectifs();
    if (tab === 'historique') loadHistorique();
  }, [tab]);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'T';
  const noteColor = !profile?.note_moyenne ? '#64748b' : profile.note_moyenne >= 4.5 ? T.success : profile.note_moyenne >= 3.5 ? T.warning : T.danger;
  const vType = profile?.vehicule_type || profile?.type_vehicule || 'CAMION';
  const revenueData = stats?.revenus_par_mois || buildRevenueData(profile?.revenus_mois, MONTHS);
  const donutData = stats?.donut_data || [
    { name: 'Livrées',   value: profile?.nombre_livraisons || 34, color: T.primary },
    { name: 'En cours',  value: missions.length || 8,             color: T.warning },
    { name: 'En attente',value: proposees.length || 7,            color: T.text2 },
    { name: 'Annulées',  value: 5,                                 color: T.danger },
  ];
  const totalDeliveries = donutData.reduce((s, d) => s + d.value, 0);
  const perfPct = profile?.taux_reussite || 85;

  // Sidebar width
  const SW = sidebarOpen ? 280 : 72;

  const NAV_ITEMS = [
    { id: 'dashboard',  label: 'Tableau de bord', icon: Home },
    { id: 'missions',   label: 'Expéditions',      icon: Package,      badge: proposees.length },
    { id: 'map',        label: 'Mes livraisons',   icon: Map },
    { id: 'historique', label: 'Historique',        icon: History },
    { id: 'conduite',   label: 'Mode conduite',     icon: Crosshair },
    { id: 'objectifs',  label: 'Objectifs',         icon: Target },
    { id: 'support',    label: 'Messages',          icon: MessageSquare },
    { id: 'profil',     label: 'Profil',            icon: User },
  ];

  // ── Activity feed (derived from recent data) ──────────────────────────────
  const recentActivity = stats?.recent_activity?.length > 0
    ? stats.recent_activity.map(act => ({
        icon: act.type === 'LIVRAISON' ? Package : act.type === 'REVENUS' ? DollarSign : Bell,
        color: act.type === 'LIVRAISON' ? T.primary : act.type === 'REVENUS' ? T.success : T.warning,
        title: act.title,
        sub: act.sub,
        time: act.time
      }))
    : [
        ...(missions.slice(0,2).map(m => ({ icon: Package, color: T.primary, title: `Livraison #${m.reference}`, sub: 'En cours de livraison', time: 'maintenant' }))),
        ...(proposees.slice(0,1).map(p => ({ icon: Bell, color: T.warning, title: `Nouvelle mission #${p.reference}`, sub: 'Mission proposée', time: 'à l\'instant' }))),
        { icon: DollarSign, color: T.success, title: `Revenus du jour`, sub: `+${Math.round(profile?.revenus_jour || 0)} MAD`, time: 'aujourd\'hui' },
      ].slice(0, 4);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: T.text }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? T.danger : T.success, color: 'white', padding: '12px 20px', borderRadius: 14, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside style={{
        width: SW, minWidth: SW, background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 200, transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: sidebarOpen ? '20px 20px 16px' : '20px 0 16px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: sidebarOpen ? 'flex-start' : 'center', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: glowOrange }}>
            <Truck size={20} color="white" />
          </div>
          {sidebarOpen && <span style={{ fontWeight: 800, fontSize: 18, color: T.text, whiteSpace: 'nowrap' }}>Transporteur</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: sidebarOpen ? '16px 12px' : '16px 8px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={tab === item.id}
              onClick={() => setTab(item.id)} badge={item.badge} collapsed={!sidebarOpen} />
          ))}
          <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
          <NavItem icon={BarChart3} label="Finances" active={false} onClick={() => navigate('/chauffeur/finances')} collapsed={!sidebarOpen} />
          <NavItem icon={Award}     label="Gamification" active={false} onClick={() => navigate('/chauffeur/gamification')} collapsed={!sidebarOpen} />
          <NavItem icon={Settings}  label={t('nav_settings')} active={false} onClick={() => navigate('/chauffeur/parametres')} collapsed={!sidebarOpen} />
        </nav>

        {/* Status toggle */}
        <div style={{ padding: sidebarOpen ? '12px 16px' : '12px 8px', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Statut</span>
              <button onClick={handleToggleDispo} disabled={togglingDispo} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: profile?.is_available ? `${T.success}20` : `${T.danger}20`, color: profile?.is_available ? T.success : T.danger }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: profile?.is_available ? T.success : T.danger, display: 'inline-block' }} />
                {profile?.is_available ? 'En ligne' : 'Hors ligne'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: profile?.is_available ? T.success : T.danger, display: 'inline-block' }} />
            </div>
          )}
        </div>

        {/* Vehicle card */}
        <div style={{ padding: sidebarOpen ? '14px 16px' : '14px 8px', borderTop: `1px solid ${T.border}` }}>
          {sidebarOpen ? (
            <div style={{ background: '#1A1A1A', borderRadius: 16, padding: '12px 14px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.text2, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>VÉHICULE ACTIF</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 32 }}>{VEHICLE_EMOJI[vType] || '🚛'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{VEHICLE_LABEL[vType] || vType}</div>
                  <div style={{ fontSize: 11, color: T.text2 }}>{profile?.plaque || profile?.plaque_immatriculation || '–'}</div>
                  <div style={{ fontSize: 10, color: T.primary, fontWeight: 600, marginTop: 2 }}>● Actif</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}><span style={{ fontSize: 26 }}>{VEHICLE_EMOJI[vType] || '🚛'}</span></div>
          )}
        </div>

        {/* Collapse button */}
        <button onClick={() => setSidebarOpen(o => !o)} style={{ margin: '10px', padding: '8px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,138,0,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      {/* ══ MAIN AREA ════════════════════════════════════════════════════════ */}
      <div style={{ marginLeft: SW, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.3s ease' }}>

        {/* ── Topbar ── */}
        <header style={{ height: 64, background: T.sidebar, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, gap: 16 }}>
          {/* Search */}
          <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
            <input placeholder="Rechercher une expédition, client..." style={{ width: '100%', padding: '9px 16px 9px 38px', background: '#1A1A1A', border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.text2, fontSize: 14 }}>🔍</span>
          </div>
          <div style={{ flex: 1 }} />
          {/* SOS */}
          <button onClick={() => setSosModalOpen(true)} disabled={sosLoading} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: `${T.danger}20`, color: T.danger, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldAlert size={15} /> SOS
          </button>
          {/* Notifications */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <div style={{ position: 'relative', cursor: 'pointer', padding: 6 }} onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={20} color={unreadCount > 0 ? T.warning : T.text2} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: T.danger, color: 'white',
                  borderRadius: 10, fontSize: 9, fontWeight: 800,
                  padding: '1px 4px', minWidth: 14, textAlign: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>

            {notifOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, width: 340,
                background: T.sidebar, border: `1px solid ${T.border}`,
                borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                zIndex: 9999, maxHeight: 400, overflowY: 'auto',
              }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={toutLire} style={{ fontSize: 11, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: T.text2, fontSize: 13 }}>
                      Aucune notification
                    </div>
                  ) : notifications.map(notif => (
                    <div key={notif.id} onClick={() => { marquerLue(notif.id); setNotifOpen(false); }}
                      style={{
                        padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
                        cursor: 'pointer', background: notif.lue ? 'transparent' : 'rgba(255,138,0,0.04)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = notif.lue ? 'transparent' : 'rgba(255,138,0,0.04)'; }}
                    >
                      <div style={{ fontSize: 13, fontWeight: notif.lue ? 500 : 700, color: T.text }}>{notif.titre}</div>
                      <div style={{ fontSize: 12, color: T.text2, marginTop: 3, lineHeight: 1.4 }}>{notif.message}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                        {new Date(notif.date_creation).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Messages */}
          <div style={{ padding: 6, cursor: 'pointer' }} onClick={() => setTab('support')}>
            <MessageSquare size={20} color={T.text2} />
          </div>
          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 8px', borderRadius: 10, background: '#1A1A1A', border: `1px solid ${T.border}` }} onClick={() => setTab('profil')}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white' }}>{initials}</div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: 11, color: T.text2 }}>Transporteur</div>
            </div>
          </div>
          {/* Nouveau retrait */}
          <button onClick={() => navigate('/chauffeur/finances')} style={{ padding: '9px 18px', borderRadius: 14, border: 'none', background: gradient, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: glowOrange, whiteSpace: 'nowrap' }}>
            + Nouveau retrait
          </button>
        </header>

        {/* ── Content ── */}
        <main style={{ flex: 1, padding: '28px 28px', overflowY: 'auto', background: T.bg }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              background: 'rgba(239,68,68,0.08)', border: `1px solid ${T.danger}40`,
              borderRadius: 12, marginBottom: 20, color: '#fca5a5', fontSize: 13,
            }}>
              <AlertTriangle size={16} style={{ color: T.danger, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          )}

          {/* ══ DASHBOARD TAB ══════════════════════════════════════════════ */}
          {tab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Greeting */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.text }}>Bonjour, {user?.first_name} ! 👋</h1>
                  <p style={{ margin: '6px 0 0', color: T.text2, fontSize: 14 }}>Voici un aperçu de vos activités aujourd'hui</p>
                </div>
                <button onClick={() => navigate('/chauffeur/finances')} style={{ padding: '10px 20px', borderRadius: 14, border: 'none', background: gradient, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: glowOrange }}>
                  + Nouveau retrait
                </button>
              </div>

              {/* Proposed missions alert */}
              {proposees.length > 0 && (
                <div style={{ background: `${T.warning}12`, border: `1px solid ${T.warning}40`, borderRadius: 14, padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.warning, display: 'inline-block' }} />
                    <span style={{ fontWeight: 600, color: T.warning }}>{proposees.length} livraison{proposees.length > 1 ? 's' : ''} proposée{proposees.length > 1 ? 's' : ''} en attente</span>
                  </div>
                  <button onClick={() => setTab('missions')} style={{ background: T.warning, border: 'none', color: '#000', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    Voir <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <KpiCard icon={Package}    label="Livraisons aujourd'hui" value={profile?.nombre_livraisons_jour || 0} trend="+20% vs hier"        color={T.primary} />
                <KpiCard icon={Truck}      label="En cours"                value={missions.length}                      trend="+2% vs hier"         color={T.warning} />
                <KpiCard icon={CheckCircle}label="Livrées (total)"         value={profile?.nombre_livraisons || 0}      trend="+18% vs hier"        color={T.success} />
                <KpiCard icon={DollarSign} label="Revenus du mois"         value={`${Math.round(profile?.revenus_mois || 0).toLocaleString()} MAD`} trend="+15% vs mois dernier" color="#a78bfa" />
              </div>

              {/* Charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

                {/* Revenue area chart */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '22px 24px', border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Revenus</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 26, fontWeight: 800, color: T.text }}>{Math.round(profile?.revenus_mois || 0).toLocaleString()} MAD</span>
                        <span style={{ fontSize: 12, color: T.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <TrendingUp size={12} /> +15% vs mois dernier
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '5px 12px', background: '#1A1A1A', borderRadius: 8, fontSize: 12, color: T.text2, border: `1px solid ${T.border}` }}>Mensuel</div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={T.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fill: T.text2, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: T.text2, fontSize: 11 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid ${T.border}`, borderRadius: 10, color: T.text }} formatter={v => [`${v.toLocaleString()} MAD`, 'Revenus']} />
                      <Area type="monotone" dataKey="revenus" stroke={T.primary} strokeWidth={2.5} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut chart */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '22px 20px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Répartition des livraisons</div>
                  <div style={{ position: 'relative', margin: '12px auto', width: 160, height: 160 }}>
                    <PieChart width={160} height={160}>
                      <Pie data={donutData} cx={75} cy={75} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Total</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{totalDeliveries}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {donutData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                          <span style={{ color: T.text2 }}>{d.name}</span>
                        </div>
                        <span style={{ color: T.text, fontWeight: 700 }}>{d.value} ({Math.round(d.value/totalDeliveries*100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance gauge */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '22px 20px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Performance</span>
                    <span style={{ fontSize: 11, color: T.text2, background: '#1A1A1A', padding: '4px 8px', borderRadius: 8, border: `1px solid ${T.border}` }}>Hebdomadaire</span>
                  </div>
                  <div style={{ position: 'relative', width: 140, height: 140 }}>
                    <svg viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                      <circle cx="70" cy="70" r="58" fill="none"
                        stroke={T.primary} strokeWidth="12"
                        strokeDasharray={`${(perfPct / 100) * 364} 364`}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 8px ${T.primary}80)` }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 30, fontWeight: 900, color: T.text }}>{perfPct}%</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: T.text2, marginTop: 10 }}>Taux de réussite</div>
                  <div style={{ fontSize: 12, color: T.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <TrendingUp size={12} /> +5% vs semaine dernière
                  </div>
                </div>
              </div>

              {/* Bottom row: Recent deliveries + Map + Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

                {/* Recent deliveries */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '22px 24px', border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Livraisons récentes</span>
                    <button onClick={() => setTab('missions')} style={{ fontSize: 12, color: T.primary, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Voir tout</button>
                  </div>
                  {loading ? (
                    /* Skeleton loader */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[1,2,3].map(k => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.border}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ height: 12, width: '60%', background: T.border, borderRadius: 6 }} />
                            <div style={{ height: 10, width: '40%', background: T.border, borderRadius: 6 }} />
                          </div>
                          <div style={{ height: 24, width: 72, background: T.border, borderRadius: 20 }} />
                        </div>
                      ))}
                    </div>
                  ) : missions.length === 0 ? (
                    /* État vide */
                    <div style={{ textAlign: 'center', padding: '28px 0', color: T.text2 }}>
                      <Package size={40} color={T.primary} style={{ opacity: 0.4, marginBottom: 12 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>Aucune livraison récente</div>
                      <div style={{ fontSize: 12 }}>Vos prochaines missions apparaîtront ici.</div>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {missions.slice(0, 5).map((cmd) => {
                          const s = STATUT_STYLE[cmd.statut] || STATUT_STYLE.EN_ATTENTE;
                          const timeStr = cmd.created_at ? new Date(cmd.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '–';
                          return (
                            <tr key={cmd.id} style={{ borderBottom: `1px solid ${T.border}` }}
                              onMouseEnter={e => e.currentTarget.style.background = `${T.primary}08`}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '11px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Package size={16} color={T.primary} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>#{cmd.reference}</div>
                                  <div style={{ fontSize: 11, color: T.text2 }}>{cmd.adresse_livraison}</div>
                                </div>
                              </td>
                              <td style={{ padding: '11px 8px', fontSize: 12, color: T.text2, whiteSpace: 'nowrap' }}>{timeStr}</td>
                              <td style={{ padding: '11px 8px', textAlign: 'right' }}>
                                <span style={{ background: s.bg, color: s.color, fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Map des livraisons */}
                <div style={{ background: T.surface, borderRadius: 20, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Carte des livraisons</span>
                    <button onClick={() => setTab('map')} style={{ fontSize: 11, color: T.primary, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Voir tout</button>
                  </div>
                  <div style={{ height: 240 }}>
                    <MapContainer center={myPosition || [31.7917, -7.0926]} zoom={myPosition ? 10 : 5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                      <TileLayer url={`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`} attribution="&copy; MapTiler &copy; OpenStreetMap contributors" />
                      {myPosition && <Marker position={myPosition} icon={MY_ICON}><Popup>📍 Ma position</Popup></Marker>}
                      {missions.map(cmd => cmd.latitude_livraison && cmd.longitude_livraison && (
                        <Marker key={cmd.id} position={[cmd.latitude_livraison, cmd.longitude_livraison]} icon={DELIVERY_ICON}><Popup>#{cmd.reference}</Popup></Marker>
                      ))}
                    </MapContainer>
                  </div>
                </div>

                {/* Activité en temps réel */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '22px 20px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 18 }}>Activité en temps réel</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {recentActivity.length === 0 ? (
                      <div style={{ color: T.text2, fontSize: 13, textAlign: 'center', padding: 20 }}>Aucune activité récente</div>
                    ) : recentActivity.map((act, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${act.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <act.icon size={16} color={act.color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{act.title}</div>
                          <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{act.sub}</div>
                        </div>
                        <div style={{ fontSize: 10, color: T.text2, whiteSpace: 'nowrap' }}>{act.time}</div>
                      </div>
                    ))}
                    {/* GPS quick action */}
                    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 4 }}>
                      <button onClick={handleUpdatePosition} disabled={posStatus === 'loading'} style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', background: gradient, color: 'white', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {posStatus === 'loading' ? <><RefreshCw size={13} /> Localisation...</> : posStatus === 'success' ? <><CheckCircle size={13} /> Position envoyée !</> : <><Navigation size={13} /> Mettre à jour position</>}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => {}} style={{ marginTop: 16, width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, cursor: 'pointer', fontSize: 12 }}>
                    Voir toute l'activité
                  </button>
                </div>
              </div>

              {/* Vehicle + Incident row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <WorkingHoursCard profile={profile} />
                <div style={{ background: T.surface, borderRadius: 16, padding: '1.25rem', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: T.text }}>
                      <AlertTriangle size={15} color={T.danger} /> Signaler un incident
                    </div>
                    <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>Accident, panne, vol, colis endommagé…</div>
                  </div>
                  <button onClick={() => setShowIncidentModal(true)} style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}35`, color: '#fca5a5', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} /> Signaler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ MISSIONS TAB ═══════════════════════════════════════════════ */}
          {tab === 'missions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Mes missions {missions.length > 0 && <span style={{ background: `${T.success}20`, color: T.success, fontSize: 13, padding: '3px 12px', borderRadius: 20, fontWeight: 700, marginLeft: 8 }}>{missions.length} active{missions.length > 1 ? 's' : ''}</span>}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!myPosition && <button onClick={handleUpdatePosition} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: gradient, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Navigation size={13} /> Activer GPS</button>}
                  <button onClick={fetchData} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.text2, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Actualiser</button>
                </div>
              </div>
              {!myPosition && missions.length > 0 && <div style={{ background: `${T.warning}12`, border: `1px solid ${T.warning}30`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: T.warning, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> Activez votre GPS pour voir les itinéraires</div>}
              {proposees.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.warning, letterSpacing: '0.08em', marginBottom: 12 }}>⚡ PROPOSÉES ({proposees.length})</div>
                  {proposees.map(cmd => <MissionCard key={cmd.id} commande={cmd} proposed onAccept={handleAccept} onRefuse={handleRefuse} disabled={actionLoading} />)}
                </div>
              )}
              {missions.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.success, letterSpacing: '0.08em', marginBottom: 12, marginTop: 8 }}>🚚 EN COURS ({missions.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {missions.map(cmd => (
                      <div key={cmd.id}>
                        <ActiveMissionCard mission={cmd} myPosition={myPosition} onAdvance={handleAdvance} disabled={actionLoading} />
                        {cmd.statut === 'EN_ROUTE' && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button onClick={() => openChat(cmd)} style={{ flex: 1, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><MessageSquare size={13} /> Chat client</button>
                            <button onClick={() => { setQrMission(cmd); setTab('conduite'); }} style={{ flex: 1, background: `${T.success}15`, border: `1px solid ${T.success}30`, color: '#86efac', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><QrCode size={13} /> QR Code</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {proposees.length === 0 && missions.length === 0 && (
                <div style={{ background: T.surface, borderRadius: 16, padding: '3rem', textAlign: 'center', color: T.text2, border: `1px solid ${T.border}` }}>
                  <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontWeight: 600, fontSize: 16 }}>Aucune mission pour le moment</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Passez en disponible pour recevoir des missions</div>
                  {!profile?.is_available && <button onClick={handleToggleDispo} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, border: 'none', background: gradient, color: 'white', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Me rendre disponible</button>}
                </div>
              )}
            </div>
          )}

          {/* ══ MAP TAB ════════════════════════════════════════════════════ */}
          {tab === 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Ma position & missions</h2>
                <button onClick={handleUpdatePosition} disabled={posStatus === 'loading'} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.text2, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Navigation size={14} /> {posStatus === 'loading' ? 'GPS...' : 'Localiser'}</button>
              </div>
              <div style={{ background: T.surface, borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, height: 460 }}>
                <MapContainer center={myPosition || [33.5731, -7.5898]} zoom={myPosition ? 13 : 6} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url={`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`} attribution="&copy; MapTiler &copy; OpenStreetMap contributors" />
                  {myPosition && (<><Marker position={myPosition} icon={MY_ICON}><Popup><strong>📍 Ma position</strong></Popup></Marker><Circle center={myPosition} radius={300} pathOptions={{ color: T.primary, fillColor: T.primary, fillOpacity: 0.1, weight: 2, dashArray: '6 4' }} /></>)}
                  {missions.map(cmd => cmd.latitude_livraison && cmd.longitude_livraison && (
                    <Marker key={cmd.id} position={[cmd.latitude_livraison, cmd.longitude_livraison]} icon={DELIVERY_ICON}><Popup><strong>📦 {cmd.reference}</strong><br />{cmd.adresse_livraison}</Popup></Marker>
                  ))}
                </MapContainer>
              </div>
              {missions.map(cmd => (
                <div key={cmd.id} style={{ background: T.surface, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${T.border}` }}>
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>#{cmd.reference}</div><div style={{ fontSize: 12, color: T.text2, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><MapPin size={11} /> {cmd.adresse_livraison}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: T.success }}>{Math.round(cmd.total_price)} MAD</div><div style={{ fontSize: 11, color: T.primary }}>🚚 EN ROUTE</div></div>
                </div>
              ))}
            </div>
          )}

          {/* ══ OBJECTIFS TAB ══════════════════════════════════════════════ */}
          {tab === 'objectifs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={22} color={T.warning} /> Objectifs hebdomadaires</h2>
              {!objectifs ? (
                <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Chargement…</div>
              ) : (
                <>
                  <div style={{ background: T.surface, borderRadius: 16, padding: '2rem', textAlign: 'center', border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>Semaine du {objectifs.semaine || '—'}</div>
                    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                      <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke={objectifs.taux_completion >= 100 ? T.success : T.warning} strokeWidth="10"
                          strokeDasharray={`${(objectifs.taux_completion / 100) * 314} 314`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: objectifs.taux_completion >= 100 ? T.success : T.warning }}>{Math.round(objectifs.taux_completion || 0)}%</div>
                        <div style={{ fontSize: 11, color: T.text2 }}>accompli</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{objectifs.livraisons_effectuees || 0}<span style={{ color: T.text2, fontWeight: 400 }}> / {objectifs.objectif_livraisons || 10} livraisons</span></div>
                    {objectifs.taux_completion >= 100 && <div style={{ marginTop: 16, background: `${T.success}15`, border: `1px solid ${T.success}40`, borderRadius: 12, padding: '12px 20px', color: '#86efac', fontWeight: 700 }}>🏆 Objectif atteint ! Bonus débloqué 🎉</div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    <MiniStat icon={Package} label="Total livraisons" value={profile?.nombre_livraisons || 0} color="#3b82f6" />
                    <MiniStat icon={Star}    label="Note moyenne"    value={(profile?.note_moyenne || 0).toFixed(1)} color={T.warning} />
                    <MiniStat icon={Award}   label="Taux réussite"   value={`${profile?.taux_reussite || 0}%`} color={T.success} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ HISTORIQUE TAB ═════════════════════════════════════════════ */}
          {tab === 'historique' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Historique des livraisons</h2>
                <button onClick={loadHistorique} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.text2, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /></button>
              </div>
              {historique.length === 0 ? (
                <div style={{ background: T.surface, borderRadius: 16, padding: '3rem', textAlign: 'center', color: T.text2, border: `1px solid ${T.border}` }}><History size={40} style={{ opacity: 0.3, marginBottom: 12 }} /><div>Aucune livraison dans l'historique</div></div>
              ) : historique.map(cmd => {
                const s = STATUT_STYLE[cmd.statut] || STATUT_STYLE.EN_ATTENTE;
                const note = cmd.avis?.note;
                return (
                  <div key={cmd.id} style={{ background: T.surface, borderRadius: 12, padding: '1rem 1.25rem', borderLeft: `3px solid ${s.color}`, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div><div style={{ fontWeight: 700, fontSize: 15 }}>#{cmd.reference}</div><div style={{ fontSize: 12, color: T.text2 }}>{cmd.created_at ? new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div></div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: T.success, fontSize: 15 }}>{Math.round(cmd.frais_livraison || 0)} MAD</div><span style={{ background: s.bg, color: s.color, fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>{s.label}</span></div>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={11} /> {cmd.adresse_livraison || '—'}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {note && <span style={{ fontSize: 12, color: T.warning }}>{'★'.repeat(Math.round(note))}{'☆'.repeat(5 - Math.round(note))} {note}/5</span>}
                      {cmd.incidents?.length > 0 && <span style={{ fontSize: 11, background: `${T.danger}15`, color: '#fca5a5', borderRadius: 5, padding: '1px 7px' }}>⚠ {cmd.incidents.length} incident{cmd.incidents.length > 1 ? 's' : ''}</span>}
                      {cmd.duree_minutes && <span style={{ fontSize: 11, color: '#64748b' }}>⏱ {cmd.duree_minutes} min</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ MODE CONDUITE TAB ══════════════════════════════════════════ */}
          {tab === 'conduite' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Crosshair size={22} color={T.success} /> Mode conduite</h2>
              <div style={{ color: T.text2, fontSize: 13, marginTop: -12 }}>Interface simplifiée — grands boutons, actions en 1 clic</div>
              {missions.filter(m => m.statut === 'EN_ROUTE').length > 0 ? missions.filter(m => m.statut === 'EN_ROUTE').slice(0, 1).map(m => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: `${T.success}12`, border: `2px solid ${T.success}40`, borderRadius: 16, padding: '18px 22px' }}>
                    <div style={{ fontSize: 13, color: '#86efac', marginBottom: 4 }}>🚚 EN ROUTE</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 6 }}>#{m.reference}</div>
                    <div style={{ fontSize: 16, color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: 8 }}><MapPin size={18} color={T.success} style={{ flexShrink: 0, marginTop: 2 }} />{m.adresse_livraison}</div>
                  </div>
                  <button onClick={() => handleAdvance(m)} style={{ background: `linear-gradient(135deg,${T.success},#059669)`, border: 'none', color: '#fff', borderRadius: 16, padding: '22px', cursor: 'pointer', fontWeight: 800, fontSize: 20, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: `0 4px 20px ${T.success}40` }}>
                    <CheckCircle size={28} /> Livraison confirmée
                  </button>
                  <div style={{ background: '#1A1A1A', border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><QrCode size={18} color="#a5b4fc" /> Confirmation QR Code</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input value={qrInput} onChange={e => { setQrInput(e.target.value); setQrMission(m); }} placeholder="Scanner ou saisir le code client…"
                        style={{ flex: 1, padding: '12px 14px', background: T.bg, border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 10, color: T.text, fontSize: 15, outline: 'none' }} />
                      <button onClick={() => { setQrMission(m); handleQrConfirm(); }} disabled={!qrInput.trim()} style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc', borderRadius: 10, padding: '12px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>OK</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button onClick={() => openChat(m)} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', borderRadius: 14, padding: '18px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><MessageSquare size={28} /> Chat client</button>
                    <button onClick={() => { const dest = m.latitude_livraison && m.longitude_livraison ? `${m.latitude_livraison},${m.longitude_livraison}` : encodeURIComponent(m.adresse_livraison || ''); window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank'); }} style={{ background: `${T.success}15`, border: `1px solid ${T.success}40`, color: '#86efac', borderRadius: 14, padding: '18px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><Navigation size={28} /> GPS</button>
                  </div>
                  <button onClick={() => setSosModalOpen(true)} disabled={sosLoading} style={{ background: `${T.danger}15`, border: `2px solid ${T.danger}50`, color: '#fca5a5', borderRadius: 14, padding: '18px', cursor: 'pointer', fontWeight: 800, fontSize: 18, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><ShieldAlert size={24} /> 🚨 SOS Urgence</button>
                </div>
              )) : (
                <div style={{ background: T.surface, borderRadius: 16, padding: '3rem', textAlign: 'center', color: T.text2, border: `1px solid ${T.border}` }}><Crosshair size={40} style={{ opacity: 0.3, marginBottom: 12 }} /><div style={{ fontWeight: 600 }}>Aucune mission en route</div><div style={{ fontSize: 13, marginTop: 6 }}>Le mode conduite s'active lors d'une livraison EN_ROUTE</div></div>
              )}
            </div>
          )}

          {/* ══ CHAT TAB ═══════════════════════════════════════════════════ */}
          {tab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <button onClick={() => setTab('conduite')} style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
                <h2 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={18} color="#6366f1" />Chat — {chatCommande ? `#${chatCommande.reference}` : 'Livraison'}</h2>
              </div>
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: '#0D0D0D', borderRadius: 14, padding: 16, border: '1px solid rgba(99,102,241,0.2)', minHeight: 300 }}>
                {chatLoading && <div style={{ color: T.text2, textAlign: 'center' }}>Chargement…</div>}
                {!chatLoading && chatMessages.length === 0 && <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, margin: 'auto' }}>Pas encore de messages</div>}
                {chatMessages.map((msg, i) => {
                  const isMe = msg.auteur_role === 'TRANSPORTEUR';
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? gradient : '#1A1A1A', border: isMe ? 'none' : '1px solid rgba(99,102,241,0.2)', color: T.text, fontSize: 14, lineHeight: 1.5 }}>
                        {msg.contenu}
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'right' }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} placeholder="Message au client…"
                  style={{ flex: 1, padding: '12px 16px', background: T.surface, border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none' }} />
                <button onClick={sendChat} disabled={!chatInput.trim()} style={{ background: gradient, border: 'none', borderRadius: 12, padding: '12px 18px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}><Send size={16} /> Envoyer</button>
              </div>
            </div>
          )}

          {/* ══ PROFIL TAB ═════════════════════════════════════════════════ */}
          {tab === 'profil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Mon profil</h2>

              {/* Top banner */}
              <div style={{ background: `linear-gradient(135deg, ${T.surface}, #1C1C1C)`, borderRadius: 20, padding: '28px 32px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white', border: '3px solid rgba(255,255,255,0.15)', boxShadow: glowOrange, flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: T.text }}>{user?.first_name} {user?.last_name}</div>
                  <div style={{ fontSize: 13, color: T.text2, marginTop: 4 }}>{user?.email}</div>
                  {user?.phone && <div style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>📞 {user.phone}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {profile?.is_verified
                      ? <span style={{ background: `${T.success}20`, color: T.success, fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>✔ Vérifié</span>
                      : <span style={{ background: `${T.warning}20`, color: T.warning, fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>⏳ En attente de vérification</span>}
                    <span style={{ background: profile?.is_available ? `${T.success}20` : `${T.danger}20`, color: profile?.is_available ? T.success : T.danger, fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                      {profile?.is_available ? '🟢 En ligne' : '🔴 Hors ligne'}
                    </span>
                  </div>
                </div>
                <button onClick={() => { logout(); navigate('/login'); }} style={{ padding: '10px 20px', borderRadius: 12, border: `1px solid ${T.danger}30`, background: `${T.danger}12`, color: T.danger, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>

              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <MiniStat icon={Package}    label="Livraisons totales" value={profile?.nombre_livraisons || 0}                         color="#3b82f6" />
                <MiniStat icon={Star}       label="Note moyenne"       value={profile?.note_moyenne?.toFixed(1) || '–'}                color={noteColor} sub={`${profile?.nombre_avis || 0} avis`} />
                <MiniStat icon={DollarSign} label="Revenus totaux"     value={`${Math.round(profile?.revenus_total || 0).toLocaleString()} MAD`} color={T.success} />
                <MiniStat icon={Award}      label="Taux de réussite"   value={`${profile?.taux_reussite || 0}%`}                       color={T.primary} />
              </div>

              {/* 2-col grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

                {/* Revenus */}
                <div style={{ background: T.surface, borderRadius: 18, padding: '22px 24px', border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h4 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: T.text }}><TrendingUp size={17} color={T.success} /> Revenus</h4>
                    <button onClick={() => navigate('/chauffeur/finances')} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.primary}30`, background: `${T.primary}12`, color: T.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir détails →</button>
                  </div>
                  {[
                    { label: "Aujourd'hui",  value: profile?.revenus_jour    || 0, color: T.success },
                    { label: 'Cette semaine', value: profile?.revenus_semaine || 0, color: '#38BDF8' },
                    { label: 'Ce mois',       value: profile?.revenus_mois    || 0, color: T.primary },
                    { label: 'Total cumulé',  value: profile?.revenus_total   || 0, color: T.warning },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 13, color: T.text2 }}>{label}</span>
                      <span style={{ fontWeight: 800, color, fontSize: 15 }}>{Math.round(value).toLocaleString()} MAD</span>
                    </div>
                  ))}
                </div>

                {/* Véhicule */}
                <div style={{ background: T.surface, borderRadius: 18, padding: '22px 24px', border: `1px solid ${T.border}` }}>
                  <h4 style={{ fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8, color: T.text }}><Truck size={17} color={T.primary} /> Mon véhicule</h4>
                  {profile ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, padding: '14px 16px', background: `${T.primary}0A`, borderRadius: 14, border: `1px solid ${T.primary}20` }}>
                        <span style={{ fontSize: 42 }}>{VEHICLE_EMOJI[profile.vehicule_type] || VEHICLE_EMOJI[profile.type_vehicule] || '🚛'}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{VEHICLE_LABEL[profile.vehicule_type] || profile.vehicule_type || '—'}</div>
                          <div style={{ fontSize: 12, color: T.text2, marginTop: 3 }}>Véhicule actif</div>
                          <div style={{ fontSize: 11, color: T.primary, fontWeight: 600, marginTop: 4 }}>● En service</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'Plaque',    value: profile.plaque || profile.plaque_immatriculation || '—' },
                          { label: 'Capacité',  value: profile.capacite_kg ? `${profile.capacite_kg} kg` : '—' },
                          { label: 'Permis',    value: profile.permis || '—' },
                          { label: 'Ville',     value: profile.ville || '—' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, color: T.text2, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: T.text2, textAlign: 'center', padding: 20 }}>Aucune donnée véhicule</div>
                  )}
                </div>

                {/* Heures de travail */}
                <WorkingHoursCard profile={profile} />

                {/* Actions rapides */}
                <div style={{ background: T.surface, borderRadius: 18, padding: '22px 24px', border: `1px solid ${T.border}` }}>
                  <h4 style={{ fontWeight: 700, margin: '0 0 16px', color: T.text }}>⚡ Actions rapides</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => navigate('/chauffeur/finances')} style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: 'none', background: gradient, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: glowOrange }}>
                      <DollarSign size={17} /> Dashboard financier
                    </button>
                    <button onClick={() => navigate('/chauffeur/gamification')} style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: `1px solid ${T.warning}30`, background: `${T.warning}10`, color: T.warning, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Award size={17} /> Mes badges & classement
                    </button>
                    <button onClick={() => setShowIncidentModal(true)} style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: `1px solid ${T.danger}30`, background: `${T.danger}10`, color: T.danger, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={17} /> Signaler un incident
                    </button>
                    <button onClick={() => navigate('/tickets')} style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', color: T.text2, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MessageSquare size={17} /> Mes tickets support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ SUPPORT TAB ════════════════════════════════════════════════ */}
          {tab === 'support' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Centre de support</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

                {/* Mes tickets */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '28px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: `${T.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🎫</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 6 }}>Mes tickets</div>
                    <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>Suivez l'avancement de vos demandes de support ouvertes.</div>
                  </div>
                  <button onClick={() => navigate('/tickets')} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: gradient, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: glowOrange }}>
                    Voir mes tickets
                  </button>
                </div>

                {/* Nouveau ticket */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '28px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: `${T.warning}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>✏️</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 6 }}>Nouveau ticket</div>
                    <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>Posez une question ou signalez un problème à l'équipe support.</div>
                  </div>
                  <button onClick={() => navigate('/tickets?action=nouveau')} style={{ width: '100%', padding: '13px', borderRadius: 12, border: `1px solid ${T.warning}30`, background: `${T.warning}12`, color: T.warning, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Ouvrir un ticket
                  </button>
                </div>

                {/* Signaler incident */}
                <div style={{ background: T.surface, borderRadius: 20, padding: '28px', border: `1px solid ${T.danger}25`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: `${T.danger}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>⚠️</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 6 }}>Signaler un incident</div>
                    <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>Accident, panne, vol, colis endommagé... Signalez-le immédiatement.</div>
                  </div>
                  <button onClick={() => setShowIncidentModal(true)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: `1px solid ${T.danger}30`, background: `${T.danger}12`, color: T.danger, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Signaler un incident
                  </button>
                </div>

                {/* SOS Urgence */}
                <div style={{ background: `linear-gradient(135deg, ${T.surface}, rgba(239,68,68,0.05))`, borderRadius: 20, padding: '28px', border: `2px solid ${T.danger}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: `${T.danger}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🚨</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: T.danger, marginBottom: 6 }}>Alerte SOS</div>
                    <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>En cas d'urgence grave, alertez immédiatement les admins avec votre position.</div>
                  </div>
                  <button onClick={() => setSosModalOpen(true)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: `2px solid ${T.danger}50`, background: `${T.danger}15`, color: T.danger, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                    🚨 Envoyer SOS
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Incident Modal ── */}
      {showIncidentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Signaler un incident</h3>
              <button onClick={() => setShowIncidentModal(false)} style={{ background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <SignalerIncidentPanel onClose={() => setShowIncidentModal(false)} />
          </div>
        </div>
      )}

      {/* ── SOS Modal ── */}
      {sosModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: T.surface, borderRadius: 24, padding: 32, width: '100%', maxWidth: 440, border: `2px solid ${T.danger}40`, boxShadow: `0 20px 60px rgba(239,68,68,0.25)` }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🚨</div>
              <h2 style={{ fontWeight: 800, fontSize: 22, color: T.danger, margin: 0 }}>Alerte SOS</h2>
              <p style={{ color: T.text2, fontSize: 13, marginTop: 8 }}>Choisissez le type d'urgence et confirmez l'envoi</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {['ACCIDENT', 'PANNE', 'AGRESSION', 'MEDICAL', 'PERDU', 'AUTRE'].map(type => (
                <button
                  key={type}
                  onClick={() => setSosType(type)}
                  style={{
                    padding: '12px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    border: `2px solid ${sosType === type ? T.danger : T.border}`,
                    background: sosType === type ? `${T.danger}15` : 'transparent',
                    color: sosType === type ? T.danger : T.text2,
                    transition: 'all 0.2s',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={sendSOS}
              disabled={sosSent}
              style={{
                width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                background: sosSent ? `${T.danger}30` : `linear-gradient(135deg, #B91C1C, ${T.danger})`,
                color: sosSent ? T.danger : 'white', fontWeight: 800, fontSize: 16,
                cursor: sosSent ? 'default' : 'pointer',
                boxShadow: sosSent ? 'none' : '0 8px 24px rgba(239,68,68,0.4)',
                marginBottom: 12,
              }}
            >
              {sosSent ? '✅ SOS envoyé !' : '🚨 Envoyer SOS maintenant'}
            </button>
            <button
              onClick={() => { setSosModalOpen(false); setSosSent(false); setSosType('ACCIDENT'); }}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text2, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChauffeurDashboard;
