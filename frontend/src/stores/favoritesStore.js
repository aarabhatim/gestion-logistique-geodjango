import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favoriteShops: [],
      favoriteProducts: [],

      toggleFavShop: (shopObj) => {
        if (!shopObj || !shopObj.id) return;
        const { favoriteShops } = get();
        const exists = favoriteShops.some(s => s.id === shopObj.id);
        if (exists) {
          set({ favoriteShops: favoriteShops.filter(s => s.id !== shopObj.id) });
        } else {
          set({ favoriteShops: [...favoriteShops, shopObj] });
        }
      },

      toggleFavProduct: (productObj, fondateurId) => {
        if (!productObj || !productObj.id) return;
        const { favoriteProducts } = get();
        const exists = favoriteProducts.some(p => p.id === productObj.id);
        if (exists) {
          set({ favoriteProducts: favoriteProducts.filter(p => p.id !== productObj.id) });
        } else {
          set({ favoriteProducts: [...favoriteProducts, { ...productObj, fondateurId }] });
        }
      },

      isFavShop: (id) => {
        return get().favoriteShops.some(s => s.id === id);
      },

      isFavProduct: (id) => {
        return get().favoriteProducts.some(p => p.id === id);
      },
    }),
    {
      name: 'delivermap-favorites',
    }
  )
);

export default useFavoritesStore;
