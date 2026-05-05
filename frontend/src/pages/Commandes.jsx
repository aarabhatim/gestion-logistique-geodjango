import React, { useState, useEffect } from 'react';
import { Package, Check, Truck, X, Plus } from 'lucide-react';
import { getCommandes, validerCommande, affecterCommande } from '../services/api';
import CommandeFormModal from '../components/CommandeFormModal';

const Commandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchCommandes = async () => {
    try {
      const res = await getCommandes();
      const features = res.data.features || (res.data.results && res.data.results.features) || [];
      setCommandes(features);
    } catch (error) {
      console.error("Erreur de chargement", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  const handleAction = async (actionFn, id) => {
    try {
      await actionFn(id);
      fetchCommandes(); // Refresh data
    } catch (error) {
      alert("Erreur lors de l'action : " + (error.response?.data?.error || error.message));
    }
  };

  const renderStatut = (statut) => {
    const badges = {
      en_attente: "badge-warning",
      validee: "badge-info",
      affectee: "badge-primary",
      en_cours: "badge-success",
      livree: "badge-success"
    };
    return <span className={`badge ${badges[statut] || 'badge-secondary'}`}>{statut}</span>;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="page-title text-gradient">Gestion des Commandes</h2>
          <p className="page-subtitle">Validez et affectez automatiquement les livraisons.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nouvelle Commande
        </button>
      </div>

      {showModal && (
        <CommandeFormModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchCommandes(); // Refresh data
          }} 
        />
      )}

      <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Marchandise</th>
              <th>Poids</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chargement...</td></tr>
            ) : commandes.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucune commande.</td></tr>
            ) : (
              commandes.map((cmd) => (
                <tr key={cmd.id}>
                  <td><strong>{cmd.properties.reference}</strong></td>
                  <td>{cmd.properties.type_marchandise}</td>
                  <td>{cmd.properties.poids_kg} kg</td>
                  <td>{renderStatut(cmd.properties.statut)}</td>
                  <td>{new Date(cmd.properties.date_creation).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      {cmd.properties.statut === 'en_attente' && (
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAction(validerCommande, cmd.id)}
                          title="Valider la commande"
                        >
                          <Check size={16} /> Valider
                        </button>
                      )}
                      {cmd.properties.statut === 'validee' && (
                        <button 
                          className="btn btn-sm"
                          style={{ background: 'var(--gradient-warning)', color: 'white' }}
                          onClick={() => handleAction(affecterCommande, cmd.id)}
                          title="Trouver un transporteur"
                        >
                          <Truck size={16} /> Affecter
                        </button>
                      )}
                    </div>
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

export default Commandes;
