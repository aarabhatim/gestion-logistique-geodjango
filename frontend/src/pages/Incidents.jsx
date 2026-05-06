import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, MessageSquare } from 'lucide-react';
import { getIncidents, resoudreIncident } from '../services/api';

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    try {
      const res = await getIncidents();
      const features = res.data.features || (res.data.results && res.data.results.features) || [];
      setIncidents(features);
    } catch (error) {
      console.error("Erreur de chargement", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleResoudre = async (id) => {
    const notes = prompt("Notes de résolution (optionnel):");
    if (notes !== null) {
      try {
        await resoudreIncident(id, notes);
        fetchIncidents();
      } catch (error) {
        alert("Erreur lors de la résolution");
      }
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Gestion des Incidents</h2>
          <p className="page-subtitle">Suivez et résolvez les problèmes de livraison.</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Type d'incident</th>
              <th>Description</th>
              <th>Date Signalement</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chargement...</td></tr>
            ) : incidents.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucun incident signalé.</td></tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.id}>
                  <td><strong>{inc.properties.commande_reference}</strong></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={16} className={inc.properties.statut === 'resolu' ? "icon-success" : "icon-danger"} />
                      {inc.properties.type_incident_display}
                    </div>
                  </td>
                  <td>{inc.properties.description}</td>
                  <td>{new Date(inc.properties.date_signalement).toLocaleString()}</td>
                  <td>
                    {inc.properties.statut === 'resolu' ? (
                      <span className="badge badge-success">Résolu</span>
                    ) : (
                      <span className="badge badge-danger">Ouvert</span>
                    )}
                  </td>
                  <td>
                    {inc.properties.statut !== 'resolu' && (
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={() => handleResoudre(inc.id)}
                        title="Marquer comme résolu"
                      >
                        <Check size={16} /> Résoudre
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Incidents;
