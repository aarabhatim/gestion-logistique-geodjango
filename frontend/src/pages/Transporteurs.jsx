import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Phone, Hash } from 'lucide-react';
import { getVehicules } from '../services/api';

const Transporteurs = () => {
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicules = async () => {
    try {
      const res = await getVehicules();
      // vehicules is not a GeoFeature endpoint, just a regular list from our API
      setVehicules(res.data.results || res.data || []);
    } catch (error) {
      console.error("Erreur de chargement", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicules();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Flotte de Transporteurs</h2>
          <p className="page-subtitle">Gérez vos véhicules, chauffeurs et leur disponibilité.</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Transporteur</th>
              <th>Véhicule</th>
              <th>Capacité</th>
              <th>Chauffeur</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Chargement...</td></tr>
            ) : vehicules.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucun véhicule trouvé.</td></tr>
            ) : (
              vehicules.map((vehicule) => (
                <tr key={vehicule.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Truck size={16} className="icon-primary" />
                      <strong>LogistiquePro</strong> {/* Placeholder, on pourrait fetcher le nom du transporteur si serialisé */}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div><strong>{vehicule.immatriculation}</strong></div>
                      <small style={{ color: 'var(--text-secondary)' }}>{vehicule.type_vehicule}</small>
                    </div>
                  </td>
                  <td>{vehicule.capacite_kg} kg</td>
                  <td>
                    {vehicule.chauffeur ? (
                       <div>Chauffeur #{vehicule.chauffeur}</div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Non assigné</span>
                    )}
                  </td>
                  <td>
                    {vehicule.disponible ? (
                      <span className="badge badge-success">Disponible</span>
                    ) : (
                      <span className="badge badge-warning">En mission</span>
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

export default Transporteurs;
