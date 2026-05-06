import React, { useState, useEffect } from 'react';
import { Package, Check, Truck, X, Plus, Filter, Navigation } from 'lucide-react';
import { getCommandes, validerCommande, affecterCommande, annulerCommande, livrerCommande } from '../services/api';
import CommandeFormModal from '../components/CommandeFormModal';

const Commandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Filters
  const [filterStatut, setFilterStatut] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCommandes = async () => {
    try {
      const params = {};
      if (filterStatut) params.statut = filterStatut;
      if (searchQuery) params.search = searchQuery;
      
      const res = await getCommandes(params);
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
  }, [filterStatut, searchQuery]); // Re-fetch on filter change

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
      en_cours: "badge-primary", // use different style if wanted
      livree: "badge-success",
      annulee: "badge-danger",
    };
    return <span className={`badge ${badges[statut] || 'badge-secondary'}`}>{statut.replace('_', ' ')}</span>;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="page-title text-gradient">Gestion des Commandes</h2>
          <p className="page-subtitle">Pilotez le cycle de vie complet de vos expéditions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nouvelle Commande
        </button>
      </div>

      {/* Filters Section */}
      <div className="glass-card animate-fade-in" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
        <input 
          type="text" 
          placeholder="Rechercher par référence..." 
          className="glass-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <select 
          className="glass-input" 
          value={filterStatut} 
          onChange={(e) => setFilterStatut(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="validee">Validée</option>
          <option value="affectee">Affectée</option>
          <option value="en_cours">En cours</option>
          <option value="livree">Livrée</option>
          <option value="annulee">Annulée</option>
        </select>
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
              <th>Poids/Prix</th>
              <th>Statut</th>
              <th>Date d'expédition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chargement...</td></tr>
            ) : commandes.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucune commande trouvée.</td></tr>
            ) : (
              commandes.map((cmd) => (
                <tr key={cmd.id}>
                  <td><strong>{cmd.properties.reference}</strong></td>
                  <td>{cmd.properties.type_marchandise}</td>
                  <td>
                    {cmd.properties.poids_kg} kg
                    <br/><small style={{color:'var(--success-color)'}}>{cmd.properties.prix_estime ? `${cmd.properties.prix_estime} MAD` : '---'}</small>
                  </td>
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
                      {(cmd.properties.statut === 'affectee' || cmd.properties.statut === 'en_cours') && (
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleAction(livrerCommande, cmd.id)}
                          title="Marquer comme livrée"
                        >
                          <Navigation size={16} /> Livrer
                        </button>
                      )}
                      {(cmd.properties.statut !== 'livree' && cmd.properties.statut !== 'annulee') && (
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            if(window.confirm('Voulez-vous annuler cette commande ?')) {
                              handleAction(annulerCommande, cmd.id);
                            }
                          }}
                          title="Annuler"
                        >
                          <X size={16} />
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
