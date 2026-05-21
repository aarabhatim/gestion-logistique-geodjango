import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';

/**
 * AdminSidebar améliorée
 * - Toggle compact (icônes seules) / étendu
 * - Favoris personnels épinglés (localStorage)
 * - Badges live : incidents ouverts, tickets non assignés
 * - Barre de recherche rapide intégrée
 *
 * Usage : remplacer votre sidebar admin actuelle par ce composant
 */

const NAV_ITEMS = [
  { key: 'dashboard',      label: 'Dashboard',       icon: '📊', path: '/admin',                  badge: null },
  { key: 'live',           label: 'Live',             icon: '🗺️', path: '/admin/live',             badge: null },
  { key: 'commandes',      label: 'Commandes',        icon: '📦', path: '/admin/commandes',        badge: null },
  { key: 'clients',        label: 'Clients',          icon: '👤', path: '/admin/clients',          badge: null },
  { key: 'transporteurs',  label: 'Transporteurs',    icon: '🚗', path: '/admin/transporteurs',    badge: null },
  { key: 'incidents',      label: 'Incidents',        icon: '⚠️', path: '/admin/incidents',        badge: 'incidents' },
  { key: 'tickets',        label: 'Tickets',          icon: '🎫', path: '/admin/tickets',          badge: 'tickets' },
  { key: 'contrats',       label: 'Contrats',         icon: '📋', path: '/admin/contrats',         badge: null },
  { key: 'zones',          label: 'Zones',            icon: '🗾', path: '/admin/zones',            badge: null },
  { key: 'promotions',     label: 'Promotions',       icon: '🏷️', path: '/admin/promotions',       badge: null },
  { key: 'bannieres',      label: 'Bannières',        icon: '🖼️', path: '/admin/bannieres',        badge: null },
  { key: 'blacklist',      label: 'Blacklist',        icon: '🚫', path: '/admin/blacklist',        badge: null },
  { key: 'heatmap',        label: 'Heatmap',          icon: '🌡️', path: '/admin/heatmap',          badge: null },
  { key: 'calendrier',     label: 'Calendrier',       icon: '📅', path: '/admin/calendrier',       badge: null },
  { key: 'previsions',     label: 'Prévisions',       icon: '📈', path: '/admin/previsions',       badge: null },
  { key: 'impersonation',  label: 'Impersonation',    icon: '🎭', path: '/admin/impersonation',    badge: null },
  { key: 'settings',       label: 'Paramètres',       icon: '⚙️', path: '/admin/settings',         badge: null },
];

const STORAGE_KEY = 'delivermap_sidebar_favorites';

const AdminSidebar = () => {
  const location = useLocation();
  const [compact, setCompact] = useState(() => JSON.parse(localStorage.getItem('delivermap_sidebar_compact') || 'false'));
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  const [badges, setBadges] = useState({ incidents: 0, tickets: 0 });
  const [search, setSearch] = useState('');

  // Persister l'état compact
  useEffect(() => {
    localStorage.setItem('delivermap_sidebar_compact', JSON.stringify(compact));
  }, [compact]);

  // Persister les favoris
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // Badges live (poll toutes les 30s)
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const [inc, tik] = await Promise.all([
          api.get('/incidents/stats/').then(r => r.data?.ouverts || 0).catch(() => 0),
          api.get('/tickets/statistiques/').then(r => r.data?.non_assignes || 0).catch(() => 0),
        ]);
        setBadges({ incidents: inc, tickets: tik });
      } catch {}
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleFavorite = (key) => {
    setFavorites(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key].slice(0, 3)
    );
  };

  const filteredItems = NAV_ITEMS.filter(item =>
    !search || item.label.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedItems = NAV_ITEMS.filter(item => favorites.includes(item.key));
  const regularItems = filteredItems.filter(item => !favorites.includes(item.key));

  const NavItem = ({ item, pinnable = true }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    const badgeCount = item.badge ? badges[item.badge] : 0;

    return (
      <div className="group relative flex items-center">
        <Link
          to={item.path}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium
            transition-all duration-150
            ${isActive
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'
            }
          `}
        >
          <span className="text-lg flex-shrink-0">{item.icon}</span>
          {!compact && <span className="flex-1 truncate">{item.label}</span>}
          {!compact && badgeCount > 0 && (
            <span className="ml-auto bg-[var(--color-danger)] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </Link>

        {/* Badge en mode compact */}
        {compact && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--color-danger)] text-white text-xs font-bold px-1 rounded-full min-w-4 text-center z-10">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}

        {/* Tooltip en mode compact */}
        {compact && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--color-secondary)] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {item.label}
          </div>
        )}

        {/* Bouton favori */}
        {!compact && pinnable && (
          <button
            onClick={(e) => { e.preventDefault(); toggleFavorite(item.key); }}
            className={`absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded
              ${favorites.includes(item.key) ? 'text-yellow-500 opacity-100' : 'text-[var(--color-text-muted)]'}
            `}
            title={favorites.includes(item.key) ? 'Retirer des favoris' : 'Épingler'}
          >
            {favorites.includes(item.key) ? '★' : '☆'}
          </button>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        flex flex-col h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)]
        transition-all duration-300 flex-shrink-0
        ${compact ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 p-4 border-b border-[var(--color-border)] ${compact ? 'justify-center' : 'justify-between'}`}>
        {!compact && (
          <span className="font-bold text-[var(--color-primary)] text-lg font-heading">DeliverMap</span>
        )}
        <button
          onClick={() => setCompact(prev => !prev)}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] transition-colors"
          title={compact ? 'Étendre' : 'Réduire'}
        >
          {compact ? '→' : '←'}
        </button>
      </div>

      {/* Search (mode étendu) */}
      {!compact && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-alt)]">
            <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer le menu..."
              className="flex-1 bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none"
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* Favoris épinglés */}
        {!search && pinnedItems.length > 0 && (
          <>
            {!compact && (
              <p className="px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Favoris
              </p>
            )}
            {pinnedItems.map(item => <NavItem key={item.key} item={item} />)}
            {!compact && <hr className="border-[var(--color-border)] my-2" />}
          </>
        )}

        {/* Tous les items */}
        {regularItems.map(item => <NavItem key={item.key} item={item} />)}
      </nav>

      {/* Kbd shortcut hint */}
      {!compact && (
        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-alt)] font-mono">⌘K</kbd>
            <span>Recherche globale</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;
