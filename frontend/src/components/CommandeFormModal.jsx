import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api, { getClients } from '../services/api';
import './CommandeForm.css';

// Fix Leaflet icons in modal
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const LocationPicker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={DefaultIcon} /> : null;
};

const CommandeFormModal = ({ onClose, onSuccess }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    client: '',
    adresse_depart: 'Entrepôt Tanger Med',
    adresse_destination: '',
    type_marchandise: 'standard',
    poids_kg: 500,
    date_souhaitee: new Date().toISOString().split('T')[0],
  });

  const [pointDepart, setPointDepart] = useState([35.882, -5.512]); // Port Tanger Med by default
  const [pointDestination, setPointDestination] = useState(null);

  useEffect(() => {
    getClients().then(res => {
      const features = res.data.features || (res.data.results && res.data.results.features) || [];
      setClients(features);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pointDestination) {
      alert("Veuillez cliquer sur la carte pour sélectionner la destination !");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client: parseInt(formData.client),
        adresse_depart: formData.adresse_depart,
        adresse_destination: formData.adresse_destination,
        type_marchandise: formData.type_marchandise,
        poids_kg: parseFloat(formData.poids_kg),
        date_souhaitee: formData.date_souhaitee,
        statut: 'en_attente',
        // Django expects GeoJSON Point format for PointFields
        point_depart: { type: 'Point', coordinates: [pointDepart[1], pointDepart[0]] },
        point_destination: { type: 'Point', coordinates: [pointDestination[1], pointDestination[0]] }
      };

      await api.post('commandes/', payload);
      onSuccess();
    } catch (error) {
      alert("Erreur: " + JSON.stringify(error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in">
        <div className="modal-header">
          <h3>Nouvelle Commande</h3>
          <button onClick={onClose} className="btn-close"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Client</label>
            <select 
              required 
              value={formData.client} 
              onChange={e => setFormData({...formData, client: e.target.value})}
            >
              <option value="">Sélectionnez un client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.properties.prenom} {c.properties.nom}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Marchandise</label>
            <input type="text" required value={formData.type_marchandise} onChange={e => setFormData({...formData, type_marchandise: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Poids (kg)</label>
            <input type="number" required min="1" value={formData.poids_kg} onChange={e => setFormData({...formData, poids_kg: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Date souhaitée</label>
            <input type="date" required value={formData.date_souhaitee} onChange={e => setFormData({...formData, date_souhaitee: e.target.value})} />
          </div>

          <div className="form-group full-width">
            <label>Adresse de Destination (Description)</label>
            <input type="text" required placeholder="Ex: 12 Rue de la Liberté" value={formData.adresse_destination} onChange={e => setFormData({...formData, adresse_destination: e.target.value})} />
          </div>

          <div className="form-group full-width map-group">
            <label><MapPin size={16}/> Cliquez sur la carte pour définir la géolocalisation de destination</label>
            <div className="form-map-container">
              <MapContainer center={[35.7595, -5.8340]} zoom={11} style={{ height: '250px', width: '100%', borderRadius: '8px' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <LocationPicker position={pointDestination} setPosition={setPointDestination} />
              </MapContainer>
            </div>
            {!pointDestination && <small style={{color:'var(--warning-color)'}}>Position requise !</small>}
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !pointDestination}>
              {loading ? 'Création...' : 'Créer la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommandeFormModal;
