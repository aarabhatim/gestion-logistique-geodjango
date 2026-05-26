import React, { useState, useEffect } from 'react';
import { promotionsApi } from '../../services/api';
import { Tag, Plus, Trash2, Edit2, BarChart2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

const EMPTY = { nom: '', code: '', type_reduction: 'pourcentage', valeur: 10, date_debut: '', date_fin: '', usage_max: '', montant_min_commande: 0, actif: true, description: '' };

export default function PromotionsPage() {
  const { t } = useI18n();
  const [promos, setPromos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([promotionsApi.list(), promotionsApi.stats()]);
      setPromos(p.data?.results || p.data || []);
      setStats(s.data);
    } catch { setPromos([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    try {
      const payload = { ...form, usage_max: form.usage_max || null, date_fin: form.date_fin || null };
      if (editing) { await promotionsApi.update(editing.id, payload); showToast(t('pr_toast_updated')); }
      else { await promotionsApi.create(payload); showToast(t('pr_toast_created')); }
      setShowForm(false); setEditing(null); setForm(EMPTY); fetchAll();
    } catch (e) { showToast(e.response?.data?.detail || t('toast_error'), 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('pr_confirm_delete'))) return;
    try { await promotionsApi.delete(id); showToast(t('pr_toast_deleted')); fetchAll(); }
    catch { showToast(t('toast_error'), 'error'); }
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ nom: p.nom, code: p.code, type_reduction: p.type_reduction, valeur: p.valeur, date_debut: p.date_debut?.split('T')[0] || '', date_fin: p.date_fin?.split('T')[0] || '', usage_max: p.usage_max || '', montant_min_commande: p.montant_min_commande, actif: p.actif, description: p.description || '' });
    setShowForm(true);
  };

  return (
    <div className="dashboard-container">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={22} /> {t('pr_title')}
          </h2>
          <p className="page-subtitle">{t('pr_subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> {t('pr_btn_new')}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { labelKey: 'pr_stat_campaigns', value: stats.total,               color: '#3b82f6', icon: Tag },
            { labelKey: 'pr_stat_active',    value: stats.actives,             color: '#10b981', icon: CheckCircle },
            { labelKey: 'pr_stat_uses',      value: stats.total_utilisations,  color: '#f59e0b', icon: BarChart2 },
          ].map(({ labelKey, value, color, icon: Icon }) => (
            <div key={labelKey} className="glass-card" style={{ padding: '0.85rem 1rem', borderLeft: `3px solid ${color}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <Icon size={22} color={color} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 24, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t(labelKey)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="glass-card animate-fade-in">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('adm_code')}</th>
                <th>{t('adm_name')}</th>
                <th>{t('adm_type')}</th>
                <th>{t('pr_col_value')}</th>
                <th>{t('pr_col_uses')}</th>
                <th>{t('pr_col_expiry')}</th>
                <th>{t('adm_status')}</th>
                <th>{t('adm_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id}>
                  <td><code style={{ background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{p.code}</code></td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</td>
                  <td style={{ fontSize: 12 }}>{p.type_reduction}</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{p.type_reduction === 'pourcentage' ? `${p.valeur}%` : `${p.valeur} DH`}</td>
                  <td style={{ fontSize: 12 }}>{p.usage_count} {p.usage_max ? `/ ${p.usage_max}` : ''}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {p.date_fin ? new Date(p.date_fin).toLocaleDateString() : t('pr_no_limit')}
                  </td>
                  <td>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: p.est_valide ? '#10b98120' : '#ef444420', color: p.est_valide ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {p.est_valide ? t('pr_status_active') : t('pr_status_inactive')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}><Edit2 size={12} /></button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDelete(p.id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulaire modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 15 }}>
              {editing ? t('pr_modal_title_edit') : t('pr_btn_new')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['nom',         t('adm_name')],
                ['code',        t('pr_field_code_example')],
                ['description', t('adm_description')],
              ].map(([k, l]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{l}</label>
                  <input className="glass-input" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('adm_type')}</label>
                  <select className="glass-input" value={form.type_reduction} onChange={e => setForm(f => ({ ...f, type_reduction: e.target.value }))} style={{ width: '100%' }}>
                    <option value="pourcentage">{t('pr_type_percentage')}</option>
                    <option value="montant_fixe">{t('pr_type_fixed')}</option>
                    <option value="livraison_gratuite">{t('pr_type_free_delivery')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('pr_field_value')}</label>
                  <input type="number" className="glass-input" value={form.valeur} onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('pr_field_date_start')}</label>
                  <input type="date" className="glass-input" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('pr_field_date_end')}</label>
                  <input type="date" className="glass-input" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('pr_field_max_use')}</label>
                  <input type="number" className="glass-input" value={form.usage_max} onChange={e => setForm(f => ({ ...f, usage_max: e.target.value }))} placeholder={t('pr_unlimited_placeholder')} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('pr_field_min_order')}</label>
                  <input type="number" className="glass-input" value={form.montant_min_commande} onChange={e => setForm(f => ({ ...f, montant_min_commande: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>{t('adm_cancel')}</button>
                <button className="btn btn-primary" onClick={handleSave}>{t('adm_save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
