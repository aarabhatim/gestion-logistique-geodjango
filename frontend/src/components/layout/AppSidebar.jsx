import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Truck, Package, Map as MapIcon,
  Settings, BarChart2, AlertTriangle, LogOut, Store, Activity,
  Award, MessageSquare, FileText, Radio, CalendarDays, MapPinned,
  Tag, TrendingUp, UserCog, Megaphone, Ban, Image, Star,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';

// ─── Theme tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      '#0A0F0B',
  surface: '#0F1A12',
  border:  'rgba(34,197,94,0.08)',
  primary: '#22C55E',
  primary2:'#16A34A',
  text:    '#FFFFFF',
  text2:   '#6B7280',
  text3:   'rgba(34,197,94,0.5)',
  danger:  '#EF4444',
};
const grad   = `linear-gradient(135deg, ${T.primary2}, ${T.primary})`;
const glow   = `0 0 20px rgba(34,197,94,0.3)`;

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, badge, collapsed }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  const [hovered, setHovered] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <Link to={to} style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={() => { setHovered(true); if (collapsed) setTipVisible(true); }}
        onMouseLeave={() => { setHovered(false); setTipVisible(false); }}>
        {active && (
          <motion.span
            layoutId="sidebar-pill"
            style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: 'rgba(34,197,94,0.12)',
              border: `1px solid rgba(34,197,94,0.2)`,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        )}
        {active && (
          <span style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 22, borderRadius: '0 3px 3px 0',
            background: grad, boxShadow: glow,
          }} />
        )}
        <span style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '10px 0' : '10px 12px',
          borderRadius: 12,
          background: !active && hovered ? 'rgba(34,197,94,0.06)' : 'transparent',
          transition: 'all 0.2s',
        }}>
          <Icon
            size={17}
            style={{
              flexShrink: 0,
              color: active ? T.primary : hovered ? 'rgba(34,197,94,0.7)' : T.text2,
              filter: active ? `drop-shadow(0 0 5px rgba(34,197,94,0.5))` : 'none',
              transition: 'all 0.2s',
            }}
          />
          {!collapsed && (
            <>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: 13.5, fontWeight: active ? 600 : 500,
                color: active ? T.text : hovered ? 'rgba(255,255,255,0.8)' : T.text2,
                transition: 'color 0.2s',
              }}>
                {label}
              </span>
              {badge != null && (
                <span style={{
                  marginLeft: 'auto',
                  padding: '2px 7px', borderRadius: 20,
                  fontSize: 10, fontWeight: 700, color: 'white',
                  background: grad,
                }}>
                  {badge}
                </span>
              )}
            </>
          )}
        </span>
      </Link>

      {/* Tooltip when collapsed */}
      <AnimatePresence>
        {collapsed && tipVisible && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
              marginLeft: 10, zIndex: 999,
              background: '#1A2E20', border: `1px solid rgba(34,197,94,0.2)`,
              borderRadius: 8, padding: '6px 10px',
              fontSize: 12, fontWeight: 600, color: T.text,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ title, collapsed }) {
  if (collapsed) {
    return (
      <div style={{ height: 1, background: T.border, margin: '8px 10px 8px' }} />
    );
  }
  return (
    <p style={{
      margin: '16px 0 6px 12px',
      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: T.text3,
    }}>
      {title}
    </p>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export function AppSidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const scrollRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const SCROLL_KEY = 'sidebar-scroll-y';

  const SW = collapsed ? 72 : 260;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) el.scrollTop = parseInt(saved, 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const save = () => sessionStorage.setItem(SCROLL_KEY, el.scrollTop);
    el.addEventListener('scroll', save, { passive: true });
    return () => el.removeEventListener('scroll', save);
  }, []);

  const initials = user
    ? ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'A'
    : 'A';
  const roleLabel = { ADMIN: t('sb_role_admin'), FONDATEUR: t('sb_role_fondateur'), TRANSPORTEUR: t('sb_role_transporteur'), CLIENT: t('sb_role_client') };
  const isAdmin    = user?.role === 'ADMIN';
  const isFondateur = user?.role === 'FONDATEUR';

  return (
    <aside style={{
      width: SW, minWidth: SW,
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: `linear-gradient(180deg, #081810 0%, #060E09 100%)`,
      borderRight: `1px solid ${T.border}`,
      overflow: 'hidden',
      transition: 'width 0.3s ease, min-width 0.3s ease',
      flexShrink: 0,
      position: 'relative',
    }}>

      {/* ── Logo ── */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 16px' : '0 18px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10, borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: grad, boxShadow: glow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Truck size={19} color="white" />
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: T.text, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              DeliverMap
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: T.text3, textTransform: 'uppercase', marginTop: 1 }}>
              Enterprise Logistics
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: collapsed ? '8px 8px' : '8px 10px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(34,197,94,0.12) transparent',
        }}
      >
        {isAdmin && (
          <>
            <SectionHeader title={t('dashboard')} collapsed={collapsed} />
            <NavItem to="/"           icon={LayoutDashboard} label={t('dashboard')}    collapsed={collapsed} />
            <NavItem to="/live"       icon={Radio}           label={t('sb_live')}   collapsed={collapsed} />
            <NavItem to="/map"        icon={MapIcon}         label={t('map_tracking')} collapsed={collapsed} />
            <NavItem to="/calendrier" icon={CalendarDays}    label={t('sb_calendrier')}        collapsed={collapsed} />

            <SectionHeader title={t('sb_operations')} collapsed={collapsed} />
            <NavItem to="/commandes"  icon={Package}       label={t('commandes')}    collapsed={collapsed} />
            <NavItem to="/boutiques"  icon={Store}         label={t('boutiques')}    collapsed={collapsed} />
            <NavItem to="/incidents"  icon={AlertTriangle} label={t('incidents')}    collapsed={collapsed} />
            <NavItem to="/zones"      icon={MapPinned}     label={t('sb_zones')}   collapsed={collapsed} />
            <NavItem to="/promotions" icon={Tag}           label={t('sb_promotions')}        collapsed={collapsed} />

            <SectionHeader title={t('sb_gestion')} collapsed={collapsed} />
            <NavItem to="/clients"       icon={Users}         label={t('clients')}       collapsed={collapsed} />
            <NavItem to="/transporteurs" icon={Truck}         label={t('transporteurs')} collapsed={collapsed} />
            <NavItem to="/scoring"       icon={Award}         label={t('scoring')}            collapsed={collapsed} />
            <NavItem to="/tickets"       icon={MessageSquare} label={t('sb_tickets')}            collapsed={collapsed} />
            <NavItem to="/contrats"      icon={FileText}      label={t('sb_contrats')}           collapsed={collapsed} />

            <SectionHeader title={t('sb_intelligence')} collapsed={collapsed} />
            <NavItem to="/rapports"   icon={BarChart2}  label={t('reports')}  collapsed={collapsed} />
            <NavItem to="/heatmap"    icon={Activity}   label={t('heatmap')}  collapsed={collapsed} />
            <NavItem to="/previsions" icon={TrendingUp} label={t('sb_previsions')}    collapsed={collapsed} />

            <SectionHeader title={t('sb_outils_admin')} collapsed={collapsed} />
            <NavItem to="/impersonation" icon={UserCog}   label={t('sb_impersonation')} collapsed={collapsed} />
            <NavItem to="/bannieres"     icon={Megaphone} label={t('sb_bannieres')}     collapsed={collapsed} />
            <NavItem to="/blacklist"     icon={Ban}       label={t('sb_blacklist')}     collapsed={collapsed} />
            <NavItem to="/settings"      icon={Settings}  label={t('settings')} collapsed={collapsed} />
          </>
        )}

        {isFondateur && (
          <>
            <SectionHeader title={t('sb_ma_boutique')} collapsed={collapsed} />
            <NavItem to="/boutique"           icon={LayoutDashboard} label={t('dashboard')}  collapsed={collapsed} />
            <NavItem to="/boutique/commandes" icon={Package}         label={t('sb_commandes')}         collapsed={collapsed} />
            <NavItem to="/boutique/produits"  icon={Store}           label={t('sb_produits')}  collapsed={collapsed} />
            <NavItem to="/boutique/galerie"   icon={Image}           label={t('sb_galerie')}           collapsed={collapsed} />

            <SectionHeader title={t('sb_clients_section')} collapsed={collapsed} />
            <NavItem to="/boutique/avis" icon={Star}          label={t('sb_avis')}    collapsed={collapsed} />
            <NavItem to="/tickets"       icon={MessageSquare} label={t('sb_tickets_support')} collapsed={collapsed} />

            <SectionHeader title={t('sb_analytics')} collapsed={collapsed} />
            <NavItem to="/boutique/analytics" icon={BarChart2} label={t('sb_analytiques')} collapsed={collapsed} />

            <SectionHeader title={t('sb_parametres')} collapsed={collapsed} />
            <NavItem to="/settings" icon={Settings} label={t('settings')} collapsed={collapsed} />
          </>
        )}

        {!isAdmin && !isFondateur && (
          <>
            <SectionHeader title={t('dashboard')} collapsed={collapsed} />
            <NavItem to="/"         icon={LayoutDashboard} label={t('dashboard')} collapsed={collapsed} />
            <NavItem to="/tickets"  icon={MessageSquare}   label={t('sb_tickets')}        collapsed={collapsed} />
            <NavItem to="/settings" icon={Settings}        label={t('settings')}  collapsed={collapsed} />
          </>
        )}
      </div>

      {/* ── User Profile ── */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${T.border}`,
        padding: collapsed ? '12px 8px' : '12px 12px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius: 12,
          background: 'rgba(34,197,94,0.06)',
          border: `1px solid rgba(34,197,94,0.1)`,
        }}>
          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: grad, boxShadow: `0 0 10px rgba(34,197,94,0.25)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: 'white',
            border: '1.5px solid rgba(34,197,94,0.3)',
          }}>
            {initials}
          </div>

          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>
                  {roleLabel[user?.role]}
                </div>
              </div>
              <button
                onClick={logout}
                title={t('logout')}
                style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  border: `1px solid rgba(239,68,68,0.2)`,
                  background: 'rgba(239,68,68,0.08)',
                  color: T.danger, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Collapse Toggle ── */}
      <div style={{ flexShrink: 0, padding: '8px', borderTop: `1px solid ${T.border}` }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: 'transparent', color: T.text2,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.07)'; e.currentTarget.style.color = T.primary; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text2; e.currentTarget.style.borderColor = T.border; }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={15} /><span style={{ fontSize: 11 }}>{t('sidebar_collapse')}</span></>}
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
