import React, { useState, useEffect, useCallback } from 'react';
import Pagination from '../components/Pagination';
import {
  Truck, Star, MapPin, CheckCircle, XCircle, RefreshCw,
  Clock, AlertTriangle, Shield, UserCheck, UserX, Search,
  Filter, Eye, TrendingUp, DollarSign, Award, Calendar,
  BarChart2, Download,
} from 'lucide-react';
import { transporteursApi, scoringApi } from '../services/api';
import { useI18n } from '../contexts/I18nContext';

// ─── Export CSV helper ────────────────────────────────────────────────────────
const exportTransporteursCSV = (rows) => {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const headers = ['ID', 'Nom', 'Email', 'Téléphone', 'Véhicule', 'Plaque', 'Vérifié', 'Disponible', 'Livraisons', 'Note', 'Revenus'];
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(t => [
      t.id,
      t.nom_complet || `${t.user_first_name || ''} ${t.user_last_name || ''}`,
      t.user_email || t.email || '',
      t.phone || '',
      t.vehicule_type || '',
      t.plaque || '',
      t.is_verified ? 'Oui' : 'Non',
      t.is_available ? 'Oui' : 'Non',
      t.nombre_livraisons || 0,
      t.note_moyenne?.toFixed?.(2) || '',
      t.revenus_total || 0,
    ].map(escape).join(',')),
  ].join('\n');
  const blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transporteurs_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const VEHICULE_ICONS = {
  MOTO: '🛵',
  VOITURE: '🚗',
  CAMIONNETTE: '🚐',
  CAMION: '🚛',
};

const VEHICULE_COLORS = {
  MOTO: '#10b981',
  VOITURE: '#3b82f6',
  CAMIONNETTE: '#f59e0b',
  CAMION: '#22c55e',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
};

const StarRating = ({ note, size = 12 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={size} fill={i <= Math.round(note) ? '#f59e0b' : 'transparent'} color={i <= Math.round(note) ? '#f59e0b' : '#64748b'} />
    ))}
    <span style={{ fontSize: '11px', marginLeft: '4px', color: 'var(--text-secondary)' }}>{note?.toFixed(1) || '0.0'}</span>
  </div>
);

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
      {type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
      {msg}
    </div>
  );
};

// ─── Score Tab ─────────────────────────────────────────────────────────────────
const ScoreTab = ({ transporteurId }) => {
  const { t: tr } = useI18n();
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transporteurId) return;
    scoringApi.detail(transporteurId)
      .then(r => setScore(r.data))
      .catch(() => setScore(null))
      .finally(() => setLoading(false));
  }, [transporteurId]);

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Chargement du score…
    </div>
  );

  if (!score) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <BarChart2 size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
      {tr('tr_no_score_msg')}
    </div>
  );

  const dims = [
    { key: 'score_ponctualite', labelKey: 'tr_punctuality', color: '#3b82f6', fullMark: 100 },
    { key: 'score_fiabilite',   labelKey: 'tr_reliability', color: '#10b981', fullMark: 100 },
    { key: 'score_satisfaction', labelKey: 'tr_satisfaction', color: '#f59e0b', fullMark: 100 },
    { key: 'score_rapidite',    labelKey: 'tr_speed',    color: '#22c55e', fullMark: 100 },
  ];

  const radarData = dims.map(d => ({
    dimension: tr(d.labelKey) || d.key,
    score: Math.round((score[d.key] || 0) * 100) / 100,
    fullMark: 100,
  }));

  const globalScore = score.score_global || 0;
  const scoreColor = globalScore >= 75 ? '#10b981' : globalScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '1rem' }}>
      {/* Score global */}
      <div style={{
        textAlign: 'center', marginBottom: '1.25rem',
        background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem',
        border: `1px solid ${scoreColor}30`,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>
          SCORE GLOBAL
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
          {globalScore.toFixed(1)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>/100</div>
      </div>

      {/* Radar chart */}
      <div style={{ height: 220, marginBottom: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Score" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Détail par dimension */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {dims.map(d => {
          const val = (score[d.key] || 0);
          const pct = Math.min(100, Math.round(val));
          return (
            <div key={d.key} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{val.toFixed(1)}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dernière mise à jour */}
      {score.updated_at && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 12 }}>
          {tr('tr_last_updated')} : {new Date(score.updated_at).toLocaleDateString(undefined)}
        </div>
      )}
    </div>
  );
};

// ─── Transporteur Card ────────────────────────────────────────────────────────
const TransporteurCard = ({ t, onSelect }) => {
  const { t: tr } = useI18n();
  const vColor = VEHICULE_COLORS[t.vehicule_type] || '#64748b';
  const vIcon  = VEHICULE_ICONS[t.vehicule_type]  || '🚗';
  return (
    <div className="glass-card animate-fade-in"
      onClick={() => onSelect(t)}
      style={{ cursor: 'pointer', padding: '1rem', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 28 }}>{vIcon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {t.nom_complet || `${t.user_first_name || ''} ${t.user_last_name || ''}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.user_email || t.email}</div>
          </div>
        </div>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
          background: t.is_on_delivery ? '#f59e0b20' : t.is_available ? '#10b98120' : '#47556920',
          color:      t.is_on_delivery ? '#f59e0b'   : t.is_available ? '#10b981'   : '#94a3b8',
        }}>
          {t.is_on_delivery ? `🚚 ${tr('drv_in_progress')}` : t.is_available ? `✅ ${tr('drv_card_available')}` : `⭕ ${tr('tr_offline')}`}
        </span>
      </div>

      {/* Véhicule + vérification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
          background: `${vColor}20`, color: vColor }}>
          {t.vehicule_type}
        </span>
        {t.plaque && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            {t.plaque}
          </span>
        )}
        {t.is_verified
          ? <span style={{ fontSize: 10, color: '#10b981', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={11} /> {tr('drv_card_verified')}</span>
          : <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {tr('drv_card_pending')}</span>
        }
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
        {[
          { label: tr('drv_card_deliveries'), value: t.nombre_livraisons || 0,                              icon: Truck,      color: '#3b82f6' },
          { label: tr('drv_card_rating'),     value: t.note_moyenne?.toFixed(1) || '–',                     icon: Star,       color: '#f59e0b' },
          { label: tr('drv_card_reviews'),    value: t.nombre_avis || 0,                                    icon: Award,      color: '#22c55e' },
          { label: tr('drv_card_revenue'),    value: `${Math.round((t.revenus_total || 0) / 1000)}k`,       icon: DollarSign, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <Icon size={12} color={color} style={{ display: 'block', margin: '0 auto 2px' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DETAIL_TABS = [
  { key: 'info',  labelKey: 'tr_tab_info',   icon: Eye },
  { key: 'score', labelKey: 'tr_tab_score',  icon: BarChart2 },
];

// TransporteurDetail: contenu sans overlay (l'appelant fournit déjà le backdrop)
const TransporteurDetail = ({ t, onClose, onAction }) => {
  const { t: tr } = useI18n();
  const [activeTab, setActiveTab] = useState('info');

  return (
    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 580, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.25rem 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 36 }}>{VEHICULE_ICONS[t.vehicule_type] || '🚗'}</div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>{t.nom_complet || `${t.user_first_name || ''} ${t.user_last_name || ''}`}</h3>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{t.user_email || t.email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.phone || '—'}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><XCircle size={15} /></button>
        </div>

        {/* Statut badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0.75rem 1.25rem', flexShrink: 0 }}>
          <span style={{ background: t.is_verified ? '#10b98120' : '#f59e0b20', color: t.is_verified ? '#10b981' : '#f59e0b', fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
            {t.is_verified ? tr('tr_verified_badge') : tr('tr_pending_verif')}
          </span>
          <span style={{
            background: t.is_on_delivery ? '#f59e0b20' : t.is_available ? '#10b98120' : '#47556920',
            color: t.is_on_delivery ? '#f59e0b' : t.is_available ? '#10b981' : '#94a3b8',
            fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
          }}>
            {t.is_on_delivery ? '🚚 En livraison' : t.is_available ? '✅ Disponible' : '⭕ Hors ligne'}
          </span>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingLeft: '1.25rem', flexShrink: 0 }}>
          {DETAIL_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                  border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  background: 'transparent', color: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  marginBottom: '-1px',
                }}>
                <Icon size={14} /> {tr(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Contenu onglet */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'info' && (
            <div style={{ padding: '1rem 1.25rem' }}>
              {/* Véhicule */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>VÉHICULE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Type</div><div style={{ fontWeight: 600 }}>{t.vehicule_type}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Plaque</div><div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.plaque}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tr('tr_capacity')}</div><div style={{ fontWeight: 600 }}>{t.capacite_kg} kg</div></div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
                {[
                  { label: tr('drv_card_deliveries'), value: t.nombre_livraisons || 0, color: '#3b82f6', icon: Truck },
                  { label: tr('drv_card_rating'), value: t.note_moyenne?.toFixed(1) || '–', color: '#f59e0b', icon: Star },
                  { label: tr('drv_card_reviews'), value: t.nombre_avis || 0, color: '#22c55e', icon: Award },
                  { label: tr('drv_card_revenue'), value: `${Math.round((t.revenus_total || 0) / 1000)}k`, color: '#10b981', icon: DollarSign },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <Icon size={14} color={color} style={{ margin: '0 auto 4px', display: 'block' }} />
                    <div style={{ fontWeight: 700, fontSize: 16, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Heures de travail */}
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} /> HEURES DE TRAVAIL
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Aujourd'hui</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#22c55e' }}>
                      {formatDuration((t.minutes_travaillees_aujourd_hui || 0) + (t.is_available ? (t.minutes_session_courante || 0) : 0))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Cette semaine</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{formatDuration(t.minutes_travaillees_semaine || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ce mois</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{formatDuration(t.minutes_travaillees_mois || 0)}</div>
                  </div>
                </div>
                {t.is_available && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                    Session en cours depuis {formatDuration(t.minutes_session_courante || 0)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {!t.is_verified ? (
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => onAction(t, 'approuver')}>
                    <Shield size={15} /> {tr('tr_verify_btn')}
                  </button>
                ) : (
                  <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', color: '#ef4444', border: '1px solid #ef444430' }}
                    onClick={() => onAction(t, 'rejeter')}>
                    <UserX size={15} /> {tr('tr_unverify_btn')}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'score' && (
            <ScoreTab transporteurId={t.id} />
          )}
        </div>
      </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Transporteurs = () => {
  const { t } = useI18n();
  const [transporteurs, setTransporteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [filterDispo, setFilterDispo] = useState('');
  const [search, setSearch] = useState('');
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const fetchData = useCallback(async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: ps };
      if (filterType) params.vehicule_type = filterType;
      if (filterDispo !== '') params.is_available = filterDispo;
      if (filterVerified !== '') params.is_verified = filterVerified;
      if (search) params.search = search;
      const res = await transporteursApi.adminListe(params);
      const results = res.data.results || res.data || [];
      setTransporteurs(results);
      setCount(res.data.count || results.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDispo, filterVerified, search, page, pageSize]);

  useEffect(() => { setPage(1); }, [filterType, filterDispo, filterVerified, search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60s to update working hours
  useEffect(() => {
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleAction = async (t, action) => {
    try {
      await transporteursApi.adminValider(t.id, action);
      const msg = action === 'approuver'
        ? `${t.nom_complet || 'Chauffeur'} vérifié avec succès !`
        : `Vérification retirée pour ${t.nom_complet || 'ce chauffeur'}`;
      showToast(msg);
      setSelected(null);
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur lors de l\'action', 'error');
    }
  };

  // Stats
  const stats = {
    total: transporteurs.length,
    verified: transporteurs.filter(t => t.is_verified).length,
    pending: transporteurs.filter(t => !t.is_verified).length,
    available: transporteurs.filter(t => t.is_available && !t.is_on_delivery).length,
    delivering: transporteurs.filter(t => t.is_on_delivery).length,
    offline: transporteurs.filter(t => !t.is_available).length,
  };

  return (
    <div className="dashboard-container">
      {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}

      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">{t('tr_title')}</h2>
          <p className="page-subtitle">{count} {t('transporteurs')} · {stats.pending} {t('tr_pending')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportTransporteursCSV(transporteurs)}
            title="Exporter en CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> CSV
          </button>
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {t('common_retry')}
          </button>
        </div>
      </div>

      {/* Stats KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: t('adm_total'),       value: stats.total,      color: '#3b82f6', icon: Truck },
          { label: t('tr_verified'),     value: stats.verified,   color: '#10b981', icon: Shield },
          { label: t('tr_pending'),      value: stats.pending,    color: '#f59e0b', icon: AlertTriangle },
          { label: t('tr_available'),    value: stats.available,  color: '#22c55e', icon: CheckCircle },
          { label: t('drv_in_progress'), value: stats.delivering, color: '#06b6d4', icon: Truck },
          { label: t('tr_offline'),      value: stats.offline,    color: '#64748b', icon: XCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: '0.75rem 1rem', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              </div>
              <Icon size={20} color={color} style={{ opacity: 0.7 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Alerte pending */}
      {stats.pending > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12,
          padding: '12px 16px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
              {stats.pending} chauffeur{stats.pending > 1 ? 's' : ''} en attente de vérification
            </span>
          </div>
          <button className="btn btn-sm" style={{ background: '#f59e0b', color: 'white', fontSize: 12 }}
            onClick={() => setFilterVerified('false')}>
            Voir
          </button>

        </div>
      )}

      {/* Search & Filters */}
      <div className="glass-card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="glass-input"
          placeholder={t('tr_search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: '6px 10px', fontSize: 13 }}
        />
        <select className="glass-input" value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ width: 140, padding: '6px 10px', fontSize: 13 }}>
          <option value="">{t('tr_all_types')}</option>
          {['moto', 'voiture', 'van', 'camion'].map(vt => (
            <option key={vt} value={vt}>{vt.charAt(0).toUpperCase() + vt.slice(1)}</option>
          ))}
        </select>
        <select className="glass-input" value={filterVerified} onChange={e => setFilterVerified(e.target.value)}
          style={{ width: 140, padding: '6px 10px', fontSize: 13 }}>
          <option value="">{t('tr_verification')}</option>
          <option value="true">{t('tr_verified')}</option>
          <option value="false">{t('tr_pending')}</option>
        </select>
        <select className="glass-input" value={filterDispo} onChange={e => setFilterDispo(e.target.value)}
          style={{ width: 140, padding: '6px 10px', fontSize: 13 }}>
          <option value="">{t('tr_availability')}</option>
          <option value="true">{t('tr_available')}</option>
          <option value="false">{t('tr_offline')}</option>
        </select>
        {(search || filterType || filterVerified || filterDispo) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterType(''); setFilterVerified(''); setFilterDispo(''); }}>
            {t('adm_filters_clear')}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Chargement des transporteurs...
        </div>
      ) : transporteurs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Truck size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>{t("tr_empty")}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {transporteurs.map(t => (
            <TransporteurCard key={t.id} t={t} onSelect={setSelected} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={count}
        onPageChange={(p) => { setPage(p); fetchData(p, pageSize); }}
        onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); fetchData(1, ps); }}
      />

      {/* Detail panel */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem',
        }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <TransporteurDetail t={selected} onClose={() => setSelected(null)} onAction={handleAction} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Transporteurs;
