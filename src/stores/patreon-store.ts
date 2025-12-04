import { create } from 'zustand';
import { commands } from '@/lib/bindings';
import { error } from '@tauri-apps/plugin-log';

interface PatreonState {
  supporters: Set<string>;
  isLoading: boolean;
  lastFetched: number | null;
  error: string | null;
  fetchSupporters: () => Promise<void>;
  clearCache: () => void;
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const usePatreonStore = create<PatreonState>((set, get) => ({
  supporters: new Set(),
  isLoading: false,
  lastFetched: null,
  error: null,

  fetchSupporters: async () => {
    const state = get();
    const now = Date.now();

    // Check if we have valid cached data
    if (
      state.lastFetched &&
      now - state.lastFetched < CACHE_DURATION &&
      state.supporters.size > 0
    ) {
      return;
    }

    // Prevent multiple simultaneous requests
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await commands.fetchPatreonVrchatNames();
      if (result.status === 'ok') {
        const allSupporters = new Set<string>([
          ...result.data.platinumSupporter,
          ...result.data.goldSupporter,
          ...result.data.silverSupporter,
          ...result.data.bronzeSupporter,
          ...result.data.basicSupporter,
        ]);
        set({
          supporters: allSupporters,
          lastFetched: now,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      const errorMessage = `Failed to fetch Patreon VRChat names: ${e}`;
      error(errorMessage);
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  clearCache: () => {
    set({
      supporters: new Set(),
      lastFetched: null,
      error: null,
    });
  },
}));
