import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../contexts/I18nContext';

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
      alert(t('cfm_err_create') + ' : ' + JSON.stringify(error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>{t('cfm_title')}</h3>
          <button onClick={onClose} className="btn-close"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>{t('cfm_prenom')}</label>
            <input required type="text" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>{t('cfm_nom')}</label>
            <input required type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
          </div>

          <div className="form-group">
            <label>{t('cfm_email')}</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="form-group">
            <label>{t('cfm_tel')}</label>
            <input required type="text" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
          </div>

          <div className="form-group full-width">
            <label>{t('cfm_entreprise')}</label>
            <input type="text" placeholder={t('cfm_optional')} value={formData.entreprise} onChange={e => setFormData({...formData, entreprise: e.target.value})} />
          </div>

          <div className="form-group full-width">
            <label>{t('cfm_adresse')}</label>
            <input required type="text" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} />
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('cfm_creating') : t('cfm_create_client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormModal;
