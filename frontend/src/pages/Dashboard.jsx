import React, { useState, useEffect } from 'react';
import { Package, Truck, Users, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { getStats, getCommandes } from '../services/api';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, colorClass }) => (
  <div className="glass-card stat-card animate-fade-in">
    <div className="stat-header">
      <div>
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value">{value !== null ? value : '...'}</div>
      </div>
      <div className={`stat-icon-wrapper ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
    <div className="stat-footer">
      {trend && (
        <span className={`trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
          <TrendingUp size={16} className={trend === 'down' ? 'rotate-180' : ''} />
          {trendValue}
        </span>
      )}
      <span className="trend-label">Données en temps réel</span>
    </div>
  </div>
);

const ActivityItem = ({ title, time, status, icon: Icon, colorClass }) => (
  <div className="activity-item">
    <div className={`activity-icon ${colorClass}`}>
      <Icon size={16} />
    </div>
    <div className="activity-content">
      <div className="activity-title">{title}</div>
      <div className="activity-time">{time}</div>
    </div>
    <div className={`badge badge-${status.type}`}>{status.label}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    commandes: null,
    vehicules: null,
    clients: null,
    incidents: null,
  });
  const [commandesRecentes, setCommandesRecentes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, cmdRes] = await Promise.all([
          getStats(),
          getCommandes()
        ]);
        
        const kpis = statsRes.data.kpis;
        setStats({
          commandes: kpis.total_commandes,
          vehicules: kpis.vehicules_disponibles,
          clients: kpis.total_clients,
          incidents: kpis.incidents_ouverts,
        });

        const getFeatures = (res) => {
          if (res.data.features) return res.data.features;
          if (res.data.results && res.data.results.features) return res.data.results.features;
          return [];
        };

        const commandesFeat = getFeatures(cmdRes);
        if (commandesFeat.length > 0) {
          setCommandesRecentes(commandesFeat.slice(0, 4));
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Vue d'ensemble</h2>
          <p className="page-subtitle">Suivi en temps réel de vos opérations logistiques.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Clock size={16} /> Dernières 24h
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Commandes" 
          value={stats.commandes} 
          icon={Package} 
          trend="up" 
          trendValue="Actives" 
          colorClass="icon-primary" 
        />
        <StatCard 
          title="Véhicules" 
          value={stats.vehicules} 
          icon={Truck} 
          trend="up" 
          trendValue="Disponibles" 
          colorClass="icon-success" 
        />
        <StatCard 
          title="Clients" 
          value={stats.clients} 
          icon={Users} 
          trend="up" 
          trendValue="Inscrits" 
          colorClass="icon-warning" 
        />
        <StatCard 
          title="Incidents" 
          value={stats.incidents} 
          icon={AlertCircle} 
          trend={stats.incidents > 0 ? "up" : "down"} 
          trendValue="Ouverts" 
          colorClass={stats.incidents > 0 ? "icon-danger" : "icon-success"} 
        />
      </div>

      <div className="dashboard-main-grid">
        <div className="glass-card map-preview-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <h3 className="card-title">Carte des Opérations</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => window.location.href='/map'}>Ouvrir la carte</button>
          </div>
          <div className="map-placeholder" style={{ padding: 0 }}>
            <MapComponent />
          </div>
        </div>

        <div className="glass-card activity-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">
            <h3 className="card-title">Activité Récente</h3>
          </div>
          <div className="activity-list">
            {commandesRecentes.length > 0 ? commandesRecentes.map((cmd) => (
              <ActivityItem 
                key={cmd.id}
                title={`Commande ${cmd.properties.reference}`} 
                time={`Créée le ${new Date(cmd.properties.date_creation).toLocaleDateString()}`} 
                status={{ type: cmd.properties.statut === 'en_attente' ? 'warning' : 'primary', label: cmd.properties.statut }}
                icon={Package}
                colorClass="bg-primary-light"
              />
            )) : <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>Aucune commande récente.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
