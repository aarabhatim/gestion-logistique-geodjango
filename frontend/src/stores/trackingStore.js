import { create } from 'zustand';

const useTrackingStore = create((set) => ({
  // Position du transporteur en live
  transporteurPosition: null,  // { lat, lng }
  eta: null,
  statutLivraison: null,
  livraisonId: null,

  setPosition: (lat, lng) => set({ transporteurPosition: { lat, lng } }),
  setEta: (eta) => set({ eta }),
  setStatut: (statut) => set({ statutLivraison: statut }),
  setLivraisonId: (id) => set({ livraisonId: id }),
  reset: () => set({ transporteurPosition: null, eta: null, statutLivraison: null, livraisonId: null }),
}));

export default useTrackingStore;
