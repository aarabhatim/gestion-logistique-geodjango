import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Globe, X, CheckCheck, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useNotifications } from '../contexts/NotificationContext';

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ar', flag: '🇲🇦', label: 'العربية' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

const TYPE_COLORS = {
  success: 'var(--success-color, #10b981)',
  warning: 'var(--warning-color, #f59e0b)',
  danger: 'var(--danger-color, #ef4444)',
  INFO: '#4f8cff', SUCCESS: '#10b981', WARNING: '#f59e0b',
  DANGER: '#ef4444', COMMANDE: '#a78bfa', LIVRAISON: '#10b981', PAIEMENT: '#22d3ee',
};

const getColor = (n) =>
  TYPE_COLORS[n.type_notif] || TYPE_COLORS[n.type] || 'var(--accent-primary)';

const groupByDate = (notifications) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

  const groups = { today: [], week: [], older: [] };
  notifications.forEach(n => {
    const d = new Date(n.date_creation);
    if (d >= startOfToday) groups.today.push(n);
    else if (d >= startOfWeek) groups.week.push(n);
    else groups.older.push(n);
  });
  return groups;
};

const NotifItem = ({ n, onMarkRead, onDelete, deleteLabel }) => {
  const color = getColor(n);
  return (
    <div
      onClick={() => !n.lue && onMarkRead(n.id)}
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: n.lue ? 'default' : 'pointer',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: n.lue ? 'transparent' : 'rgba(79,140,255,0.04)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!n.lue) e.currentTarget.style.background = 'rgba(79,140,255,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = n.lue ? 'transparent' : 'rgba(79,140,255,0.04)'; }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: n.lue ? 'var(--text-secondary)' : color, marginTop: 5,
        opacity: n.lue ? 0.4 : 1,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: n.lue ? 500 : 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
          {n.titre}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {n.message}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 5 }}>
          {new Date(n.date_creation).toLocaleString()}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(n.id); }}
        title={deleteLabel}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', padding: 4, borderRadius: 6,
          display: 'flex', alignItems: 'center', flexShrink: 0,
          opacity: 0.6, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

const GroupLabel = ({ label, count }) => (
  <div style={{
    padding: '6px 14px 4px', fontSize: 10, fontWeight: 700,
    color: 'var(--text-secondary)', letterSpacing: '0.08em',
    textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)',
  }}>
    <span>{label}</span>
    <span style={{ background: 'var(--glass-border)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
  </div>
);

const Header = () => {
  const { t, langue, setLangue } = useI18n();

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    connected,
    fetchNotifications,
    fetchNextPage,
    marquerLue,
    supprimer,
    toutLire,
    supprimerLues,
  } = useNotifications();

  const [showAll, setShowAll] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const dropdownRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    if (showDropdown) {
      fetchNotifications(true, showAll);
    }
  }, [showDropdown, showAll, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setShowDropdown(false);
      if (langRef.current && !langRef.current.contains(event.target))
        setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groups = groupByDate(notifications);
  const currentLang = LANGS.find(l => l.code === langue) || LANGS[0];

  const TABS = [
    { label: t('notif_unread'), val: false },
    { label: t('notif_all_tab'), val: true },
  ];

  return (
    <header className="top-header glass-card">
      <div className="header-search">
        <input type="text" className="glass-input" placeholder={t('search_placeholder')} />
      </div>
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ThemeToggle />

        {/* Sélecteur de langue */}
        <div ref={langRef} style={{ position: 'relative' }}>
          <button className="btn btn-icon" onClick={() => setShowLangMenu(s => !s)}
            style={{ background: 'transparent', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', minWidth: 'auto' }}>
            <Globe size={16} />
            <span style={{ fontSize: 14 }}>{currentLang.flag}</span>
          </button>
          {showLangMenu && (
            <div className="glass-card animate-fade-in" style={{
              position: 'absolute', top: '120%', right: 0, width: 180, padding: 6,
              zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLangue(l.code); setShowLangMenu(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, border: 'none',
                    background: l.code === langue ? 'var(--accent-primary)20' : 'transparent',
                    color: l.code === langue ? 'var(--accent-primary)' : 'inherit',
                    cursor: 'pointer', fontSize: 13, fontWeight: l.code === langue ? 700 : 500,
                    textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 18 }}>{l.flag}</span> {l.label}
                  {l.code === langue && <Check size={14} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cloche Notifications */}
        <div className="notifications-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="btn btn-icon" onClick={() => setShowDropdown(!showDropdown)}
            style={{ position: 'relative', background: 'transparent', border: '1px solid var(--glass-border)' }}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="badge-pulse" style={{
                position: 'absolute', top: '-5px', right: '-5px',
                background: 'var(--danger-color)', color: 'white',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 'bold',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#10b981' : '#6b7280',
              border: '2px solid var(--bg-elevated, #0f1225)',
            }} />
          </button>

          {showDropdown && (
            <div className="notifications-dropdown glass-card" style={{
              position: 'absolute', top: '120%', right: 0, width: 360, padding: 0,
              zIndex: 1000, boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
              border: '1px solid var(--glass-border)',
              animation: 'slideInDown 0.25s cubic-bezier(0.4,0,0.2,1)',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}>
              <style>{`
                @keyframes slideInDown {
                  from { opacity:0; transform: translateY(-10px) scale(0.97); }
                  to   { opacity:1; transform: translateY(0)     scale(1); }
                }
              `}</style>

              {/* Header du panel */}
              <div style={{
                padding: '12px 14px', borderBottom: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexShrink: 0,
              }}>
                <h4 style={{ margin: 0, fontSize: 14 }}>
                  {t('notifications')}
                  {unreadCount > 0 && (
                    <span style={{
                      marginLeft: 8, background: 'var(--danger-color)', color: 'white',
                      borderRadius: 10, fontSize: 10, padding: '2px 7px', fontWeight: 700,
                    }}>{unreadCount}</span>
                  )}
                </h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  {unreadCount > 0 && (
                    <button className="btn btn-sm" onClick={toutLire} disabled={loading}
                      title={t('notif_mark_all_read')}
                      style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: 12, padding: '4px 8px', border: '1px solid var(--accent-primary)30' }}>
                      <CheckCheck size={13} style={{ marginRight: 3 }} /> {t('mark_all_read')}
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={supprimerLues} disabled={loading}
                    title={t('notif_delete_read')}
                    style={{ background: 'transparent', color: '#ef4444', fontSize: 12, padding: '4px 8px', border: '1px solid #ef444430' }}>
                    <Trash2 size={13} />
                  </button>
                  <button className="btn btn-sm" onClick={() => setShowDropdown(false)}
                    style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, padding: '4px 6px', border: 'none' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Toggle lu/non-lu */}
              <div style={{
                display: 'flex', gap: 0, borderBottom: '1px solid var(--glass-border)',
                flexShrink: 0,
              }}>
                {TABS.map(opt => (
                  <button key={String(opt.val)} onClick={() => setShowAll(opt.val)}
                    style={{
                      flex: 1, padding: '8px 0', border: 'none', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', borderBottom: showAll === opt.val
                        ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: showAll === opt.val ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      background: 'transparent', transition: 'all 0.2s',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Corps scrollable */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Bell size={28} style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px' }} />
                    {t('no_notifications')}
                  </div>
                ) : (
                  <>
                    {groups.today.length > 0 && (
                      <>
                        <GroupLabel label={t('notif_today')} count={groups.today.length} />
                        {groups.today.map(n => (
                          <NotifItem key={n.id} n={n} onMarkRead={marquerLue} onDelete={supprimer} deleteLabel={t('action_delete')} />
                        ))}
                      </>
                    )}
                    {groups.week.length > 0 && (
                      <>
                        <GroupLabel label={t('notif_this_week')} count={groups.week.length} />
                        {groups.week.map(n => (
                          <NotifItem key={n.id} n={n} onMarkRead={marquerLue} onDelete={supprimer} deleteLabel={t('action_delete')} />
                        ))}
                      </>
                    )}
                    {groups.older.length > 0 && (
                      <>
                        <GroupLabel label={t('notif_older')} count={groups.older.length} />
                        {groups.older.map(n => (
                          <NotifItem key={n.id} n={n} onMarkRead={marquerLue} onDelete={supprimer} deleteLabel={t('action_delete')} />
                        ))}
                      </>
                    )}

                    {showAll && hasMore && (
                      <div style={{
                        padding: '10px 14px', textAlign: 'center',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <button
                          onClick={fetchNextPage}
                          disabled={loading}
                          style={{
                            width: '100%', padding: '8px 0', borderRadius: 8,
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--accent-primary)', fontSize: 12,
                            fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        >
                          {loading
                            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> {t('notif_loading')}</>
                            : t('notif_load_more')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
