/**
 * AlertesCentrePage.jsx
 * Centre d'alertes admin : retards, incidents critiques, documents expirés, zones saturées.
 * Agrège les notifications + alertes-retard de l'API.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, RefreshCw, Check, CheckCheck, Trash2, Filter, X,
  Clock, AlertTriangle, Package, TruckIcon, FileWarning,
  MapPin, ChevronRight, Loader, BellOff,
} from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

/* ── Types d'alerte ──────────────────────────────────────────────────────── */
const TYPE_CONFIG = {
  RETARD:            { icon: '⏱️', label: 'Retard livraison',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  INCIDENT:          { icon: '🚨', label: 'Incident signalé',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  TICKET:            { icon: '🎫', label: 'Ticket support',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  COMMANDE:          { icon: '📦', label: 'Commande',             color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  DOCUMENT_EXPIRE:   { icon: '📄', label: 'Document expiré',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  ZONE_SATUREE:      { icon: '🗺️', label: 'Zone saturée',         color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  CONTRAT:           { icon: '📋', label: 'Contrat',              color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  SCORING:           { icon: '⭐', label: 'Scoring',              color: '#eab308', bg: 'rgba(234,179,8,0.12)'   },
  DEFAULT:           { icon: '🔔', label: 'Notification',         color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const getTypeConfig = (type = '') => {
  const key = Object.keys(TYPE_CONFIG).find(k => type.toUpperCase().includes(k));
  return TYPE_CONFIG[key] || TYPE_CONFIG.DEFAULT;
};

/* ── Filtre tabs ─────────────────────────────────────────────────────────── */
const FILTRES = [
  { id: 'all',    label: 'Toutes' },
  { id: 'unread', label: 'Non lues' },
  { id: 'RETARD', label: 'Retards' },
  { id: 'INCIDENT', label: 'Incidents' },
  { id: 'TICKET', label: 'Tickets' },
];

/* ── Carte notification ──────────────────────────────────────────────────── */
const NotifCard = ({ notif, onRead, onDelete, onClick }) => {
  const cfg  = getTypeConfig(notif.type || notif.titre || '');
  const date = notif.created_at ? new Date(notif.created_at) : null;
  const timeAgo = date ? formatTimeAgo(date) : '';

  return (
    <div
      onClick={() => { if (!notif.lue) onRead(notif.id); onClick(notif); }}
      style={{
        background: notif.lue ? 'var(--glass-bg, rgba(30,41,59,0.5))' : cfg.bg,
        border: `1px solid ${notif.lue ? 'rgba(255,255,255,0.06)' : cfg.color + '55'}`,
        borderLeft: `4px solid ${notif.lue ? 'transparent' : cfg.color}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        cursor: 'pointer', transition: 'all 0.2s ease',
        display: 'flex', gap: 14, alignItems: 'flex-start',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
    >
      {/* Icône */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: cfg.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20, border: `1px solid ${cfg.color}44`,
      }}>
        {cfg.icon}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontWeight: notif.lue ? 500 : 700, fontSize: 14, color: 'var(--text-primary, #f1f5f9)', flex: 1 }}>
            {notif.titre || cfg.label}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {timeAgo}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)', marginTop: 3, lineHeight: 1.4 }}>
          {notif.message || notif.corps || '–'}
        </div>
        {/* Badge type */}
        <span style={{
          display: 'inline-block', marginTop: 6, fontSize: 11,
          background: cfg.color + '22', color: cfg.color,
          padding: '2px 8px', borderRadius: 20, fontWeight: 600,
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {!notif.lue && (
          <button
            onClick={e => { e.stopPropagation(); onRead(notif.id); }}
            title="Marquer comme lue"
            style={{ background: 'none', border: 'none', color: cfg.color, cursor: 'pointer', padding: 4, borderRadius: 6 }}>
            <Check size={14} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
          title="Supprimer"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
          <Trash2 size={13} />
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: 4 }} />
      </div>

      {/* Point non-lu */}
      {!notif.lue && (
        <div style={{
          position: 'absolute', top: 14, right: 58,
          width: 8, height: 8, borderRadius: '50%',
          background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`,
        }} />
      )}
    </div>
  );
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatTimeAgo(date) {
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60)  return 'À l\'instant';
  if (s < 3600) return `Il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.round(s / 3600)} h`;
  return date.toLocaleDateString('fr-FR');
}

/* ══════════════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════════════ */
export default function AlertesCentrePage() {
  const navigate = useNavigate();
  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtre, setFiltre]       = useState('all');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);

  const fetchNotifs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await notificationsApi.list({ page_size: 100 });
      const data = res.data?.results || res.data || [];
      setNotifs(data);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const marquerLue = async (id) => {
    await notificationsApi.marquerLue(id).catch(() => {});
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, lue: true } : n));
  };

  const toutLire = async () => {
    await notificationsApi.toutLire().catch(() => {});
    setNotifs(ns => ns.map(n => ({ ...n, lue: true })));
  };

  const supprimer = async (id) => {
    await notificationsApi.supprimer(id).catch(() => {});
    setNotifs(ns => ns.filter(n => n.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const supprimerLues = async () => {
    await notificationsApi.supprimerLues().catch(() => {});
    setNotifs(ns => ns.filter(n => !n.lue));
  };

  /* Filtrage */
  const filtered = notifs.filter(n => {
    if (filtre === 'unread' && n.lue) return false;
    if (filtre !== 'all' && filtre !== 'unread') {
      const cfg = getTypeConfig(n.type || n.titre || '');
      if (!((n.type || n.titre || '').toUpperCase().includes(filtre))) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (n.titre || '').toLowerCase().includes(q) || (n.message || n.corps || '').toLowerCase().includes(q);
    }
    return true;
  });

  const nonLues = notifs.filter(n => !n.lue).length;

  /* KPIs par type */
  const kpis = [
    { label: 'Non lues', val: nonLues, icon: Bell, color: '#ef4444' },
    { label: 'Retards',  val: notifs.filter(n => (n.type || n.titre || '').toUpperCase().includes('RETARD')).length, icon: Clock, color: '#f59e0b' },
    { label: 'Incidents', val: notifs.filter(n => (n.type || n.titre || '').toUpperCase().includes('INCIDENT')).length, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Tickets',  val: notifs.filter(n => (n.type || n.titre || '').toUpperCase().includes('TICKET')).length, icon: FileWarning, color: '#3b82f6' },
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} /> Centre d'alertes
            {nonLues > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20, lineHeight: 1.4 }}>
                {nonLues}
              </span>
            )}
          </h2>
          <p className="page-subtitle">Retards, incidents critiques, tickets, documents expirés.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={toutLire} disabled={nonLues === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCheck size={15} /> Tout lire
          </button>
          <button className="btn btn-secondary" onClick={supprimerLues} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={15} /> Supprimer lues
          </button>
          <button className="btn btn-secondary" onClick={() => fetchNotifs(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="glass-card animate-fade-in" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: k.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={k.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{k.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtres + Recherche */}
      <div className="glass-card animate-fade-in" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTRES.map(f => (
            <button key={f.id} onClick={() => setFiltre(f.id)}
              className={filtre === f.id ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: 12, padding: '4px 12px' }}>
              {f.label}
              {f.id === 'unread' && nonLues > 0 && ` (${nonLues})`}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            className="glass-input"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '6px 12px', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: 'var(--text-secondary)' }}>
          <Loader size={24} className="spin" /> Chargement des alertes…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <BellOff size={56} style={{ opacity: 0.25, marginBottom: 16 }} />
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Aucune alerte</div>
          <div style={{ fontSize: 14 }}>Tout est sous contrôle ! Aucune alerte ne correspond aux filtres sélectionnés.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: 20, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {filtered.length} alerte(s) affichée(s)
            </div>
            {filtered.map(n => (
              <NotifCard
                key={n.id}
                notif={n}
                onRead={marquerLue}
                onDelete={supprimer}
                onClick={n => setSelected(selected?.id === n.id ? null : n)}
              />
            ))}
          </div>

          {/* Panneau détail */}
          {selected && (
            <div className="glass-card" style={{ padding: '20px 18px', position: 'sticky', top: 80, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Détail</span>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
              {(() => {
                const cfg = getTypeConfig(selected.type || selected.titre || '');
                return (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>{cfg.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.titre || cfg.label}</div>
                      <span style={{ fontSize: 11, background: cfg.color + '22', color: cfg.color, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                      {selected.message || selected.corps || 'Aucun détail.'}
                    </div>
                    {selected.created_at && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} /> {new Date(selected.created_at).toLocaleString('fr-FR')}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {!selected.lue && (
                        <button onClick={() => marquerLue(selected.id)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                          <Check size={14} /> Marquer comme lue
                        </button>
                      )}
                      {selected.commande_id && (
                        <button onClick={() => navigate(`/commandes?id=${selected.commande_id}`)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                          <Package size={14} /> Voir la commande
                        </button>
                      )}
                      {selected.incident_id && (
                        <button onClick={() => navigate('/incidents')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                          <AlertTriangle size={14} /> Voir l'incident
                        </button>
                      )}
                      {selected.ticket_id && (
                        <button onClick={() => navigate('/tickets')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                          Voir le ticket
                        </button>
                      )}
                      <button onClick={() => supprimer(selected.id)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', color: 'var(--danger)' }}>
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
