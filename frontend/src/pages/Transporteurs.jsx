import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Star, MapPin, CheckCircle, XCircle, RefreshCw,
  Clock, AlertTriangle, Shield, UserCheck, UserX, Search,
  Filter, Eye, TrendingUp, DollarSign, Award, Calendar,
} from 'lucide-react';
import { transporteursApi } from '../services/api';

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
  CAMION: '#8b5cf6',
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

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ t, onClose, onAction }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 580, maxHeight: '85vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
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

      {/* Statut bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <span style={{ background: t.is_verified ? '#10b98120' : '#f59e0b20', color: t.is_verified ? '#10b981' : '#f59e0b', fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
          {t.is_verified ? '✔ Vérifié' : '⏳ En attente vérification'}
        </span>
        <span style={{
          background: t.is_on_delivery ? '#f59e0b20' : t.is_available ? '#10b98120' : '#47556920',
          color: t.is_on_delivery ? '#f59e0b' : t.is_available ? '#10b981' : '#94a3b8',
          fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
        }}>
          {t.is_on_delivery ? '🚚 En livraison' : t.is_available ? '✅ Disponible' : '⭕ Hors ligne'}
        </span>
      </div>

      {/* Véhicule */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>VÉHICULE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Type</div><div style={{ fontWeight: 600 }}>{t.vehicule_type}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Plaque</div><div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.plaque}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Capacité</div><div style={{ fontWeight: 600 }}>{t.capacite_kg} kg</div></div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
        {[
          { label: 'Livraisons', value: t.nombre_livraisons || 0, color: '#3b82f6', icon: Truck },
          { label: 'Note', value: t.note_moyenne?.toFixed(1) || '–', color: '#f59e0b', icon: Star },
          { label: 'Avis', value: t.nombre_avis || 0, color: '#8b5cf6', icon: Award },
          { label: 'Revenus', value: `${Math.round((t.revenus_total || 0) / 1000)}k`, color: '#10b981', icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <Icon size={14} color={color} style={{ margin: '0 auto 4px', display: 'block' }} />
            <div style={{ fontWeight: 700, fontSize: 16, color }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Heures de travail */}
      <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} /> HEURES DE TRAVAIL
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Aujourd'hui</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#a78bfa' }}>
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
            <Shield size={15} /> Vérifier ce chauffeur
          </button>
        ) : (
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', color: '#ef4444', border: '1px solid #ef444430' }}
            onClick={() => onAction(t, 'rejeter')}>
            <UserX size={15} /> Retirer la vérification
          </button>
        )}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Transporteurs = () => {
  const [transporteurs, setTransporteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [filterDispo, setFilterDispo] = useState('');
  const [search, setSearch] = useState('');
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
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
  }, [filterType, filterDispo, filterVerified, search]);

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
          <h2 className="page-title text-gradient">Flotte de Transporteurs</h2>
          <p className="page-subtitle">{count} chauffeurs · {stats.pending} en attente de vérification</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Stats KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#3b82f6', icon: Truck },
          { label: 'Vérifiés', value: stats.verified, color: '#10b981', icon: Shield },
          { label: 'En attente', value: stats.pending, color: '#f59e0b', icon: AlertTriangle },
          { label: 'Disponibles', value: stats.available, color: '#22c55e', icon: CheckCircle },
          { label: 'En livraison', value: stats.delivering, color: '#06b6d4', icon: Truck },
          { label: 'Hors ligne', value: stats.offline, color: '#64748b', icon: XCircle },
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

      {/* Filters */}
      <div className="glass-card animate-fade-in" style={{ padding: '1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="glass-input" placeholder="Nom, email, plaque..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
        </div>
        <select className="glass-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">Tous véhicules</option>
          <option value="MOTO">🛵 Moto</option>
          <option value="VOITURE">🚗 Voiture</option>
          <option value="CAMIONNETTE">🚐 Camionnette</option>
          <option value="CAMION">🚛 Camion</option>
        </select>
        <select className="glass-input" value={filterDispo} onChange={e => setFilterDispo(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">Toute disponibilité</option>
          <option value="true">Disponibles</option>
          <option value="false">Indisponibles</option>
        </select>
        <select className="glass-input" value={filterVerified} onChange={e => setFilterVerified(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">Tous</option>
          <option value="true">✓ Vérifiés</option>
          <option value="false">⏳ En attente</option>
        </select>
        {(filterType || filterDispo !== '' || filterVerified !== '' || search) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setFilterType(''); setFilterDispo(''); setFilterVerified(''); setSearch(''); }}>
            × Effacer
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass-card" style={{ height: 220, opacity: 0.4 }} />
          ))
        ) : transporteurs.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Truck size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>Aucun transporteur trouvé</div>
          </div>
        ) : transporteurs.map(t => {
          const vColor = VEHICULE_COLORS[t.vehicule_type] || '#64748b';
          const heuresJour = (t.minutes_travaillees_aujourd_hui || 0) + (t.is_available ? (t.minutes_session_courante || 0) : 0);
          return (
            <div key={t.id} className="glass-card animate-fade-in" style={{ padding: '1.1rem', position: 'relative', borderTop: `3px solid ${t.is_available ? '#10b981' : vColor + '60'}`, transition: 'all 0.2s' }}>
              {/* Badges top-right */}
              <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', display: 'flex', gap: 5, flexDirection: 'column', alignItems: 'flex-end' }}>
                {t.is_verified ? (
                  <span style={{ background: '#10b98115', color: '#10b981', fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Shield size={9} /> Vérifié
                  </span>
                ) : (
                  <span style={{ background: '#f59e0b15', color: '#f59e0b', fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    ⏳ En attente
                  </span>
                )}
                <span style={{
                  background: t.is_on_delivery ? '#f59e0b15' : t.is_available ? '#10b98115' : '#47556915',
                  color: t.is_on_delivery ? '#f59e0b' : t.is_available ? '#10b981' : '#94a3b8',
                  fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700,
                }}>
                  {t.is_on_delivery ? '🚚 Mission' : t.is_available ? '● Dispo' : '○ Off'}
                </span>
              </div>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', paddingRight: 80 }}>
                <div style={{ fontSize: 32 }}>{VEHICULE_ICONS[t.vehicule_type] || '🚗'}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.nom_complet || `${t.user_first_name || ''} ${t.user_last_name || ''}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {t.user_email || t.email}
                  </div>
                  <div style={{ fontSize: 11, color: vColor, fontWeight: 600, marginTop: 2 }}>
                    {t.vehicule_type} · {t.plaque}
                  </div>
                </div>
              </div>

              {/* Stats compact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10, fontSize: 12 }}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 4px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Livraisons</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#3b82f6' }}>{t.nombre_livraisons || 0}</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 4px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Note</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>
                    {t.note_moyenne ? `${t.note_moyenne.toFixed(1)}⭐` : '–'}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 4px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Revenus</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>
                    {Math.round((t.revenus_total || 0) / 1000)}k
                  </div>
                </div>
              </div>

              {/* Heures de travail mini-display */}
              <div style={{
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 8,
                padding: '8px 10px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <Clock size={11} color="#a78bfa" />
                  <span>Travail aujourd'hui</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: 13 }}>
                    {formatDuration(heuresJour)}
                  </span>
                  {t.is_available && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-secondary" style={{ flex: 1, fontSize: 11, justifyContent: 'center' }}
                  onClick={() => setSelected(t)}>
                  <Eye size={12} /> Détails
                </button>
                {!t.is_verified ? (
                  <button className="btn btn-sm btn-primary" style={{ flex: 1, fontSize: 11, justifyContent: 'center' }}
                    onClick={() => handleAction(t, 'approuver')}>
                    <Shield size={12} /> Vérifier
                  </button>
                ) : (
                  <button className="btn btn-sm btn-secondary"
                    style={{ flex: 1, fontSize: 11, justifyContent: 'center', color: '#ef4444', border: '1px solid #ef444430' }}
                    onClick={() => handleAction(t, 'rejeter')}>
                    <UserX size={12} /> Retirer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && <DetailModal t={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
    </div>
  );
};

export default Transporteurs;
