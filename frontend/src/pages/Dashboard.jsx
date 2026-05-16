import React, { useState, useEffect } from 'react';
import { Package, Truck, Users, AlertCircle, TrendingUp, Store, Star, CheckCircle } from 'lucide-react';
import { analyticsApi } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import './Dashboard.css';

const STATUT_COLORS = {
  EN_ATTENTE: '#f59e0b',
  VALIDEE: '#3b82f6',
  EN_PREPARATION: '#8b5cf6',
  EN_ROUTE: '#06b6d4',
  LIVREE: '#10b981',
  ANNULEE: '#ef4444',
};

const StatCard = ({ title, value, icon: Icon, sub, colorClass, loading }) => (
  <div className="glass-card stat-card animate-fade-in">
    <div className="stat-header">
      <div>
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value">{loading ? '...' : (value ?? 0)}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
      </div>
      <div className={`stat-icon-wrapper ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.adminDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis || {};
  const evolution = (data?.evolution_6m || []).map(e => ({
    mois: e.mois ? new Date(e.mois).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '',
    commandes: e.count,
    ca: Math.round(e.ca || 0),
  }));
  const parStatut = (data?.par_statut || []).map(s => ({
    name: s.statut,
    value: s.count,
    color: STATUT_COLORS[s.statut] || '#64748b',
  }));
  const topFondateurs = data?.top_fondateurs || [];
  const topTransporteurs = data?.top_transporteurs || [];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Vue d'ensemble</h2>
          <p className="page-subtitle">Tableau de bord DeliverMap — données en temps réel</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard title="Commandes totales" value={kpis.commandes_total} icon={Package}
          sub={`${kpis.commandes_aujourd_hui || 0} aujourd'hui`} colorClass="icon-primary" loading={loading} />
        <StatCard title="En cours" value={kpis.commandes_en_cours} icon={Truck}
          sub={`Taux livraison: ${kpis.taux_livraison || 0}%`} colorClass="icon-warning" loading={loading} />
        <StatCard title="Clients" value={kpis.clients_total} icon={Users}
          sub="Inscrits sur la plateforme" colorClass="icon-success" loading={loading} />
        <StatCard title="Boutiques actives" value={kpis.fondateurs_actifs} icon={Store}
          sub={`${kpis.fondateurs_en_attente || 0} en attente de validation`} colorClass="icon-primary" loading={loading} />
        <StatCard title="Transporteurs dispos" value={kpis.transporteurs_actifs} icon={CheckCircle}
          sub={`${kpis.transporteurs_en_livraison || 0} en livraison`} colorClass="icon-success" loading={loading} />
        <StatCard title="CA total" value={`${Math.round(kpis.ca_total || 0).toLocaleString()} MAD`} icon={TrendingUp}
          sub={`${Math.round(kpis.ca_mois || 0).toLocaleString()} MAD ce mois`} colorClass="icon-warning" loading={loading} />
        <StatCard title="Signalées" value={kpis.commandes_signalees} icon={AlertCircle}
          sub="Commandes à traiter" colorClass="icon-danger" loading={loading} />
        <StatCard title="Taux livraison" value={`${kpis.taux_livraison || 0}%`} icon={Star}
          sub="Commandes livrées / total" colorClass="icon-primary" loading={loading} />
      </div>

      {/* Graphiques */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Évolution 6 mois */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Évolution des commandes (6 mois)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="mois" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="commandes" name="Commandes" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par statut */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Par statut</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={parStatut} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={95} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="value" name="Commandes" radius={[0, 4, 4, 0]}>
                {parStatut.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Fondateurs + Top Transporteurs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.2rem' }}>Top boutiques (CA)</h3>
          {loading ? <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topFondateurs.slice(0, 6).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{f.fondateur__nom_boutique}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{f.nb_commandes} commandes</div>
                    </div>
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '14px' }}>
                    {Math.round(f.ca || 0).toLocaleString()} MAD
                  </span>
                </div>
              ))}
              {topFondateurs.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aucune donnée</p>}
            </div>
          )}
        </div>

        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.2rem' }}>Top transporteurs</h3>
          {loading ? <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topTransporteurs.slice(0, 6).map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gradient-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.user__first_name} {t.user__last_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.vehicule_type} — ⭐ {t.note_moyenne}</div>
                    </div>
                  </div>
                  <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '14px' }}>
                    {t.nombre_livraisons} livr.
                  </span>
                </div>
              ))}
              {topTransporteurs.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aucune donnée</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
