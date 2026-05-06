import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Commandes ────────────────────────────────────────────────────────────────
export const getCommandes = (params = {}) => api.get('commandes/', { params });
export const createCommande = (data) => api.post('commandes/', data);
export const validerCommande = (id) => api.post(`commandes/${id}/valider/`);
export const affecterCommande = (id) => api.post(`commandes/${id}/affecter/`);
export const annulerCommande = (id) => api.post(`commandes/${id}/annuler/`);
export const livrerCommande = (id) => api.post(`commandes/${id}/livrer/`);

// ─── Clients ──────────────────────────────────────────────────────────────────
export const getClients = () => api.get('clients/');
export const createClient = (data) => api.post('clients/', data);
export const updateClient = (id, data) => api.patch(`clients/${id}/`, data);
export const deleteClient = (id) => api.delete(`clients/${id}/`);

// ─── Transporteurs / Flotte ───────────────────────────────────────────────────
export const getTransporteurs = () => api.get('transporteurs/entreprises/');
export const getVehicules = () => api.get('transporteurs/vehicules/');
export const getChauffeurs = () => api.get('transporteurs/chauffeurs/');
export const getEntrepots = () => api.get('transporteurs/entrepots/');

// ─── Tracking ─────────────────────────────────────────────────────────────────
export const getPositions = () => api.get('tracking/positions/');

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = () => api.get('notifications/');
export const getNonLues = () => api.get('notifications/non_lues/');
export const marquerLue = (id) => api.post(`notifications/${id}/lire/`);
export const toutMarquerLu = () => api.post('notifications/tout_lire/');

// ─── Incidents ────────────────────────────────────────────────────────────────
export const getIncidents = (params = {}) => api.get('incidents/', { params });
export const createIncident = (data) => api.post('incidents/', data);
export const resoudreIncident = (id, notes = '') =>
  api.post(`incidents/${id}/resoudre/`, { notes_resolution: notes });

// ─── Statistiques ─────────────────────────────────────────────────────────────
export const getStats = () => api.get('stats/');

export default api;
