import React, { useState, useEffect } from 'react';
import { getStats } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Rapports = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getStats();
        setStats(res.data);
      } catch (error) {
        console.error("Erreur chargement stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="dashboard-container"><p>Chargement des rapports...</p></div>;
  if (!stats) return <div className="dashboard-container"><p>Erreur de chargement des données.</p></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Rapports & Statistiques</h2>
          <p className="page-subtitle">Analysez vos performances logistiques.</p>
        </div>
      </div>

      <div className="dashboard-main-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        
        {/* Évolution Mensuelle */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s', gridColumn: '1 / -1' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Évolution des Commandes (6 derniers mois)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.evolution_mensuelle} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="mois" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Line type="monotone" dataKey="count" name="Commandes" stroke="#3b82f6" activeDot={{ r: 8 }} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commandes par Statut */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Répartition par Statut</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.commandes_par_statut.filter(d => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="statut"
                  label={({statut, percent}) => `${statut} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.commandes_par_statut.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commandes par Marchandise */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Types de Marchandises</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.commandes_par_type} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="type_marchandise" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Bar dataKey="count" name="Quantité" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Rapports;
