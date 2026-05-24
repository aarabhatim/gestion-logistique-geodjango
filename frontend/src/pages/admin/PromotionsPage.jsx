import React, { useState, useEffect } from 'react';
import { promotionsApi } from '../../services/api';
import { Tag, Plus, Trash2, Edit2, BarChart2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const EMPTY = { nom: '', code: '', type_reduction: 'pourcentage', valeur: 10, date_debut: '', date_fin: '', usage_max: '', montant_min_commande: 0, actif: true, description: '' };

export default function PromotionsPage() {
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
      if (editing) { await promotionsApi.update(editing.id, payload); showToast('Promo mise à jour'); }
      else { await promotionsApi.create(payload); showToast('Promo créée'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); fetchAll();
    } catch (e) { showToast(e.response?.data?.detail || 'Erreur', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette promotion ?')) return;
    try { await promotionsApi.delete(id); showToast('Supprimée'); fetchAll(); } catch { showToast('Erreur', 'error'); }
  };

  const openEdit = (p) => { setEditing(p); setForm({ nom: p.nom, code: p.code, type_reduction: p.type_reduction, valeur: p.valeur, date_debut: p.date_debut?.split('T')[0] || '', date_fin: p.date_fin?.split('T')[0] || '', usage_max: p.usage_max || '', montant_min_commande: p.montant_min_commande, actif: p.actif, description: p.description || '' }); setShowForm(true); };

  return (
    <div className="dashboard-container">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', fontWeight: 600 }}>{toast.msg}</div>}

      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Tag size={22} /> Promotions plateforme</h2>
          <p className="page-subtitle">Codes promo multi-boutiques</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Nouvelle promotion
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { label: 'Total campagnes', value: stats.total, color: '#3b82f6', icon: Tag },
            { label: 'Actives', value: stats.actives, color: '#10b981', icon: CheckCircle },
            { label: 'Utilisations', value: stats.total_utilisations, color: '#f59e0b', icon: BarChart2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glass-card" style={{ padding: '0.85rem 1rem', borderLeft: `3px solid ${color}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <Icon size={22} color={color} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 24, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="glass-card animate-fade-in">
        {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th><th>Nom</th><th>Type</th><th>Valeur</th>
                <th>Utilisations</th><th>Expiration</th><th>Statut</th><th>Actions</th>
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
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR') : 'Sans limite'}</td>
                  <td>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: p.est_valide ? '#10b98120' : '#ef444420', color: p.est_valide ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {p.est_valide ? 'Active' : 'Inactive'}
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
            <h3 style={{ margin: '0 0 1rem', fontSize: 15 }}>{editing ? 'Modifier' : 'Nouvelle'} promotion</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['nom','Nom'], ['code','Code (ex: PROMO10)'], ['description','Description']].map(([k, l]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{l}</label>
                  <input className="glass-input" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Type</label>
                  <select className="glass-input" value={form.type_reduction} onChange={e => setForm(f => ({ ...f, type_reduction: e.target.value }))} style={{ width: '100%' }}>
                    <option value="pourcentage">Pourcentage</option>
                    <option value="montant_fixe">Montant fixe</option>
                    <option value="livraison_gratuite">Livraison gratuite</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Valeur</label>
                  <input type="number" className="glass-input" value={form.valeur} onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Date début</label>
                  <input type="date" className="glass-input" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Date fin</label>
                  <input type="date" className="glass-input" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Usage max</label>
                  <input type="number" className="glass-input" value={form.usage_max} onChange={e => setForm(f => ({ ...f, usage_max: e.target.value }))} placeholder="Illimité" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Commande min (DH)</label>
                  <input type="number" className="glass-input" value={form.montant_min_commande} onChange={e => setForm(f => ({ ...f, montant_min_commande: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
