import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Check, Truck, X, RefreshCw, Filter,
  ChevronLeft, ChevronRight, Eye, UserCheck, AlertTriangle,
  ArrowRight, MapPin, Clock, Star, Search, Download,
  LayoutList, Kanban,
} from 'lucide-react';
import { commandesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { KanbanCommandes } from '../components/KanbanCommandes';

// ─── Export CSV helper ────────────────────────────────────────────────────────
const exportCSV = (rows) => {
  const headers = ['ID', 'Référence', 'Client', 'Boutique', 'Statut', 'Montant (MAD)', 'Date'];
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(c => [
      c.id,
      c.reference || '',
      c.client_nom || c.client || '',
      c.fondateur_nom || c.boutique || '',
      c.statut || '',
      c.montant_total || c.total || '',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
    ].map(escape).join(',')),
  ].join('\n');
  const blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ─── Config statuts ───────────────────────────────────────────────────────────
const STATUT_CONFIG = {
  EN_ATTENTE:     { label: 'En attente',     cls: 'badge-warning', dot: '#f59e0b', next: 'Valider', icon: Check },
  VALIDEE:        { label: 'Validée',        cls: 'badge-info',    dot: '#3b82f6', next: 'Préparer', icon: Package },
  EN_PREPARATION: { label: 'En préparation', cls: 'badge-primary', dot: '#22c55e', next: 'En route', icon: Truck },
  EN_ROUTE:       { label: 'En route',       cls: 'badge-success', dot: '#06b6d4', next: 'Livrer', icon: Check },
  LIVREE:         { label: 'Livrée',         cls: 'badge-success', dot: '#10b981', next: null, icon: Check },
  ANNULEE:        { label: 'Annulée',        cls: 'badge-danger',  dot: '#ef4444', next: null, icon: X },
};

const NEXT_LABEL = {
  EN_ATTENTE: 'Valider →',
  VALIDEE: 'Préparer →',
  EN_PREPARATION: 'En route →',
  EN_ROUTE: 'Livrer ✓',
};

const StatutBadge = ({ statut }) => {
  const cfg = STATUT_CONFIG[statut] || { label: statut, cls: 'badge-secondary', dot: '#64748b' };
  return (
    <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
};

// ─── Modal Détail commande ────────────────────────────────────────────────────
const DetailModal = ({ commande, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 620, maxHeight: '85vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>#{commande.reference}</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {new Date(commande.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatutBadge statut={commande.statut} />
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Client', primary: `${commande.client_detail?.first_name || ''} ${commande.client_detail?.last_name || ''}`, secondary: commande.client_detail?.email },
          { label: 'Boutique', primary: commande.fondateur_detail?.nom_boutique, secondary: commande.fondateur_detail?.ville },
          { label: 'Livraison', primary: commande.adresse_livraison || '—', secondary: commande.instructions_livraison || '' },
          { label: 'Paiement', primary: `${commande.mode_paiement}`, secondary: commande.est_paye ? '✅ Payé' : '⏳ Non encaissé' },
        ].map(({ label, primary, secondary }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.875rem' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>{label.toUpperCase()}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{primary}</div>
            {secondary && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{secondary}</div>}
          </div>
        ))}
      </div>

      {/* Transporteur */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.875rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>TRANSPORTEUR</div>
        {commande.transporteur_detail ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>
              {commande.transporteur_detail.first_name} {commande.transporteur_detail.last_name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{commande.transporteur_detail.phone || ''}</span>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: '#f59e0b' }}>⏳ Non encore assigné</span>
        )}
      </div>

      {/* Montants */}
      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '0.875rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <span>Sous-total</span><span>{commande.sous_total} MAD</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <span>Frais livraison</span><span>{commande.frais_livraison} MAD</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: '1px solid rgba(16,185,129,0.2)', paddingTop: 8, color: '#10b981' }}>
          <span>Total</span><span>{commande.total_price} MAD</span>
        </div>
      </div>

      {/* Lignes */}
      {commande.lignes?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.05em' }}>PRODUITS</div>
          {commande.lignes.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
              <span>{l.produit_detail?.nom || `Produit #${l.produit}`} <span style={{ color: 'var(--text-secondary)' }}>×{l.quantite}</span></span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{l.sous_total} MAD</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── Modal Assigner transporteur ──────────────────────────────────────────────
const AssignerModal = ({ commande, onClose, onSuccess }) => {
  const [transporteurs, setTransporteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    commandesApi.adminTransporteursDispo(commande.id)
      .then(r => setTransporteurs(r.data || []))
      .catch(() => setTransporteurs([]))
      .finally(() => setLoading(false));
  }, [commande.id]);

  const handleAssign = async (t) => {
    setAssigning(t.id);
    try {
      await commandesApi.adminAssigner(commande.id, t.id);
      onSuccess(`Transporteur ${t.nom_complet} assigné avec succès !`);
      onClose();
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur lors de l\'assignation');
    } finally {
      setAssigning(null);
    }
  };

  const filtered = transporteurs.filter(t =>
    !search || t.nom_complet?.toLowerCase().includes(search.toLowerCase()) || t.plaque?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Assigner un transporteur</h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Commande #{commande.reference}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="glass-input" placeholder="Rechercher par nom ou plaque..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
            <div>Chargement des transporteurs...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <Truck size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div>Aucun transporteur disponible à proximité</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Élargissez la zone ou attendez qu'un chauffeur se connecte</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
            {filtered.map(t => (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '0.875rem',
                border: `1px solid ${t.is_on_delivery ? 'rgba(245,158,11,0.2)' : t.is_available ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.is_on_delivery ? 'rgba(245,158,11,0.15)' : t.is_available ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                    fontSize: 18,
                  }}>
                    {t.is_on_delivery ? '🚚' : t.is_available ? '🚗' : '💤'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.nom_complet}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{t.vehicule_type}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span>{t.plaque}</span>
                      {t.note_moyenne > 0 && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Star size={10} fill="#f59e0b" /> {t.note_moyenne?.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {t.nombre_livraisons || 0} livraisons · {Math.round(t.revenus_total || 0)} MAD
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: t.is_on_delivery ? 'rgba(245,158,11,0.15)' : t.is_available ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                    color: t.is_on_delivery ? '#f59e0b' : t.is_available ? '#10b981' : '#64748b',
                  }}>
                    {t.is_on_delivery ? 'En livraison' : t.is_available ? 'Disponible' : 'Indisponible'}
                  </span>
                  <button className="btn btn-sm btn-primary"
                    onClick={() => handleAssign(t)} disabled={assigning === t.id}
                    style={{ fontSize: 12, padding: '4px 12px' }}>
                    {assigning === t.id ? '...' : 'Assigner'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onHide }) => {
  useEffect(() => { const t = setTimeout(onHide, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: type === 'error' ? '#ef4444' : '#10b981',
      color: 'white', padding: '12px 20px', borderRadius: 12,
      fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.3s ease', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
      {msg}
    </div>
  );
};

// ─── Shared button styles ─────────────────────────────────────────────────────
const BTN_ICON = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)',
  cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
  lineHeight: 1,
};
const BTN_PRIMARY = {
  background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.35)', color: '#22c55e',
};
const BTN_DANGER = {
  background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171',
};

// ─── Commandes principale ─────────────────────────────────────────────────────
const Commandes = () => {
  const { user } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState(new Set()); // boutons en cours
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('liste'); // 'liste' | 'kanban'

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  const fetchCommandes = useCallback(async (statut = filterStatut, q = search, p = page) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (statut) params.statut = statut;
      if (q) params.search = q;
      const res = await commandesApi.list(params);
      const results = res.data.results || res.data || [];
      setCommandes(results);
      setCount(res.data.count || results.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatut, search, page]);

  useEffect(() => { fetchCommandes(); }, []);

  // ── Optimistic update : change le statut localement immédiatement ────────────
  const NEXT_STATUT = {
    EN_ATTENTE: 'VALIDEE', VALIDEE: 'EN_PREPARATION',
    EN_PREPARATION: 'EN_ROUTE', EN_ROUTE: 'LIVREE',
  };

  const handleAvancer = useCallback(async (cmd) => {
    const nextStatut = NEXT_STATUT[cmd.statut];
    if (!nextStatut || pendingIds.has(cmd.id)) return;
    // Optimistic update — UI réagit immédiatement
    setPendingIds(s => new Set(s).add(cmd.id));
    setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, statut: nextStatut } : c));
    try {
      await commandesApi.avancer(cmd.id);
      showToast(`${NEXT_LABEL[cmd.statut] || 'Avancé'} avec succès !`);
    } catch (e) {
      // Rollback si erreur
      setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, statut: cmd.statut } : c));
      showToast(e.response?.data?.error || e.response?.data?.detail || 'Erreur', 'error');
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(cmd.id); return n; });
    }
  }, [pendingIds, showToast]);

  const handleAnnuler = useCallback(async (cmd) => {
    if (!window.confirm(`Annuler la commande ${cmd.reference} ?`)) return;
    if (pendingIds.has(cmd.id)) return;
    setPendingIds(s => new Set(s).add(cmd.id));
    setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, statut: 'ANNULEE' } : c));
    try {
      await commandesApi.adminAnnuler(cmd.id);
      showToast('Commande annulée');
    } catch (e) {
      setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, statut: cmd.statut } : c));
      showToast(e.response?.data?.error || 'Erreur annulation', 'error');
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(cmd.id); return n; });
    }
  }, [pendingIds, showToast]);

  const totalPages = Math.ceil(count / 20);
  const changePage = useCallback((np) => { setPage(np); fetchCommandes(filterStatut, search, np); }, [filterStatut, search, fetchCommandes]);
  const changeFilter = useCallback((statut) => { setFilterStatut(statut); setPage(1); fetchCommandes(statut, search, 1); }, [search, fetchCommandes]);
  const changeSearch = useCallback((q) => { setSearch(q); setPage(1); fetchCommandes(filterStatut, q, 1); }, [filterStatut, fetchCommandes]);

  // Quick stats per status
  const countByStatut = (s) => commandes.filter(c => c.statut === s).length;

  return (
    <div className="dashboard-container">
      {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}

      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Gestion des Commandes</h2>
          <p className="page-subtitle">{count} commandes · Page {page}/{Math.max(1, totalPages)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Toggle Liste / Kanban */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setViewMode('liste')}
              title="Vue liste"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: 'none', cursor: 'pointer',
                background: viewMode === 'liste' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                color: viewMode === 'liste' ? '#818cf8' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
              }}>
              <LayoutList size={14} /> Liste
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Vue Kanban"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: 'none', cursor: 'pointer',
                background: viewMode === 'kanban' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                color: viewMode === 'kanban' ? '#818cf8' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
              }}>
              <Kanban size={14} /> Kanban
            </button>
          </div>
          <button className="btn btn-secondary" onClick={() => exportCSV(commandes)}
            title="Exporter la page courante en CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> CSV
          </button>
          <button className="btn btn-secondary" onClick={() => fetchCommandes()}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* Quick stat chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => changeFilter(filterStatut === key ? '' : key)}
            className="badge" style={{
              cursor: 'pointer', border: `1px solid ${filterStatut === key ? cfg.dot : 'transparent'}`,
              background: filterStatut === key ? `${cfg.dot}20` : 'rgba(255,255,255,0.04)',
              color: filterStatut === key ? cfg.dot : 'var(--text-secondary)', fontSize: 12, padding: '5px 12px',
            }}>
            {cfg.label}
          </button>
        ))}
        {filterStatut && (
          <button className="btn btn-secondary btn-sm" onClick={() => changeFilter('')}>× Tout</button>
        )}
      </div>

      {/* Search */}
      <div className="glass-card animate-fade-in" style={{ padding: '0.875rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Filter size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <input type="text" placeholder="Référence, client, boutique..." className="glass-input"
          value={search} onChange={e => changeSearch(e.target.value)} style={{ flex: 1, maxWidth: 340 }} />
        {search && <button className="btn btn-secondary btn-sm" onClick={() => changeSearch('')}>× Effacer</button>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>{count} résultat{count !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Vue Kanban ── */}
      {viewMode === 'kanban' && (
        <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <KanbanCommandes
            commandes={commandes}
            loading={loading}
            onAvancer={handleAvancer}
            onDetail={setSelected}
          />
        </div>
      )}

      {/* ── Vue Liste (tableau) ── */}
      {viewMode === 'liste' && (
      <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s', overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Client</th>
              <th>Boutique</th>
              <th>Total</th>
              <th>Transporteur</th>
              <th>Statut</th>
              <th>Date</th>
              <th style={{ minWidth: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(8).fill(0).map((_, j) => (
                    <td key={j}><div style={{ height: 18, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: j === 7 ? '120px' : '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : commandes.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div>Aucune commande trouvée</div>
                </td>
              </tr>
            ) : commandes.map(cmd => (
              <tr key={cmd.id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
                    {cmd.reference}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {cmd.client_detail?.first_name} {cmd.client_detail?.last_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cmd.client_detail?.email}</div>
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{cmd.fondateur_detail?.nom_boutique}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cmd.fondateur_detail?.ville}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>{cmd.total_price} MAD</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cmd.mode_paiement}</div>
                </td>
                <td>
                  {cmd.transporteur_detail ? (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {cmd.transporteur_detail.first_name} {cmd.transporteur_detail.last_name}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>⏳ Non assigné</span>
                  )}
                </td>
                <td><StatutBadge statut={cmd.statut} /></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(cmd.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {/* Voir détail */}
                    <button
                      onClick={() => setSelected(cmd)}
                      title="Voir détail"
                      style={BTN_ICON}
                    >
                      <Eye size={13} />
                    </button>

                    {/* Avancer statut */}
                    {NEXT_LABEL[cmd.statut] && (
                      <button
                        onClick={() => handleAvancer(cmd)}
                        disabled={pendingIds.has(cmd.id)}
                        title={NEXT_LABEL[cmd.statut]}
                        style={{ ...BTN_ICON, ...BTN_PRIMARY, opacity: pendingIds.has(cmd.id) ? 0.6 : 1 }}
                      >
                        {pendingIds.has(cmd.id)
                          ? <RefreshCw size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                          : <ArrowRight size={13} />
                        }
                      </button>
                    )}

                    {/* Assigner transporteur */}
                    {['EN_ATTENTE', 'VALIDEE', 'EN_PREPARATION'].includes(cmd.statut) && (
                      <button className="btn btn-sm" style={{ background: '#8b5cf620', color: '#a78bfa', border: '1px solid #8b5cf630', fontSize: 11 }}
                        onClick={() => setAssigning(cmd)} title="Assigner transporteur">
                        <UserCheck size={12} /> {cmd.transporteur_detail ? 'Réassigner' : 'Assigner'}
                      </button>
                    )}

                    {/* Annuler */}
                    {!['LIVREE', 'ANNULEE'].includes(cmd.statut) && (
                      <button className="btn btn-sm btn-secondary" style={{ color: '#ef4444' }}
                        onClick={() => handleAnnuler(cmd)} title="Annuler">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => changePage(page - 1)}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Page {page} / {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
      )} {/* end viewMode === liste */}

      {/* Modals */}
      {selected && <DetailModal commande={selected} onClose={() => setSelected(null)} />}
      {assigning && (
        <AssignerModal
          commande={assigning}
          onClose={() => setAssigning(null)}
          onSuccess={(msg) => { showToast(msg); fetchCommandes(); }}
        />
      )}
    </div>
  );
};

export default Commandes;
