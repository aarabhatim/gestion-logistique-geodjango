/**
 * Hooks React Query — DeliverMap
 *
 * Remplacer les useEffect + fetch/api par ces hooks pour :
 * - Cache automatique
 * - Refetch intelligent (stale while revalidate)
 * - États loading/error standardisés
 *
 * Prérequis :
 *   npm install @tanstack/react-query
 *
 * Dans main.jsx :
 *   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 *   const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
 *   <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ── Commandes ─────────────────────────────────────────────────────────────

export const useCommandes = (filters = {}) =>
  useQuery({
    queryKey: ['commandes', filters],
    queryFn: () => api.get('/commandes/', { params: filters }).then(r => r.data),
    staleTime: 15_000,
  });

export const useCommande = (id) =>
  useQuery({
    queryKey: ['commandes', id],
    queryFn: () => api.get(`/commandes/${id}/`).then(r => r.data),
    enabled: !!id,
  });

// ── Boutiques / Catalogue ─────────────────────────────────────────────────

export const useBoutiques = (params = {}) =>
  useQuery({
    queryKey: ['boutiques', params],
    queryFn: () => api.get('/fondateurs/boutiques/', { params }).then(r => r.data),
    staleTime: 60_000,
  });

export const useBoutique = (id) =>
  useQuery({
    queryKey: ['boutiques', id],
    queryFn: () => api.get(`/fondateurs/boutiques/${id}/`).then(r => r.data),
    enabled: !!id,
    staleTime: 60_000,
  });

// ── Transporteurs ─────────────────────────────────────────────────────────

export const useTransporteurs = (params = {}) =>
  useQuery({
    queryKey: ['transporteurs', params],
    queryFn: () => api.get('/auth/admin/users/', { params: { role: 'TRANSPORTEUR', ...params } }).then(r => r.data),
    staleTime: 20_000,
  });

// ── Incidents ─────────────────────────────────────────────────────────────

export const useIncidents = (params = {}) =>
  useQuery({
    queryKey: ['incidents', params],
    queryFn: () => api.get('/incidents/', { params }).then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000, // refresh automatique toutes les 30s
  });

// ── Tickets ───────────────────────────────────────────────────────────────

export const useTickets = (params = {}) =>
  useQuery({
    queryKey: ['tickets', params],
    queryFn: () => api.get('/tickets/', { params }).then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

// ── Favoris ───────────────────────────────────────────────────────────────

export const useFavorisBoutiques = () =>
  useQuery({
    queryKey: ['favoris', 'boutiques'],
    queryFn: () => api.get('/favoris/boutiques/').then(r => r.data),
  });

export const useFavorisProduits = () =>
  useQuery({
    queryKey: ['favoris', 'produits'],
    queryFn: () => api.get('/favoris/produits/').then(r => r.data),
  });

// ── Fidélité ──────────────────────────────────────────────────────────────

export const useFidelite = () =>
  useQuery({
    queryKey: ['fidelite'],
    queryFn: () => api.get('/fidelite/mon-compte/').then(r => r.data),
  });

// ── Mutations utiles ──────────────────────────────────────────────────────

export const useAvancerStatut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) => api.post(`/commandes/${id}/${action}/`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commandes'] }),
  });
};

export const useToggleFavoriBoutique = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (boutiqueId) => api.post(`/favoris/boutiques/${boutiqueId}/toggle/`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favoris', 'boutiques'] }),
  });
};
