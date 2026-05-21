import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useLoyaltyStore = create(
  persist(
    (set, get) => ({
      points: 0,
      history: [],

      addPoints: (amountSpent, ref) => {
        const pointsGagnes = Math.floor(amountSpent / 10);
        if (pointsGagnes <= 0) return;
        const currentPoints = get().points;
        const currentHistory = get().history;
        set({
          points: currentPoints + pointsGagnes,
          history: [
            {
              id: Math.random().toString(36).substring(2, 9),
              date: new Date().toISOString(),
              points: pointsGagnes,
              type: 'earn',
              details: `Gain commande ${ref || ''}`,
            },
            ...currentHistory,
          ],
        });
      },

      redeemPoints: (pointsToRedeem, ref) => {
        const currentPoints = get().points;
        if (pointsToRedeem <= 0 || currentPoints < pointsToRedeem) return;
        const currentHistory = get().history;
        set({
          points: currentPoints - pointsToRedeem,
          history: [
            {
              id: Math.random().toString(36).substring(2, 9),
              date: new Date().toISOString(),
              points: -pointsToRedeem,
              type: 'redeem',
              details: `Réduction appliquée sur commande ${ref || ''}`,
            },
            ...currentHistory,
          ],
        });
      },
    }),
    {
      name: 'delivermap-loyalty',
    }
  )
);

export default useLoyaltyStore;
