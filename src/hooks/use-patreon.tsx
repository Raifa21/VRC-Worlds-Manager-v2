import { useEffect } from 'react';
import { usePatreonStore, isPatreonSupporter } from '@/stores/patreon-store';

/**
 * Hook to fetch and provide patreon supporter VRChat display names
 * Returns a set of all supporter VRChat names for efficient lookup
 * Data is cached globally with Zustand to prevent multiple API calls
 */
export function usePatreon() {
  const { supporters, isLoading, fetchSupporters } = usePatreonStore();

  useEffect(() => {
    fetchSupporters();
  }, [fetchSupporters]);

  return { supporters, isLoading };
}

// Re-export the helper function for convenience
export { isPatreonSupporter };
