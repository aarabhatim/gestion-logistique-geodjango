import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Panier multi-boutiques avec compatibilité descendante.
 * - Legacy : `fondateur` (single, latest), removeItem(id), updateQuantite(id, qty)
 * - Nouveau : groupsByShop(), removeItem(id, fondateurId), updateQuantite(id, fondateurId, qty)
 */

const _recomputeFondateurUnique = (items, fondateurs) => {
  if (items.length === 0) return null;
  const lastId = items[items.length - 1].fondateurId;
  return fondateurs[lastId] || null;
};

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      fondateurs: {},
      fondateur: null,         // legacy : dernier ajout (mis à jour automatiquement)
      adresseLivraison: '',
      latitude: null,
      longitude: null,
      codesPromos: {},
      codePromo: '',
      reductionAppliquee: 0,

      addItem: (produit, fondateurObj) => {
        if (!produit || !fondateurObj) return;
        const fondateurId = fondateurObj.id;
        const state = get();
        const existing = state.items.find(
          i => i.produit.id === produit.id && i.fondateurId === fondateurId
        );
        let items, fondateurs;
        if (existing) {
          items = state.items.map(i =>
            i.produit.id === produit.id && i.fondateurId === fondateurId
              ? { ...i, quantite: i.quantite + 1 }
              : i
          );
        } else {
          items = [...state.items, { produit, quantite: 1, fondateurId }];
        }
        fondateurs = { ...state.fondateurs, [fondateurId]: fondateurObj };
        set({ items, fondateurs, fondateur: _recomputeFondateurUnique(items, fondateurs) });
      },

      removeItem: (produitId, fondateurId) => {
        const state = get();
        const items = state.items.filter(i => {
          if (i.produit.id !== produitId) return true;
          if (fondateurId == null) return false;
          return i.fondateurId !== fondateurId;
        });
        const fondateurs = { ...state.fondateurs };
        const codesPromos = { ...state.codesPromos };
        Object.keys(fondateurs).forEach(fid => {
          if (!items.find(i => String(i.fondateurId) === String(fid))) {
            delete fondateurs[fid];
            delete codesPromos[fid];
          }
        });
        set({ items, fondateurs, codesPromos, fondateur: _recomputeFondateurUnique(items, fondateurs) });
      },

      updateQuantite: (produitId, second, third) => {
        let fondateurId, quantite;
        if (third === undefined) {
          fondateurId = null;
          quantite = second;
        } else {
          fondateurId = second;
          quantite = third;
        }
        set(state => {
          const items = state.items.map(i => {
            if (i.produit.id === produitId && (fondateurId === null || String(i.fondateurId) === String(fondateurId))) {
              return { ...i, quantite: Math.max(0, quantite) };
            }
            return i;
          }).filter(i => i.quantite > 0);
          const fondateurs = { ...state.fondateurs };
          const codesPromos = { ...state.codesPromos };
          Object.keys(fondateurs).forEach(fid => {
            if (!items.find(i => String(i.fondateurId) === String(fid))) {
              delete fondateurs[fid];
              delete codesPromos[fid];
            }
          });
          return { items, fondateurs, codesPromos, fondateur: _recomputeFondateurUnique(items, fondateurs) };
        });
      },

      clearCart: () => set({ items: [], fondateurs: {}, codesPromos: {}, fondateur: null }),

      setFromOrder: (orderItems, fondateurObj) => {
        if (!orderItems || !fondateurObj) return;
        const fondateurId = fondateurObj.id;
        const items = orderItems.map(l => ({
          produit: l.produit_detail || {
            id: l.produit,
            nom: `Produit #${l.produit}`,
            prix: parseFloat(l.prix_unitaire || 0),
            prix_effectif: parseFloat(l.prix_unitaire || 0)
          },
          quantite: l.quantite,
          fondateurId
        }));
        const fondateurs = { [fondateurId]: fondateurObj };
        set({
          items,
          fondateurs,
          fondateur: fondateurObj,
          codesPromos: {},
        });
      },

      appliquerCodePromo: (fondateurId, code, reduction) =>
        set(state => ({
          codesPromos: { ...state.codesPromos, [fondateurId]: { code, reduction } },
        })),

      retirerCodePromo: (fondateurId) =>
        set(state => {
          const codesPromos = { ...state.codesPromos };
          delete codesPromos[fondateurId];
          return { codesPromos };
        }),
    }),
    {
      name: 'delivermap-cart',
      partialize: state => ({
        items: state.items,
        fondateurs: state.fondateurs,
        codesPromos: state.codesPromos,
        fondateur: state.fondateur,
      }),
    }
  )
);

export default useCartStore;
