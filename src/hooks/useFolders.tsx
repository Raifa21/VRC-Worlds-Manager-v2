import useSWR from 'swr';
import { commands } from '@/lib/bindings';

const fetchFolders = async () => {
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
  } = useSWR('folders', fetchFolders);

  return { folders, error, isLoading, refresh };
}
