import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Truck, Package, Map as MapIcon,
  Settings, BarChart2, AlertTriangle, LogOut, Store, Activity,
  Award, MessageSquare, FileText, Radio, CalendarDays, MapPinned,
  Tag, TrendingUp, UserCog, Megaphone, Ban, Image, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

// ─── NavLink ─────────────────────────────────────────────────────────────────
const NavLink = ({ to, icon: Icon, label, badge }) => {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className="relative block"
      style={{ transition: 'opacity 0.15s' }}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg"
          style={{ background: 'rgba(99,102,241,0.15)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <span
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
          active
            ? 'text-sidebar-foreground'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground',
        )}
        style={{ transition: 'color 0.15s, background 0.15s' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon
          className="shrink-0"
          size={17}
          style={{ color: active ? '#818cf8' : undefined, transition: 'color 0.15s' }}
        />
        <span className="flex-1 truncate">{label}</span>
        {badge != null && (
          <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
};

const NavSection = ({ title, children }) => (
  <div className="mb-3">
    {title && (
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35">
        {title}
      </p>
    )}
    <nav className="flex flex-col gap-0.5">{children}</nav>
  </div>
);

// ─── AppSidebar ───────────────────────────────────────────────────────────────
export function AppSidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  // Préserver la position du scroll entre les navigations
  const SCROLL_KEY = 'sidebar-scroll-y';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Restore saved position
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) el.scrollTop = parseInt(saved, 10);
  }, []); // mount only

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const save = () => sessionStorage.setItem(SCROLL_KEY, el.scrollTop);
    el.addEventListener('scroll', save, { passive: true });
    return () => el.removeEventListener('scroll', save);
  }, []);

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'A'
    : 'A';

  const roleLabel = {
    ADMIN: 'Administrateur', FONDATEUR: 'Fondateur',
    TRANSPORTEUR: 'Transporteur', CLIENT: 'Client',
  };

  const isAdmin    = user?.role === 'ADMIN';
  const isFondateur = user?.role === 'FONDATEUR';

  return (
    <aside
      className="flex h-screen w-[260px] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ willChange: 'transform' }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow">
          <Truck className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display text-base font-bold leading-tight">DeliverMap</p>
          <p className="text-[10px] text-sidebar-foreground/40">Enterprise Logistics</p>
        </div>
      </div>

      {/* Scrollable nav — position preserved via ref */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
      >
        {/* ── ADMIN ─────────────────────────────────────── */}
        {isAdmin && (
          <>
            <NavSection title="Tableau de bord">
              <NavLink to="/"           icon={LayoutDashboard} label={t('dashboard')} />
              <NavLink to="/live"       icon={Radio}           label="Live temps réel" />
              <NavLink to="/map"        icon={MapIcon}         label={t('map_tracking')} />
              <NavLink to="/calendrier" icon={CalendarDays}    label="Calendrier" />
            </NavSection>

            <NavSection title="Opérations">
              <NavLink to="/commandes"  icon={Package}         label={t('commandes')} />
              <NavLink to="/boutiques"  icon={Store}           label={t('boutiques')} />
              <NavLink to="/incidents"  icon={AlertTriangle}   label={t('incidents')} />
              <NavLink to="/zones"      icon={MapPinned}       label="Zones livraison" />
              <NavLink to="/promotions" icon={Tag}             label="Promotions" />
            </NavSection>

            <NavSection title="Gestion">
              <NavLink to="/clients"       icon={Users}         label={t('clients')} />
              <NavLink to="/transporteurs" icon={Truck}         label={t('transporteurs')} />
              <NavLink to="/scoring"       icon={Award}         label="Scoring" />
              <NavLink to="/tickets"       icon={MessageSquare} label="Tickets" />
              <NavLink to="/contrats"      icon={FileText}      label="Contrats" />
            </NavSection>

            <NavSection title="Intelligence">
              <NavLink to="/rapports"   icon={BarChart2}   label={t('reports')} />
              <NavLink to="/heatmap"    icon={Activity}    label={t('heatmap')} />
              <NavLink to="/previsions" icon={TrendingUp}  label="Prévisions" />
            </NavSection>

            <NavSection title="Outils Admin">
              <NavLink to="/impersonation" icon={UserCog}   label="Impersonation" />
              <NavLink to="/bannieres"     icon={Megaphone} label="Bannières" />
              <NavLink to="/blacklist"     icon={Ban}       label="Blacklist" />
              <NavLink to="/settings"      icon={Settings}  label={t('settings')} />
            </NavSection>
          </>
        )}

        {/* ── FONDATEUR ─────────────────────────────────── */}
        {isFondateur && (
          <>
            <NavSection title="Ma Boutique">
              <NavLink to="/boutique"           icon={LayoutDashboard} label="Tableau de bord" />
              <NavLink to="/boutique/commandes" icon={Package}         label="Commandes" />
              <NavLink to="/boutique/produits"  icon={Store}           label="Produits & Stock" />
              <NavLink to="/boutique/galerie"   icon={Image}           label="Galerie" />
            </NavSection>
            <NavSection title="Clients">
              <NavLink to="/boutique/avis" icon={Star}          label="Avis clients" />
              <NavLink to="/tickets"       icon={MessageSquare} label="Tickets support" />
            </NavSection>
            <NavSection title="Analytics">
              <NavLink to="/boutique/analytics" icon={BarChart2} label="Analytiques" />
            </NavSection>
            <NavSection title="Paramètres">
              <NavLink to="/settings" icon={Settings} label={t('settings')} />
            </NavSection>
          </>
        )}

        {/* ── Autres rôles ──────────────────────────────── */}
        {!isAdmin && !isFondateur && (
          <NavSection title="">
            <NavLink to="/"        icon={LayoutDashboard} label={t('dashboard')} />
            <NavLink to="/tickets" icon={MessageSquare}   label="Tickets" />
            <NavLink to="/settings" icon={Settings}       label={t('settings')} />
          </NavSection>
        )}
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/45">
              {roleLabel[user?.role]}
            </p>
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={logout}
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
