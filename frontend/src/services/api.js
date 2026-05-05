import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getCommandes = () => api.get('commandes/');
export const getTransporteurs = () => api.get('transporteurs/entreprises/');
export const getVehicules = () => api.get('transporteurs/vehicules/');
export const getClients = () => api.get('clients/');
export const getPositions = () => api.get('tracking/positions/');

// Actions métiers
export const validerCommande = (id) => api.post(`commandes/${id}/valider/`);
export const affecterCommande = (id) => api.post(`commandes/${id}/affecter/`);

export default api;
