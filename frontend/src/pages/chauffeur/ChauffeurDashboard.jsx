import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, MapPin, Navigation, Star, CheckCircle, Clock, LogOut,
  Package, TrendingUp, Bell, ChevronRight, ToggleLeft, ToggleRight,
  DollarSign, Award, AlertTriangle, Map, List, User, Zap,
  ArrowRight, Phone, RefreshCw,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../contexts/AuthContext';
import { transporteursApi, commandesApi, livraisonsApi, notificationsApi, authApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

// ─── Leaflet icon fix ─────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color, emoji, size = 36) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:${size*0.45}px">${emoji}</div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor: [0, -size / 2],
});

const MY_ICON       = makeIcon('#8b5cf6', '🚗', 40);
const DELIVERY_ICON = makeIcon('#ef4444', '📦', 32);
const BOUTIQUE_ICON = makeIcon('#3b82f6', '🏪', 28);

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
              Refuser
            </button>
            <button className="btn btn-sm btn-primary" style={{ fontSize: 12 }}
              onClick={() => onAccept(commande.id)}>
              <CheckCircle size={13} /> Accepter
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

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [profRes, missionRes, propRes, notifRes] = await Promise.all([
        transporteursApi.monProfil(),
        commandesApi.list({ statut: 'EN_ROUTE' }),
        commandesApi.proposees().catch(() => ({ data: [] })),
        notificationsApi.nonLues().catch(() => ({ data: [] })),
      ]);
      setProfile(profRes.data);
      setMissions(missionRes.data.results || missionRes.data || []);
      setProposees(Array.isArray(propRes.data) ? propRes.data : propRes.data.results || []);
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : notifRes.data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Derived stats
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'T';
  const noteColor = !profile?.note_moyenne ? '#64748b' : profile.note_moyenne >= 4.5 ? '#10b981' : profile.note_moyenne >= 3.5 ? '#f59e0b' : '#ef4444';

  const TABS = [
    { id: 'dashboard', label: 'Accueil', icon: Zap },
    { id: 'missions', label: 'Missions', icon: Package, badge: proposees.length },
    { id: 'map', label: 'Carte', icon: Map },
    { id: 'profil', label: 'Profil', icon: User },
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
            {profile?.is_available ? 'Disponible' : 'Indisponible'}
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
            Bonjour, <strong style={{ color: 'var(--text-primary)' }}>{user?.first_name}</strong>
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
                <div style={{ fontWeight: 800, fontSize: 20 }}>Bonjour {user?.first_name} ! 👋</div>
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
                    <div>Aucune mission active</div>
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
          </div>
        )}

        {/* ── MISSIONS TAB ──────────────────────────────────────────────── */}
        {tab === 'missions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Mes missions</h3>
              <button className="btn btn-secondary btn-sm" onClick={fetchData}>
                <RefreshCw size={14} /> Actualiser
              </button>
            </div>

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

            {/* Missions en cours */}
            {missions.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', letterSpacing: '0.08em', marginBottom: 10, marginTop: 8 }}>
                  🚚 EN COURS ({missions.length})
                </div>
                {missions.map(cmd => (
                  <MissionCard key={cmd.id} commande={cmd} />
                ))}
              </div>
            )}

            {proposees.length === 0 && missions.length === 0 && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontWeight: 600 }}>Aucune mission pour le moment</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Passez en disponible pour recevoir des missions</div>
                <button className="btn btn-primary btn-sm" onClick={handleToggleDispo} style={{ marginTop: 16 }}>
                  <CheckCircle size={14} /> Me rendre disponible
                </button>
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
              <MiniStat icon={Package}    label="Livraisons"  value={profile?.nombre_livraisons || 0} color="#3b82f6" />
              <MiniStat icon={Star}       label="Note moy."   value={profile?.note_moyenne?.toFixed(1) || '–'} color={noteColor} sub={`${profile?.nombre_avis || 0} avis`} />
              <MiniStat icon={DollarSign} label="Revenus tot." value={`${Math.round(profile?.revenus_total || 0)} MAD`} color="#10b981" />
            </div>

            {/* Revenus breakdown */}
            <div className="glass-card">
              <h4 style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#10b981" /> Revenus
              </h4>
              {[
                { label: "Aujourd'hui", value: profile?.revenus_jour || 0, color: '#10b981', icon: '📅' },
                { label: 'Cette semaine', value: profile?.revenus_semaine || 0, color: '#3b82f6', icon: '📆' },
                { label: 'Ce mois', value: profile?.revenus_mois || 0, color: '#8b5cf6', icon: '🗓️' },
                { label: 'Total cumulé', value: profile?.revenus_total || 0, color: '#f59e0b', icon: '💰' },
              ].map(({ label, value, color, icon }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{icon} {label}</span>
                  <span style={{ fontWeight: 700, color, fontSize: 15 }}>{Math.round(value).toLocaleString()} MAD</span>
                </div>
              ))}
            </div>

            {/* Vehicle info */}
            {profile && (
              <div className="glass-card">
                <h4 style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={16} color="#8b5cf6" /> Informations véhicule
                </h4>
                {[
                  { label: 'Type', value: profile.vehicule_type },
                  { label: 'Plaque', value: profile.plaque },
                  { label: 'Numéro de permis', value: profile.permis },
                  { label: 'Ville', value: profile.ville },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-secondary" onClick={handleLogout}
              style={{ color: '#ef4444', border: '1px solid #ef444430', display: 'flex', justifyContent: 'center', gap: 8 }}>
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChauffeurDashboard;
