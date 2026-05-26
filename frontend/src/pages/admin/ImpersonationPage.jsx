import { useState, useRef } from 'react';
import { impersonationApi } from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { useI18n } from '../../contexts/I18nContext';

export default function ImpersonationPage() {
  const { t } = useI18n();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive]     = useState(null);  // impersonated user
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const debounceRef = useRef(null);
  const { user: adminUser } = useAuthStore();

  const ROLE_COLORS = {
    ADMIN: '#22c55e', FONDATEUR: '#f59e0b',
    TRANSPORTEUR: '#22c55e', CLIENT: '#38bdf8',
  };
  const ROLE_ICONS = {
    ADMIN: '🛡️', FONDATEUR: '🏪', TRANSPORTEUR: '🚗', CLIENT: '👤',
  };

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      impersonationApi.search(val)
        .then(r => setResults(r.data?.results || r.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
  };

  const handleImpersonate = (targetUser) => {
    setError(null);
    setSuccess(null);
    impersonationApi.impersonate(targetUser.id)
      .then(r => {
        setActive({ ...targetUser, tokens: r.data });
        setSuccess(`Session ouverte en tant que ${targetUser.first_name || targetUser.username}`);
        setResults([]);
        setQuery('');
      })
      .catch(e => {
        setError(e.response?.data?.error || 'Erreur impersonation');
      });
  };

  const handleStop = () => {
    setActive(null);
    setSuccess(null);
    setError(null);
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>🕵️</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            {t('imp_title')}
          </h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            {t('imp_select_user')}
          </div>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{
        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 24,
        display: 'flex', gap: 10, alignItems: 'flex-start'
      }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <div style={{ color: '#fcd34d', fontSize: 13 }}>
          <strong>{t('imp_warning_title')}</strong> {t('imp_warning_text')}
        </div>
      </div>

      {/* Active session */}
      {active && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.4)',
          borderRadius: 14, padding: '18px 22px', marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: ROLE_COLORS[active.role] || '#22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22
            }}>
              {ROLE_ICONS[active.role] || '👤'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#86efac', fontWeight: 700, fontSize: 16 }}>
                {active.first_name || ''} {active.last_name || ''} ({active.username})
              </div>
              <div style={{ color: '#4ade80', fontSize: 13 }}>
                {t('adm_role')} : {active.role} · ID : {active.id}
              </div>
              {active.tokens && (
                <div style={{
                  marginTop: 10, background: 'rgba(0,0,0,0.3)',
                  borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 11,
                  color: '#94a3b8', wordBreak: 'break-all'
                }}>
                  <div><strong style={{ color: '#64748b' }}>Access :</strong> {active.tokens.access?.slice(0, 60)}…</div>
                </div>
              )}
            </div>
            <button
              onClick={handleStop}
              style={{
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                color: '#fca5a5', borderRadius: 8, padding: '8px 16px',
                cursor: 'pointer', fontWeight: 600, fontSize: 13
              }}
            >
              {t('common_close')}
            </button>
          </div>
        </div>
      )}

      {success && !active && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14
        }}>✅ {success}</div>
      )}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14
        }}>❌ {error}</div>
      )}

      {/* Search */}
      <div style={{
        background: 'rgba(13,32,21,0.88)', border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 16, padding: '20px 24px'
      }}>
        <h3 style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: 15 }}>
          {t('imp_search_user')}
        </h3>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t('imp_search_placeholder')}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'rgba(7,18,11,0.8)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searching && (
            <div style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#22c55e', fontSize: 12
            }}>Recherche…</div>
          )}
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(10,24,15,0.7)', border: '1px solid rgba(34,197,94,0.12)',
                borderRadius: 10, padding: '12px 16px',
                transition: 'border-color 0.2s'
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: ROLE_COLORS[u.role] || '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0
                }}>
                  {ROLE_ICONS[u.role] || '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>
                    {u.first_name || ''} {u.last_name || ''} · @{u.username}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {u.email} · {u.role}
                    {u.is_active === false && (
                      <span style={{
                        marginLeft: 8, background: 'rgba(239,68,68,0.2)',
                        color: '#f87171', borderRadius: 4, padding: '1px 6px', fontSize: 11
                      }}>Banni</span>
                    )}
                  </div>
                </div>
                {u.id !== adminUser?.id && (
                  <button
                    onClick={() => handleImpersonate(u)}
                    disabled={!!active}
                    style={{
                      background: active ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.35)',
                      color: active ? '#64748b' : '#22c55e',
                      borderRadius: 8, padding: '7px 14px',
                      cursor: active ? 'not-allowed' : 'pointer',
                      fontWeight: 600, fontSize: 13
                    }}
                  >
                    Se connecter
                  </button>
                )}
                {u.id === adminUser?.id && (
                  <span style={{ color: '#64748b', fontSize: 12 }}>Vous</span>
                )}
              </div>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && results.length === 0 && !searching && (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
            Aucun utilisateur trouvé pour « {query} »
          </div>
        )}
      </div>
    </div>
  );
}
