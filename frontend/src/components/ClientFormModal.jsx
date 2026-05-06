import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

const ClientFormModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    entreprise: '',
    note_fidelite: 3
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('clients/', formData);
      onSuccess();
    } catch (error) {
      alert("Erreur lors de la création : " + JSON.stringify(error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Nouveau Client</h3>
          <button onClick={onClose} className="btn-close"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Prénom</label>
            <input required type="text" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Nom</label>
            <input required type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Téléphone</label>
            <input required type="text" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
          </div>

          <div className="form-group full-width">
            <label>Entreprise</label>
            <input type="text" placeholder="Optionnel" value={formData.entreprise} onChange={e => setFormData({...formData, entreprise: e.target.value})} />
          </div>

          <div className="form-group full-width">
            <label>Adresse</label>
            <input required type="text" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} />
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Création...' : 'Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormModal;
