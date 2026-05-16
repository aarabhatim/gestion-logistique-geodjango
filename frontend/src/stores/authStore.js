import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),

      setUser: (user) => set({ user }),

      login: (data) => set({
        user: data.user,
        accessToken: data.access,
        refreshToken: data.refresh,
      }),

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

      isAuthenticated: () => !!get().accessToken,

      isAdmin: () => get().user?.role === 'ADMIN',
      isClient: () => get().user?.role === 'CLIENT',
      isTransporteur: () => get().user?.role === 'TRANSPORTEUR',
      isFondateur: () => get().user?.role === 'FONDATEUR',
    }),
    {
      name: 'delivermap-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
