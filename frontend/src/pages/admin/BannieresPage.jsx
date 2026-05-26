import { useState, useEffect } from 'react';
import { bannieresApi } from '../../services/api';
import { useI18n } from '../../contexts/I18nContext';

const TYPE_STYLES = {
  info:    { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  color: '#93c5fd', icon: 'ℹ️' },
  warning: { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  color: '#fcd34d', icon: '⚠️' },
  danger:  { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   color: '#fca5a5', icon: '🚨' },
  success: { bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.4)',   color: '#86efac', icon: '✅' },
};

const ROLES = ['all', 'ADMIN', 'FONDATEUR', 'TRANSPORTEUR', 'CLIENT'];
const TYPES = ['info', 'warning', 'danger', 'success'];

const BannierePreview = ({ b, t }) => {
  const s = TYPE_STYLES[b.type] || TYPE_STYLES.info;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 10, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10, marginTop: 12
    }}>
      <span style={{ fontSize: 18 }}>{s.icon}</span>
      <div style={{ flex: 1, color: s.color, fontSize: 14 }}>{b.message || t('bn_preview_placeholder')}</div>
      {b.dismissible && (
        <button style={{
          background: 'none', border: 'none', color: s.color,
          cursor: 'pointer', fontSize: 16, lineHeight: 1
        }}>✕</button>
      )}
    </div>
  );
};

const EMPTY = {
  message: '', type: 'info', role_cible: 'all',
  date_debut: '', date_fin: '', dismissible: true, active: true,
};

export default function BannieresPage() {
  const { t } = useI18n();
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const load = () => {
    setLoading(true);
    bannieresApi.list()
      .then(r => setList(r.data?.results || r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowModal(true); setError(null); };
  const openEdit   = (b) => {
    setForm({
      message: b.message, type: b.type, role_cible: b.role_cible,
      date_debut: b.date_debut?.slice(0, 16) || '',
      date_fin: b.date_fin?.slice(0, 16) || '',
      dismissible: b.dismissible, active: b.active,
    });
    setEditId(b.id);
    setShowModal(true);
    setError(null);
  };

  const handleSave = () => {
    setSaving(true); setError(null);
    const payload = {
      ...form,
      date_debut: form.date_debut || null,
      date_fin:   form.date_fin   || null,
    };
    const call = editId
      ? bannieresApi.update(editId, payload)
      : bannieresApi.create(payload);
    call
      .then(() => { setShowModal(false); load(); })
      .catch(e => setError(e.response?.data?.message || JSON.stringify(e.response?.data) || t('toast_error')))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('bn_confirm_delete'))) return;
    bannieresApi.delete(id).then(load).catch(() => {});
  };

  const toggleActive = (b) => {
    bannieresApi.update(b.id, { active: !b.active }).then(load).catch(() => {});
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>📢</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            {t('bn_title')}
          </h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            {t('sb_bannieres')}
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg,#16a34a,#22c55e)',
            border: 'none', color: '#fff', borderRadius: 10,
            padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14
          }}
        >
          {t('bn_btn_new')}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>{t('common_loading')}</div>
      ) : list.length === 0 ? (
        <div style={{
          background: 'rgba(13,32,21,0.88)', border: '1px solid rgba(34,197,94,0.12)',
          borderRadius: 14, padding: 40, textAlign: 'center', color: '#64748b'
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📢</div>
          {t('bn_empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(b => {
            const s = TYPE_STYLES[b.type] || TYPE_STYLES.info;
            return (
              <div key={b.id} style={{
                background: 'rgba(13,32,21,0.88)',
                border: `1px solid ${b.active ? s.border : 'rgba(71,85,105,0.3)'}`,
                borderRadius: 14, padding: '16px 20px',
                opacity: b.active ? 1 : 0.6,
                transition: 'opacity 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: s.color, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                      {b.message}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: `${s.bg}`, border: `1px solid ${s.border}`,
                        color: s.color, borderRadius: 6, padding: '2px 8px', fontSize: 11
                      }}>{b.type}</span>
                      <span style={{
                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
                        color: '#22c55e', borderRadius: 6, padding: '2px 8px', fontSize: 11
                      }}>🎯 {b.role_cible}</span>
                      {b.dismissible && (
                        <span style={{
                          background: 'rgba(71,85,105,0.3)', color: '#94a3b8',
                          borderRadius: 6, padding: '2px 8px', fontSize: 11
                        }}>{t('bn_dismissible_text')}</span>
                      )}
                      {b.date_debut && (
                        <span style={{ color: '#64748b', fontSize: 11 }}>
                          {b.date_debut?.slice(0,10)} → {b.date_fin?.slice(0,10) || '∞'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => toggleActive(b)}
                      style={{
                        background: b.active ? 'rgba(34,197,94,0.15)' : 'rgba(71,85,105,0.2)',
                        border: `1px solid ${b.active ? 'rgba(34,197,94,0.4)' : 'rgba(71,85,105,0.3)'}`,
                        color: b.active ? '#86efac' : '#64748b',
                        borderRadius: 8, padding: '5px 12px',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600
                      }}
                    >
                      {b.active ? t('bn_status_active') : t('bn_status_inactive')}
                    </button>
                    <button
                      onClick={() => openEdit(b)}
                      style={{
                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
                        color: '#22c55e', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13
                      }}
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#f87171', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13
                      }}
                    >🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#070e09', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 18, padding: '28px 32px', width: '100%', maxWidth: 560
          }}>
            <h2 style={{ margin: '0 0 20px', color: '#f1f5f9', fontSize: 17 }}>
              {editId ? t('bn_modal_edit') : t('bn_new')}
            </h2>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13
              }}>{error}</div>
            )}

            <label style={{ display: 'block', marginBottom: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>{t('bn_field_message')}</div>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={3}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'rgba(7,18,11,0.8)', border: '1px solid rgba(34,197,94,0.22)',
                  borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box'
                }}
                placeholder={t('bn_msg_placeholder')}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <label>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>{t('adm_type')}</div>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'rgba(7,18,11,0.8)', border: '1px solid rgba(34,197,94,0.22)',
                    borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none'
                  }}
                >
                  {TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </label>
              <label>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>{t('bn_field_role')}</div>
                <select
                  value={form.role_cible}
                  onChange={e => setForm(f => ({ ...f, role_cible: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'rgba(7,18,11,0.8)', border: '1px solid rgba(34,197,94,0.22)',
                    borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none'
                  }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? t('adm_all') : r}</option>)}
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <label>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>{t('pr_field_date_start')}</div>
                <input
                  type="datetime-local"
                  value={form.date_debut}
                  onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'rgba(7,18,11,0.8)', border: '1px solid rgba(34,197,94,0.22)',
                    borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </label>
              <label>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>{t('pr_field_date_end')}</div>
                <input
                  type="datetime-local"
                  value={form.date_fin}
                  onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'rgba(7,18,11,0.8)', border: '1px solid rgba(34,197,94,0.22)',
                    borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={form.dismissible}
                  onChange={e => setForm(f => ({ ...f, dismissible: e.target.checked }))}
                />
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{t('bn_dismissible_text')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                />
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{t('bn_active_immediately')}</span>
              </label>
            </div>

            {/* Preview */}
            <BannierePreview b={form} t={t} />

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(71,85,105,0.3)', border: '1px solid rgba(71,85,105,0.4)',
                  color: '#94a3b8', borderRadius: 9, padding: '9px 20px',
                  cursor: 'pointer', fontSize: 14
                }}
              >{t('adm_cancel')}</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.message.trim()}
                style={{
                  background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                  border: 'none', color: '#fff', borderRadius: 9,
                  padding: '9px 22px', cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? t('bn_saving') : editId ? t('adm_edit') : t('adm_create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
