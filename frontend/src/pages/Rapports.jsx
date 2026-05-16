import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { TrendingUp, Package, Truck, Store } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const STATUT_LABELS = {
  EN_ATTENTE: 'En attente', VALIDEE: 'Validée', EN_PREPARATION: 'En prépa.',
  EN_ROUTE: 'En route', LIVREE: 'Livrée', ANNULEE: 'Annulée',
};

const KPICard = ({ icon: Icon, title, value, sub, color }) => (
  <div className="glass-card stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div className="stat-header">
      <div>
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value" style={{ color }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} />
      </div>
    </div>
  </div>
);

const Rapports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.adminDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="dashboard-container">
      <div className="dashboard-header"><h2 className="page-title text-gradient">Rapports & Analytics</h2></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1,2,3,4].map(i => <div key={i} className="glass-card" style={{ height: '100px', opacity: 0.4 }} />)}
      </div>
    </div>
  );

  const kpis = data?.kpis || {};
  const evolution = (data?.evolution_6m || []).map(e => ({
    mois: e.mois ? new Date(e.mois).toLocaleDateString('fr-FR', { month: 'short' }) : '',
    commandes: e.count,
    ca: Math.round(e.ca || 0),
  }));
  const parStatut = (data?.par_statut || []).map(s => ({
    name: STATUT_LABELS[s.statut] || s.statut,
    value: s.count,
  }));
  const topFondateurs = (data?.top_fondateurs || []).slice(0, 8).map(f => ({
    name: f.fondateur__nom_boutique?.length > 18 ? f.fondateur__nom_boutique.slice(0, 18) + '…' : f.fondateur__nom_boutique,
    ca: Math.round(f.ca || 0),
    commandes: f.nb_commandes,
  }));
  const topTransporteurs = (data?.top_transporteurs || []).slice(0, 8).map(t => ({
    name: `${t.user__first_name} ${t.user__last_name?.[0]}.`,
    livraisons: t.nombre_livraisons,
    note: t.note_moyenne,
  }));

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Rapports & Analytics</h2>
          <p className="page-subtitle">Vue globale de la performance de la plateforme</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <KPICard icon={Package} title="CA Total" value={`${Math.round(kpis.ca_total || 0).toLocaleString()} MAD`}
          sub={`${Math.round(kpis.ca_mois || 0).toLocaleString()} MAD ce mois`} color="#10b981" />
        <KPICard icon={TrendingUp} title="Taux de livraison" value={`${kpis.taux_livraison || 0}%`}
          sub="Commandes livrées / total" color="#3b82f6" />
        <KPICard icon={Store} title="Boutiques actives" value={kpis.fondateurs_actifs || 0}
          sub={`${kpis.fondateurs_en_attente || 0} en attente`} color="#f59e0b" />
        <KPICard icon={Truck} title="Transporteurs" value={kpis.transporteurs_actifs || 0}
          sub={`${kpis.transporteurs_en_livraison || 0} en mission`} color="#8b5cf6" />
      </div>

      {/* Évolution CA + commandes */}
      <div className="glass-card animate-fade-in" style={{ marginBottom: '1.5rem', animationDelay: '0.1s' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Évolution des commandes & CA (6 mois)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={evolution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCmd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="mois" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="commandes" name="Commandes" stroke="#3b82f6" fill="url(#colorCmd)" strokeWidth={2} />
            <Area yAxisId="right" type="monotone" dataKey="ca" name="CA (MAD)" stroke="#10b981" fill="url(#colorCa)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Répartition par statut */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Par statut</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={parStatut} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                paddingAngle={3} dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {parStatut.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top fondateurs */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Top boutiques (CA)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topFondateurs} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={90} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={v => [`${v.toLocaleString()} MAD`]} />
              <Bar dataKey="ca" name="CA" radius={[0, 4, 4, 0]}>
                {topFondateurs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top transporteurs */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Top transporteurs</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topTransporteurs} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="livraisons" name="Livraisons" radius={[0, 4, 4, 0]}>
                {topTransporteurs.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Rapports;
