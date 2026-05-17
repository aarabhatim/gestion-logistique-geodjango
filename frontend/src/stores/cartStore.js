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
        if (quantite <= 0) {
          get().removeItem(produitId, fondateurId);
          return;
        }
        const state = get();
        const items = state.items.map(i => {
          if (i.produit.id !== produitId) return i;
          if (fondateurId != null && i.fondateurId !== fondateurId) return i;
          return { ...i, quantite };
        });
        set({ items });
      },

      clearCart: () => set({
        items: [], fondateurs: {}, fondateur: null,
        codesPromos: {}, codePromo: '', reductionAppliquee: 0,
      }),

      clearShop: (fondateurId) => {
        const state = get();
        const items = state.items.filter(i => i.fondateurId !== fondateurId);
        const fondateurs = { ...state.fondateurs };
        const codesPromos = { ...state.codesPromos };
        delete fondateurs[fondateurId];
        delete codesPromos[fondateurId];
        set({ items, fondateurs, codesPromos, fondateur: _recomputeFondateurUnique(items, fondateurs) });
      },

      groupsByShop: () => {
        const state = get();
        const map = {};
        state.items.forEach(i => {
          if (!map[i.fondateurId]) {
            map[i.fondateurId] = {
              fondateur: state.fondateurs[i.fondateurId],
              items: [], sousTotal: 0,
            };
          }
          map[i.fondateurId].items.push(i);
          map[i.fondateurId].sousTotal += parseFloat(i.produit.prix_effectif) * i.quantite;
        });
        return Object.entries(map).map(([fondateurId, group]) => {
          const frais = group.fondateur ? parseFloat(group.fondateur.frais_livraison_base) || 0 : 0;
          const promo = state.codesPromos[fondateurId];
          const reduction = promo ? promo.reduction : 0;
          return {
            fondateurId,
            fondateur: group.fondateur,
            items: group.items,
            sousTotal: group.sousTotal,
            frais, reduction,
            total: group.sousTotal + frais - reduction,
            codePromo: promo ? promo.code : '',
          };
        });
      },

      sousTotalGlobal: () => get().items.reduce((acc, i) => acc + parseFloat(i.produit.prix_effectif) * i.quantite, 0),
      fraisGlobal: () => Object.values(get().fondateurs).reduce((acc, f) => acc + (parseFloat(f && f.frais_livraison_base) || 0), 0),
      reductionGlobale: () => Object.values(get().codesPromos).reduce((acc, p) => acc + ((p && p.reduction) || 0), 0),
      totalGlobal: () => { const s = get(); return s.sousTotalGlobal() + s.fraisGlobal() - s.reductionGlobale(); },
      countItems: () => get().items.reduce((acc, i) => acc + i.quantite, 0),
      countShops: () => Object.keys(get().fondateurs).length,

      appliquerCodePromo: (...args) => {
        if (args.length === 2) {
          const [code, reduction] = args;
          const state = get();
          const lastId = state.items.length ? state.items[state.items.length - 1].fondateurId : null;
          if (lastId != null) {
            set({ codesPromos: { ...state.codesPromos, [lastId]: { code, reduction } }, codePromo: code, reductionAppliquee: reduction });
          }
        } else {
          const [fondateurId, code, reduction] = args;
          set(s => ({ codesPromos: { ...s.codesPromos, [fondateurId]: { code, reduction } } }));
        }
      },

      retirerCodePromo: (fondateurId) =>
        set(s => {
          const newPromos = { ...s.codesPromos };
          delete newPromos[fondateurId];
          return { codesPromos: newPromos };
        }),

      setAdresse: (adresse, lat, lon) => set({ adresseLivraison: adresse, latitude: lat, longitude: lon }),
    }),
    { name: 'delivermap-cart-v2', version: 2 }
  )
);

export default useCartStore;
