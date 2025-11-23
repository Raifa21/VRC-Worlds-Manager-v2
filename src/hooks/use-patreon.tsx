import { useEffect, useState } from 'react';
import { commands } from '@/lib/bindings';
import { error } from '@tauri-apps/plugin-log';

const CACHE_KEY = 'patreon-vrchat-names';
const CACHE_TIMESTAMP_KEY = 'patreon-vrchat-names-timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook to fetch and provide patreon supporter VRChat display names
 * Returns a set of all supporter VRChat names for efficient lookup
 * Caches data in localStorage for 24 hours to avoid excessive API calls
 */
export function usePatreon() {
  const [supporters, setSupporters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPatreonVRChatNames() {
      try {
        // Check if we have valid cached data
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const now = Date.now();
          const timestamp = parseInt(cachedTimestamp, 10);
          
          // Use cached data if it's less than 24 hours old
          if (now - timestamp < CACHE_DURATION_MS) {
            const parsedData = JSON.parse(cachedData);
            const allSupporters = new Set<string>(parsedData);
            setSupporters(allSupporters);
            setIsLoading(false);
            return;
          }
        }

        // Fetch fresh data if cache is invalid or expired
        const result = await commands.fetchPatreonVrchatNames();
        if (result.status === 'ok') {
          const allSupporters = new Set<string>([
            ...result.data.platinumSupporter,
            ...result.data.goldSupporter,
            ...result.data.silverSupporter,
            ...result.data.bronzeSupporter,
            ...result.data.basicSupporter,
          ]);
          
          // Cache the data
          localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(allSupporters)));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          
          setSupporters(allSupporters);
        } else {
          throw new Error(result.error);
        }
      } catch (e) {
        error(`Failed to fetch Patreon VRChat names: ${e}`);
        // Don't show toast here - fail silently for world cards
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatreonVRChatNames();
  }, []);

  return { supporters, isLoading };
}

/**
 * Helper function to check if a VRChat display name is a patreon supporter
 */
export function isPatreonSupporter(
  name: string,
  supporters: Set<string>,
): boolean {
  return supporters.has(name);
}
