import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Truck, Package, Map as MapIcon,
  Settings, BarChart2, AlertTriangle, LogOut, Store, Activity,
  Award, MessageSquare, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const NavLink = ({ to, icon: Icon, label }) => {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link to={to} className="relative block">
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-sidebar-accent/15"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <span
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          active
            ? 'text-sidebar-foreground'
            : 'text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground',
        )}
      >
        <Icon className={cn('h-[18px] w-[18px]', active && 'text-[hsl(var(--sidebar-accent))]')} />
        {label}
      </span>
    </Link>
  );
};

const NavSection = ({ title, children }) => (
  <div className="mb-4">
    {title && (
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
        {title}
      </p>
    )}
    <nav className="flex flex-col gap-0.5">{children}</nav>
  </div>
);

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'A'
    : 'A';
  const roleLabel = {
    ADMIN: 'Administrateur',
    FONDATEUR: 'Fondateur',
    TRANSPORTEUR: 'Transporteur',
    CLIENT: 'Client',
  };

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-glow">
          <Truck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-tight">DeliverMap</p>
          <p className="text-[10px] text-sidebar-foreground/50">Enterprise Logistics</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <NavSection title={t('nav_overview')}>
          <NavLink to="/" icon={LayoutDashboard} label={t('dashboard')} />
          <NavLink to="/map" icon={MapIcon} label={t('map_tracking')} />
        </NavSection>
        <NavSection title={t('nav_operations')}>
          <NavLink to="/commandes" icon={Package} label={t('commandes')} />
          <NavLink to="/boutiques" icon={Store} label={t('boutiques')} />
          <NavLink to="/incidents" icon={AlertTriangle} label={t('incidents')} />
        </NavSection>
        <NavSection title={t('nav_management')}>
          <NavLink to="/clients" icon={Users} label={t('clients')} />
          <NavLink to="/transporteurs" icon={Truck} label={t('transporteurs')} />
          <NavLink to="/scoring" icon={Award} label="Scoring" />
          <NavLink to="/tickets" icon={MessageSquare} label="Tickets" />
          <NavLink to="/contrats" icon={FileText} label="Contrats" />
        </NavSection>
        <NavSection title={t('nav_analysis')}>
          <NavLink to="/rapports" icon={BarChart2} label={t('reports')} />
          <NavLink to="/heatmap" icon={Activity} label={t('heatmap')} />
          <NavLink to="/settings" icon={Settings} label={t('settings')} />
        </NavSection>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.first_name} {user?.last_name}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">{roleLabel[user?.role]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
