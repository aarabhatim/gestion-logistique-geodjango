import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import {
  FileText, Download, CheckSquare, Power, XCircle, RefreshCw,
  Plus, Eye, AlertCircle, Calendar, User,
} from 'lucide-react';
import { contratsApi } from '../services/api';
import { useI18n } from '../contexts/I18nContext';

const TYPE_CONFIG = {
  transporteur: { label: 'Transporteur', color: '#3b82f6' },
  fondateur:    { label: 'Fondateur',    color: '#10b981' },
  partenaire:   { label: 'Partenaire',   color: '#22c55e' },
};

const STATUT_CONFIG = {
  brouillon:   { label: 'Brouillon',  class: 'badge-secondary' },
  envoye:      { label: 'Envoyé',    class: 'badge-primary'   },
  signe:       { label: 'Signé',     class: 'badge-warning'   },
  actif:       { label: 'Actif',     class: 'badge-success'   },
  expire:      { label: 'Expiré',    class: 'badge-danger'    },
  resilie:     { label: 'Résilié',   class: 'badge-danger'    },
};

const Contrats = () => {
  const { t } = useI18n();
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreType, setFiltreType] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchContrats = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const res = await contratsApi.list({
        statut: filtreStatut || undefined,
        type_contrat: filtreType || undefined,
        page: p,
        page_size: ps,
      });
      const data = res.data;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      setTotal(data.count ?? items.length);
      setContrats(items);
    } catch { setContrats([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); fetchContrats(1, pageSize); }, [filtreStatut, filtreType]);

  const handleGenererPdf = async (id) => {
    setActionLoading(id + '_pdf');
    try {
      await contratsApi.genererPdf(id);
      fetchContrats();
    } catch { alert('Erreur lors de la génération du PDF.'); }
    finally { setActionLoading(null); }
  };

  const handleTelecharger = async (id, ref) => {
    setDownloading(id);
    try {
      const res = await contratsApi.telechargerPdf(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat_${ref || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('Erreur lors du téléchargement.'); }
    finally { setDownloading(null); }
  };

  const handleAction = async (id, action, extra = {}) => {
    setActionLoading(id + '_' + action);
    try {
      if (action === 'signer') await contratsApi.signer(id, extra);
      else if (action === 'activer') await contratsApi.activer(id);
      else if (action === 'resilier') {
        const motif = prompt('Motif de résiliation :');
        if (motif === null) return;
        await contratsApi.resilier(id, { motif });
      }
      fetchContrats();
      if (selected?.id === id) {
        const res = await contratsApi.detail(id);
        setSelected(res.data);
      }
    } catch { alert('Erreur.'); }
    finally { setActionLoading(null); }
  };

  const isLoading = (id, action) => actionLoading === id + '_' + action;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={24} /> {t('ct_title')}
          </h2>
          <p className="page-subtitle">{t('contrats')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => contratsApi.verifierExpirations().then(fetchContrats)}
            className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={13} /> Vérifier expirations
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> {t('ct_new')}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="glass-card animate-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '1rem',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="glass-input" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
          style={{ width: 150, padding: '5px 10px', fontSize: 12 }}>
          <option value="">{t('adm_all_status')}</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="glass-input" value={filtreType} onChange={e => setFiltreType(e.target.value)}
          style={{ width: 150, padding: '5px 10px', fontSize: 12 }}>
          <option value="">{t('adm_all_types')}</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filtreStatut || filtreType) && (
          <button onClick={() => { setFiltreStatut(''); setFiltreType(''); }}
            className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>
            {t('adm_filters_clear')}
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
          {contrats.length} {t('contrats')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: '1.25rem' }}>
        {/* Tableau */}
        <div className="glass-card animate-fade-in" style={{ overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={22} className="spin" style={{ opacity: 0.5 }} />
            </div>
          ) : contrats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: 13 }}>
              <FileText size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>{t('common_no_results')}</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('co_col_reference')}</th>
                  <th>{t('ct_col_type')}</th>
                  <th>{t('ct_col_party')}</th>
                  <th>{t('ct_col_status')}</th>
                  <th>{t('adm_date')}</th>
                  <th>PDF</th>
                  <th>{t('ct_col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {contrats.map(c => {
                  const tCfg = TYPE_CONFIG[c.type_contrat] || {};
                  const sCfg = STATUT_CONFIG[c.statut] || {};
                  const isSelected = selected?.id === c.id;
                  const isExpiringSoon = c.statut === 'actif' && c.jours_avant_expiration <= 30 && c.jours_avant_expiration > 0;
                  return (
                    <tr key={c.id} onClick={() => setSelected(isSelected ? null : c)}
                      style={{ cursor: 'pointer', background: isSelected ? 'rgba(34,197,94,0.08)' : '' }}>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{c.titre || c.reference || `#${c.id}`}</span>
                        {c.commande_reference && (
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Cmd. {c.commande_reference}</div>
                        )}
                        {isExpiringSoon && (
                          <div style={{ fontSize: 10, color: '#f59e0b' }}>
                            <AlertCircle size={9} style={{ marginRight: 3 }} />
                            Expire dans {c.jours_avant_expiration}j
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: tCfg.color, fontWeight: 600 }}>
                          {tCfg.label || c.type_contrat}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {c.partie_nom || c.transporteur_nom || c.fondateur_nom || '-'}
                      </td>
                      <td>
                        <span className={`badge ${sCfg.class || 'badge-secondary'}`} style={{ fontSize: 10 }}>
                          {sCfg.label || c.statut}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {c.date_debut && (
                          <span>
                            {new Date(c.date_debut).toLocaleDateString('fr-FR')} →{' '}
                            {c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : 'Indéfini'}
                          </span>
                        )}
                      </td>
                      <td>
                        {c.pdf_genere ? (
                          <button onClick={(e) => { e.stopPropagation(); handleTelecharger(c.id, c.reference); }}
                            className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                            disabled={downloading === c.id}>
                            <Download size={11} /> {downloading === c.id ? '...' : 'PDF'}
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleGenererPdf(c.id); }}
                            className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                            disabled={isLoading(c.id, 'pdf')}>
                            <FileText size={11} /> Générer
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.statut === 'envoye' && (
                            <button onClick={(e) => { e.stopPropagation(); handleAction(c.id, 'signer'); }}
                              className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }}
                              disabled={isLoading(c.id, 'signer')}>
                              <CheckSquare size={11} /> Signer
                            </button>
                          )}
                          {c.statut === 'signe' && (
                            <button onClick={(e) => { e.stopPropagation(); handleAction(c.id, 'activer'); }}
                              className="btn btn-success" style={{ padding: '3px 8px', fontSize: 11 }}
                              disabled={isLoading(c.id, 'activer')}>
                              <Power size={11} /> Activer
                            </button>
                          )}
                          {(c.statut === 'actif' || c.statut === 'signe') && (
                            <button onClick={(e) => { e.stopPropagation(); handleAction(c.id, 'resilier'); }}
                              className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }}
                              disabled={isLoading(c.id, 'resilier')}>
                              <XCircle size={11} /> Résilier
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Panneau detail */}
        {selected && (
          <div className="glass-card animate-fade-in" style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} /> Détail contrat
              </h4>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Référence', value: selected.reference || `#${selected.id}` },
                { label: 'Type', value: TYPE_CONFIG[selected.type_contrat]?.label || selected.type_contrat },
                { label: 'Statut', value: STATUT_CONFIG[selected.statut]?.label || selected.statut },
                { label: 'Partie', value: selected.partie_nom || selected.transporteur_nom || selected.fondateur_nom || '-' },
                { label: 'Début', value: selected.date_debut ? new Date(selected.date_debut).toLocaleDateString('fr-FR') : '-' },
                { label: 'Fin', value: selected.date_fin ? new Date(selected.date_fin).toLocaleDateString('fr-FR') : 'Indéfini' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{row.label}</span>
                  <strong style={{ fontSize: 12 }}>{row.value}</strong>
                </div>
              ))}
              {selected.clauses && (
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 6 }}>Clauses</div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 6, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selected.clauses}
                  </div>
                </div>
              )}
              {selected.pdf_genere && (
                <button onClick={() => handleTelecharger(selected.id, selected.reference)}
                  className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  disabled={downloading === selected.id}>
                  <Download size={14} /> {downloading === selected.id ? 'Téléchargement...' : 'Télécharger le PDF'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal create */}
      {showCreate && (
        <CreateContratModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchContrats(); }}
        />
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => { setPage(p); fetchContrats(p, pageSize); }}
        onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); fetchContrats(1, ps); }}
      />
    </div>
  );
};

const CreateContratModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    type_contrat: 'transporteur', date_debut: '', date_fin: '', clauses: '',
    commission_rate: '', montant_mensuel: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.date_debut) { setError('La date de debut est obligatoire.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await contratsApi.creer(form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur.');
    } finally { setSubmitting(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-card animate-fade-in" style={{ width: 460, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Nouveau contrat</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Type de contrat</label>
            <select className="glass-input" value={form.type_contrat} onChange={e => set('type_contrat', e.target.value)} style={{ width: '100%', padding: '8px 12px' }}>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Date de début *</label>
              <input type="date" className="glass-input" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} style={{ width: '100%', padding: '8px 12px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Date de fin</label>
              <input type="date" className="glass-input" value={form.date_fin} onChange={e => set('date_fin', e.target.value)} style={{ width: '100%', padding: '8px 12px' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Clauses</label>
            <textarea className="glass-input" value={form.clauses} onChange={e => set('clauses', e.target.value)} placeholder="Clauses contractuelles..." style={{ width: '100%', minHeight: 80, resize: 'vertical', fontSize: 13 }} />
          </div>
          {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 12, color: '#fca5a5' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {submitting ? 'Création...' : 'Créer le contrat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contrats;
