import useSWR from 'swr';
import { commands } from '@/lib/bindings';

const fetchFolders = async (): Promise<[string, number][]> => {
  const result = await commands.getFolders();
  if (result.status === 'ok') return result.data;
  throw new Error(result.error);
};

export function useFolders() {
  const {
    data: folders = [],
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<[string, number][]>('folders', fetchFolders, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    errorRetryCount: 3, // Retry fetching on error
    errorRetryInterval: 2000, // Retry every 2 seconds
  });

  return { folders, error, isLoading, refresh };
}
