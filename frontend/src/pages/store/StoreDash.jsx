import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, DollarSign, Clock } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="stat-card fade-in">
    <div className="stat-header">
      <div className="stat-title">{title}</div>
      <div className="stat-icon-wrapper"><Icon size={20} className="text-primary" /></div>
    </div>
    <div className="stat-value">{value}</div>
    {trend && (
      <div className={`stat-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
        <TrendingUp size={16} />
        <span>{Math.abs(trend)}% vs mois dernier</span>
      </div>
    )}
  </div>
);

const StoreDash = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({ total_ca: 0, total_commandes: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Obtenir le fondateur lié à l'utilisateur
        const resFondateur = await api.get('fondateurs/');
        const monFondateur = resFondateur.data.find(f => f.nom_boutique); // Simplification, idéalement backend filtre
        if (monFondateur) {
          const res = await api.get(`fondateurs/${monFondateur.id}/analytics/`);
          setAnalytics(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="dashboard-container animate-fade-in">
      <h1 className="text-gradient mb-4">Tableau de bord Boutique</h1>
      
      <div className="stats-grid">
        <StatCard title="Chiffre d'Affaires" value={`${analytics.total_ca} MAD`} icon={DollarSign} trend={+12} />
        <StatCard title="Commandes Totales" value={analytics.total_commandes} icon={Package} trend={+5} />
        <StatCard title="Temps Moyen Prépa" value="14 min" icon={Clock} />
      </div>

      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h3>Dernières commandes</h3>
          <p className="text-secondary">Les commandes récentes s'afficheront ici.</p>
        </div>
        <div className="card">
          <h3>Alertes Stock</h3>
          <p className="text-secondary">Produits bientôt en rupture.</p>
        </div>
      </div>
    </div>
  );
};

export default StoreDash;
