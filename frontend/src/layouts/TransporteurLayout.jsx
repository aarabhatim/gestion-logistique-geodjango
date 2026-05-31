/**
 * TransporteurLayout — shell partagé pour les sous-pages chauffeur
 * (/chauffeur/finances, /chauffeur/gamification, etc.)
 *
 * Fournit :
 *  - Sidebar identique à ChauffeurDashboard (collapsible)
 *  - Topbar avec bouton retour, titre de la page, SOS, profil
 *  - Zone de contenu scrollable avec le fond #0B0B0B
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Truck, Home, Package, Map, History, Target, Crosshair,
  MessageSquare, User, BarChart3, Award, Settings,
  ChevronLeft, ChevronRight, Bell, ShieldAlert, LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { transporteursApi } from '../services/api';

// ─── Theme tokens (identiques à ChauffeurDashboard) ─────────────────────────
const T = {
  bg:      '#0B0B0B',
  surface: '#161616',
  sidebar: '#111111',
  primary: '#FF8A00',
  primary2:'#FF6B00',
  text:    '#FFFFFF',
  text2:   '#A3A3A3',
  border:  'rgba(255,255,255,0.05)',
  danger:  '#EF4444',
  success: '#22C55E',
};
const gradient = `linear-gradient(90deg, ${T.primary}, ${T.primary2})`;
const glowOrange = `0 4px 16px rgba(255,138,0,0.25)`;

const VEHICLE_EMOJI = { MOTO: '🛵', VOITURE: '🚗', VAN: '🚐', CAMIONNETTE: '🚐', CAMION: '🚛' };
const VEHICLE_LABEL = { MOTO: 'Moto', VOITURE: 'Voiture', VAN: 'Van', CAMIONNETTE: 'Camionnette', CAMION: 'Camion' };

const NAV_ITEMS = [
  { path: '/chauffeur',             label: 'Tableau de bord', icon: Home },
  { path: '/chauffeur/missions',    label: 'Expéditions',      icon: Package },
  { path: '/chauffeur/map',         label: 'Mes livraisons',   icon: Map },
  { path: '/chauffeur/historique',  label: 'Historique',       icon: History },
  { path: '/chauffeur/conduite',    label: 'Mode conduite',    icon: Crosshair },
  { path: '/chauffeur/objectifs',   label: 'Objectifs',        icon: Target },
  { path: '/chauffeur/support',     label: 'Messages',         icon: MessageSquare },
  { path: '/chauffeur/profil',      label: 'Profil',           icon: User },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, onClick, collapsed }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: collapsed ? '12px 0' : '11px 16px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 16, border: 'none', cursor: 'pointer',
        background: active
          ? gradient
          : hovered ? 'rgba(255,138,0,0.1)' : 'transparent',
        color: active ? 'white' : T.text2,
        fontWeight: active ? 700 : 500, fontSize: 14,
        transition: 'all 0.2s ease',
        boxShadow: active ? glowOrange : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
    </button>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function TransporteurLayout({ children, pageTitle, pageIcon }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile]         = useState(null);

  useEffect(() => {
    transporteursApi.monProfil()
      .then(r => setProfile(r.data))
      .catch(() => {});
  }, []);

  const SW       = sidebarOpen ? 280 : 72;
  const vType    = profile?.vehicule_type || profile?.type_vehicule || 'CAMION';
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'T';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: T.bg,
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: T.text,
    }}>

      {/* ══ SIDEBAR ════════════════════════════════════════════════════════ */}
      <aside style={{
        width: SW, minWidth: SW,
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 200,
        transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          padding: sidebarOpen ? '20px 20px 16px' : '20px 0 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: gradient, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: glowOrange,
          }}>
            <Truck size={20} color="white" />
          </div>
          {sidebarOpen && (
            <span style={{ fontWeight: 800, fontSize: 18, color: T.text, whiteSpace: 'nowrap' }}>
              Transporteur
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1,
          padding: sidebarOpen ? '16px 12px' : '16px 8px',
          display: 'flex', flexDirection: 'column', gap: 4,
          overflowY: 'auto',
        }}>
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              collapsed={!sidebarOpen}
            />
          ))}

          <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
          <NavItem icon={BarChart3} label="Finances"     active={location.pathname === '/chauffeur/finances'}     onClick={() => navigate('/chauffeur/finances')}     collapsed={!sidebarOpen} />
          <NavItem icon={Award}     label="Gamification" active={location.pathname === '/chauffeur/gamification'} onClick={() => navigate('/chauffeur/gamification')} collapsed={!sidebarOpen} />
          <NavItem icon={Settings}  label="Paramètres"   active={location.pathname === '/chauffeur/parametres'} onClick={() => navigate('/chauffeur/parametres')} collapsed={!sidebarOpen} />
        </nav>

        {/* Status */}
        <div style={{
          padding: sidebarOpen ? '12px 16px' : '12px 8px',
          borderTop: `1px solid ${T.border}`,
          borderBottom: `1px solid ${T.border}`,
        }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: T.text2 }}>Statut</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                background: profile?.is_available ? `${T.success}20` : `${T.danger}20`,
                color: profile?.is_available ? T.success : T.danger,
                fontSize: 12, fontWeight: 600,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: profile?.is_available ? T.success : T.danger,
                  display: 'inline-block',
                }} />
                {profile?.is_available ? 'En ligne' : 'Hors ligne'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                background: profile?.is_available ? T.success : T.danger,
                display: 'inline-block',
              }} />
            </div>
          )}
        </div>

        {/* Vehicle */}
        <div style={{ padding: sidebarOpen ? '14px 16px' : '14px 8px', borderTop: `1px solid ${T.border}` }}>
          {sidebarOpen ? (
            <div style={{
              background: '#1A1A1A', borderRadius: 16,
              padding: '12px 14px', border: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 10, color: T.text2, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>
                VÉHICULE ACTIF
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 30 }}>{VEHICLE_EMOJI[vType] || '🚛'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{VEHICLE_LABEL[vType] || vType}</div>
                  <div style={{ fontSize: 11, color: T.text2 }}>
                    {profile?.plaque || profile?.plaque_immatriculation || '–'}
                  </div>
                  <div style={{ fontSize: 10, color: T.primary, fontWeight: 600, marginTop: 2 }}>● Actif</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: 26 }}>{VEHICLE_EMOJI[vType] || '🚛'}</span>
            </div>
          )}
        </div>

        {/* Collapse btn */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            margin: '10px', padding: '8px', borderRadius: 10,
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.text2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,138,0,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      {/* ══ MAIN AREA ══════════════════════════════════════════════════════ */}
      <div style={{
        marginLeft: SW, flex: 1,
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        transition: 'margin-left 0.3s ease',
      }}>

        {/* ── Topbar ── */}
        <header style={{
          height: 64, background: T.sidebar,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 14,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          {/* Back */}
          <button
            onClick={() => navigate('/chauffeur')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10,
              border: `1px solid ${T.border}`, background: '#1A1A1A',
              color: T.text2, cursor: 'pointer', fontSize: 13,
              fontWeight: 600, whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
          >
            <ChevronLeft size={15} /> Tableau de bord
          </button>

          {/* Page title */}
          {pageTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {pageIcon && <span style={{ fontSize: 20 }}>{pageIcon}</span>}
              <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{pageTitle}</span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* SOS */}
          <button
            onClick={() => navigate('/chauffeur')}
            style={{
              padding: '7px 14px', borderRadius: 10,
              border: 'none', background: `${T.danger}20`,
              color: T.danger, cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <ShieldAlert size={15} /> SOS
          </button>

          {/* Bell */}
          <div style={{ padding: 6, cursor: 'pointer' }} onClick={() => navigate('/chauffeur')}>
            <Bell size={20} color={T.text2} />
          </div>

          {/* Profile chip */}
          <div
            onClick={() => navigate('/chauffeur')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '4px 10px', borderRadius: 10,
              background: '#1A1A1A', border: `1px solid ${T.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: 'white',
            }}>
              {initials}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: 11, color: T.text2 }}>Transporteur</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              padding: '7px 10px', borderRadius: 10,
              border: `1px solid ${T.border}`, background: 'transparent',
              color: `${T.danger}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </header>

        {/* ── Page content ── */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto', background: T.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
}
