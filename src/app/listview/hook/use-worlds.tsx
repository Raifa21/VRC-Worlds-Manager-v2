import { useLocalization } from '@/hooks/use-localization';
import { commands, WorldDisplayData } from '@/lib/bindings';
import { FolderType, isUserFolder, SpecialFolders } from '@/types/folders';
import { error } from 'console';
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
      onError: (error) => {
        console.error('Failed to fetch worlds:', error);
        toast.error(t('general:error-title'), {
          description: t('listview-page:error-fetch-worlds'),
        });
      },
    },
  );

  return {
    worlds,
    error,
    isLoading,
    refresh,
  };

  // const handleHideWorld = async (worldId: string[], worldName: string[]) => {
  //   try {
  //     // Store original folder information for each world before hiding
  //     const worldFoldersMap = new Map<string, string[]>();

  //     // Get folder information for each world
  //     for (const id of worldId) {
  //       const world = worlds.find((w) => w.worldId === id);
  //       if (world) {
  //         worldFoldersMap.set(id, [...world.folders]);
  //       }
  //     }

  //     // Hide worlds in parallel instead of one by one
  //     await Promise.all(worldId.map((id) => commands.hideWorld(id)));

  //     toast(t('listview-page:worlds-hidden-title'), {
  //       description:
  //         worldName.length > 1
  //           ? t(
  //               'listview-page:worlds-hidden-multiple',
  //               worldName[0],
  //               worldName.length - 1,
  //             )
  //           : t('listview-page:worlds-hidden-single', worldName[0]),
  //       action: {
  //         label: t('listview-page:undo-button'),
  //         onClick: () => undoHideWorld(),
  //       },
  //     });

  //     await refreshCurrentView();
  //   } catch (e) {
  //     error(`Failed to hide world: ${e}`);
  //     toast({
  //       title: t('general:error-title'),
  //       description: t('listview-page:error-hide-world'),
  //       variant: 'destructive',
  //     });
  //   }
  // };

  // const undoHideWorld = () => {
  //   async () => {
  //     try {
  //       // Parallel unhide and folder restoration
  //       await Promise.all(
  //         worldId.map(async (id) => {
  //           await commands.unhideWorld(id);

  //           // Restore folders for this world
  //           const originalFolders = worldFoldersMap.get(id);
  //           if (originalFolders?.length) {
  //             await Promise.all(
  //               originalFolders.map((folder) =>
  //                 commands.addWorldToFolder(folder, id),
  //               ),
  //             );
  //           }
  //         }),
  //       );

  //       await refreshCurrentView();
  //       toast({
  //         title: t('listview-page:restored-title'),
  //         description: t('listview-page:worlds-restored'),
  //       });
  //     } catch (e) {
  //       error(`Failed to restore worlds: ${e}`);
  //       toast({
  //         title: t('general:error-title'),
  //         description: t('listview-page:error-restore-worlds'),
  //         variant: 'destructive',
  //       });
  //     }
  //   };
  // };
}
