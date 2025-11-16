import { useEffect, useState } from 'react';
import { commands } from '@/lib/bindings';
import { error } from '@tauri-apps/plugin-log';

/**
 * Hook to fetch and provide patreon supporter data
 * Returns a set of all supporter user IDs for efficient lookup
 */
export function usePatreon() {
  const [supporters, setSupporters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPatreonData() {
      try {
        const result = await commands.fetchPatreonData();
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
        error(`Failed to fetch Patreon data: ${e}`);
        // Don't show toast here - fail silently for world cards
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatreonData();
  }, []);

  return { supporters, isLoading };
}

/**
 * Helper function to check if a user ID is a patreon supporter
 */
export function isPatreonSupporter(
  userId: string,
  supporters: Set<string>,
): boolean {
  return supporters.has(userId);
}
