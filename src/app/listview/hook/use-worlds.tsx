import { useLocalization } from '@/hooks/use-localization';
import { commands, WorldDisplayData } from '@/lib/bindings';
import { FolderType, isUserFolder, SpecialFolders } from '@/types/folders';
import { error, info } from '@tauri-apps/plugin-log';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

const handleCommandResult = async <T,>(
  commandPromise: Promise<{ status: string; data?: T; error?: string }>,
  errorMessage: string,
): Promise<T> => {
  const result = await commandPromise;
  if (result.status === 'ok' && result.data) {
    return result.data;
  } else {
    info(errorMessage + ': ' + result.error);
    throw new Error(result.error || errorMessage);
  }
};

const fetchUserFolder = async (folder: string): Promise<WorldDisplayData[]> => {
  return handleCommandResult(
    commands.getWorlds(folder),
    `Failed to fetch worlds for folder: ${folder}`,
  );
};

const fetchAllWorlds = async (): Promise<WorldDisplayData[]> => {
  return handleCommandResult(
    commands.getAllWorlds(),
    'Failed to fetch all worlds',
  );
};

const fetchUnclassifiedWorlds = async (): Promise<WorldDisplayData[]> => {
  return handleCommandResult(
    commands.getUnclassifiedWorlds(),
    'Failed to fetch unclassified worlds',
  );
};

const fetchHiddenWorlds = async (): Promise<WorldDisplayData[]> => {
  return handleCommandResult(
    commands.getHiddenWorlds(),
    'Failed to fetch hidden worlds',
  );
};

const getFavoriteWorlds = async () => {
  return handleCommandResult(
    commands.getFavoriteWorlds(),
    'Failed to fetch favorite worlds',
  );
};

const fetchWorlds = async (folder: FolderType): Promise<WorldDisplayData[]> => {
  if (isUserFolder(folder)) {
    const userFolderName: string = folder;
    return fetchUserFolder(userFolderName);
  }

  switch (folder) {
    case SpecialFolders.All:
      return fetchAllWorlds();
    case SpecialFolders.Unclassified:
      return fetchUnclassifiedWorlds();
    case SpecialFolders.Hidden:
      return fetchHiddenWorlds();
    case SpecialFolders.Find:
      return []; // or appropriate implementation
    default:
      throw new Error(`Unknown folder type: ${folder}`);
  }
};

export function useWorlds(folder: FolderType) {
  const { t } = useLocalization();

  const {
    data: worlds = [],
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<WorldDisplayData[]>(
    ['worlds', folder],
    () => fetchWorlds(folder),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      onError: (e) => {
        info('Failed to fetch worlds:', e);
        toast.error(t('general:error-title'), {
          description: t('listview-page:error-fetch-worlds'),
        });
      },
    },
  );

  const getAllWorlds = () => {
    return fetchAllWorlds();
  };

  const addWorld = async (worldId: string) => {
    try {
      const world = await commands.getWorld(worldId, null);
      if (world.status === 'error') {
        throw new Error(world.error);
      }
      // if we are not in a special folder, add the world to the current folder
      if (isUserFolder(folder) === true) {
        await commands.addWorldToFolder(folder, worldId);
      }
      toast(t('listview-page:world-added-title'), {
        description: t('listview-page:world-added-description'),
      });
      refresh();
    } catch (e) {
      error(`Failed to add world: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-add-world'),
      });
    }
  };

  return {
    worlds,
    isLoading,
    getAllWorlds,
    getFavoriteWorlds,
    addWorld,
    refresh,
  };
}
