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

const NavLink = ({ to, icon: Icon, label, badge }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link to={to} className="relative block">
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.15)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
          style={{ background: 'linear-gradient(180deg,#22c55e,#16a34a)', boxShadow: '0 0 10px rgba(34,197,94,0.6)' }}
        />
      )}
      <span
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          active ? 'text-white' : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-white/5',
        )}
      >
        <Icon
          className="shrink-0"
          size={17}
          style={{ color: active ? '#22c55e' : undefined, filter: active ? 'drop-shadow(0 0 6px rgba(34,197,94,0.5))' : undefined }}
        />
        <span className="flex-1 truncate">{label}</span>
        {badge != null && (
          <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(90deg,#16a34a,#22c55e)' }}>
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
};

const NavSection = ({ title, children }) => (
  <div className="mb-4">
    {title && (
      <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em]"
        style={{ color: 'rgba(34,197,94,0.5)' }}>
        {title}
      </p>
    )}
    <nav className="flex flex-col gap-0.5">{children}</nav>
  </div>
);

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const scrollRef = useRef(null);
  const SCROLL_KEY = 'sidebar-scroll-y';

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
    ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') || 'A'
    : 'A';

  const roleLabel = { ADMIN: 'Administrateur', FONDATEUR: 'Fondateur', TRANSPORTEUR: 'Transporteur', CLIENT: 'Client' };
  const isAdmin = user?.role === 'ADMIN';
  const isFondateur = user?.role === 'FONDATEUR';

  return (
    <aside
      className="flex h-screen w-[260px] shrink-0 flex-col overflow-hidden border-r"
      style={{ background: 'linear-gradient(180deg,#081A10 0%,#07140D 100%)', borderColor: 'rgba(34,197,94,0.08)' }}
    >
      <div className="flex h-16 items-center gap-3 border-b px-5 shrink-0"
        style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 0 20px rgba(34,197,94,0.35)' }}>
          <Truck className="text-white" size={18} />
        </div>
        <div>
          <p className="font-display text-[15px] font-bold leading-tight text-white tracking-tight">DeliverMap</p>
          <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'rgba(34,197,94,0.55)' }}>
            Enterprise Logistics
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(34,197,94,0.15) transparent' }}
      >
        {isAdmin && (
          <>
            <NavSection title="Tableau de bord">
              <NavLink to="/"           icon={LayoutDashboard} label={t('dashboard')} />
              <NavLink to="/live"       icon={Radio}           label="Live temps reel" />
              <NavLink to="/map"        icon={MapIcon}         label={t('map_tracking')} />
              <NavLink to="/calendrier" icon={CalendarDays}    label="Calendrier" />
            </NavSection>
            <NavSection title="Operations">
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
              <NavLink to="/previsions" icon={TrendingUp}  label="Previsions" />
            </NavSection>
            <NavSection title="Outils Admin">
              <NavLink to="/impersonation" icon={UserCog}   label="Impersonation" />
              <NavLink to="/bannieres"     icon={Megaphone} label="Bannieres" />
              <NavLink to="/blacklist"     icon={Ban}       label="Blacklist" />
              <NavLink to="/settings"      icon={Settings}  label={t('settings')} />
            </NavSection>
          </>
        )}

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
            <NavSection title="Parametres">
              <NavLink to="/settings" icon={Settings} label={t('settings')} />
            </NavSection>
          </>
        )}

        {!isAdmin && !isFondateur && (
          <NavSection title="">
            <NavLink to="/"         icon={LayoutDashboard} label={t('dashboard')} />
            <NavLink to="/tickets"  icon={MessageSquare}   label="Tickets" />
            <NavLink to="/settings" icon={Settings}        label={t('settings')} />
          </NavSection>
        )}
      </div>

      <div className="shrink-0 border-t p-3" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
        <div className="flex items-center gap-3 rounded-xl px-2 py-2"
          style={{ background: 'rgba(34,197,94,0.06)' }}>
          <Avatar className="h-8 w-8 shrink-0" style={{ border: '1px solid rgba(34,197,94,0.3)' }}>
            <AvatarFallback className="text-xs font-bold"
              style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: 'white' }}>
              {initials.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-white">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="truncate text-[11px]" style={{ color: 'rgba(34,197,94,0.6)' }}>
              {roleLabel[user?.role]}
            </p>
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={logout}
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Se deconnecter"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
