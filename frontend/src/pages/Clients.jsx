import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin } from 'lucide-react';
import { getClients } from '../services/api';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const res = await getClients();
      const features = res.data.features || (res.data.results && res.data.results.features) || [];
      setClients(features);
    } catch (error) {
      console.error("Erreur de chargement", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2 className="page-title text-gradient">Annuaire des Clients</h2>
          <p className="page-subtitle">Gérez vos clients et leurs adresses de livraison.</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="clients-grid">
          {loading ? (
            <p>Chargement...</p>
          ) : clients.length === 0 ? (
            <p>Aucun client trouvé.</p>
          ) : (
            clients.map(client => (
              <div key={client.id} className="client-card">
                <div className="client-header">
                  <div className="client-avatar">
                    {client.properties.prenom.charAt(0)}{client.properties.nom.charAt(0)}
                  </div>
                  <div className="client-name-group">
                    <h3>{client.properties.prenom} {client.properties.nom}</h3>
                    <span className="badge badge-success">Actif</span>
                  </div>
                </div>
                <div className="client-details">
                  <p><Mail size={14} /> {client.properties.email}</p>
                  <p><Phone size={14} /> {client.properties.telephone}</p>
                  <p><MapPin size={14} /> {client.properties.adresse}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;
