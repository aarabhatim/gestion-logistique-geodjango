import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck, MapPin, Navigation, Star, CheckCircle, Clock, LogOut,
  Package, TrendingUp, Bell, ChevronRight, ToggleLeft, ToggleRight,
  DollarSign, Award, AlertTriangle, Map, List, User, Zap,
  ArrowRight, Phone, RefreshCw, MessageSquare, History, Target,
  Send, QrCode, Crosshair, ShieldAlert,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { transporteursApi, commandesApi, livraisonsApi, notificationsApi, authApi, chauffeurApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { SignalerIncidentPanel } from './SignalerIncident';

// ─── Inline SVG icons — no external CDN ──────────────────────────────────────
import '../../utils/leafletIcons'; // applies the L.Icon.Default patch

const makeIcon = (color, emoji, size = 36) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:${size*0.45}px">${emoji}</div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor: [0, -size / 2],
});

const MY_ICON       = makeIcon('#8b5cf6', '🚗', 40);
const DELIVERY_ICON = makeIcon('#ef4444', '📦', 36);
const BOUTIQUE_ICON = makeIcon('#3b82f6', '🏪', 36);
const CLIENT_ICON   = makeIcon('#10b981', '🏠', 36);

// ─── Statut colors ────────────────────────────────────────────────────────────
const STATUT_STYLE = {
  EN_ATTENTE:     { bg: '#64748b20', color: '#94a3b8', label: 'En attente' },
  VALIDEE:        { bg: '#3b82f620', color: '#3b82f6', label: 'Validée' },
  EN_PREPARATION: { bg: '#f59e0b20', color: '#f59e0b', label: 'En préparation' },
  EN_ROUTE:       { bg: '#10b98120', color: '#10b981', label: '🚚 En route' },
  LIVREE:         { bg: '#22c55e20', color: '#22c55e', label: '✅ Livrée' },
  ANNULEE:        { bg: '#ef444420', color: '#ef4444', label: 'Annulée' },
};

// ─── KPI Mini Card ────────────────────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, value, color, sub }) => (
  <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', borderTop: `3px solid ${color}` }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
      <Icon size={18} color={color} />
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─── Mission Card ─────────────────────────────────────────────────────────────
const MissionCard = ({ commande, onAccept, onRefuse, proposed }) => {
  const { t } = useI18n();
  const s = STATUT_STYLE[commande.statut] || STATUT_STYLE.EN_ATTENTE;
  return (
    <div className="glass-card animate-fade-in" style={{ borderLeft: `4px solid ${s.color}`, position: 'relative' }}>
      {proposed && (
        <div style={{
          position: 'absolute', top: -8, right: 12,
          background: 'var(--gradient-primary)', color: 'white',
          fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
          letterSpacing: '0.05em',
        }}>
          ✨ PROPOSÉE
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>#{commande.reference}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {commande.fondateur_detail?.nom_boutique || 'Boutique'}
          </div>
        </div>
        <span style={{ background: s.bg, color: s.color, fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
          {s.label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <MapPin size={12} />
        {commande.adresse_livraison || 'Adresse non définie'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>
          {Math.round(commande.total_price || 0)} MAD
        </span>
        {proposed && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" style={{ color: '#ef4444', fontSize: 12 }}
              onClick={() => onRefuse(commande.id)}>
              {t('drv_refuse')}
            </button>
            <button className="btn btn-sm btn-primary" style={{ fontSize: 12 }}
              onClick={() => onAccept(commande.id)}>
              <CheckCircle size={13} /> {t('drv_accept')}
            </button>
          </div>
        )}
        {commande.statut === 'EN_ROUTE' && (
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>🚚 En cours</span>
        )}
      </div>
    </div>
  );
};

// ─── OSRM routing helper ─────────────────────────────────────────────────────
const fetchRoute = async (from, to) => {
  if (!from || !to) return null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      return {
        coords,
        distance_km: (data.routes[0].distance / 1000).toFixed(1),
        duration_min: Math.round(data.routes[0].duration / 60),
      };
    }
  } catch (e) { console.warn('OSRM failed:', e); }
  return null;
};

// ─── Active Mission Card with route + actions ────────────────────────────────
const ActiveMissionCard = ({ mission, myPosition, onAdvance, onCancel }) => {
  const [route, setRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Determine destination based on status
  // EN_PREPARATION/VALIDEE → go to BOUTIQUE
  // EN_ROUTE → go to CLIENT
  const isEnRoute = mission.statut === 'EN_ROUTE';
  const destination = isEnRoute
    ? (mission.latitude_livraison && mission.longitude_livraison
        ? [mission.latitude_livraison, mission.longitude_livraison]
        : null)
    : (mission.fondateur_detail?.latitude && mission.fondateur_detail?.longitude
        ? [mission.fondateur_detail.latitude, mission.fondateur_detail.longitude]
        : null);

  useEffect(() => {
    if (myPosition && destination) {
      setLoadingRoute(true);
      fetchRoute(myPosition, destination)
        .then(setRoute)
        .finally(() => setLoadingRoute(false));
    }
  }, [myPosition?.[0], myPosition?.[1], destination?.[0], destination?.[1]]);

  const statusConfig = {
    VALIDEE:        { color: '#3b82f6', label: '✅ Mission assignée', emoji: '📋', dest: 'boutique' },
    EN_PREPARATION: { color: '#f59e0b', label: '👨‍🍳 En préparation',   emoji: '🏪', dest: 'boutique' },
    EN_ROUTE:       { color: '#06b6d4', label: '🚚 En route vers client', emoji: '🏠', dest: 'client' },
  }[mission.statut] || { color: '#64748b', label: mission.statut, emoji: '📦' };

  const nextAction = isEnRoute
    ? { label: '✓ Confirmer livraison', color: '#22c55e', icon: CheckCircle }
    : { label: '🚗 Commande prise — En route', color: '#3b82f6', icon: ArrowRight };

  return (
    <div className="glass-card animate-fade-in" style={{
      borderLeft: `4px solid ${statusConfig.color}`,
      background: `linear-gradient(135deg, rgba(15,23,42,0.6), ${statusConfig.color}08)`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{statusConfig.emoji}</span>
            <strong style={{ fontSize: 16 }}>{mission.reference}</strong>
            <span style={{ fontSize: 11, background: statusConfig.color + '20', color: statusConfig.color, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              {statusConfig.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {mission.fondateur_detail?.nom_boutique} → {mission.client_detail?.first_name}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
            +{(parseFloat(mission.frais_livraison || 0) + parseFloat(mission.sous_total || 0) * 0.05).toFixed(0)} MAD
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>votre gain</div>
        </div>
      </div>

      {/* Route info */}
      {route && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-around', gap: 8,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Distance</div>
            <div style={{ fontWeight: 700, color: '#3b82f6' }}>{route.distance_km} km</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Temps</div>
            <div style={{ fontWeight: 700, color: '#f59e0b' }}>{route.duration_min} min</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Direction</div>
            <div style={{ fontWeight: 700, color: statusConfig.color }}>
              {statusConfig.dest === 'boutique' ? '🏪 Boutique' : '🏠 Client'}
            </div>
          </div>
        </div>
      )}
      {loadingRoute && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', padding: '6px 0' }}>
          <RefreshCw size={11} className="spin" style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Calcul de l'itinéraire...
        </div>
      )}

      {/* Mini map */}
      {myPosition && destination && (
        <div style={{ height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
          <MapContainer center={myPosition} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© CARTO" />
            <Marker position={myPosition} icon={MY_ICON}><Popup>📍 Moi</Popup></Marker>
            <Marker position={destination} icon={statusConfig.dest === 'boutique' ? BOUTIQUE_ICON : CLIENT_ICON}>
              <Popup>
                {statusConfig.dest === 'boutique'
                  ? <><strong>🏪 {mission.fondateur_detail?.nom_boutique}</strong><br />{mission.fondateur_detail?.adresse}</>
                  : <><strong>🏠 {mission.client_detail?.first_name}</strong><br />{mission.adresse_livraison}</>
                }
              </Popup>
            </Marker>
            {route && route.coords.length > 0 && (
              <Polyline
                positions={route.coords}
                pathOptions={{ color: statusConfig.color, weight: 4, opacity: 0.85, dashArray: isEnRoute ? null : '8 6' }}
              />
            )}
          </MapContainer>
        </div>
      )}

      {/* Adresse de destination */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>
          {statusConfig.dest === 'boutique' ? '📍 RÉCUPÉRER À' : '📍 LIVRER À'}
        </div>
        <div style={{ fontWeight: 600 }}>
          {statusConfig.dest === 'boutique' ? mission.fondateur_detail?.nom_boutique : mission.client_detail?.first_name + ' ' + (mission.client_detail?.last_name || '')}
        </div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
          {statusConfig.dest === 'boutique' ? mission.fondateur_detail?.adresse : mission.adresse_livraison}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onAdvance(mission)}
          style={{
            flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: nextAction.color, color: 'white', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: `0 4px 14px ${nextAction.color}40`,
          }}>
          <nextAction.icon size={15} /> {nextAction.label}
        </button>
        {destination && (
          <a href={`https://www.google.com/maps/dir/${myPosition ? myPosition.join(',') : ''}/${destination.join(',')}`}
            target="_blank" rel="noreferrer"
            style={{
              padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
            }} title="Ouvrir dans Google Maps">
            <Navigation size={15} />
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Working Hours Card ──────────────────────────────────────────────────────
const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0h00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
};

const WorkingHoursCard = ({ profile }) => {
  const [tick, setTick] = useState(0);

  // Live tick every minute when available
  useEffect(() => {
    if (!profile?.is_available) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [profile?.is_available]);

  // Compute session minutes from heure_debut_disponibilite if active
  let sessionMin = profile?.minutes_session_courante || 0;
  if (profile?.is_available && profile?.heure_debut_disponibilite) {
    const start = new Date(profile.heure_debut_disponibilite);
    sessionMin = Math.floor((Date.now() - start.getTime()) / 60000);
  }

  const todayMin = (profile?.minutes_travaillees_aujourd_hui || 0) + (profile?.is_available ? sessionMin : 0);
  const weekMin  = profile?.minutes_travaillees_semaine || 0;
  const monthMin = profile?.minutes_travaillees_mois || 0;

  // Daily goal: 8h = 480 min
  const goalMin = 480;
  const goalPct = Math.min(100, Math.round((todayMin / goalMin) * 100));

  return (
    <div className="glass-card animate-fade-in" style={{ borderLeft: '4px solid #a78bfa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Clock size={16} color="#a78bfa" /> Mes heures de travail
        </h4>
        {profile?.is_available && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            En activité depuis {formatDuration(sessionMin)}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: "Aujourd'hui", value: formatDuration(todayMin), color: '#a78bfa', big: true },
          { label: 'Cette semaine', value: formatDuration(weekMin), color: '#3b82f6' },
          { label: 'Ce mois', value: formatDuration(monthMin), color: '#10b981' },
        ].map(({ label, value, color, big }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px',
            textAlign: 'center', border: big ? `1px solid ${color}30` : '1px solid transparent',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.03em', marginBottom: 4 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontWeight: 800, fontSize: big ? 20 : 16, color, fontFamily: 'monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Objectif quotidien */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-secondary)' }}>🎯 Objectif quotidien (8h)</span>
          <span style={{ fontWeight: 700, color: goalPct >= 100 ? '#10b981' : '#a78bfa' }}>{goalPct}%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, goalPct)}%`, height: '100%',
            background: goalPct >= 100 ? 'linear-gradient(90deg, #10b981, #22c55e)' : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
            transition: 'width 0.6s ease',
          }} />
        </div>
        {goalPct >= 100 && (
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>
            🏆 Objectif atteint ! Bravo
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tab Nav ──────────────────────────────────────────────────────────────────
const TabNav = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
    {tabs.map(({ id, label, icon: Icon, badge }) => (
      <button key={id} onClick={() => onChange(id)}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: active === id ? 'var(--gradient-primary)' : 'transparent',
          color: active === id ? 'white' : 'var(--text-secondary)',
          transition: 'all 0.2s', position: 'relative',
        }}>
        <Icon size={15} />
        <span className="sidebar-label">{label}</span>
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 6,
            background: '#ef4444', color: 'white', borderRadius: 10,
            fontSize: 9, fontWeight: 800, padding: '1px 5px', minWidth: 16,
          }}>{badge}</span>
        )}
      </button>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ChauffeurDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [proposees, setProposees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [posStatus, setPosStatus] = useState('idle');
  const [togglingDispo, setTogglingDispo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [objectifs, setObjectifs]   = useState(null);
  const [historique, setHistorique] = useState([]);
  const [chatCommande, setChatCommande] = useState(null);   // commande active for chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [qrInput, setQrInput]       = useState('');
  const [qrMission, setQrMission]   = useState(null);
  const chatBottomRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [profRes, missionRes, propRes, notifRes] = await Promise.all([
        transporteursApi.monProfil(),
        commandesApi.list(),                                     // toutes mes commandes (filtrées par backend)
        commandesApi.proposees().catch(() => ({ data: [] })),
        notificationsApi.nonLues().catch(() => ({ data: [] })),
      ]);
      setProfile(profRes.data);
      // Garde uniquement les missions actives (assignées à moi)
      const all = missionRes.data.results || missionRes.data || [];
      const actives = all.filter(c => ['VALIDEE', 'EN_PREPARATION', 'EN_ROUTE'].includes(c.statut));
      setMissions(actives);
      setProposees(Array.isArray(propRes.data) ? propRes.data : propRes.data.results || []);
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : notifRes.data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Get initial GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setMyPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Auto-refresh missions every 30s
  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Auto-update GPS every 60s while on map tab
  useEffect(() => {
    let id;
    if (tab === 'map' && navigator.geolocation) {
      const updatePos = () => {
        navigator.geolocation.getCurrentPosition(pos => {
          setMyPosition([pos.coords.latitude, pos.coords.longitude]);
          authApi.updatePosition(pos.coords.latitude, pos.coords.longitude).catch(() => {});
        }, () => {}, { enableHighAccuracy: true });
      };
      updatePos();
      id = setInterval(updatePos, 60000);
    }
    return () => clearInterval(id);
  }, [tab]);

  const handleUpdatePosition = () => {
    setPosStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await authApi.updatePosition(pos.coords.latitude, pos.coords.longitude);
          setMyPosition([pos.coords.latitude, pos.coords.longitude]);
          setPosStatus('success');
          showToast('Position mise à jour avec succès !');
          setTimeout(() => setPosStatus('idle'), 3000);
        } catch {
          setPosStatus('error');
          setTimeout(() => setPosStatus('idle'), 3000);
        }
      },
      () => { setPosStatus('error'); setTimeout(() => setPosStatus('idle'), 3000); },
      { enableHighAccuracy: true }
    );
  };

  const handleToggleDispo = async () => {
    setTogglingDispo(true);
    try {
      const res = await transporteursApi.toggleDisponibilite();
      setProfile(prev => ({ ...prev, is_available: res.data.is_available }));
      showToast(res.data.is_available ? 'Vous êtes maintenant disponible' : 'Vous êtes maintenant indisponible');
    } catch {
      showToast('Erreur lors du changement de statut', 'error');
    } finally {
      setTogglingDispo(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await commandesApi.transporteurAction(id, 'accepter');
      showToast('Mission acceptée ! Bonne route 🚚');
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Erreur', 'error');
    }
  };

  const handleRefuse = async (id) => {
    try {
      await commandesApi.transporteurAction(id, 'refuser');
      showToast('Mission refusée');
      fetchData();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const handleAdvance = async (mission) => {
    try {
      await commandesApi.avancer(mission.id);
      const msg = mission.statut === 'EN_ROUTE'
        ? `✅ Livraison confirmée ! Vous avez gagné ${(parseFloat(mission.frais_livraison || 0) + parseFloat(mission.sous_total || 0) * 0.05).toFixed(0)} MAD`
        : '🚗 Mission acceptée — Direction client !';
      showToast(msg);
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur lors de la mise à jour', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // ── SOS / Urgence ────────────────────────────────────────────────────────
  const handleSOS = () => setSosModalOpen(true);

  const SOS_OPTIONS = [
    { id: 'accident',    emoji: '🚗💥', label: 'Accident de véhicule',       message: 'ACCIDENT — Véhicule impliqué dans un accident' },
    { id: 'panne',       emoji: '🔧',   label: 'Panne / Crevaison',           message: 'PANNE — Véhicule immobilisé (panne ou crevaison)' },
    { id: 'agression',   emoji: '🆘',   label: 'Agression / Insécurité',      message: 'URGENCE SÉCURITÉ — Chauffeur en danger / agression' },
    { id: 'medical',     emoji: '🏥',   label: 'Urgence médicale',            message: 'URGENCE MÉDICALE — Chauffeur nécessite secours' },
    { id: 'perdu',       emoji: '🗺️',   label: 'Perdu / Problème itinéraire', message: 'NAVIGATION — Chauffeur perdu, besoin d\'assistance' },
    { id: 'autre',       emoji: '⚠️',   label: 'Autre urgence',               message: 'URGENCE — Chauffeur signale une situation critique' },
  ];

  const sendSOS = async (option) => {
    setSosModalOpen(false);
    setSosLoading(true);
    const sendWithPos = async (lat, lng) => {
      await chauffeurApi.sos({ latitude: lat, longitude: lng, message: option.message });
    };
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => { try { await sendWithPos(pos.coords.latitude, pos.coords.longitude); resolve(); } catch (e) { reject(e); } },
          async () => { try { await chauffeurApi.sos({ message: option.message + ' (position inconnue)' }); resolve(); } catch (e) { reject(e); } },
          { timeout: 5000 }
        );
      });
      showToast(`🚨 SOS "${option.label}" envoyé aux admins !`, 'success');
    } catch {
      showToast('Erreur lors de l\'envoi SOS', 'error');
    } finally {
      setSosLoading(false);
    }
  };

  // ── Objectifs ────────────────────────────────────────────────────────────
  const loadObjectifs = useCallback(async () => {
    try {
      const r = await chauffeurApi.objectifs();
      setObjectifs(r.data);
    } catch (_) {}
  }, []);

  // ── Historique ───────────────────────────────────────────────────────────
  const loadHistorique = useCallback(async () => {
    try {
      const r = await chauffeurApi.historique({ page_size: 30 });
      const arr = r.data?.results || r.data || [];
      setHistorique(arr);
    } catch (_) {}
  }, []);

  // ── Chat livraison ────────────────────────────────────────────────────────
  const openChat = async (commande) => {
    setChatCommande(commande);
    setChatLoading(true);
    setTab('chat');
    try {
      const r = await chauffeurApi.chatGet(commande.id);
      setChatMessages(r.data || []);
    } catch (_) { setChatMessages([]); }
    finally { setChatLoading(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !chatCommande) return;
    const text = chatInput.trim();
    setChatInput('');
    try {
      const r = await chauffeurApi.chatSend(chatCommande.id, text);
      setChatMessages(prev => [...prev, r.data]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (_) {}
  };

  // ── QR confirmation ───────────────────────────────────────────────────────
  const handleQrConfirm = async () => {
    if (!qrMission || !qrInput.trim()) return;
    try {
      await commandesApi.avancer(qrMission.id, { code_confirmation: qrInput.trim() });
      showToast('✅ Livraison confirmée par QR code !');
      setQrInput(''); setQrMission(null);
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.error || 'Code incorrect', 'error');
    }
  };

  // Load extras when tabs open
  useEffect(() => {
    if (tab === 'objectifs') loadObjectifs();
    if (tab === 'historique') loadHistorique();
  }, [tab]);

  // Derived stats
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'T';
  const noteColor = !profile?.note_moyenne ? '#64748b' : profile.note_moyenne >= 4.5 ? '#10b981' : profile.note_moyenne >= 3.5 ? '#f59e0b' : '#ef4444';

  const TABS = [
    { id: 'dashboard',  label: t('drv_dashboard'),       icon: Zap },
    { id: 'missions',   label: t('drv_my_deliveries'),   icon: Package, badge: proposees.length },
    { id: 'map',        label: t('map_tracking'),        icon: Map },
    { id: 'objectifs',  label: t('drv_gamification'),    icon: Target },
    { id: 'historique', label: t('drv_history'),         icon: History },
    { id: 'conduite',   label: t('drv_navigate'),        icon: Crosshair },
    { id: 'support',    label: t('chat_send'),           icon: MessageSquare },
    { id: 'profil',     label: t('drv_profile'),         icon: User },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 0 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: 12,
          fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease',
        }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <div style={{
        background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo-icon"><Truck size={20} color="white" /></div>
          <span className="text-gradient" style={{ fontWeight: 800, fontSize: 18 }}>DeliverMap</span>
          <span style={{ background: '#10b98120', color: '#10b981', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
            Chauffeur
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Dispo toggle */}
          <button onClick={handleToggleDispo} disabled={togglingDispo}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: profile?.is_available ? '#10b98120' : '#ef444420',
              color: profile?.is_available ? '#10b981' : '#ef4444',
            }}>
            {profile?.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {profile?.is_available ? t('drv_status_available') : t('drv_status_offline')}
          </button>
          {/* Sélecteur de langue */}
          <LanguageSwitcher variant="dark" />
          {/* SOS Button */}
          <button
            onClick={handleSOS}
            disabled={sosLoading}
            title="SOS"
            style={{
              background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
              animation: 'none', boxShadow: '0 0 10px rgba(239,68,68,0.5)',
            }}
          >
            <ShieldAlert size={15} /> SOS
          </button>
          {/* Notifications */}
          <div style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setTab('missions')}>
            <Bell size={20} color={notifications.length > 0 ? '#f59e0b' : 'var(--text-secondary)'} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, background: '#ef4444',
                color: 'white', borderRadius: 10, fontSize: 9, fontWeight: 800,
                padding: '1px 4px', minWidth: 14, textAlign: 'center',
              }}>{notifications.length}</span>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('welcome')}, <strong style={{ color: 'var(--text-primary)' }}>{user?.first_name}</strong>
          </span>
          <button className="btn btn-icon" onClick={handleLogout}
            style={{ background: 'transparent', color: '#ef4444', padding: '6px' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Tab Nav */}
        <div style={{ marginBottom: 24 }}>
          <TabNav tabs={TABS} active={tab} onChange={setTab} />
        </div>

        {/* ── DASHBOARD TAB ─────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Welcome banner */}
            <div style={{
              background: 'var(--gradient-primary)', borderRadius: 16, padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{t('welcome')} {user?.first_name} ! 👋</div>
                <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                  {profile?.is_available ? '✅ Vous êtes disponible pour des livraisons' : '⏸ Vous êtes actuellement indisponible'}
                </div>
                {profile?.is_on_delivery && (
                  <div style={{ fontSize: 13, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', marginTop: 8, display: 'inline-block' }}>
                    🚚 Mission en cours — consultez l'onglet Missions
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                  {profile?.nombre_livraisons || 0}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>livraisons totales</div>
              </div>
            </div>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MiniStat icon={DollarSign} label="Aujourd'hui" value={`${Math.round(profile?.revenus_jour || 0)} MAD`}  color="#10b981" />
              <MiniStat icon={TrendingUp} label="Semaine"    value={`${Math.round(profile?.revenus_semaine || 0)} MAD`} color="#3b82f6" />
              <MiniStat icon={Award}     label="Ce mois"    value={`${Math.round(profile?.revenus_mois || 0)} MAD`}    color="#8b5cf6" />
              <MiniStat icon={Star}      label="Ma note"    value={profile?.note_moyenne?.toFixed(1) || '–'}           color={noteColor} sub={`${profile?.nombre_avis || 0} avis`} />
            </div>

            {/* Heures de travail */}
            <WorkingHoursCard profile={profile} />

            {/* Missions proposées alert */}
            {proposees.length > 0 && (
              <div style={{
                background: '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: 12,
                padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                    {proposees.length} livraison{proposees.length > 1 ? 's' : ''} proposée{proposees.length > 1 ? 's' : ''} en attente
                  </span>
                </div>
                <button className="btn btn-sm" onClick={() => setTab('missions')}
                  style={{ background: '#f59e0b', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Voir <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* GPS Update + Current mission */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* GPS */}
              <div className="glass-card">
                <h4 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Navigation size={16} color="#3b82f6" /> Position GPS
                </h4>
                <button
                  onClick={handleUpdatePosition}
                  disabled={posStatus === 'loading'}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: posStatus === 'success' ? '#10b981' : posStatus === 'error' ? '#ef4444' : 'var(--gradient-primary)',
                    color: 'white', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.3s',
                  }}>
                  {posStatus === 'loading' && <><RefreshCw size={16} className="spin" /> Localisation...</>}
                  {posStatus === 'success' && <><CheckCircle size={16} /> Position envoyée !</>}
                  {posStatus === 'error'   && <><AlertTriangle size={16} /> Erreur GPS</>}
                  {posStatus === 'idle'    && <><Navigation size={16} /> Mettre à jour position</>}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
                  Partagé avec l'admin en temps réel
                </p>
              </div>

              {/* Mission en cours */}
              <div className="glass-card">
                <h4 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={16} color="#f59e0b" /> Mission en cours
                </h4>
                {missions.filter(m => m.statut === 'EN_ROUTE').length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: '16px 0' }}>
                    <Truck size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>{t('drv_no_active_delivery')}</div>
                  </div>
                ) : missions.filter(m => m.statut === 'EN_ROUTE').slice(0, 1).map(m => (
                  <div key={m.id}>
                    <div style={{ fontWeight: 700 }}>#{m.reference}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{m.adresse_livraison}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginTop: 8 }}>
                      {Math.round(m.total_price || 0)} MAD
                    </div>
                    <button className="btn btn-sm btn-primary" style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 12 }}
                      onClick={() => setTab('map')}>
                      <Map size={12} /> Voir sur carte
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Véhicule info */}
            {profile && (
              <div className="glass-card">
                <h4 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={16} color="#8b5cf6" /> Mon Véhicule
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Type', value: profile.vehicule_type || '–', emoji: { MOTO: '🛵', VOITURE: '🚗', VAN: '🚐', CAMION: '🚚' }[profile.vehicule_type] || '🚗' },
                    { label: 'Plaque', value: profile.plaque || '–', emoji: '🔢' },
                    { label: 'Permis', value: profile.permis || '–', emoji: '📋' },
                  ].map(({ label, value, emoji }) => (
                    <div key={label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 8px' }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signaler un incident */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderLeft: '3px solid #ef4444' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} color="#ef4444" /> Signaler un incident
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  Accident, panne, vol, colis endommagé...
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIncidentModal(true)}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                  color: '#fca5a5', borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <AlertTriangle size={13} /> Signaler
              </button>
            </div>
          </div>
        )}

        {/* ── MISSIONS TAB ──────────────────────────────────────────────── */}
        {tab === 'missions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} /> {t('drv_my_deliveries')}
                {missions.length > 0 && <span style={{ background: '#10b98120', color: '#10b981', fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{missions.length} active{missions.length > 1 ? 's' : ''}</span>}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {!myPosition && (
                  <button className="btn btn-sm btn-primary" onClick={handleUpdatePosition} style={{ fontSize: 12 }}>
                    <Navigation size={13} /> Activer GPS
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={fetchData}>
                  <RefreshCw size={14} /> Actualiser
                </button>
              </div>
            </div>

            {/* GPS warning */}
            {!myPosition && missions.length > 0 && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12,
                padding: '12px 16px', fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertTriangle size={16} />
                Activez votre GPS pour voir les itinéraires et calculer les trajets
              </div>
            )}

            {/* Missions proposées */}
            {proposees.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', marginBottom: 10 }}>
                  ⚡ PROPOSÉES ({proposees.length})
                </div>
                {proposees.map(cmd => (
                  <MissionCard key={cmd.id} commande={cmd} proposed
                    onAccept={handleAccept} onRefuse={handleRefuse} />
                ))}
              </div>
            )}

            {/* Missions actives avec itinéraires */}
            {missions.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', letterSpacing: '0.08em', marginBottom: 10, marginTop: 8 }}>
                  🚚 EN COURS ({missions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {missions.map(cmd => (
                    <div key={cmd.id}>
                      <ActiveMissionCard mission={cmd}
                        myPosition={myPosition} onAdvance={handleAdvance} />
                      {cmd.statut === 'EN_ROUTE' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => openChat(cmd)} style={{
                            flex: 1, background: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc',
                            borderRadius: 8, padding: '8px', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: 6
                          }}>
                            <MessageSquare size={13} /> Chat client
                          </button>
                          <button onClick={() => { setQrMission(cmd); setTab('conduite'); }} style={{
                            flex: 1, background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.3)', color: '#86efac',
                            borderRadius: 8, padding: '8px', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: 6
                          }}>
                            <QrCode size={13} /> QR Code
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {proposees.length === 0 && missions.length === 0 && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontWeight: 600 }}>{t('drv_no_active_delivery')}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Passez en disponible pour recevoir des missions</div>
                {!profile?.is_available && (
                  <button className="btn btn-primary btn-sm" onClick={handleToggleDispo} style={{ marginTop: 16 }}>
                    <CheckCircle size={14} /> Me rendre disponible
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MAP TAB ───────────────────────────────────────────────────── */}
        {tab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Ma position & missions</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleUpdatePosition} disabled={posStatus === 'loading'}>
                <Navigation size={14} /> {posStatus === 'loading' ? 'GPS...' : 'Localiser'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16, height: 420 }}>
              <MapContainer
                center={myPosition || [33.5731, -7.5898]}
                zoom={myPosition ? 13 : 6}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />
                {myPosition && (
                  <>
                    <Marker position={myPosition} icon={MY_ICON}>
                      <Popup><strong>📍 Ma position</strong></Popup>
                    </Marker>
                    <Circle
                      center={myPosition}
                      radius={300}
                      pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.1, weight: 2, dashArray: '6 4' }}
                    />
                  </>
                )}
                {missions.map(cmd => {
                  const lat = cmd.latitude_livraison;
                  const lon = cmd.longitude_livraison;
                  if (!lat && !lon) return null;
                  return (
                    <Marker key={cmd.id} position={[lat, lon]} icon={DELIVERY_ICON}>
                      <Popup>
                        <strong>📦 {cmd.reference}</strong><br />
                        {cmd.adresse_livraison}<br />
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{Math.round(cmd.total_price)} MAD</span>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {!myPosition && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: 13 }}>
                📡 Cliquez sur "Localiser" pour afficher votre position sur la carte
              </div>
            )}

            {/* Mission list below map */}
            {missions.length > 0 && (
              <div>
                {missions.map(cmd => (
                  <div key={cmd.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>#{cmd.reference}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {cmd.adresse_livraison}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#10b981' }}>{Math.round(cmd.total_price)} MAD</div>
                      <div style={{ fontSize: 11, color: '#f59e0b' }}>🚚 EN ROUTE</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OBJECTIFS TAB ─────────────────────────────────────────────── */}
        {tab === 'objectifs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={18} color="#f59e0b" /> Objectifs hebdomadaires
            </h3>
            {!objectifs ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement…</div>
            ) : (
              <>
                <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Semaine du {objectifs.semaine || '—'}
                  </div>
                  <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                    <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none"
                        stroke={objectifs.taux_completion >= 100 ? '#22c55e' : '#f59e0b'}
                        strokeWidth="10"
                        strokeDasharray={`${(objectifs.taux_completion / 100) * 314} 314`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.8s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: objectifs.taux_completion >= 100 ? '#22c55e' : '#f59e0b' }}>
                        {Math.round(objectifs.taux_completion || 0)}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>accompli</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {objectifs.livraisons_effectuees || 0}
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                      {' '}/ {objectifs.objectif_livraisons || 10} livraisons
                    </span>
                  </div>
                  {objectifs.taux_completion >= 100 && (
                    <div style={{ marginTop: 16, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 12, padding: '12px 20px', color: '#86efac', fontWeight: 700 }}>
                      🏆 Objectif atteint ! Bonus débloqué 🎉
                    </div>
                  )}
                </div>
                <div className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award size={16} color="#f59e0b" /> Badges débloqués
                    </h4>
                    <button
                      onClick={() => navigate('/chauffeur/gamification')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 8,
                        border: '1px solid rgba(245,158,11,0.3)',
                        background: 'rgba(245,158,11,0.08)',
                        color: '#f59e0b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>
                      Voir tout →
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { emoji: '🚀', label: '10 livraisons',   achieved: (profile?.nombre_livraisons || 0) >= 10 },
                      { emoji: '⭐', label: '50 livraisons',   achieved: (profile?.nombre_livraisons || 0) >= 50 },
                      { emoji: '💎', label: '100 livraisons',  achieved: (profile?.nombre_livraisons || 0) >= 100 },
                      { emoji: '🏅', label: 'Objectif semaine', achieved: (objectifs.taux_completion || 0) >= 100 },
                      { emoji: '📈', label: 'Note 4.5+',       achieved: (profile?.note_moyenne || 0) >= 4.5 },
                      { emoji: '⚡', label: 'Zéro incident',   achieved: (profile?.incidents_total || 0) === 0 },
                    ].map((b, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: '12px 16px', background: b.achieved ? 'rgba(245,158,11,0.15)' : 'rgba(71,85,105,0.15)', border: `1px solid ${b.achieved ? 'rgba(245,158,11,0.4)' : 'rgba(71,85,105,0.2)'}`, borderRadius: 12, opacity: b.achieved ? 1 : 0.4, minWidth: 90 }}>
                        <div style={{ fontSize: 28 }}>{b.emoji}</div>
                        <div style={{ fontSize: 11, color: b.achieved ? '#fcd34d' : '#64748b', marginTop: 4 }}>{b.label}</div>
                        {b.achieved && <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>✓ Obtenu</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  <MiniStat icon={Package} label="Total livraisons" value={profile?.nombre_livraisons || 0} color="#3b82f6" />
                  <MiniStat icon={Star}    label="Note moyenne"    value={(profile?.note_moyenne || 0).toFixed(1)} color="#f59e0b" />
                  <MiniStat icon={Award}   label="Taux réussite"   value={`${profile?.taux_reussite || 0}%`} color="#22c55e" />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── HISTORIQUE TAB ────────────────────────────────────────────── */}
        {tab === 'historique' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} /> Historique des livraisons
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={loadHistorique}><RefreshCw size={14} /></button>
            </div>
            {historique.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <History size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div>Aucune livraison dans l'historique</div>
              </div>
            ) : historique.map(cmd => {
              const s = STATUT_STYLE[cmd.statut] || STATUT_STYLE.EN_ATTENTE;
              const note = cmd.avis?.note;
              return (
                <div key={cmd.id} className="glass-card animate-fade-in" style={{ borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>#{cmd.reference}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {cmd.created_at ? new Date(cmd.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>{Math.round(cmd.frais_livraison || 0)} MAD</div>
                      <span style={{ background: s.bg, color: s.color, fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>{s.label}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={11} /> {cmd.adresse_livraison || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {note && <span style={{ fontSize: 12, color: '#f59e0b' }}>{'★'.repeat(Math.round(note))}{'☆'.repeat(5 - Math.round(note))} {note}/5</span>}
                    {cmd.incidents?.length > 0 && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: 5, padding: '1px 7px' }}>⚠ {cmd.incidents.length} incident{cmd.incidents.length > 1 ? 's' : ''}</span>}
                    {cmd.duree_minutes && <span style={{ fontSize: 11, color: '#64748b' }}>⏱ {cmd.duree_minutes} min</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MODE CONDUITE TAB ─────────────────────────────────────────── */}
        {tab === 'conduite' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crosshair size={18} color="#10b981" /> Mode conduite
            </h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: -10 }}>Interface simplifiée — grands boutons, actions en 1 clic</div>
            {missions.filter(m => m.statut === 'EN_ROUTE').length > 0 ? (
              missions.filter(m => m.statut === 'EN_ROUTE').slice(0, 1).map(m => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)', borderRadius: 16, padding: '18px 22px' }}>
                    <div style={{ fontSize: 13, color: '#86efac', marginBottom: 4 }}>🚚 EN ROUTE</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>#{m.reference}</div>
                    <div style={{ fontSize: 16, color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <MapPin size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                      {m.adresse_livraison}
                    </div>
                  </div>
                  <button onClick={() => handleAdvance(m)} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', borderRadius: 16, padding: '22px', cursor: 'pointer', fontWeight: 800, fontSize: 20, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
                    <CheckCircle size={28} /> Livraison confirmée
                  </button>
                  <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <QrCode size={18} color="#a5b4fc" /> Confirmation QR Code
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input value={qrInput} onChange={e => { setQrInput(e.target.value); setQrMission(m); }}
                        placeholder="Scanner ou saisir le code client…"
                        style={{ flex: 1, padding: '12px 14px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#f1f5f9', fontSize: 15, outline: 'none' }} />
                      <button onClick={() => { setQrMission(m); handleQrConfirm(); }} disabled={!qrInput.trim()} style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc', borderRadius: 10, padding: '12px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>OK</button>
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Code optionnel — confirme la livraison directement</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button onClick={() => openChat(m)} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', borderRadius: 14, padding: '18px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <MessageSquare size={28} /> Chat client
                    </button>
                    <button onClick={() => { const dest = m.latitude_livraison && m.longitude_livraison ? `${m.latitude_livraison},${m.longitude_livraison}` : encodeURIComponent(m.adresse_livraison || ''); window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank'); }} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', color: '#86efac', borderRadius: 14, padding: '18px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Navigation size={28} /> GPS
                    </button>
                  </div>
                  <button onClick={handleSOS} disabled={sosLoading} style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.5)', color: '#fca5a5', borderRadius: 14, padding: '18px', cursor: 'pointer', fontWeight: 800, fontSize: 18, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}>
                    <ShieldAlert size={24} /> 🚨 SOS Urgence
                  </button>
                </div>
              ))
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Crosshair size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontWeight: 600 }}>{t('drv_no_active_delivery')}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Le mode conduite s'active lors d'une livraison EN_ROUTE</div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ──────────────────────────────────────────────────── */}
        {tab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => setTab('conduite')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>
              <h3 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="#6366f1" />
                Chat — {chatCommande ? `#${chatCommande.reference}` : 'Livraison'}
              </h3>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(15,23,42,0.5)', borderRadius: 14, padding: 16, border: '1px solid rgba(99,102,241,0.2)', minHeight: 300 }}>
              {chatLoading && <div style={{ color: '#64748b', textAlign: 'center' }}>Chargement…</div>}
              {!chatLoading && chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, margin: 'auto' }}>
                  Pas encore de messages — dites bonjour au client !
                </div>
              )}
              {chatMessages.map((msg, i) => {
                const isMe = msg.auteur_role === 'TRANSPORTEUR';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(30,41,59,0.8)', border: isMe ? 'none' : '1px solid rgba(99,102,241,0.2)', color: '#f1f5f9', fontSize: 14, lineHeight: 1.5 }}>
                      {msg.contenu}
                      <div style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : '#475569', marginTop: 4, textAlign: 'right' }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} placeholder="Message au client…"
                style={{ flex: 1, padding: '12px 16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#f1f5f9', fontSize: 14, outline: 'none' }} />
              <button onClick={sendChat} disabled={!chatInput.trim()} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, padding: '12px 18px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Send size={16} /> Envoyer
              </button>
            </div>
          </div>
        )}

        {/* ── PROFIL TAB ────────────────────────────────────────────────── */}
        {tab === 'profil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Avatar card */}
            <div className="glass-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
                background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: 'white', border: '3px solid rgba(255,255,255,0.2)',
              }}>{initials}</div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{user?.email}</div>
              {user?.phone && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📞 {user.phone}</div>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                {profile?.is_verified
                  ? <span style={{ background: '#10b98120', color: '#10b981', fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>✔ Vérifié</span>
                  : <span style={{ background: '#f59e0b20', color: '#f59e0b', fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>⏳ En attente de vérification</span>
                }
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <MiniStat icon={Package}    label="Livraisons"   value={profile?.nombre_livraisons || 0}                    color="#3b82f6" />
              <MiniStat icon={Star}       label="Note moy."    value={profile?.note_moyenne?.toFixed(1) || '–'}           color={noteColor} sub={`${profile?.nombre_avis || 0} avis`} />
              <MiniStat icon={DollarSign} label="Revenus tot." value={`${Math.round(profile?.revenus_total || 0)} MAD`}   color="#10b981" />
            </div>

            {/* Revenus — résumé + lien dashboard financier */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="#10b981" /> Revenus
                </h4>
                <button
                  onClick={() => navigate('/chauffeur/finances')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 8,
                    border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16,185,129,0.08)',
                    color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Dashboard complet →
                </button>
              </div>
              {[
                { label: "Aujourd'hui",  value: profile?.revenus_jour    || 0, color: '#10b981', icon: '📅' },
                { label: 'Cette semaine', value: profile?.revenus_semaine || 0, color: '#3b82f6', icon: '📆' },
                { label: 'Ce mois',       value: profile?.revenus_mois    || 0, color: '#8b5cf6', icon: '🗓️' },
                { label: 'Total cumulé',  value: profile?.revenus_total   || 0, color: '#f59e0b', icon: '💰' },
              ].map(({ label, value, color, icon }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{icon} {label}</span>
                  <span style={{ fontWeight: 700, color, fontSize: 15 }}>{Math.round(value).toLocaleString()} MAD</span>
                </div>
              ))}
            </div>

            {/* Véhicule */}
            {profile && (
              <div className="glass-card">
                <h4 style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={16} color="#3b82f6" /> Véhicule
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Type',     value: profile.vehicule_type || profile.type_vehicule || '—' },
                    { label: 'Plaque',   value: profile.plaque || profile.plaque_immatriculation || '—' },
                    { label: 'Capacité', value: profile.capacite_kg ? `${profile.capacite_kg} kg` : '—' },
                    { label: 'Ville',    value: profile.ville || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Déconnexion */}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <LogOut size={18} /> Se déconnecter
            </button>
          </div>
        )}

        {/* ── SUPPORT TAB ───────────────────────────────────────────────── */}
        {tab === 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Mes tickets de support</h3>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/tickets')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronRight size={14} /> Voir tout
              </button>
            </div>
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Centre de support</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                Signalez un problème, posez une question ou suivez l'avancement de vos tickets.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, margin: '0 auto' }}>
                <button className="btn btn-primary" onClick={() => navigate('/tickets')} style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700 }}>
                  🎫 Mes tickets
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/tickets?action=nouveau')} style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700 }}>
                  ✏️ Ouvrir un nouveau ticket
                </button>
                <button className="btn btn-secondary" onClick={() => setShowIncidentModal(true)} style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700 }}>
                  ⚠️ Signaler un incident
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Incident modal */}
      {showIncidentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Signaler un incident</h3>
              <button onClick={() => setShowIncidentModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <SignalerIncidentPanel onClose={() => setShowIncidentModal(false)} />
          </div>
        </div>
      )}

      {/* SOS modal */}
      {sosModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'rgba(20,10,10,0.98)', border: '2px solid rgba(239,68,68,0.5)', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 440, boxShadow: '0 0 60px rgba(239,68,68,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🚨</div>
              <h3 style={{ color: '#ef4444', fontWeight: 800, fontSize: 20, margin: 0 }}>Alerte SOS</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6 }}>Choisissez le type d&apos;urgence — les admins seront notifiés immédiatement</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SOS_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => sendSOS(opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 12, cursor: 'pointer', color: 'white', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                >
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{opt.message}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setSosModalOpen(false)}
              style={{ width: '100%', marginTop: '1.25rem', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChauffeurDashboard;
