import { useParams } from 'next/navigation';
import { useWorlds } from '../../hook/use-worlds';

export const useUserFolderPage = () => {
  const { worlds, isLoading, refresh } = useWorlds();

  return {
    worlds,
    error,
    isLoading,
    refresh,
  };
};
