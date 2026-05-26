import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

/**
 * Sélecteur de langue universel.
 * Affiche un bouton globe ; au clic, ouvre un menu déroulant des 4 langues
 * supportées (FR / EN / AR / ES). Sélectionner une langue met à jour le
 * contexte i18n -> toute l'application se traduit instantanément.
 *
 * Style "client" (orange) par défaut. Passer `variant="dark"` pour le thème
 * sombre des dashboards admin/transporteur.
 */
const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ar', flag: '🇲🇦', label: 'العربية' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

const LanguageSwitcher = ({ variant = 'client' }) => {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGS.find(l => l.code === lang) || LANGS[0];

  // Styles selon le thème
  const isClient = variant === 'client';
  const btnStyle = isClient
    ? {
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.15)',
        color: '#F8FAFC',
        padding: '8px 12px',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
      }
    : {
        background: 'transparent',
        border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
        color: 'inherit',
        padding: '6px 10px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        fontSize: 13,
      };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Langue / Language"
        style={btnStyle}
      >
        <Globe size={15} />
        <span>{current.flag}</span>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
          {current.code}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 180,
            background: '#1A1F36',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: 4,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}
        >
          {LANGS.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 11px',
                borderRadius: 8,
                border: 'none',
                background: l.code === lang ? 'rgba(255,107,53,0.18)' : 'transparent',
                color: l.code === lang ? '#FF8C60' : '#F8FAFC',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: l.code === lang ? 700 : 500,
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                if (l.code !== lang) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                if (l.code !== lang) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === lang && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
