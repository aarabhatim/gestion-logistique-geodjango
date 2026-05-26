import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, Globe, Search, Sun, Moon, Trash2, CheckCheck, X, Plus,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  primary: '#22C55E',
  primary2: '#16A34A',
  border: 'rgba(34,197,94,0.1)',
  surface: '#0F1A12',
  text: '#FFFFFF',
  text2: '#6B7280',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
};
const grad = `linear-gradient(135deg, ${T.primary2}, ${T.primary})`;

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ar', flag: '🇲🇦', label: 'Arabe' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

const NOTIF_TYPE_ICON = {
  WARNING:   { emoji: '⚠️', color: T.warning },
  DANGER:    { emoji: '🚨', color: T.danger },
  SUCCESS:   { emoji: '✅', color: T.success },
  LIVRAISON: { emoji: '📦', color: T.primary },
  INFO:      { emoji: 'ℹ️', color: '#60A5FA' },
};

export function AppHeader() {
  const { t, langue, setLangue } = useI18n();
  const { mode, toggleMode, isAdmin } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications, unreadCount, loading, hasMore,
    fetchNotifications, fetchNextPage, marquerLue, supprimer, toutLire, supprimerLues,
  } = useNotifications();

  const [openNotif, setOpenNotif] = useState(false);
  const [showAll, setShowAll]   = useState(false);
  const [openLang, setOpenLang] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const notifRef = useRef(null);
  const langRef  = useRef(null);

  useEffect(() => {
    if (openNotif) fetchNotifications(true, showAll);
  }, [openNotif, showAll, fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
      if (langRef.current  && !langRef.current.contains(e.target))  setOpenLang(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = LANGS.find(l => l.code === langue) || LANGS[0];
  const initials    = user ? ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'A' : 'A';

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      height: 64, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 24px',
      background: 'rgba(6,14,9,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
    }}>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <Search size={15} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: searchFocused ? T.primary : T.text2,
          transition: 'color 0.2s',
          pointerEvents: 'none',
        }} />
        <input
          placeholder={t('search_placeholder') || 'Rechercher...'}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%', height: 38,
            paddingLeft: 38, paddingRight: 14,
            borderRadius: 999,
            background: searchFocused ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${searchFocused ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.07)'}`,
            outline: 'none',
            fontSize: 13, color: T.text,
            transition: 'all 0.25s',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Add Expedition CTA ── */}
      {isAdmin && (
        <button
          onClick={() => navigate('/commandes', { state: { openCreate: true } })}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 10,
            border: 'none', background: grad,
            color: 'white', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(34,197,94,0.25)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(34,197,94,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 4px 16px rgba(34,197,94,0.25)'; }}
        >
          <Zap size={14} />
          Nouvelle expédition
        </button>
      )}

      {/* ── Theme toggle ── */}
      <button
        onClick={toggleMode}
        style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`,
          background: 'rgba(34,197,94,0.06)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.06)'; }}
      >
        {mode === 'dark'
          ? <Sun size={16} color="#FBBF24" />
          : <Moon size={16} color="#94A3B8" />}
      </button>

      {/* ── Language picker ── */}
      <div style={{ position: 'relative' }} ref={langRef}>
        <button
          onClick={() => setOpenLang(s => !s)}
          style={{
            height: 36, padding: '0 12px', borderRadius: 10,
            border: `1px solid ${openLang ? 'rgba(34,197,94,0.3)' : T.border}`,
            background: openLang ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.06)',
            color: T.text, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
        >
          <Globe size={14} color={T.text2} />
          <span>{currentLang.flag}</span>
        </button>
        <AnimatePresence>
          {openLang && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 8, zIndex: 50,
                background: '#0F1A12', border: `1px solid ${T.border}`,
                borderRadius: 12, padding: '6px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 140,
              }}
            >
              {LANGS.map(l => (
                <button key={l.code}
                  onClick={() => { setLangue(l.code); setOpenLang(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, border: 'none',
                    background: l.code === langue ? 'rgba(34,197,94,0.12)' : 'transparent',
                    color: l.code === langue ? T.primary : T.text,
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (l.code !== langue) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (l.code !== langue) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 16 }}>{l.flag}</span>
                  {l.label}
                  {l.code === langue && <Check size={13} style={{ marginLeft: 'auto', color: T.primary }} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Notifications bell ── */}
      <div style={{ position: 'relative' }} ref={notifRef}>
        <button
          onClick={() => setOpenNotif(s => !s)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${openNotif ? 'rgba(34,197,94,0.3)' : T.border}`,
            background: openNotif ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.06)',
            cursor: 'pointer', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          <Bell size={16} color={openNotif ? T.primary : T.text2} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', right: -4, top: -4,
              minWidth: 18, height: 18, borderRadius: 20,
              background: '#EF4444', border: '2px solid #060E09',
              fontSize: 9, fontWeight: 700, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {openNotif && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 8,
                zIndex: 50, width: 380,
                background: '#0A1A0E',
                border: `1px solid rgba(34,197,94,0.14)`,
                borderRadius: 18,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                maxHeight: 'calc(80vh - 64px)',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: `1px solid rgba(34,197,94,0.08)`,
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span style={{
                      padding: '2px 7px', borderRadius: 20,
                      background: 'rgba(239,68,68,0.15)', color: T.danger,
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {unreadCount > 0 && (
                    <button onClick={toutLire} title="Tout marquer lu" style={{ ...iconBtnStyle }}>
                      <CheckCheck size={14} color={T.primary} />
                    </button>
                  )}
                  <button onClick={supprimerLues} title="Supprimer les lues" style={{ ...iconBtnStyle }}>
                    <Trash2 size={14} color={T.danger} />
                  </button>
                  <button onClick={() => setOpenNotif(false)} style={{ ...iconBtnStyle }}>
                    <X size={14} color={T.text2} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex', borderBottom: `1px solid rgba(34,197,94,0.08)`,
                flexShrink: 0,
              }}>
                {[{ label: 'Non lues', val: false }, { label: 'Toutes', val: true }].map(({ label, val }) => {
                  const active = showAll === val;
                  return (
                    <button key={label} onClick={() => setShowAll(val)}
                      style={{
                        flex: 1, padding: '10px 0', border: 'none',
                        background: 'transparent', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        color: active ? T.primary : T.text2,
                        borderBottom: `2px solid ${active ? T.primary : 'transparent'}`,
                        transition: 'all 0.2s',
                      }}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <Bell size={28} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ fontSize: 13, color: T.text2 }}>{t('no_notifications') || 'Aucune notification'}</p>
                  </div>
                ) : (
                  <>
                    {notifications.map(n => {
                      const typeInfo = NOTIF_TYPE_ICON[n.type_notif] || NOTIF_TYPE_ICON[n.type] || NOTIF_TYPE_ICON.INFO;
                      return (
                        <div key={n.id}
                          style={{
                            display: 'flex', gap: 12, padding: '12px 16px',
                            borderBottom: `1px solid rgba(255,255,255,0.03)`,
                            background: n.lue ? 'transparent' : 'rgba(34,197,94,0.04)',
                            cursor: 'pointer', transition: 'background 0.2s',
                            position: 'relative',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = n.lue ? 'transparent' : 'rgba(34,197,94,0.04)'}
                          onClick={() => !n.lue && marquerLue(n.id)}
                        >
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: `${typeInfo.color}18`,
                            border: `1px solid ${typeInfo.color}25`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15,
                          }}>
                            {typeInfo.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: n.lue ? 500 : 700, color: n.lue ? T.text2 : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.titre}
                            </div>
                            <div style={{ fontSize: 11.5, color: T.text2, marginTop: 2, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                              {new Date(n.date_creation).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); supprimer(n.id); }}
                            style={{ ...iconBtnSmallStyle, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}
                            title="Supprimer"
                          >
                            <X size={11} color={T.text2} />
                          </button>
                        </div>
                      );
                    })}
                    {showAll && hasMore && (
                      <div style={{ padding: 12, borderTop: `1px solid rgba(34,197,94,0.08)` }}>
                        <button
                          onClick={fetchNextPage} disabled={loading}
                          style={{
                            width: '100%', padding: '9px', borderRadius: 10,
                            border: `1px solid rgba(34,197,94,0.15)`, background: 'rgba(34,197,94,0.06)',
                            color: T.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {loading ? 'Chargement…' : 'Charger plus'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Avatar ── */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: grad, boxShadow: '0 0 12px rgba(34,197,94,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: 'white',
        border: '1.5px solid rgba(34,197,94,0.35)',
        cursor: 'pointer', flexShrink: 0,
      }}>
        {initials}
      </div>
    </header>
  );
}

// ─── Shared button styles ─────────────────────────────────────────────────────
const iconBtnStyle = {
  width: 30, height: 30, borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.04)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.2s',
};
const iconBtnSmallStyle = {
  width: 22, height: 22, borderRadius: 6,
  border: 'none', background: 'transparent',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.2s', opacity: 0,
};
