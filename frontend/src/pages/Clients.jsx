import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Plus, Star } from 'lucide-react';
import { getClients } from '../services/api';
import ClientFormModal from '../components/ClientFormModal';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="page-title text-gradient">Annuaire des Clients</h2>
          <p className="page-subtitle">Gérez vos clients et leurs adresses de livraison.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nouveau Client
        </button>
      </div>

      {showModal && (
        <ClientFormModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchClients();
          }} 
        />
      )}

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
                    {client.properties.entreprise && (
                      <span className="badge badge-info" style={{ marginTop: '4px' }}>{client.properties.entreprise}</span>
                    )}
                  </div>
                </div>
                <div className="client-details">
                  <p><Mail size={14} /> {client.properties.email}</p>
                  <p><Phone size={14} /> {client.properties.telephone}</p>
                  <p><MapPin size={14} /> {client.properties.adresse}</p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" /> Fidélité: {client.properties.note_fidelite}/5
                  </p>
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
