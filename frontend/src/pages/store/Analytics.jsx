import React, { useEffect, useState } from 'react';
import {
  TrendingUp, DollarSign, Package, Star, AlertCircle,
  BarChart2, RefreshCw, ShoppingBag,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { analyticsApi } from '../../services/api';
import '../../styles/marjane.css';
import { useI18n } from '../../contexts/I18nContext';

// ─── KPI Card ──────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#E30613' }) => (
  <div className="mj-stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--mj-text-3)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--mj-text-3)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  </div>
);

// ─── Custom Tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--mj-white)', border: '1px solid var(--mj-border)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <div style={{ color: 'var(--mj-text-3)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined) : p.value}
          {p.dataKey === 'ca' ? ' MAD' : ''}
        </div>
      ))}
    </div>
  );
};

const PRODUCT_COLORS = ['#E30613', '#B8000C', '#ef4444', '#f87171', '#fca5a5', '#fed7d7', '#fee2e2'];

// ─── Main Component ────────────────────────────────────────────────────────
export default function StoreAnalytics() {
  const { t } = useI18n();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.fondateurAnalytics();
      setData(res.data);
    } catch (err) {
      setError(t('an_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="mj-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <div className="mj-spin" style={{
        width: 28, height: 28,
        border: '3px solid var(--mj-border)', borderTopColor: 'var(--mj-red)', borderRadius: '50%',
      }} />
      <span style={{ color: 'var(--mj-text-3)' }}>{t('an_loading')}</span>
    </div>
  );

  if (error) return (
    <div className="mj-page">
      <div className="mj-card" style={{ textAlign: 'center', padding: '3rem', color: '#E30613' }}>
        <AlertCircle size={40} style={{ marginBottom: 12 }} />
        <div style={{ fontWeight: 600, marginBottom: 16 }}>{error}</div>
        <button className="mj-btn mj-btn-outline-red mj-btn-sm" onClick={fetchData}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    </div>
  );

  const { kpis = {}, top_produits = [], evolution_30j = [], avis_distribution = [] } = data || {};

  const evolutionData = evolution_30j.map(d => ({
    jour: new Date(d.jour).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
    ca: Math.round(parseFloat(d.ca) || 0),
    nb: d.nb || 0,
  }));

  const avisData = [1, 2, 3, 4, 5].map(note => ({
    note: `${note}★`,
    count: avis_distribution.find(a => a.note === note)?.count || 0,
    fill: note >= 4 ? '#22C55E' : note === 3 ? '#F59E0B' : '#E30613',
  }));

  return (
    <div className="mj-page" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 0 40px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            Analytiques de la boutique
          </h2>
          <div style={{ fontSize: 13, color: 'var(--mj-text-3)', marginTop: 4 }}>
            Données en temps réel basées sur vos commandes
          </div>
        </div>
        <button
          className="mj-btn mj-btn-outline-red mj-btn-sm"
          onClick={fetchData}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard icon={DollarSign} label={t('sd_ca_month')} value={`${Math.round(kpis.ca_mois || 0).toLocaleString(undefined)} MAD`} color="#22C55E" />
        <KpiCard icon={TrendingUp} label={t('sd_ca_total')} value={`${Math.round(kpis.ca_total || 0).toLocaleString(undefined)} MAD`} color="#3b82f6" />
        <KpiCard icon={Package} label={t('sd_orders_total')} value={kpis.commandes_total || 0}
          sub={`${kpis.commandes_aujourd_hui || 0} ${t('sd_today')}`} color="#6366f1" />
        <KpiCard icon={ShoppingBag} label={t('status_EN_ATTENTE')} value={kpis.commandes_en_attente || 0}
          sub={`${kpis.commandes_en_preparation || 0} ${t('an_in_prep_sub')}`} color="#F59E0B" />
        <KpiCard icon={Star} label={t('sd_shop_rating')} value={(kpis.note_boutique || 0).toFixed(1)}
          sub={`${kpis.nombre_avis || 0} ${t('sd_reviews_lbl')}`} color="#F59E0B" />
        <KpiCard icon={AlertCircle} label={t('sd_cancel_rate')} value={`${kpis.taux_annulation || 0}%`} color="#E30613" />
      </div>

      {/* ── Évolution CA 30j ── */}
      <div className="mj-card">
        <h4 style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
          <TrendingUp size={16} color="var(--mj-red)" /> Chiffre d'affaires — 30 derniers jours
        </h4>
        {evolutionData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--mj-text-3)', fontSize: 14 }}>
            Aucune commande livrée ces 30 derniers jours.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mj-border)" />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: 'var(--mj-text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--mj-text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="ca" name="CA" stroke="#E30613" strokeWidth={2.5}
                dot={{ r: 3, fill: '#E30613' }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top produits ── */}
      {top_produits.length > 0 && (
        <div className="mj-card">
          <h4 style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            <BarChart2 size={16} color="var(--mj-red)" /> Produits les plus commandés
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top_produits.slice(0, 7)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mj-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--mj-text-3)' }} />
              <YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 11, fill: 'var(--mj-text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="nombre_commandes" name="Commandes" radius={[0, 6, 6, 0]}>
                {top_produits.slice(0, 7).map((_, i) => (
                  <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 20 }}>
            {top_produits.slice(0, 5).map((p, i) => (
              <div key={p.nom} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--mj-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: PRODUCT_COLORS[i] + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: PRODUCT_COLORS[i],
                  }}>
                    #{i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mj-text)' }}>{p.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--mj-text-3)' }}>
                      {p.stock} en stock · {p.prix} MAD
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: PRODUCT_COLORS[i], fontSize: 16 }}>{p.nombre_commandes}</div>
                  <div style={{ fontSize: 11, color: 'var(--mj-text-3)' }}>commandes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Distribution des avis ── */}
      {avis_distribution.length > 0 && (
        <div className="mj-card">
          <h4 style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            <Star size={16} color="#F59E0B" /> Distribution des avis clients
          </h4>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <ResponsiveContainer width="50%" height={160} minWidth={220}>
              <BarChart data={avisData}>
                <XAxis dataKey="note" tick={{ fontSize: 12, fill: 'var(--mj-text-3)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Avis" radius={[6, 6, 0, 0]}>
                  {avisData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>
                {(kpis.note_boutique || 0).toFixed(1)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--mj-text-3)', marginTop: 4 }}>
                Note moyenne sur {kpis.nombre_avis || 0} avis
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={20}
                    fill={i <= Math.round(kpis.note_boutique || 0) ? '#F59E0B' : 'transparent'}
                    color={i <= Math.round(kpis.note_boutique || 0) ? '#F59E0B' : '#E5E5E5'}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
