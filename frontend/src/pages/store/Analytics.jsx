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

// ─── KPI Card ──────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = '#6366f1' }) => (
  <div className="glass-card" style={{ borderTop: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  </div>
);

// ─── Custom Tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
          {p.dataKey === 'ca' ? ' MAD' : ''}
        </div>
      ))}
    </div>
  );
};

const PRODUCT_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe','#f3f4f6'];

// ─── Main Component ────────────────────────────────────────────────────────
export default function StoreAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.fondateurAnalytics();
      setData(res.data);
    } catch (err) {
      setError('Impossible de charger les analytics. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-secondary)' }}>Chargement des analytics…</span>
    </div>
  );

  if (error) return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
      <AlertCircle size={40} style={{ marginBottom: 12 }} />
      <div style={{ fontWeight: 600 }}>{error}</div>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={fetchData}>
        <RefreshCw size={14} /> Réessayer
      </button>
    </div>
  );

  const { kpis = {}, top_produits = [], evolution_30j = [], avis_distribution = [] } = data || {};

  // Prepare evolution chart data
  const evolutionData = evolution_30j.map(d => ({
    jour: new Date(d.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    ca: Math.round(parseFloat(d.ca) || 0),
    nb: d.nb || 0,
  }));

  // Avis distribution (notes 1-5)
  const avisData = [1,2,3,4,5].map(note => ({
    note: `${note}★`,
    count: avis_distribution.find(a => a.note === note)?.count || 0,
    fill: note >= 4 ? '#10b981' : note === 3 ? '#f59e0b' : '#ef4444',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22 }}>Analytiques de la boutique</h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Données en temps réel basées sur vos commandes
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard icon={DollarSign} label="CA ce mois" value={`${Math.round(kpis.ca_mois || 0).toLocaleString('fr-FR')} MAD`} color="#10b981" />
        <KpiCard icon={TrendingUp} label="CA total" value={`${Math.round(kpis.ca_total || 0).toLocaleString('fr-FR')} MAD`} color="#6366f1" />
        <KpiCard icon={Package} label="Commandes totales" value={kpis.commandes_total || 0} sub={`${kpis.commandes_aujourd_hui || 0} aujourd'hui`} color="#3b82f6" />
        <KpiCard icon={ShoppingBag} label="En attente" value={kpis.commandes_en_attente || 0} sub={`${kpis.commandes_en_preparation || 0} en préparation`} color="#f59e0b" />
        <KpiCard icon={Star} label="Note boutique" value={(kpis.note_boutique || 0).toFixed(1)} sub={`${kpis.nombre_avis || 0} avis`} color="#f59e0b" />
        <KpiCard icon={AlertCircle} label="Taux annulation" value={`${kpis.taux_annulation || 0}%`} color="#ef4444" />
      </div>

      {/* Evolution CA 30j */}
      <div className="glass-card">
        <h4 style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} color="#6366f1" /> Chiffre d'affaires — 30 derniers jours
        </h4>
        {evolutionData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Aucune commande livrée ces 30 derniers jours.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ca" name="CA" stroke="#6366f1" strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top produits */}
      {top_produits.length > 0 && (
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={16} color="#8b5cf6" /> Produits les plus commandés
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top_produits.slice(0, 7)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="nombre_commandes" name="Commandes" radius={[0, 6, 6, 0]}>
                {top_produits.slice(0, 7).map((_, i) => (
                  <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Table des top produits */}
          <div style={{ marginTop: 20 }}>
            {top_produits.slice(0, 5).map((p, i) => (
              <div key={p.nom} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: PRODUCT_COLORS[i] + '25',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: PRODUCT_COLORS[i] }}>
                    #{i+1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {p.stock} en stock · {p.prix} MAD
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: PRODUCT_COLORS[i] }}>{p.nombre_commandes}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>commandes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribution des avis */}
      {avis_distribution.length > 0 && (
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} color="#f59e0b" /> Distribution des avis clients
          </h4>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <ResponsiveContainer width="50%" height={160}>
              <BarChart data={avisData}>
                <XAxis dataKey="note" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Avis" radius={[6, 6, 0, 0]}>
                  {avisData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
                {(kpis.note_boutique || 0).toFixed(1)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Note moyenne sur {kpis.nombre_avis || 0} avis
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={18}
                    fill={i <= Math.round(kpis.note_boutique || 0) ? '#f59e0b' : 'transparent'}
                    color={i <= Math.round(kpis.note_boutique || 0) ? '#f59e0b' : '#475569'} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
