import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * GlobalSearch — Recherche globale Cmd+K / Ctrl+K
 *
 * Intégration dans App.jsx ou AdminLayout.jsx :
 *   import GlobalSearch from '../components/GlobalSearch';
 *   <GlobalSearch />
 *
 * S'ouvre avec Cmd+K ou Ctrl+K, se ferme avec Escape.
 */

const CATEGORIES = [
  { key: 'commandes', label: 'Commandes', icon: '📦', endpoint: '/commandes/?search=' },
  { key: 'clients',   label: 'Clients',   icon: '👤', endpoint: '/auth/admin/users/?role=CLIENT&search=' },
  { key: 'transporteurs', label: 'Transporteurs', icon: '🚗', endpoint: '/auth/admin/users/?role=TRANSPORTEUR&search=' },
];

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('commandes');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Ouvrir avec Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({});
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Recherche avec debounce
  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults({}); return; }
    setLoading(true);
    try {
      const [commandes, clients, transporteurs] = await Promise.all([
        api.get('commandes/', { params: { search: q } }).then(r => r.data?.results || r.data || []).catch(() => []),
        api.get('auth/admin/users/', { params: { role: 'CLIENT', search: q } }).then(r => r.data?.results || r.data || []).catch(() => []),
        api.get('auth/admin/users/', { params: { role: 'TRANSPORTEUR', search: q } }).then(r => r.data?.results || r.data || []).catch(() => []),
      ]);
      setResults({ commandes, clients, transporteurs });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 320);
  };

  const activeResults = results[activeCategory] || [];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      style={{ zIndex: 'var(--z-modal, 300)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-[var(--color-surface)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <svg className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            placeholder="Rechercher une commande, client, transporteur..."
            className="flex-1 bg-transparent text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-base outline-none"
          />
          {loading && (
            <svg className="animate-spin w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-surface-alt)] text-xs text-[var(--color-text-muted)] font-mono">
            Esc
          </kbd>
        </div>

        {/* Category tabs */}
        <div className="flex border-b border-[var(--color-border)]">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === c.key
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] -mb-px'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <span>{c.icon}</span>{c.label}
              {results[c.key]?.length > 0 && (
                <span className="bg-[var(--color-primary-10)] text-[var(--color-primary)] text-xs px-1.5 rounded-full">
                  {results[c.key].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query || query.length < 2 ? (
            <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">
              Tapez au moins 2 caractères pour rechercher…
            </div>
          ) : activeResults.length === 0 && !loading ? (
            <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">
              Aucun résultat pour "{query}"
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {activeResults.slice(0, 8).map((item, i) => (
                <li
                  key={item.id || i}
                  className="px-4 py-3 hover:bg-[var(--color-surface-alt)] cursor-pointer flex items-center gap-3 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-xl">{CATEGORIES.find(c => c.key === activeCategory)?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                      {item.username || item.numero || item.id || JSON.stringify(item).slice(0, 60)}
                    </p>
                    {item.email && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{item.email}</p>
                    )}
                    {item.statut && (
                      <p className="text-xs text-[var(--color-text-secondary)]">Statut : {item.statut}</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex gap-4 text-xs text-[var(--color-text-muted)]">
          <span>↑↓ Naviguer</span>
          <span>↵ Sélectionner</span>
          <span>Esc Fermer</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
