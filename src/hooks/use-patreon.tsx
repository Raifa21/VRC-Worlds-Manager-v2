import { useEffect, useState } from 'react';
import { commands } from '@/lib/bindings';
import { error } from '@tauri-apps/plugin-log';

/**
 * Hook to fetch and provide patreon supporter VRChat display names
 * Returns a set of all supporter VRChat names for efficient lookup
 * Data is cached on the backend for 24 hours
 */
export function usePatreon() {
  const [supporters, setSupporters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPatreonVRChatNames() {
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
