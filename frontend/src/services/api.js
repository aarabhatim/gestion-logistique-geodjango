import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur: inject token
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('delivermap-auth');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    } catch {}
  }
  return config;
});

// Intercepteur: refresh token auto
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const stored = localStorage.getItem('delivermap-auth');
      if (stored) {
        try {
          const { state } = JSON.parse(stored);
          if (state?.refreshToken) {
            const resp = await axios.post(`${BASE_URL}auth/token/refresh/`, {
              refresh: state.refreshToken,
            });
            const newAccess = resp.data.access;
            const parsed = JSON.parse(stored);
            parsed.state.accessToken = newAccess;
            localStorage.setItem('delivermap-auth', JSON.stringify(parsed));
            original.headers.Authorization = `Bearer ${newAccess}`;
            return api(original);
          }
        } catch {
          localStorage.removeItem('delivermap-auth');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data) => api.post('auth/login/', data),
  register: (data) => api.post('auth/register/', data),
  logout: (refresh) => api.post('auth/logout/', { refresh }),
  me: () => api.get('auth/me/'),
  updateProfile: (data) => api.patch('auth/me/', data),
  changePassword: (data) => api.post('auth/me/password/', data),
  updatePosition: (lat, lon) => api.post('auth/position/', { latitude: lat, longitude: lon }),
};

// Fondateurs & Produits
export const fondateursApi = {
  proches: (lat, lon, rayon = 10, categorie) =>
    api.get('fondateurs/proches/', { params: { lat, lon, rayon, categorie } }),
  list: (params) => api.get('fondateurs/', { params }),
  detail: (id) => api.get(`fondateurs/${id}/`),
  produits: (fondateurId, params) => api.get(`fondateurs/${fondateurId}/produits/`, { params }),
  maBoutique: () => api.get('fondateurs/ma-boutique/'),
  creerBoutique: (data) => api.post('fondateurs/ma-boutique/', data),
  updateBoutique: (data) => api.patch('fondateurs/ma-boutique/', data),
  mesProduits: () => api.get('fondateurs/mes-produits/'),
  creerProduit: (data) => api.post('fondateurs/mes-produits/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProduit: (id, data) => api.patch(`fondateurs/mes-produits/${id}/`, data),
  deleteProduit: (id) => api.delete(`fondateurs/mes-produits/${id}/`),
  mesCodes: () => api.get('fondateurs/mes-codes-promo/'),
  creerCode: (data) => api.post('fondateurs/mes-codes-promo/', data),
  verifierCode: (data) => api.post('fondateurs/verifier-code-promo/', data),
  adminListe: (params) => api.get('fondateurs/admin/liste/', { params }),
  adminValider: (id, action, motif) => api.post(`fondateurs/admin/${id}/valider/`, { action, motif }),
  // Stock management
  toggleDisponibilite: (id) => api.post(`fondateurs/mes-produits/${id}/toggle-disponibilite/`),
  majStock: (id, data) => api.patch(`fondateurs/mes-produits/${id}/stock/`, data),
  stockAlertes: () => api.get('fondateurs/mon-stock/alertes/'),
};

// Commandes
export const commandesApi = {
  list: (params) => api.get('commandes/', { params }),
  create: (data) => api.post('commandes/', data),
  detail: (id) => api.get(`commandes/${id}/`),
  avancer: (id) => api.post(`commandes/${id}/statut/avancer/`),
  annuler: (id) => api.post(`commandes/${id}/statut/annuler/`),
  fondateurAction: (id, action) => api.post(`commandes/${id}/fondateur-action/`, { action }),
  transporteurAction: (id, action) => api.post(`commandes/${id}/transporteur-action/`, { action }),
  signaler: (id, motif) => api.post(`commandes/${id}/signaler/`, { motif }),
  proposees: () => api.get('commandes/proposees/'),
  creerAvis: (commandeId, data) => api.post(`commandes/${commandeId}/avis/`, data),
  avis: (params) => api.get('commandes/avis/', { params }),
  adminAnnuler: (id) => api.post(`commandes/${id}/admin/annuler/`),
  adminAssigner: (id, transporteurId) => api.post(`commandes/${id}/admin/assigner/`, { transporteur_id: transporteurId }),
  adminTransporteursDispo: (id) => api.get(`commandes/${id}/admin/transporteurs/`),
};

// Livraisons
export const livraisonsApi = {
  detail: (id) => api.get(`livraisons/${id}/`),
  mesLivraisons: () => api.get('livraisons/mes-livraisons/'),
  demarrer: (id) => api.post(`livraisons/${id}/demarrer/`),
  confirmer: (id, code) => api.post(`livraisons/${id}/confirmer/`, { code_confirmation: code }),
  updatePosition: (lat, lon, vitesse, livraisonId) =>
    api.post('livraisons/position/', { latitude: lat, longitude: lon, vitesse_kmh: vitesse, livraison_id: livraisonId }),
};

// Transporteurs
export const transporteursApi = {
  monProfil: () => api.get('transporteurs/mon-profil/'),
  creerProfil: (data) => api.post('transporteurs/mon-profil/', data),
  toggleDisponibilite: () => api.post('transporteurs/disponibilite/'),
  disponibles: (params) => api.get('transporteurs/disponibles/', { params }),
  adminListe: (params) => api.get('transporteurs/admin/', { params }),
  adminValider: (id, action) => api.post(`transporteurs/admin/${id}/valider/`, { action }),
};

// Notifications
export const notificationsApi = {
  list: (params) => api.get('notifications/', { params }),
  nonLues: () => api.get('notifications/non-lues/'),
  marquerLue: (id) => api.post(`notifications/${id}/lire/`),
  toutLire: () => api.post('notifications/tout-lire/'),
  supprimer: (id) => api.delete(`notifications/${id}/supprimer/`),
  supprimerLues: () => api.delete('notifications/supprimer-lues/'),
  alertesRetard: () => api.get('notifications/alertes-retard/'),
};

// Analytics
export const analyticsApi = {
  adminDashboard: () => api.get('analytics/admin/'),
  fondateurAnalytics: () => api.get('analytics/fondateur/'),
  publiques: () => api.get('analytics/publiques/'),
  // Heatmap legacy (couverture territoriale)
  heatmap: () => api.get('analytics/heatmap/'),
  // 5 heatmap types avec filtre periode (7j, 30j, 90j)
  heatmapCommandes: (periode) => api.get('analytics/heatmap/commandes/', { params: periode ? { periode } : {} }),
  heatmapRetards: (periode) => api.get('analytics/heatmap/retards/', { params: periode ? { periode } : {} }),
  heatmapIncidents: (periode) => api.get('analytics/heatmap/incidents/', { params: periode ? { periode } : {} }),
  heatmapProfits: (periode) => api.get('analytics/heatmap/profits/', { params: periode ? { periode } : {} }),
  heatmapTrafic: (periode) => api.get('analytics/heatmap/trafic/', { params: periode ? { periode } : {} }),
};

// Incidents
export const incidentsApi = {
  list: (params) => api.get('incidents/', { params }),
  detail: (id) => api.get(`incidents/${id}/`),
  signaler: (data) => api.post('incidents/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  resoudre: (id, data) => api.post(`incidents/${id}/resoudre/`, data),
  prendreEnCharge: (id) => api.post(`incidents/${id}/prendre-en-charge/`),
  mesIncidents: () => api.get('incidents/mes-incidents/'),
  stats: () => api.get('incidents/stats/'),
  ajouterPhoto: (id, data) => api.post(`incidents/${id}/ajouter-photo/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Scoring
export const scoringApi = {
  monScore: () => api.get('scoring/mon-score/'),
  detail: (id) => api.get(`scoring/${id}/`),
  classement: (params) => api.get('scoring/classement/', { params }),
  recalculer: (id) => api.post(`scoring/${id}/recalculer/`),
  recalculerTous: () => api.post('scoring/recalculer-tous/'),
};

// Tickets
export const ticketsApi = {
  list: (params) => api.get('tickets/', { params }),
  create: (data) => api.post('tickets/', data),
  detail: (id) => api.get(`tickets/${id}/`),
  repondre: (id, data) => api.post(`tickets/${id}/repondre/`, data),
  assigner: (id, data) => api.post(`tickets/${id}/assigner/`, data),
  changerStatut: (id, statut) => api.post(`tickets/${id}/changer-statut/`, { statut }),
  mesTickets: () => api.get('tickets/mes-tickets/'),
};

// Contrats
export const contratsApi = {
  list: (params) => api.get('contrats/', { params }),
  detail: (id) => api.get(`contrats/${id}/`),
  creer: (data) => api.post('contrats/', data),
  genererPdf: (id) => api.post(`contrats/${id}/generer-pdf/`),
  telechargerPdf: (id) => api.get(`contrats/${id}/telecharger-pdf/`, { responseType: 'blob' }),
  signer: (id, data) => api.post(`contrats/${id}/signer/`, data),
  activer: (id) => api.post(`contrats/${id}/activer/`),
  resilier: (id, data) => api.post(`contrats/${id}/resilier/`, data),
  verifierExpirations: () => api.post('contrats/verifier-expirations/'),
};

// Chatbot conversationnel
export const chatbotApi = {
  send: ({ message, history }) => api.post('chatbot/', { message, history }),
};

// Exports nommés compatibles (anciens composants)
export const getCommandes = (params) => commandesApi.list(params);
export const createCommande = (data) => commandesApi.create(data);
export const validerCommande = (id) => commandesApi.avancer(id);
export const affecterCommande = (id) => commandesApi.avancer(id);
export const annulerCommande = (id) => commandesApi.annuler(id);
export const livrerCommande = (id) => commandesApi.avancer(id);

export const getClients = (params) =>
  api.get('auth/admin/users/', { params: { role: 'CLIENT', ...params } });

export const getIncidents = (params) => incidentsApi.list(params);
export const resoudreIncident = (id, notes) => incidentsApi.resoudre(id, { notes_resolution: notes });

// Admin user / boutique / transporteur management
export const adminApi = {
  listUsers:           (params) => api.get('auth/admin/users/', { params }),
  banUser:             (id) => api.post(`auth/admin/users/${id}/ban/`),
  resetPassword:       (id, password) => api.post(`auth/admin/users/${id}/reset-password/`, { password }),
  validerBoutique:     (id, action, motif) => api.post(`fondateurs/admin/${id}/valider/`, { action, motif }),
  validerTransporteur: (id, action) => api.post(`transporteurs/admin/${id}/valider/`, { action }),
};

export const getStats = () => analyticsApi.adminDashboard();

export default api;
