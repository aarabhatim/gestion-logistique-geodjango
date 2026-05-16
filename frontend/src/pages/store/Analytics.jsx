import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Users } from 'lucide-react';
import api from '../../services/api';

const StoreAnalytics = () => {
  const [analytics, setAnalytics] = useState({ total_ca: 0, total_commandes: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const resFondateur = await api.get('fondateurs/');
        const monFondateur = resFondateur.data.find(f => f.nom_boutique);
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
      <h1 className="text-gradient mb-4">Analytiques de la Boutique</h1>

      <div className="stats-grid mb-4">
        <div className="stat-card fade-in">
          <div className="stat-header">
            <div className="stat-title">Chiffre d'Affaires Total</div>
            <div className="stat-icon-wrapper"><TrendingUp size={20} className="text-primary" /></div>
          </div>
          <div className="stat-value">{analytics.total_ca} MAD</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-header">
            <div className="stat-title">Commandes Totales</div>
            <div className="stat-icon-wrapper"><BarChart2 size={20} className="text-success" /></div>
          </div>
          <div className="stat-value">{analytics.total_commandes}</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-header">
            <div className="stat-title">Visites (Aperçu)</div>
            <div className="stat-icon-wrapper"><Users size={20} className="text-warning" /></div>
          </div>
          <div className="stat-value">245</div>
        </div>
      </div>

      <div className="card mt-4">
        <h3>Produits les plus vendus</h3>
        <p className="text-secondary mt-2">Les données détaillées des produits populaires s'afficheront ici.</p>
        {/* Placeholder pour un graphique ou une liste */}
        <div style={{ height: '200px', background: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-secondary">Graphique des ventes</span>
        </div>
      </div>
    </div>
  );
};

export default StoreAnalytics;
