import React, { useState, useEffect, useRef } from 'react';
import Pagination from '../components/Pagination';
import {
  MessageSquare, Plus, Send, RefreshCw, Filter, X,
  Clock, User, Tag, ChevronLeft, AlertCircle, Download,
} from 'lucide-react';
import { ticketsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { exportCsv, CSV_COLUMNS } from '../utils/exportCsv';

const PRIORITE_CONFIG = {
  urgent: { key: 'ticket_urgent',  class: 'badge-danger',   color: '#ef4444' },
  moyen:  { key: 'ticket_medium',  class: 'badge-warning',  color: '#f59e0b' },
  faible: { key: 'ticket_low',  class: 'badge-secondary', color: '#64748b' },
};

const STATUT_CONFIG = {
  ouvert:      { key: 'status_OUVERT',      class: 'badge-primary'  },
  en_cours:    { key: 'status_EN_COURS',    class: 'badge-warning'  },
  en_attente:  { key: 'status_EN_ATTENTE',  class: 'badge-secondary'},
  resolu:      { key: 'status_RESOLU',      class: 'badge-success'  },
  ferme:       { key: 'status_FERME',       class: 'badge-secondary'},
};

const Tickets = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtrePriorite, setFiltrePriorite] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const threadEndRef = useRef(null);

  const fetchTickets = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const endpoint = isAdmin ? ticketsApi.list : ticketsApi.mesTickets;
      const params = isAdmin
        ? { statut: filtreStatut || undefined, priorite: filtrePriorite || undefined, page: p, page_size: ps }
        : { page: p, page_size: ps };
      const res = isAdmin ? await endpoint(params) : await endpoint(params);
      const data = res.data;
      const items = data.results || data;
      setTickets(Array.isArray(items) ? items : []);
      setTotal(data.count || (Array.isArray(items) ? items.length : 0));
    } catch { setTickets([]); setTotal(0); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); fetchTickets(1, pageSize); }, [filtreStatut, filtrePriorite]);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    try {
      const res = await ticketsApi.detail(ticket.id);
      setThread(res.data);
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { setThread(ticket); }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare size={24} /> {isAdmin ? 'File de tickets' : 'Mes tickets'}
          </h2>
          <p className="page-subtitle">
            {isAdmin ? t('tkt_subtitle_admin') : t('tkt_subtitle_user')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => exportCsv({ data: tickets, columns: CSV_COLUMNS.tickets, filename: 'tickets' })} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> CSV
            </button>
          )}
          <button onClick={fetchTickets} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Nouveau ticket
          </button>
        </div>
      </div>

      {/* Filtres admin */}
      {isAdmin && (
        <div className="glass-card animate-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={13} style={{ color: 'var(--text-secondary)' }} />
          <select className="glass-input" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
            style={{ width: 150, padding: '5px 10px', fontSize: 12 }}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="glass-input" value={filtrePriorite} onChange={e => setFiltrePriorite(e.target.value)}
            style={{ width: 140, padding: '5px 10px', fontSize: 12 }}>
            <option value="">{t('tkt_all_priorities')}</option>
            {Object.entries(PRIORITE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(filtreStatut || filtrePriorite) && (
            <button onClick={() => { setFiltreStatut(''); setFiltrePriorite(''); }}
              className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>
              <X size={11} /> Effacer
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
            {tickets.length} ticket{tickets.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: '1.25rem' }}>
        {/* Liste tickets */}
        <div className="glass-card animate-fade-in" style={{ overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={22} className="spin" style={{ opacity: 0.5 }} />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: 13 }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>Aucun ticket.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('tkt_subject_col')}</th>
                  {isAdmin && <th>Demandeur</th>}
                  <th>{t('tkt_priority_col')}</th>
                  <th>Statut</th>
                  <th>{t('tkt_date_col')}</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(tkt => {
                  const pCfg = PRIORITE_CONFIG[tkt.priorite] || {};
                  const sCfg = STATUT_CONFIG[tkt.statut] || {};
                  const slaOk = !tkt.sla_depasse;
                  const isActive = selected?.id === tkt.id;
                  return (
                    <tr key={tkt.id} onClick={() => openTicket(tkt)}
                      style={{ cursor: 'pointer', background: isActive ? 'rgba(99,102,241,0.1)' : '' }}>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>#{tkt.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{tkt.sujet}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tkt.categorie}</div>
                      </td>
                      {isAdmin && (
                        <td style={{ fontSize: 12 }}>
                          {tkt.demandeur_nom || tkt.demandeur || '-'}
                        </td>
                      )}
                      <td>
                        <span className={`badge ${pCfg.class || 'badge-secondary'}`} style={{ fontSize: 10 }}>
                          {t(pCfg.key) || tkt.priorite}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${sCfg.class || 'badge-secondary'}`} style={{ fontSize: 10 }}>
                          {t(sCfg.key) || tkt.statut}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {new Date(tkt.created_at).toLocaleDateString(undefined)}
                      </td>
                      <td>
                        <span style={{ fontSize: 10, color: slaOk ? '#10b981' : '#ef4444',
                          display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={9} /> {slaOk ? 'OK' : t('tkt_sla_exceeded')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Thread detail */}
        {selected && (
          <TicketThread
            ticket={thread || selected}
            isAdmin={isAdmin}
            user={user}
            threadEndRef={threadEndRef}
            onClose={() => { setSelected(null); setThread(null); }}
            onRefresh={() => openTicket(selected)}
            onStatusChange={(newStatut) => {
              setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, statut: newStatut } : t));
              setThread(prev => prev ? { ...prev, statut: newStatut } : prev);
            }}
          />
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => { setPage(p); fetchTickets(p, pageSize); }}
          onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); fetchTickets(1, ps); }}
        />
      )}

      {/* Modal creation */}
      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchTickets(); }}
        />
      )}
    </div>
  );
};

const TicketThread = ({ ticket, isAdmin, user, threadEndRef, onClose, onRefresh, onStatusChange }) => {
  const { t } = useI18n();
  const [reponse, setReponse] = useState('');
  const [sending, setSending] = useState(false);
  const messages = ticket.messages || [];
  const pCfg = PRIORITE_CONFIG[ticket.priorite] || {};
  const sCfg = STATUT_CONFIG[ticket.statut] || {};

  const handleSend = async () => {
    if (!reponse.trim()) return;
    setSending(true);
    try {
      await ticketsApi.repondre(ticket.id, { contenu: reponse });
      setReponse('');
      onRefresh();
    } catch { alert('Erreur lors de l\'envoi.'); }
    finally { setSending(false); }
  };

  const handleChangerStatut = async (statut) => {
    try {
      await ticketsApi.changerStatut(ticket.id, statut);
      onStatusChange(statut);
    } catch { alert('Erreur.'); }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 640 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>#{ticket.id} — {ticket.sujet}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span className={`badge ${pCfg.class || 'badge-secondary'}`} style={{ fontSize: 10 }}>{t(pCfg.key)}</span>
            <span className={`badge ${sCfg.class || 'badge-secondary'}`} style={{ fontSize: 10 }}>{t(sCfg.key)}</span>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Admin statut actions */}
      {isAdmin && ticket.statut !== 'ferme' && ticket.statut !== 'resolu' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {ticket.statut === 'ouvert' && (
            <button onClick={() => handleChangerStatut('en_cours')} className="btn btn-secondary"
              style={{ fontSize: 11, padding: '4px 10px' }}>
              Prendre en charge
            </button>
          )}
          <button onClick={() => handleChangerStatut('resolu')} className="btn btn-success"
            style={{ fontSize: 11, padding: '4px 10px' }}>
            Marquer résolu
          </button>
          <button onClick={() => handleChangerStatut('ferme')} className="btn btn-secondary"
            style={{ fontSize: 11, padding: '4px 10px' }}>
            Fermer
          </button>
        </div>
      )}

      {/* Description originale */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 8,
        marginBottom: '0.75rem', fontSize: 12, lineHeight: 1.6, borderLeft: '3px solid rgba(99,102,241,0.5)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Description originale</div>
        {ticket.description}
      </div>

      {/* Thread messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: '1rem' }}>
            <AlertCircle size={16} style={{ opacity: 0.4, marginBottom: 6 }} />
            <div>{t('tkt_no_replies')}</div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.auteur === user?.id || msg.auteur_nom === (user?.first_name + ' ' + user?.last_name);
            const isAdminMsg = msg.auteur_role === 'ADMIN' || msg.is_note_interne;
            return (
              <div key={i} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 3,
                  textAlign: isMe ? 'right' : 'left' }}>
                  {msg.auteur_nom || msg.auteur} · {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  {msg.is_note_interne && <span style={{ color: '#f59e0b' }}> · Note interne</span>}
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  background: isMe ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                  fontSize: 12, lineHeight: 1.5,
                  border: msg.is_note_interne ? '1px solid rgba(245,158,11,0.3)' : 'none',
                }}>
                  {msg.contenu}
                </div>
              </div>
            );
          })
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Reponse */}
      {ticket.statut !== 'ferme' && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea value={reponse} onChange={e => setReponse(e.target.value)}
              placeholder={t("tk_reply_placeholder")}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
              className="glass-input"
              style={{ flex: 1, minHeight: 56, maxHeight: 120, resize: 'vertical', fontSize: 12 }}
            />
            <button onClick={handleSend} disabled={sending || !reponse.trim()}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-end', padding: '8px 12px' }}>
              <Send size={14} />
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>{t('tkt_ctrl_enter')}</div>
        </div>
      )}
    </div>
  );
};

function CreateTicketModal({ onClose, onCreated }) {
  const { t } = useI18n();
  const [sujet, setSujet] = useState('');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState('livraison');
  const [priorite, setPriorite] = useState('moyen');
  const [submitting, setSubmitting] = useState(false);
  const [errCreate, setErrCreate] = useState('');

  const handleSubmit = async () => {
    if (!sujet.trim() || !description.trim()) {
      setErrCreate('Sujet et description obligatoires.');
      return;
    }
    setSubmitting(true);
    setErrCreate('');
    try {
      await ticketsApi.create({ titre: sujet, description, categorie, priorite });
      onCreated();
    } catch (err) {
      setErrCreate(err.response?.data?.detail || t('tkt_error_create'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="glass-card animate-fade-in"
        style={{ width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> Nouveau ticket de support
          </h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>
              Sujet <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input className="glass-input" value={sujet} onChange={e => setSujet(e.target.value)}
              placeholder={t("tk_summary_placeholder")}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('tkt_category_label')}</label>
              <select className="glass-input" value={categorie} onChange={e => setCategorie(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}>
                <option value="livraison">Livraison</option>
                <option value="paiement">Paiement</option>
                <option value="technique">Technique</option>
                <option value="compte">Compte</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('tkt_priority_label')}</label>
              <select className="glass-input" value={priorite} onChange={e => setPriorite(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}>
                <option value="urgent">Urgent (4h)</option>
                <option value="moyen">Moyen (24h)</option>
                <option value="faible">Faible (72h)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>
              Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea className="glass-input" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t("tk_detail_placeholder")}
              style={{ width: '100%', minHeight: 100, resize: 'vertical', fontSize: 13 }} />
          </div>

          {errCreate && (
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)',
              borderRadius: 8, fontSize: 12, color: '#fca5a5' }}>
              {errCreate}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {submitting ? 'Envoi...' : 'Ouvrir le ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tickets;
