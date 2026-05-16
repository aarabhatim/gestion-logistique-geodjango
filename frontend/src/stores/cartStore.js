import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],           // [{ produit, quantite }]
      fondateur: null,     // Un seul fondateur par panier
      adresseLivraison: '',
      latitude: null,
      longitude: null,
      codePromo: '',
      reductionAppliquee: 0,

      addItem: (produit, fondateur) => {
        const state = get();
        // Changer de boutique: vider le panier
        if (state.fondateur && state.fondateur.id !== fondateur.id) {
          set({ items: [], fondateur, reductionAppliquee: 0, codePromo: '' });
        }
        const existing = state.items.find(i => i.produit.id === produit.id);
        if (existing) {
          set({
            items: state.items.map(i =>
              i.produit.id === produit.id ? { ...i, quantite: i.quantite + 1 } : i
            ),
            fondateur,
          });
        } else {
          set({ items: [...state.items, { produit, quantite: 1 }], fondateur });
        }
      },

      removeItem: (produitId) => {
        const items = get().items.filter(i => i.produit.id !== produitId);
        set({ items, fondateur: items.length === 0 ? null : get().fondateur });
      },

      updateQuantite: (produitId, quantite) => {
        if (quantite <= 0) {
          get().removeItem(produitId);
          return;
        }
        set({
          items: get().items.map(i =>
            i.produit.id === produitId ? { ...i, quantite } : i
          ),
        });
      },

      clearCart: () => set({ items: [], fondateur: null, codePromo: '', reductionAppliquee: 0 }),

      setSousTotal: () => {
        return get().items.reduce((acc, i) => acc + parseFloat(i.produit.prix_effectif) * i.quantite, 0);
      },

      get sousTotal() {
        return get().items.reduce((acc, i) => acc + parseFloat(i.produit.prix_effectif) * i.quantite, 0);
      },

      get fraisLivraison() {
        return get().fondateur ? parseFloat(get().fondateur.frais_livraison_base) : 0;
      },

      get total() {
        const s = get();
        return s.items.reduce((acc, i) => acc + parseFloat(i.produit.prix_effectif) * i.quantite, 0)
          + (s.fondateur ? parseFloat(s.fondateur.frais_livraison_base) : 0)
          - s.reductionAppliquee;
      },

      appliquerCodePromo: (code, reduction) => set({ codePromo: code, reductionAppliquee: reduction }),
      setAdresse: (adresse, lat, lon) => set({ adresseLivraison: adresse, latitude: lat, longitude: lon }),
    }),
    {
      name: 'delivermap-cart',
    }
  )
);

export default useCartStore;
