import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Intercepteur: inject token ───────────────────────────────────────────────
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

// ─── Intercepteur: refresh token auto ────────────────────────────────────────
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

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('auth/login/', data),
  register: (data) => api.post('auth/register/', data),
  logout: (refresh) => api.post('auth/logout/', { refresh }),
  me: () => api.get('auth/me/'),
  updateProfile: (data) => api.patch('auth/me/', data),
  changePassword: (data) => api.post('auth/me/password/', data),
  updatePosition: (lat, lon) => api.post('auth/position/', { latitude: lat, longitude: lon }),
};

// ─── Fondateurs & Produits ────────────────────────────────────────────────────
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
};

// ─── Commandes ────────────────────────────────────────────────────────────────
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
  // Admin
  adminAnnuler: (id) => api.post(`commandes/${id}/admin/annuler/`),
  adminAssigner: (id, transporteurId) => api.post(`commandes/${id}/admin/assigner/`, { transporteur_id: transporteurId }),
  adminTransporteursDispo: (id) => api.get(`commandes/${id}/admin/transporteurs/`),
};

// ─── Livraisons ───────────────────────────────────────────────────────────────
export const livraisonsApi = {
  detail: (id) => api.get(`livraisons/${id}/`),
  mesLivraisons: () => api.get('livraisons/mes-livraisons/'),
  demarrer: (id) => api.post(`livraisons/${id}/demarrer/`),
  confirmer: (id, code) => api.post(`livraisons/${id}/confirmer/`, { code_confirmation: code }),
  updatePosition: (lat, lon, vitesse, livraisonId) =>
    api.post('livraisons/position/', { latitude: lat, longitude: lon, vitesse_kmh: vitesse, livraison_id: livraisonId }),
};

// ─── Transporteurs ────────────────────────────────────────────────────────────
export const transporteursApi = {
  monProfil: () => api.get('transporteurs/mon-profil/'),
  creerProfil: (data) => api.post('transporteurs/mon-profil/', data),
  toggleDisponibilite: () => api.post('transporteurs/disponibilite/'),
  disponibles: (params) => api.get('transporteurs/disponibles/', { params }),
  adminListe: (params) => api.get('transporteurs/admin/', { params }),
  adminValider: (id, action) => api.post(`transporteurs/admin/${id}/valider/`, { action }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('notifications/'),
  nonLues: () => api.get('notifications/non-lues/'),
  marquerLue: (id) => api.post(`notifications/${id}/lire/`),
  toutLire: () => api.post('notifications/tout-lire/'),
};

// ─── Chatbot ──────────────────────────────────────────────────────────────────
export const chatbotApi = {
  send: ({ message, history }) => api.post('chatbot/', { message, history }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  adminDashboard: () => api.get('analytics/admin/'),
  fondateurAnalytics: () => api.get('analytics/fondateur/'),
  publiques: () => api.get('analytics/publiques/'),
};

// ─── Exports nommés compatibles (anciens composants) ─────────────────────────

export const getCommandes = (params) => commandesApi.list(params);
export const createCommande = (data) => commandesApi.create(data);
export const validerCommande = (id) => commandesApi.avancer(id);
export const affecterCommande = (id) => commandesApi.avancer(id);
export const annulerCommande = (id) => commandesApi.annuler(id);
export const livrerCommande = (id) => commandesApi.avancer(id);

export const getClients = (params) =>
  api.get('auth/admin/users/', { params: { role: 'CLIENT', ...params } });

export const getStats = () => analyticsApi.adminDashboard();

export const getNonLues = () => notificationsApi.nonLues();
export const marquerLue = (id) => notificationsApi.marquerLue(id);
export const toutMarquerLu = () => notificationsApi.toutLire();

export const getVehicules = (params) => transporteursApi.adminListe(params);
export const getChauffeurs = (params) =>
  api.get('auth/admin/users/', { params: { role: 'TRANSPORTEUR', ...params } });

// Incidents n'existe plus — retourne une liste vide pour éviter les crashs
export const getIncidents = () =>
  Promise.resolve({ data: { features: [] } });
export const resoudreIncident = () =>
  Promise.resolve({ data: {} });

export default api;
