import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Gestion centralisée du thème (clair / sombre) + thème spécifique admin.
 *
 * - mode : 'light' | 'dark'
 * - role : 'default' | 'admin'   (admin = console verte)
 *
 * Le thème est appliqué via deux data-attributes sur <html> :
 *   data-theme    = 'light' | 'dark'
 *   data-role     = 'default' | 'admin'
 *
 * Les variables CSS dans index.css réagissent à ces attributs pour adapter
 * couleurs, gradients, fonds, etc.
 */
const ThemeContext = createContext(null);

const STORAGE_KEY = 'delivermap-theme-v1';

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.mode === 'light' || parsed.mode === 'dark') return parsed;
    }
  } catch { /* ignore */ }
  return null;
};

export const ThemeProvider = ({ children }) => {
  const initial = readStored() || { mode: 'dark', role: 'default' };
  const [mode, setMode] = useState(initial.mode);
  const [role, setRole] = useState(initial.role);

  // Applique les attributs sur <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-role', role);
    root.classList.toggle('dark', mode === 'dark');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, role })); } catch { /* ignore */ }
  }, [mode, role]);

  const toggleMode = useCallback(() => {
    setMode(m => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const setLight = useCallback(() => setMode('light'), []);
  const setDark  = useCallback(() => setMode('dark'),  []);

  const setAdminRole   = useCallback(() => setRole('admin'), []);
  const setDefaultRole = useCallback(() => setRole('default'), []);

  return (
    <ThemeContext.Provider value={{
      mode, role,
      toggleMode, setLight, setDark,
      setAdminRole, setDefaultRole,
      isDark: mode === 'dark',
      isAdmin: role === 'admin',
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>');
  return ctx;
};

// Petit composant utilitaire : bouton bascule
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ size = 18, style }) => {
  const { mode, toggleMode } = useTheme();
  return (
    <button
      onClick={toggleMode}
      title={mode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label="Basculer le thème"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        width: 38, height: 38,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        transition: 'all 0.2s',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'rotate(15deg)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'rotate(0)'; }}>
      {mode === 'dark' ? <Sun size={size} color="#fbbf24" /> : <Moon size={size} color="#82a8ff" />}
    </button>
  );
};

export default ThemeContext;
